import fs from "node:fs/promises";
import path from "node:path";
import pdfParse from "pdf-parse";
import { processPagesWithOcr, isPageScanned, extractImagesFromPdfBuffer, getImageDimensions } from "./ocr.js";

/**
 * Parses table lines from raw page text.
 * Supports Markdown pipe tables and multi-column whitespace/tab aligned tables.
 */
export function extractTablesFromText(pageText, pageNumber) {
  if (!pageText || typeof pageText !== "string") {
    return { tables: [], cleanedText: "" };
  }

  const lines = pageText.split(/\r?\n/);
  const tables = [];
  const remainingLines = [];
  let currentGroup = [];
  let isPipeTable = false;

  function flushGroup() {
    if (currentGroup.length >= 2) {
      const parsed = parseTableGroup(currentGroup, pageNumber, tables.length + 1);
      if (parsed) {
        tables.push(parsed);
      } else {
        remainingLines.push(...currentGroup);
      }
    } else {
      remainingLines.push(...currentGroup);
    }
    currentGroup = [];
    isPipeTable = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      flushGroup();
      remainingLines.push(rawLine);
      continue;
    }

    // Check markdown table pipes: contains 2 or more '|'
    const pipeMatches = line.match(/\|/g);
    if (pipeMatches && pipeMatches.length >= 2) {
      // Separator line like |---|---| or |:---:|
      const isSep = !line.replace(/[\s\|\-\:\+\=]/g, "");
      if (isSep) {
        if (currentGroup.length > 0) {
          currentGroup.push(line);
          isPipeTable = true;
          continue;
        }
      } else {
        currentGroup.push(line);
        continue;
      }
    }

    // Check whitespace/tab delimited columns (at least 2 distinct columns separated by 2+ spaces or tabs)
    const cols = line.split(/\s{2,}|\t+/).map((c) => c.trim()).filter(Boolean);
    if (cols.length >= 2 && !line.startsWith("#") && !line.endsWith(".")) {
      currentGroup.push(line);
      continue;
    }

    // Explicit Table header caption (e.g. "Table 1: Performance Summary")
    if (/^Table\s+\d+[:\-\.]/i.test(line)) {
      flushGroup();
      currentGroup.push(line);
      continue;
    }

    flushGroup();
    remainingLines.push(rawLine);
  }
  flushGroup();

  return {
    tables,
    cleanedText: remainingLines.join("\n").trim(),
  };
}

function parseTableGroup(lines, pageNumber, tableIndex) {
  let title = "";
  let dataLines = lines;

  if (lines[0] && /^Table\s+\d+[:\-\.]/i.test(lines[0].trim())) {
    title = lines[0].trim();
    dataLines = lines.slice(1);
  }

  // Parse lines into cell arrays
  const parsedRows = dataLines
    .filter((l) => l.replace(/[\s\|\-\:\+\=]/g, "").length > 0) // remove separator bars
    .map((l) => {
      if (l.includes("|")) {
        return l
          .split("|")
          .map((c) => c.trim())
          .filter((c, idx, arr) => (idx > 0 && idx < arr.length - 1) || c.length > 0);
      }
      return l.split(/\s{2,}|\t+/).map((c) => c.trim()).filter(Boolean);
    })
    .filter((r) => r.length >= 2);

  if (parsedRows.length < 2) return null;

  const headers = parsedRows[0];
  const rows = parsedRows.slice(1);
  const columns = headers;
  const tableId = `tbl_p${pageNumber}_${tableIndex}`;

  // Build markdown representation
  const headerLine = `| ${headers.join(" | ")} |`;
  const sepLine = `| ${headers.map(() => "---").join(" | ")} |`;
  const rowLines = rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
  const markdown = `${title ? `### ${title}\n` : ""}${headerLine}\n${sepLine}\n${rowLines}`;

  // Build retrieval-friendly normalized text representation (Column: Value pairs)
  const normalizedRows = rows.map((row) => {
    return headers.map((h, i) => `${h}: ${row[i] || ""}`).join(", ");
  }).join("\n");

  return {
    contentType: "TABLE",
    tableId,
    pageNumber,
    headers,
    rows,
    columns,
    markdown,
    normalizedText: normalizedRows,
    rawTable: lines.join("\n"),
  };
}

/**
 * Detects diagram structures or ASCII/vector schematics in text or layout.
 */
export function extractDiagramsFromText(pageText, pageNumber) {
  const diagrams = [];
  let cleanedText = pageText;

  // Check for ASCII/text diagrams (boxes, arrows, flows)
  const diagramKeywords = /(?:figure|fig\.?|diagram|flowchart|architecture|schematic|workflow|graph|chart|data\s*flow|sequence\s*diagram|state\s*machine)\b/i;
  const arrowOrBoxPatterns = /(?:-->|->|<-|<--|==>|\+--\+|\+-+\+|\|[\s\w]+\|)/;

  const paragraphs = pageText.split(/\n\s*\n/);
  const remainingParagraphs = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim();
    const hasDiagramKeyword = diagramKeywords.test(p);
    const hasArrowsOrBoxes = arrowOrBoxPatterns.test(p);
    const isFigureCaption = /^(?:Figure|Fig\.?|Diagram|Architecture)\s*\d*[:\.\-]/i.test(p);

    if ((hasDiagramKeyword && hasArrowsOrBoxes) || (hasArrowsOrBoxes && p.includes("\n")) || isFigureCaption) {
      const diagramId = `diag_p${pageNumber}_${diagrams.length + 1}`;
      const surroundingText = paragraphs[Math.max(0, i - 1)] || "";
      const visualDescription = `Diagram on Page ${pageNumber}: ${p.split("\n")[0].substring(0, 120)}`;

      diagrams.push({
        contentType: "DIAGRAM",
        diagramId,
        pageNumber,
        originalDiagram: p,
        surroundingText,
        visualDescription,
        diagramType: "ASCII_OR_FLOWCHART",
      });
    } else {
      remainingParagraphs.push(paragraphs[i]);
    }
  }

  return {
    diagrams,
    cleanedText: remainingParagraphs.join("\n\n").trim(),
  };
}

/**
 * Extracts embedded image streams and classifies them as IMAGE or DIAGRAM.
 */
export function extractVisualsFromPdfBuffer(pdfBuffer, pages) {
  const imageBuffers = extractImagesFromPdfBuffer(pdfBuffer);
  const visuals = [];

  const chartPattern = /(?:chart|plot|graph|histogram|bar\s*chart|pie\s*chart|scatter\s*plot)\b/i;
  const diagramPattern = /(?:figure|fig\.?|diagram|flowchart|architecture|schematic|workflow|graph|data\s*flow|sequence\s*diagram)\b/i;

  for (let i = 0; i < imageBuffers.length; i++) {
    const buf = imageBuffers[i];
    const dims = getImageDimensions(buf) || { width: 400, height: 300 };

    // Correlate with page
    const pageIndex = Math.min(i, pages.length - 1);
    const page = pages[pageIndex] || { pageNumber: 1, text: "" };
    const pageText = page.text || "";

    // Check if surrounding text mentions chart, diagram, or illustration
    const isChart = chartPattern.test(pageText);
    const isDiagram = !isChart && diagramPattern.test(pageText);
    const contentType = isChart ? "CHART" : isDiagram ? "DIAGRAM" : "IMAGE";

    // Extract surrounding caption / context
    const lines = pageText.split("\n").map((l) => l.trim()).filter(Boolean);
    const captionLine = lines.find((l) => chartPattern.test(l) || diagramPattern.test(l) || /^(?:Figure|Image|Photo|Chart|Plot)\b/i.test(l)) || lines[0] || "";

    const dataUri = `data:image/jpeg;base64,${buf.toString("base64")}`;
    const idPrefix = isChart ? "chart" : isDiagram ? "diag" : "img";
    const id = `${idPrefix}_p${page.pageNumber}_${i + 1}`;

    if (isChart) {
      visuals.push({
        contentType: "CHART",
        chartId: id,
        pageNumber: page.pageNumber,
        originalChart: dataUri,
        surroundingText: captionLine ? `Chart Caption: ${captionLine}` : pageText.substring(0, 200),
        visualDescription: `Data Chart / Plot on Page ${page.pageNumber}: ${captionLine || `Dimensions ${dims.width}x${dims.height}`}`,
        dimensions: dims,
      });
    } else if (isDiagram) {
      visuals.push({
        contentType: "DIAGRAM",
        diagramId: id,
        pageNumber: page.pageNumber,
        originalDiagram: dataUri,
        surroundingText: captionLine ? `Caption: ${captionLine}` : pageText.substring(0, 200),
        visualDescription: `Architecture / Diagram on Page ${page.pageNumber}: ${captionLine || `Dimensions ${dims.width}x${dims.height}`}`,
        dimensions: dims,
      });
    } else {
      visuals.push({
        contentType: "IMAGE",
        imageId: id,
        pageNumber: page.pageNumber,
        originalImage: dataUri,
        surroundingText: captionLine ? `Context: ${captionLine}` : pageText.substring(0, 200),
        visualDescription: `Image / Illustration on Page ${page.pageNumber}: ${captionLine || `Dimensions ${dims.width}x${dims.height}`}`,
        dimensions: dims,
      });
    }
  }

  return visuals;
}

/**
 * Extracts text, tables, images, diagrams, and OCR pages from a PDF.
 *
 * @param {string|Buffer} filePathOrBuffer
 * @returns {Promise<object>}
 */
export async function extractPdfContent(filePathOrBuffer) {
  let dataBuffer;
  if (typeof filePathOrBuffer === "string") {
    try {
      dataBuffer = await fs.readFile(filePathOrBuffer);
    } catch (err) {
      throw new Error(`Failed to read PDF file at ${filePathOrBuffer}: ${err.message}`);
    }
  } else {
    dataBuffer = filePathOrBuffer;
  }

  if (!Buffer.isBuffer(dataBuffer) || dataBuffer.length < 10) {
    throw new Error("Invalid or corrupt PDF document: Empty or malformed file buffer");
  }

  // Verify PDF header magic bytes "%PDF-"
  if (!dataBuffer.slice(0, 5).toString("ascii").startsWith("%PDF-")) {
    throw new Error("Invalid or corrupt PDF document: Missing valid %PDF header");
  }

  // 1. Text extraction using pdf-parse
  const rawPages = [];
  const parseOptions = {
    pagerender: function (pageData) {
      return pageData.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false }).then(function (textContent) {
        let lastY, text = "";
        let lastStr = "";
        for (const item of textContent.items) {
          const str = item.str;
          if (!str) continue;
          if (lastY === undefined || Math.abs(item.transform[5] - lastY) > 3) {
            text += (text ? "\n" : "") + str;
          } else {
            const isCharStream = lastStr.length === 1 && str.length === 1;
            const alreadySpaced = text.endsWith(" ") || text.endsWith("\n") || str.startsWith(" ");
            if (isCharStream || alreadySpaced) {
              text += str;
            } else {
              text += " " + str;
            }
          }
          lastY = item.transform[5];
          lastStr = str;
        }
        rawPages.push({
          pageNumber: pageData.pageIndex + 1,
          text: text.trim(),
        });
        return text;
      });
    },
  };

  let parsed;
  try {
    parsed = await pdfParse(dataBuffer, parseOptions);
  } catch (err) {
    throw new Error(`Invalid or corrupt PDF document: ${err.message}`);
  }

  if (rawPages.length === 0) {
    rawPages.push({
      pageNumber: 1,
      text: parsed.text || "",
    });
  }

  // 2. Scanned Page Detection & OCR
  const pagesWithOcr = await processPagesWithOcr(rawPages, dataBuffer);

  // 3. Table & Diagram Extraction from page contents
  const tables = [];
  const diagrams = [];
  const normalizedPages = [];

  for (const p of pagesWithOcr) {
    // Extract tables
    const tableRes = extractTablesFromText(p.text, p.pageNumber);
    if (tableRes.tables.length > 0) {
      tables.push(...tableRes.tables);
    }

    // Extract text diagrams
    const diagRes = extractDiagramsFromText(tableRes.cleanedText || p.text, p.pageNumber);
    if (diagRes.diagrams.length > 0) {
      diagrams.push(...diagRes.diagrams);
    }

    normalizedPages.push({
      ...p,
      cleanedText: diagRes.cleanedText || p.text,
    });
  }

  // 4. Image, Diagram & Chart Extraction from binary PDF streams
  const embeddedVisuals = extractVisualsFromPdfBuffer(dataBuffer, rawPages);
  const charts = [];
  for (const v of embeddedVisuals) {
    if (v.contentType === "DIAGRAM") {
      diagrams.push(v);
    } else if (v.contentType === "CHART") {
      charts.push(v);
    }
  }
  const images = embeddedVisuals.filter((v) => v.contentType === "IMAGE");

  const fullText = normalizedPages.map((p) => p.cleanedText).filter(Boolean).join("\n\n");

  return {
    numPages: parsed.numpages || rawPages.length,
    pages: normalizedPages,
    tables,
    images,
    diagrams,
    charts,
    fullText,
    info: parsed.info || {},
  };
}

/**
 * Normalizes multi-modal extracted items into standardized Knowledge Item chunks.
 * Preserves TEXT, TABLE, IMAGE, DIAGRAM, CHART, and OCR without flattening everything into plain text.
 *
 * @param {object} extracted
 * @param {object} context - { projectId, documentId, userId, filename }
 * @param {number} maxChunkSize
 * @param {number} overlap
 * @returns {Array} Array of Knowledge Item chunks
 */
export function chunkDocumentPages(extracted, contextOrMax = {}, maybeMax = 800, maybeOverlap = 100) {
  // Support legacy signature where extracted is just pages array, or an extracted object
  const isExtractedObj = extracted && typeof extracted === "object" && !Array.isArray(extracted);
  const pages = isExtractedObj ? (extracted.pages || []) : Array.isArray(extracted) ? extracted : [];
  const tables = isExtractedObj ? (extracted.tables || []) : [];
  const images = isExtractedObj ? (extracted.images || []) : [];
  const diagrams = isExtractedObj ? (extracted.diagrams || []) : [];
  const charts = isExtractedObj ? (extracted.charts || []) : [];

  let context = {};
  let maxChunkSize = 800;
  let overlap = 100;

  if (typeof contextOrMax === "number") {
    maxChunkSize = contextOrMax;
    overlap = typeof maybeMax === "number" ? maybeMax : 100;
  } else {
    context = contextOrMax || {};
    maxChunkSize = typeof maybeMax === "number" ? maybeMax : 800;
    overlap = typeof maybeOverlap === "number" ? maybeOverlap : 100;
  }

  const projectId = context.projectId || "";
  const documentId = context.documentId || context.materialId || "";
  const userId = context.userId || "";
  const filename = context.filename || "document.pdf";

  const chunks = [];
  let chunkIndex = 0;

  // 1. Process TABLES as atomic units
  for (const tbl of tables) {
    const readableRepr = `Table on page ${tbl.pageNumber}:\n` +
      (tbl.rows || []).map((row) => (tbl.headers || []).map((h, i) => `${h}: ${row[i] || ""}`).join("\n")).join("\n\n");
    const content = `### Table: ${tbl.tableId} (Page ${tbl.pageNumber})\n${tbl.markdown}\n\n${readableRepr}`;
    const structuredData = {
      tableId: tbl.tableId,
      headers: tbl.headers,
      rows: tbl.rows,
      columns: tbl.columns,
      pageNumber: tbl.pageNumber,
      rawTable: tbl.rawTable,
      markdown: tbl.markdown,
      normalizedText: tbl.normalizedText || readableRepr,
    };
    const sourceMetadata = {
      projectId,
      documentId,
      pageNumber: tbl.pageNumber,
      contentType: "TABLE",
      chunkId: `chunk_${chunkIndex}`,
      filename,
      headers: tbl.headers,
      rowCount: tbl.rows.length,
      colCount: tbl.columns.length,
    };

    chunks.push({
      chunkIndex,
      pageNumber: tbl.pageNumber,
      startPage: tbl.pageNumber,
      endPage: tbl.pageNumber,
      contentType: "TABLE",
      content,
      tokenCount: Math.ceil(content.length / 4),
      structuredData: JSON.stringify(structuredData),
      sourceMetadata: JSON.stringify(sourceMetadata),
      metadata: {
        contentType: "TABLE",
        tableId: tbl.tableId,
        page: tbl.pageNumber,
      },
    });
    chunkIndex++;
  }

  // 2. Process CHARTS as atomic units
  for (const ch of charts) {
    const content = `[Chart on Page ${ch.pageNumber}]: ${ch.visualDescription}\nContext: ${ch.surroundingText}`;
    const structuredData = {
      chartId: ch.chartId,
      originalChart: ch.originalChart,
      pageNumber: ch.pageNumber,
      surroundingText: ch.surroundingText,
      visualDescription: ch.visualDescription,
      chartType: ch.chartType || "DATA_CHART",
    };
    const sourceMetadata = {
      projectId,
      documentId,
      pageNumber: ch.pageNumber,
      contentType: "CHART",
      chunkId: `chunk_${chunkIndex}`,
      filename,
      chartId: ch.chartId,
    };

    chunks.push({
      chunkIndex,
      pageNumber: ch.pageNumber,
      startPage: ch.pageNumber,
      endPage: ch.pageNumber,
      contentType: "CHART",
      content,
      tokenCount: Math.ceil(content.length / 4),
      structuredData: JSON.stringify(structuredData),
      sourceMetadata: JSON.stringify(sourceMetadata),
      metadata: {
        contentType: "CHART",
        chartId: ch.chartId,
        page: ch.pageNumber,
      },
    });
    chunkIndex++;
  }

  // 2. Process DIAGRAMS as atomic units
  for (const diag of diagrams) {
    const content = `[Diagram on Page ${diag.pageNumber}]: ${diag.visualDescription}\nContext: ${diag.surroundingText}`;
    const structuredData = {
      diagramId: diag.diagramId,
      originalDiagram: diag.originalDiagram,
      pageNumber: diag.pageNumber,
      surroundingText: diag.surroundingText,
      visualDescription: diag.visualDescription,
      diagramType: diag.diagramType || "EMBEDDED_DIAGRAM",
    };
    const sourceMetadata = {
      projectId,
      documentId,
      pageNumber: diag.pageNumber,
      contentType: "DIAGRAM",
      chunkId: `chunk_${chunkIndex}`,
      filename,
      diagramId: diag.diagramId,
    };

    chunks.push({
      chunkIndex,
      pageNumber: diag.pageNumber,
      startPage: diag.pageNumber,
      endPage: diag.pageNumber,
      contentType: "DIAGRAM",
      content,
      tokenCount: Math.ceil(content.length / 4),
      structuredData: JSON.stringify(structuredData),
      sourceMetadata: JSON.stringify(sourceMetadata),
      metadata: {
        contentType: "DIAGRAM",
        diagramId: diag.diagramId,
        page: diag.pageNumber,
      },
    });
    chunkIndex++;
  }

  // 3. Process IMAGES as atomic units
  for (const img of images) {
    const content = `[Image on Page ${img.pageNumber}]: ${img.visualDescription}\nContext: ${img.surroundingText}`;
    const structuredData = {
      imageId: img.imageId,
      originalImage: img.originalImage,
      pageNumber: img.pageNumber,
      surroundingText: img.surroundingText,
      visualDescription: img.visualDescription,
    };
    const sourceMetadata = {
      projectId,
      documentId,
      pageNumber: img.pageNumber,
      contentType: "IMAGE",
      chunkId: `chunk_${chunkIndex}`,
      filename,
      imageId: img.imageId,
    };

    chunks.push({
      chunkIndex,
      pageNumber: img.pageNumber,
      startPage: img.pageNumber,
      endPage: img.pageNumber,
      contentType: "IMAGE",
      content,
      tokenCount: Math.ceil(content.length / 4),
      structuredData: JSON.stringify(structuredData),
      sourceMetadata: JSON.stringify(sourceMetadata),
      metadata: {
        contentType: "IMAGE",
        imageId: img.imageId,
        page: img.pageNumber,
      },
    });
    chunkIndex++;
  }

  // 4. Process TEXT & OCR pages with section-aware semantic chunking
  for (const page of pages) {
    const isOcr = Boolean(page.isOcr || page.isScanned || page.ocrConfidence);
    const contentType = isOcr ? "OCR" : "TEXT";
    const text = (page.cleanedText || page.text || "").trim();
    if (!text) continue;

    // Split page text into paragraphs/sections
    const rawBlocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    let currentSection = "";
    const semanticBlocks = [];

    for (const block of rawBlocks) {
      // Check if block is a heading/title
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const firstLine = lines[0] || "";
      const isHeader =
        /^(?:#{1,4}\s+|[0-9]+(?:\.[0-9]+)*\s+|Section\s+|Chapter\s+)/i.test(firstLine) ||
        (firstLine.length < 60 && !/[.?!]$/.test(firstLine) && lines.length <= 2);

      if (isHeader) {
        currentSection = firstLine.replace(/^#{1,4}\s+/, "");
      }

      semanticBlocks.push({
        text: block,
        section: currentSection || `Page ${page.pageNumber}`,
      });
    }

    // Accumulate blocks into cohesive chunks respecting maxChunkSize
    let currentChunkWords = [];
    let currentChunkSection = "";

    for (const block of semanticBlocks) {
      const blockWords = block.text.split(/\s+/);

      if (currentChunkWords.length + blockWords.length <= maxChunkSize) {
        if (!currentChunkSection) currentChunkSection = block.section;
        currentChunkWords.push(...blockWords);
      } else {
        if (currentChunkWords.length > 0) {
          const chunkContent = currentChunkWords.join(" ");
          const structuredData = isOcr
            ? {
                pageNumber: page.pageNumber,
                sectionTitle: currentChunkSection,
                pageImage: page.pageImage || null,
                ocrText: chunkContent,
                ocrConfidence: page.ocrConfidence || 0,
              }
            : {
                pageNumber: page.pageNumber,
                sectionTitle: currentChunkSection,
                wordCount: currentChunkWords.length,
              };

          const sourceMetadata = {
            projectId,
            documentId,
            pageNumber: page.pageNumber,
            sectionTitle: currentChunkSection,
            contentType,
            chunkId: `chunk_${chunkIndex}`,
            filename,
            ...(isOcr ? { ocrConfidence: page.ocrConfidence || 0 } : {}),
          };

          chunks.push({
            chunkIndex,
            pageNumber: page.pageNumber,
            startPage: page.pageNumber,
            endPage: page.pageNumber,
            contentType,
            content: chunkContent,
            tokenCount: Math.ceil(chunkContent.length / 4),
            structuredData: JSON.stringify(structuredData),
            sourceMetadata: JSON.stringify(sourceMetadata),
            metadata: {
              contentType,
              sectionTitle: currentChunkSection,
              wordCount: currentChunkWords.length,
              page: page.pageNumber,
              ...(isOcr ? { isOcr: true, ocrConfidence: page.ocrConfidence || 0 } : {}),
            },
          });
          chunkIndex++;
        }

        // If single block is larger than maxChunkSize, split into windows
        if (blockWords.length > maxChunkSize) {
          let j = 0;
          while (j < blockWords.length) {
            const subSlice = blockWords.slice(j, j + maxChunkSize);
            const subContent = subSlice.join(" ");
            const structuredData = isOcr
              ? {
                  pageNumber: page.pageNumber,
                  sectionTitle: block.section,
                  pageImage: page.pageImage || null,
                  ocrText: subContent,
                  ocrConfidence: page.ocrConfidence || 0,
                }
              : {
                  pageNumber: page.pageNumber,
                  sectionTitle: block.section,
                  wordCount: subSlice.length,
                };

            const sourceMetadata = {
              projectId,
              documentId,
              pageNumber: page.pageNumber,
              sectionTitle: block.section,
              contentType,
              chunkId: `chunk_${chunkIndex}`,
              filename,
              ...(isOcr ? { ocrConfidence: page.ocrConfidence || 0 } : {}),
            };

            chunks.push({
              chunkIndex,
              pageNumber: page.pageNumber,
              startPage: page.pageNumber,
              endPage: page.pageNumber,
              contentType,
              content: subContent,
              tokenCount: Math.ceil(subContent.length / 4),
              structuredData: JSON.stringify(structuredData),
              sourceMetadata: JSON.stringify(sourceMetadata),
              metadata: {
                contentType,
                sectionTitle: block.section,
                wordCount: subSlice.length,
                page: page.pageNumber,
                ...(isOcr ? { isOcr: true, ocrConfidence: page.ocrConfidence || 0 } : {}),
              },
            });
            chunkIndex++;
            j += maxChunkSize - overlap;
          }
          currentChunkWords = [];
          currentChunkSection = "";
        } else {
          currentChunkWords = [...blockWords];
          currentChunkSection = block.section;
        }
      }
    }

    // Flush any remaining words for this page
    if (currentChunkWords.length > 0) {
      const chunkContent = currentChunkWords.join(" ");
      const structuredData = isOcr
        ? {
            pageNumber: page.pageNumber,
            sectionTitle: currentChunkSection,
            pageImage: page.pageImage || null,
            ocrText: chunkContent,
            ocrConfidence: page.ocrConfidence || 0,
          }
        : {
            pageNumber: page.pageNumber,
            sectionTitle: currentChunkSection,
            wordCount: currentChunkWords.length,
          };

      const sourceMetadata = {
        projectId,
        documentId,
        pageNumber: page.pageNumber,
        sectionTitle: currentChunkSection,
        contentType,
        chunkId: `chunk_${chunkIndex}`,
        filename,
        ...(isOcr ? { ocrConfidence: page.ocrConfidence || 0 } : {}),
      };

      chunks.push({
        chunkIndex,
        pageNumber: page.pageNumber,
        startPage: page.pageNumber,
        endPage: page.pageNumber,
        contentType,
        content: chunkContent,
        tokenCount: Math.ceil(chunkContent.length / 4),
        structuredData: JSON.stringify(structuredData),
        sourceMetadata: JSON.stringify(sourceMetadata),
        metadata: {
          contentType,
          sectionTitle: currentChunkSection,
          wordCount: currentChunkWords.length,
          page: page.pageNumber,
          ...(isOcr ? { isOcr: true, ocrConfidence: page.ocrConfidence || 0 } : {}),
        },
      });
      chunkIndex++;
    }
  }

  return chunks;
}
