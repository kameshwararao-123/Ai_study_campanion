import { createWorker } from "tesseract.js";

// Cached worker singleton to avoid recreating worker on every page
let cachedWorker = null;
let workerInitPromise = null;

async function getWorker(language = "eng") {
  if (cachedWorker) return cachedWorker;
  if (workerInitPromise) return workerInitPromise;

  workerInitPromise = (async () => {
    try {
      const worker = await createWorker(language, 1, {
        logger: () => {},
        errorHandler: () => {},
      });
      cachedWorker = worker;
      return worker;
    } catch (err) {
      cachedWorker = null;
      throw err;
    } finally {
      workerInitPromise = null;
    }
  })();

  return workerInitPromise;
}

/**
 * Checks whether an extracted PDF page lacks a sufficient text layer,
 * indicating a scanned page or image-only document (REQ-025).
 *
 * @param {string} text - Extracted raw text from page
 * @param {number} minChars - Minimum character threshold (default 30)
 * @returns {boolean}
 */
export function isPageScanned(text, minChars = 30) {
  if (!text) return true;
  const cleaned = text.replace(/[\s\r\n\t]+/g, "").trim();
  return cleaned.length < minChars;
}

/**
 * Parses image width and height from JPEG or PNG buffer.
 *
 * @param {Buffer} buf
 * @returns {{width: number, height: number} | null}
 */
export function getImageDimensions(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 24) return null;

  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length - 8) {
      // Find 0xFF marker prefix
      while (offset < buf.length && buf[offset] !== 0xff) {
        offset++;
      }
      // Skip fill 0xFF bytes
      while (offset < buf.length && buf[offset] === 0xff) {
        offset++;
      }
      if (offset >= buf.length) break;

      const marker = buf[offset];
      offset++;

      // SOF markers: 0xC0..0xC3, 0xC5..0xC7, 0xC9..0xCB, 0xCD..0xCF
      const isSof =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf);

      if (isSof) {
        if (offset + 7 <= buf.length) {
          const height = buf.readUInt16BE(offset + 3);
          const width = buf.readUInt16BE(offset + 5);
          return { width, height };
        }
        break;
      }

      if (marker === 0xd9 || marker === 0xda) break; // EOI or SOS

      // Standalone markers with no length (RST0..RST7, SOI, TEM)
      if ((marker >= 0xd0 && marker <= 0xd8) || marker === 0x01) {
        continue;
      }

      if (offset + 2 > buf.length) break;
      const length = buf.readUInt16BE(offset);
      offset += length;
    }
  }

  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    if (buf.length >= 24) {
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      return { width, height };
    }
  }

  return null;
}

/**
 * Validates whether an input is a valid image buffer or file path.
 * Filters out tiny images (e.g., 2x36 decorative icons/dividers) that cause Leptonica/Tesseract to crash.
 *
 * @param {Buffer|string} input
 * @returns {boolean}
 */
export function isValidImage(input) {
  if (typeof input === "string" && input.length > 0) return true;
  if (!Buffer.isBuffer(input) || input.length < 2000) return false;

  // Check magic bytes
  const isJpeg = input[0] === 0xff && input[1] === 0xd8;
  const isPng = input[0] === 0x89 && input[1] === 0x50 && input[2] === 0x4e && input[3] === 0x47;
  const isGif = input[0] === 0x47 && input[1] === 0x49 && input[2] === 0x46;
  const isBmp = input[0] === 0x42 && input[1] === 0x4d;
  const isTiff =
    (input[0] === 0x49 && input[1] === 0x49) || (input[0] === 0x4d && input[1] === 0x4d);

  if (!isJpeg && !isPng && !isGif && !isBmp && !isTiff) {
    return false;
  }

  // Check dimensions: reject tiny icons/spacers (e.g. 2x36) that cause "Image too small to scale" errors
  const dims = getImageDimensions(input);
  if (dims) {
    if (dims.width < 100 || dims.height < 100) {
      return false;
    }
  } else {
    // If dimensions cannot be verified, ensure file size is substantial enough to be a scanned page (> 15KB)
    if (input.length < 15000) {
      return false;
    }
  }

  return true;
}

/**
 * Performs Optical Character Recognition (OCR) on an image buffer or base64 string.
 *
 * @param {Buffer|string} imageBufferOrPath - Image Buffer or file path
 * @param {object} options - Configuration options
 * @returns {Promise<{ text: string, confidence: number, isOcr: boolean }>}
 */
export async function performOCR(imageBufferOrPath, options = {}) {
  // If explicitly mocked or provided in options
  if (options.mockText) {
    return {
      text: options.mockText,
      confidence: 95,
      isOcr: true,
      engine: "mock",
    };
  }

  // Check valid image format and dimensions before invoking worker
  if (!isValidImage(imageBufferOrPath)) {
    return {
      text: "",
      confidence: 0,
      isOcr: true,
      error: "Invalid or unsupported image buffer",
      engine: "fallback",
    };
  }

  const language = options.language || "eng";
  const timeoutMs = options.timeoutMs || 15000; // Allow 15s for OCR recognition

  try {
    const ocrPromise = (async () => {
      const worker = await getWorker(language);
      const ret = await worker.recognize(imageBufferOrPath);
      const text = ret.data && ret.data.text ? ret.data.text.trim() : "";
      const confidence = ret.data && typeof ret.data.confidence === "number" ? ret.data.confidence : 0;

      return {
        text,
        confidence,
        isOcr: true,
        engine: "tesseract.js",
      };
    })();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("OCR engine timed out or offline")), timeoutMs)
    );

    return await Promise.race([ocrPromise, timeoutPromise]);
  } catch (err) {
    // Graceful fallback
    return {
      text: "",
      confidence: 0,
      isOcr: true,
      error: err.message,
      engine: "fallback",
    };
  }
}

/**
 * Extracts raw image objects or scanned streams from a PDF buffer
 * using binary inspection of PDF DCTDecode / FlateDecode streams.
 * Filters out tiny icons or non-page images.
 *
 * @param {Buffer} pdfBuffer
 * @returns {Buffer[]} Extracted image buffers (e.g. JPEG)
 */
export function extractImagesFromPdfBuffer(pdfBuffer) {
  const images = [];
  try {
    const data = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    const str = data.toString("latin1");

    // Locate embedded JPEG streams (/DCTDecode)
    let startIdx = 0;
    while ((startIdx = str.indexOf("/DCTDecode", startIdx)) !== -1) {
      const streamStart = str.indexOf("stream\r\n", startIdx);
      const altStreamStart = str.indexOf("stream\n", startIdx);
      const actualStreamStart =
        streamStart !== -1 && streamStart < startIdx + 1000
          ? streamStart + 8
          : altStreamStart !== -1 && altStreamStart < startIdx + 1000
          ? altStreamStart + 7
          : -1;

      if (actualStreamStart !== -1) {
        const streamEnd = str.indexOf("endstream", actualStreamStart);
        if (streamEnd !== -1) {
          const imgBuf = data.subarray(actualStreamStart, streamEnd);
          // Only include images with substantial size (at least 2KB) and valid dimensions (>= 50x50)
          if (imgBuf.length >= 2000) {
            const dims = getImageDimensions(imgBuf);
            if (dims) {
              if (dims.width >= 100 && dims.height >= 100) {
                images.push(imgBuf);
              }
            } else if (imgBuf.length >= 20000) {
              images.push(imgBuf);
            }
          }
        }
      }
      startIdx += 10;
    }
  } catch (e) {
    console.warn("[OCR Image Extractor] Could not inspect PDF image streams:", e.message);
  }
  return images;
}

/**
 * Processes extracted pages from a PDF, detects scanned pages,
 * and recovers text using OCR when no native text layer is present (REQ-025).
 *
 * @param {Array<{pageNumber: number, text: string}>} pages
 * @param {Buffer} [pdfBuffer]
 * @returns {Promise<Array<{pageNumber: number, text: string, isOcr: boolean}>>}
 */
export async function processPagesWithOcr(pages, pdfBuffer = null) {
  const processedPages = [];
  let extractedImages = null;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const needsOcr = isPageScanned(page.text);

    if (!needsOcr) {
      processedPages.push({
        ...page,
        isOcr: false,
      });
      continue;
    }

    // Lazily extract large images if not already done
    if (extractedImages === null && pdfBuffer) {
      extractedImages = extractImagesFromPdfBuffer(pdfBuffer);
    }

    let ocrText = "";
    let ocrConfidence = 0;

    // Only invoke OCR if a valid candidate image exists for this page
    if (extractedImages && extractedImages.length > 0 && i < extractedImages.length) {
      const imgCandidate = extractedImages[i];
      if (isValidImage(imgCandidate)) {
        console.log(`[OCR Pipeline] Page ${page.pageNumber}: Processing scanned page with OCR...`);
        const ocrResult = await performOCR(imgCandidate);
        if (ocrResult.text) {
          ocrText = ocrResult.text;
          ocrConfidence = ocrResult.confidence;
        }
      }
    }

    if (ocrText) {
      processedPages.push({
        pageNumber: page.pageNumber,
        text: `[OCR Extracted]\n${ocrText}`,
        isOcr: true,
        ocrConfidence,
      });
    } else {
      // If OCR did not find text, preserve any native text rather than dropping it
      const hasNativeText = Boolean(page.text && page.text.trim().length > 0);
      processedPages.push({
        pageNumber: page.pageNumber,
        text: hasNativeText
          ? page.text.trim()
          : `[Scanned Document Page ${page.pageNumber} - Image/Diagram content without OCR text layer]`,
        isOcr: !hasNativeText,
        ocrConfidence: 0,
      });
    }
  }

  return processedPages;
}
