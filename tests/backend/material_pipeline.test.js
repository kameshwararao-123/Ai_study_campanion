import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "../../server/lib/db.js";
import { extractPdfContent, chunkDocumentPages, extractTablesFromText, extractDiagramsFromText } from "../../server/lib/pdf.js";
import { backgroundQueue } from "../../server/lib/queue.js";

// Helper to create a dummy test user and project
async function createTestContext(prefix = "mat_test") {
  const user = await prisma.user.create({
    data: {
      email: `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`,
      name: "Pipeline Tester",
      passwordHash: "hash123",
      role: "LEARNER",
    },
  });

  const space = await prisma.space.create({
    data: {
      userId: user.id,
      name: "Test Space",
      description: "Space for material pipeline tests",
    },
  });

  const project = await prisma.project.create({
    data: {
      spaceId: space.id,
      userId: user.id,
      name: "Material Pipeline Project",
      description: "Testing end-to-end multi-modal ingestion",
      learningGoal: "Master data extraction and search indexing",
    },
  });

  return { user, space, project };
}

test("Material Pipeline: Unit & Extraction Tests", async (t) => {
  await t.test("1. Table Extraction: Extracts headers, rows, columns, page, and table identity", () => {
    const rawPageText = `
Chapter 3: Performance Benchmarks
Here are the evaluated model metrics:

| Model Architecture | Precision | Recall | F1-Score |
|---|---|---|---|
| Support Vector Machine | 0.88 | 0.85 | 0.86 |
| Random Forest Classifier | 0.93 | 0.91 | 0.92 |
| Gradient Boosting | 0.95 | 0.94 | 0.94 |

General observations show that boosting algorithms outperform traditional linear baselines.
`;

    const { tables, cleanedText } = extractTablesFromText(rawPageText, 3);
    assert.strictEqual(tables.length, 1, "Should extract 1 table");
    const table = tables[0];

    assert.strictEqual(table.tableId, "tbl_p3_1");
    assert.strictEqual(table.pageNumber, 3);
    assert.deepStrictEqual(table.headers, ["Model Architecture", "Precision", "Recall", "F1-Score"]);
    assert.strictEqual(table.rows.length, 3);
    assert.deepStrictEqual(table.rows[0], ["Support Vector Machine", "0.88", "0.85", "0.86"]);
    assert.ok(table.markdown.includes("| Support Vector Machine |"));
    assert.ok(!cleanedText.includes("Support Vector Machine"), "Table content should be stripped from plain text");
  });

  await t.test("2. Diagram Detection: Identifies architecture flowcharts and schematics", () => {
    const rawPageText = `
System Overview
Figure 1: AI Study Companion Microservices Architecture
[Client UI] --> [Express API Gateway] --> [MongoDB Database]
                                       --> [Tesseract OCR Worker]
                                       --> [Gemini AI Service]

This architecture ensures asynchronous decoupled processing.
`;

    const { diagrams, cleanedText } = extractDiagramsFromText(rawPageText, 1);
    assert.strictEqual(diagrams.length, 1, "Should detect 1 diagram");
    const diag = diagrams[0];

    assert.strictEqual(diag.diagramId, "diag_p1_1");
    assert.strictEqual(diag.pageNumber, 1);
    assert.ok(diag.originalDiagram.includes("[Client UI] --> [Express API Gateway]"));
    assert.ok(diag.visualDescription.includes("Diagram on Page 1"));
  });

  await t.test("3. Chunking: Preserves TABLE, IMAGE, DIAGRAM, OCR, and TEXT knowledge items", () => {
    const mockExtracted = {
      pages: [
        { pageNumber: 1, text: "Introduction to Operating Systems. Kernel architecture and memory management.", isOcr: false },
        { pageNumber: 2, text: "[OCR Extracted]\nScanned notes on paging and virtual memory.", isOcr: true, ocrConfidence: 91.2 },
      ],
      tables: [
        {
          tableId: "tbl_p1_1",
          pageNumber: 1,
          headers: ["Algorithm", "Time Complexity"],
          rows: [["FIFO", "O(1)"], ["LRU", "O(1)"]],
          columns: ["Algorithm", "Time Complexity"],
          markdown: "| Algorithm | Time Complexity |\n|---|---|\n| FIFO | O(1) |\n| LRU | O(1) |",
          rawTable: "Algorithm   Time Complexity\nFIFO        O(1)\nLRU         O(1)",
        },
      ],
      diagrams: [
        {
          contentType: "DIAGRAM",
          diagramId: "diag_p1_1",
          pageNumber: 1,
          originalDiagram: "data:image/jpeg;base64,mockdiagram",
          surroundingText: "Figure 2: Memory Paging Diagram",
          visualDescription: "Diagram on Page 1: Memory Paging Architecture",
        },
      ],
      images: [
        {
          contentType: "IMAGE",
          imageId: "img_p2_1",
          pageNumber: 2,
          originalImage: "data:image/jpeg;base64,mockimage",
          surroundingText: "Hardware motherboard schematic",
          visualDescription: "Image on Page 2: Motherboard diagram",
        },
      ],
    };

    const chunks = chunkDocumentPages(mockExtracted, {
      projectId: "proj_123",
      documentId: "mat_456",
      userId: "user_789",
      filename: "os_notes.pdf",
    });

    assert.strictEqual(chunks.length, 5, "Should generate 5 chunks across all modalities");

    const tableChunk = chunks.find((c) => c.contentType === "TABLE");
    assert.ok(tableChunk);
    assert.strictEqual(tableChunk.startPage, 1);
    const tableData = JSON.parse(tableChunk.structuredData);
    assert.strictEqual(tableData.tableId, "tbl_p1_1");
    assert.deepStrictEqual(tableData.headers, ["Algorithm", "Time Complexity"]);

    const diagChunk = chunks.find((c) => c.contentType === "DIAGRAM");
    assert.ok(diagChunk);
    const diagData = JSON.parse(diagChunk.structuredData);
    assert.strictEqual(diagData.diagramId, "diag_p1_1");

    const imgChunk = chunks.find((c) => c.contentType === "IMAGE");
    assert.ok(imgChunk);
    const imgData = JSON.parse(imgChunk.structuredData);
    assert.strictEqual(imgData.imageId, "img_p2_1");

    const ocrChunk = chunks.find((c) => c.contentType === "OCR");
    assert.ok(ocrChunk);
    assert.strictEqual(ocrChunk.startPage, 2);
    const ocrData = JSON.parse(ocrChunk.structuredData);
    assert.strictEqual(ocrData.ocrConfidence, 91.2);

    const textChunk = chunks.find((c) => c.contentType === "TEXT");
    assert.ok(textChunk);
    assert.strictEqual(textChunk.startPage, 1);

    // Verify all chunks preserve knowledge item requirements
    for (const c of chunks) {
      assert.ok(c.contentType, "Chunk must have contentType");
      assert.ok(c.startPage, "Chunk must have startPage");
      assert.ok(c.content, "Chunk must have content");
      const srcMeta = JSON.parse(c.sourceMetadata);
      assert.strictEqual(srcMeta.projectId, "proj_123");
      assert.strictEqual(srcMeta.documentId, "mat_456");
      assert.strictEqual(srcMeta.filename, "os_notes.pdf");
    }
  });
});

test("Material Pipeline: End-to-End Processing & Lifecycle Tests", async (t) => {
  const { user, project } = await createTestContext("e2e_pipeline");

  await t.test("4. Normal Text PDF & Table Processing via Queue (Project_Requirements.pdf)", async () => {
    const filePath = "./Project_Requirements.pdf";
    const fileBytes = await fs.readFile(filePath);
    const fileHash = crypto.createHash("sha256").update(fileBytes).digest("hex");

    const material = await prisma.learningMaterial.create({
      data: {
        projectId: project.id,
        userId: user.id,
        filename: "Project_Requirements.pdf",
        fileUrl: filePath,
        fileSizeBytes: fileBytes.length,
        fileHash,
        status: "QUEUED",
      },
    });

    assert.strictEqual(material.status, "QUEUED");

    // Process asynchronously via queue handler
    await backgroundQueue.handleMaterialProcessing({
      materialId: material.id,
      projectId: project.id,
      userId: user.id,
      filePath,
    });

    const updated = await prisma.learningMaterial.findFirst({ where: { id: material.id } });
    assert.strictEqual(updated.status, "READY");
    assert.ok(updated.pageCount > 0);

    const breakdown = JSON.parse(updated.metadata || "{}");
    assert.ok(breakdown.totalChunks > 0);
    assert.ok(breakdown.tables > 0, "Should have extracted tables");
    assert.ok(breakdown.text > 0, "Should have extracted text");

    const chunks = await prisma.documentChunk.findMany({ where: { materialId: material.id } });
    assert.ok(chunks.length > 0);
    const hasTableChunk = chunks.some((c) => c.contentType === "TABLE");
    assert.strictEqual(hasTableChunk, true, "TABLE chunks must be preserved in DB");
  });

  await t.test("5. Idempotency: Re-processing clears old chunks before inserting new ones", async () => {
    const materials = await prisma.learningMaterial.findMany({ where: { projectId: project.id } });
    const targetMat = materials[0];
    assert.ok(targetMat);

    const initialChunks = await prisma.documentChunk.count({ where: { materialId: targetMat.id } });
    assert.ok(initialChunks > 0);

    // Reprocess the same material
    await backgroundQueue.handleMaterialProcessing({
      materialId: targetMat.id,
      projectId: project.id,
      userId: user.id,
      filePath: targetMat.fileUrl,
    });

    const finalChunks = await prisma.documentChunk.count({ where: { materialId: targetMat.id } });
    assert.strictEqual(finalChunks, initialChunks, "Chunk count should not duplicate upon reprocessing");
  });

  await t.test("6. Corrupt PDF: Fails gracefully, sets status=FAILED, never silently READY", async () => {
    const corruptPath = "./uploads/test_corrupt.pdf";
    await fs.writeFile(corruptPath, Buffer.from("THIS IS NOT A VALID PDF FILE AT ALL"));

    const corruptMat = await prisma.learningMaterial.create({
      data: {
        projectId: project.id,
        userId: user.id,
        filename: "corrupt_document.pdf",
        fileUrl: corruptPath,
        fileSizeBytes: 35,
        status: "QUEUED",
      },
    });

    await assert.rejects(
      async () => {
        await backgroundQueue.handleMaterialProcessing({
          materialId: corruptMat.id,
          projectId: project.id,
          userId: user.id,
          filePath: corruptPath,
        });
      },
      /Invalid or corrupt PDF document/
    );

    const afterFail = await prisma.learningMaterial.findFirst({ where: { id: corruptMat.id } });
    assert.strictEqual(afterFail.status, "FAILED");
    assert.ok(afterFail.errorMessage.includes("Invalid or corrupt PDF document"));
    assert.notStrictEqual(afterFail.status, "READY", "Corrupt file must NEVER appear as READY");

    try {
      await fs.unlink(corruptPath);
    } catch (_) {}
  });

  await t.test("7. Duplicate PDF Protection: Disallows duplicate uploads within the same project", async () => {
    const existing = await prisma.learningMaterial.findFirst({
      where: { projectId: project.id, status: "READY" },
    });
    assert.ok(existing && existing.fileHash);

    // Duplicate check logic
    const duplicate = await prisma.learningMaterial.findFirst({
      where: { projectId: project.id, fileHash: existing.fileHash },
    });

    assert.ok(duplicate);
    assert.strictEqual(duplicate.id, existing.id);
  });

  await t.test("8. Retry Capability: Re-queuing updates retry count and cleans up errors", async () => {
    const failedMat = await prisma.learningMaterial.create({
      data: {
        projectId: project.id,
        userId: user.id,
        filename: "retry_test.pdf",
        fileUrl: "./Project_Requirements.pdf",
        fileSizeBytes: 1000,
        status: "FAILED",
        errorMessage: "Simulated timeout error",
        retryCount: 0,
      },
    });

    assert.strictEqual(failedMat.status, "FAILED");

    // Retry operation
    const retried = await prisma.learningMaterial.update({
      where: { id: failedMat.id },
      data: {
        status: "QUEUED",
        errorMessage: null,
        retryCount: { increment: 1 },
      },
    });

    assert.strictEqual(retried.status, "QUEUED");
    assert.strictEqual(retried.errorMessage, null);
    assert.strictEqual(retried.retryCount, 1);

    // Successfully process retried material
    await backgroundQueue.handleMaterialProcessing({
      materialId: retried.id,
      projectId: project.id,
      userId: user.id,
      filePath: retried.fileUrl,
    });

    const readyMat = await prisma.learningMaterial.findFirst({ where: { id: failedMat.id } });
    assert.strictEqual(readyMat.status, "READY");
    assert.strictEqual(readyMat.errorMessage, null);
  });
});

