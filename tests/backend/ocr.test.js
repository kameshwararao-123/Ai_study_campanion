import test from "node:test";
import assert from "node:assert/strict";
import { isPageScanned, performOCR, processPagesWithOcr } from "../../server/lib/ocr.js";
import { extractPdfContent, chunkDocumentPages } from "../../server/lib/pdf.js";
import { getAIProvider } from "../../server/lib/ai.js";

test("OCR & Scanned Document Handling Suite (REQ-025)", async (t) => {
  await t.test("1. isPageScanned detects empty, whitespace, and image-only pages", () => {
    assert.strictEqual(isPageScanned(""), true, "Empty string should be detected as scanned");
    assert.strictEqual(isPageScanned("   \n\t  "), true, "Whitespace-only should be detected as scanned");
    assert.strictEqual(isPageScanned("Page 1"), true, "Fewer than threshold chars should be detected as scanned");
    assert.strictEqual(
      isPageScanned("This is a full paragraph of native document text extracted successfully from the PDF."),
      false,
      "Rich text page should not be detected as scanned"
    );
  });

  await t.test("2. performOCR gracefully handles invalid buffers with fallback", async () => {
    const fakeBuffer = Buffer.from("not an image");
    const result = await performOCR(fakeBuffer);
    assert.ok(result);
    assert.strictEqual(result.isOcr, true);
    // Should fallback gracefully without crashing
    assert.strictEqual(typeof result.text, "string");
  });

  await t.test("3. processPagesWithOcr processes mixed native and scanned pages", async () => {
    const mockPages = [
      {
        pageNumber: 1,
        text: "Chapter 1: Foundations of Artificial Intelligence. Machine learning is a method of data analysis that automates analytical model building.",
      },
      {
        pageNumber: 2,
        text: "", // Scanned page (no native text)
      },
    ];

    const processed = await processPagesWithOcr(mockPages);
    assert.strictEqual(processed.length, 2);

    // Page 1 is native text
    assert.strictEqual(processed[0].pageNumber, 1);
    assert.strictEqual(processed[0].isOcr, false);
    assert.ok(processed[0].text.includes("Chapter 1"));

    // Page 2 is scanned and handled via OCR pipeline
    assert.strictEqual(processed[1].pageNumber, 2);
    assert.strictEqual(processed[1].isOcr, true);
    assert.ok(processed[1].text.length > 0, "Scanned page should retain content boundary");
  });

  await t.test("4. chunkDocumentPages preserves OCR provenance tags in chunk metadata", () => {
    const pagesWithOcr = [
      {
        pageNumber: 1,
        text: "Native text chunk content discussing supervised learning models.",
        isOcr: false,
      },
      {
        pageNumber: 2,
        text: "[OCR Extracted]\nScanned notes discussing gradient descent and loss optimization.",
        isOcr: true,
        ocrConfidence: 89.5,
      },
    ];

    const chunks = chunkDocumentPages(pagesWithOcr, 50, 10);
    assert.strictEqual(chunks.length, 2);

    const chunk1 = chunks.find((c) => c.startPage === 1);
    const chunk2 = chunks.find((c) => c.startPage === 2);

    assert.ok(chunk1);
    assert.ok(chunk2);
    assert.strictEqual(chunk1.metadata.isOcr, undefined);
    assert.strictEqual(chunk2.metadata.isOcr, true);
    assert.strictEqual(chunk2.metadata.ocrConfidence, 89.5);
  });
});

test("Out-of-Box / Unsupported-Question Handling Suite (REQ-036 & PRD Page 7)", async (t) => {
  const ai = getAIProvider();

  await t.test("1. Completely out-of-box question (e.g. Virat Kohli) returns not found in uploaded materials", async () => {
    const res = await ai.generateText("Who is Virat Kohli?", {
      systemInstruction: "Evidence Status: NO_EVIDENCE_FOUND. Do not guess.",
    });
    assert.ok(res.text);
    assert.ok(
      res.text.toLowerCase().includes("not contain") ||
      res.text.toLowerCase().includes("not found") ||
      res.text.toLowerCase().includes("not available in your uploaded learning materials")
    );
    assert.ok(res.text.toLowerCase().includes("uploaded"));
  });

  await t.test("2. Unrelated lifestyle question (e.g. breakfast recipe) returns refusal", async () => {
    const res = await ai.generateText("What is the recipe for chocolate cake?", {
      systemInstruction: "Evidence Status: NO_EVIDENCE_FOUND.",
    });
    assert.ok(res.text);
    assert.ok(
      res.text.toLowerCase().includes("not contain") ||
      res.text.toLowerCase().includes("sufficient evidence") ||
      res.text.toLowerCase().includes("not available in your uploaded learning materials")
    );
  });

  await t.test("3. In-domain question grounded in course notes returns grounded answer", async () => {
    const res = await ai.generateText("What is classification?", {
      systemInstruction: "Course materials: Classification is predicting discrete labels.",
    });
    assert.ok(res.text);
    assert.ok(res.text.toLowerCase().includes("classification"));
    assert.ok(!res.text.toLowerCase().includes("not contain sufficient evidence"));
  });
});

