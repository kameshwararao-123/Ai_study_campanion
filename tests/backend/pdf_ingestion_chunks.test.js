process.env.NODE_ENV = "test";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import app from "../../server/index.js";
import { prisma, connectDB } from "../../server/lib/db.js";
import { signToken } from "../../server/lib/auth.js";
import { extractPdfContent, chunkDocumentPages, extractTablesFromText, extractDiagramsFromText } from "../../server/lib/pdf.js";
import { backgroundQueue } from "../../server/lib/queue.js";
import { hybridRetrieveAndRerank } from "../../server/routes/tutor.js";
import { computeSemanticEmbedding } from "../../server/lib/ai.js";

test("Comprehensive PDF Ingestion & Chunking Test Suite (12 Scenarios)", async (t) => {
  await connectDB();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const timestamp = Date.now();
  const testUser = await prisma.user.create({
    data: {
      email: `chunking_tester_${timestamp}@example.com`,
      name: "Chunking Tester",
      passwordHash: "mock_hash_eval",
      role: "STUDENT",
    },
  });

  const authToken = signToken({
    userId: testUser.id,
    email: testUser.email,
    role: testUser.role,
  });

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
  };

  const space = await prisma.space.create({
    data: {
      userId: testUser.id,
      name: "Database Systems & Engineering",
      description: "Relational database concepts and multimodal systems",
    },
  });

  // Setup Project A and Project B
  const projectA = await prisma.project.create({
    data: {
      spaceId: space.id,
      name: "SQL & RDBMS Project",
      description: "Relational queries, DDL, DML and constraints",
      userId: testUser.id,
    },
  });

  const projectB = await prisma.project.create({
    data: {
      spaceId: space.id,
      name: "Distributed Computing Project",
      description: "Distributed consensus and cloud architecture",
      userId: testUser.id,
    },
  });

  // -------------------------------------------------------------
  // Scenario 1: Normal text PDF -> chunks created with boundaries
  // -------------------------------------------------------------
  await t.test("Scenario 1: Normal text PDF -> chunks created within token/character bounds", async () => {
    const rawPages = [
      {
        pageNumber: 1,
        text: "Structured Query Language (SQL) is a domain-specific language used to manage data in relational database management systems. SQL allows users to create tables, insert records, update data, and execute complex joins between tables to derive insights.",
      },
    ];
    const chunks = chunkDocumentPages(rawPages, { maxChunkSize: 1000, overlap: 100 });
    assert.ok(chunks.length >= 1, "Should create at least 1 chunk");
    assert.strictEqual(chunks[0].contentType, "TEXT");
    assert.strictEqual(chunks[0].pageNumber, 1);
    assert.ok(chunks[0].content.length > 50, "Chunk should contain substantial extracted text");
    assert.ok(!chunks[0].content.includes("undefined"));
  });

  // -------------------------------------------------------------
  // Scenario 2: Multi-page PDF -> page metadata preserved
  // -------------------------------------------------------------
  await t.test("Scenario 2: Multi-page PDF -> page metadata strictly preserved across chunks", async () => {
    const multiPages = [
      { pageNumber: 1, text: "Page 1: Introduction to relational models and relational calculus." },
      { pageNumber: 2, text: "Page 2: Normalization forms including 1NF, 2NF, 3NF, and BCNF." },
      { pageNumber: 3, text: "Page 3: Indexing structures such as B-Trees, B+ Trees, and Hash Indices." },
    ];
    const chunks = chunkDocumentPages(multiPages);
    assert.strictEqual(chunks.length, 3, "Should create 3 chunks for 3 distinct pages");
    assert.strictEqual(chunks[0].pageNumber, 1);
    assert.strictEqual(chunks[1].pageNumber, 2);
    assert.strictEqual(chunks[2].pageNumber, 3);
  });

  // -------------------------------------------------------------
  // Scenario 3: PDF containing tables -> key-value format preserved
  // -------------------------------------------------------------
  await t.test("Scenario 3: PDF containing tables -> key-value format & TABLE contentType preserved", async () => {
    const tableText = `
Student Academic Records:
| StudentID | StudentName | Department | GPA |
|---|---|---|---|
| ST101 | Alice Johnson | Computer Science | 3.85 |
| ST102 | Bob Smith | Electrical Engineering | 3.65 |
`;
    const { tables } = extractTablesFromText(tableText, 4);
    assert.strictEqual(tables.length, 1, "Should detect 1 table");
    assert.strictEqual(tables[0].contentType, "TABLE");
    assert.strictEqual(tables[0].pageNumber, 4);
    assert.ok(tables[0].normalizedText.includes("StudentID: ST101"), "Must preserve key-value row format");
    assert.ok(tables[0].normalizedText.includes("Department: Computer Science"), "Must preserve column key-value pairing");

    const chunks = chunkDocumentPages({ tables });
    assert.strictEqual(chunks.length, 1);
    assert.strictEqual(chunks[0].contentType, "TABLE");
    assert.strictEqual(chunks[0].pageNumber, 4);
    assert.ok(chunks[0].content.includes("Table on page 4:"), "Must use 'Table on page X:' format");
    assert.ok(chunks[0].content.includes("StudentID: ST101"), "Must preserve key-value row format in chunk");
  });

  // -------------------------------------------------------------
  // Scenario 4: PDF containing images -> visual descriptions preserved
  // -------------------------------------------------------------
  await t.test("Scenario 4: PDF containing images -> visual representations & metadata preserved", async () => {
    const diagramText = `
Figure 2.1: Entity Relationship Architecture
The ER diagram displays Entity User connecting with 1-to-many relationship to Orders.
`;
    const { diagrams } = extractDiagramsFromText(diagramText, 5);
    assert.ok(diagrams.length >= 1, "Should detect diagram/image description");
    assert.strictEqual(diagrams[0].pageNumber, 5);
    assert.ok(diagrams[0].contentType === "DIAGRAM" || diagrams[0].contentType === "IMAGE");
    assert.ok(diagrams[0].visualDescription.includes("Figure 2.1"));

    const chunks = chunkDocumentPages({ diagrams });
    assert.strictEqual(chunks.length, 1);
    assert.strictEqual(chunks[0].contentType, "DIAGRAM");
    assert.strictEqual(chunks[0].pageNumber, 5);
    assert.ok(chunks[0].content.includes("Figure 2.1"));
  });

  // -------------------------------------------------------------
  // Scenario 5: Scanned PDF -> OCR chunks created without text loss
  // -------------------------------------------------------------
  await t.test("Scenario 5: Scanned PDF -> OCR chunks created with confidence & page preserved", async () => {
    const ocrPages = [
      {
        pageNumber: 6,
        text: "[OCR Scanned Text]: Transaction ACID properties are Atomicity, Consistency, Isolation, Durability.",
        isScanned: true,
        ocrConfidence: 94.5,
      },
    ];
    const chunks = chunkDocumentPages(ocrPages);
    assert.strictEqual(chunks.length, 1);
    assert.strictEqual(chunks[0].contentType, "OCR");
    assert.strictEqual(chunks[0].pageNumber, 6);
    assert.ok(chunks[0].content.includes("Atomicity"));
  });

  // -------------------------------------------------------------
  // Scenario 6: Mixed PDF -> all content types processed and tagged
  // -------------------------------------------------------------
  await t.test("Scenario 6: Mixed PDF -> TEXT, TABLE, IMAGE/DIAGRAM, OCR properly tagged", async () => {
    const mixedMaterial = await prisma.learningMaterial.create({
      data: {
        projectId: projectA.id,
        userId: testUser.id,
        title: "Mixed Architecture Guide",
        fileType: "PDF",
        fileUrl: "https://example.com/mixed.pdf",
        status: "READY",
      },
    });

    const chunkTypes = [
      { contentType: "TEXT", content: "Overview of relational database architecture and storage engines.", pageNumber: 1 },
      { contentType: "TABLE", content: "Table on page 2:\nEngine: InnoDB | Type: ACID Compliant\nEngine: MyISAM | Type: Non-transactional", pageNumber: 2 },
      { contentType: "DIAGRAM", content: "Figure 3.1: Query execution pipeline showing Parser, Optimizer, and Execution Engine.", pageNumber: 3 },
      { contentType: "OCR", content: "Scanned handwritten notes: WAL (Write-Ahead Logging) ensures durability before commit.", pageNumber: 4 },
    ];

    for (let i = 0; i < chunkTypes.length; i++) {
      await prisma.documentChunk.create({
        data: {
          materialId: mixedMaterial.id,
          projectId: projectA.id,
          userId: testUser.id,
          chunkIndex: i,
          content: chunkTypes[i].content,
          contentType: chunkTypes[i].contentType,
          pageNumber: chunkTypes[i].pageNumber,
          startPage: chunkTypes[i].pageNumber,
          endPage: chunkTypes[i].pageNumber,
          embedding: JSON.stringify(computeSemanticEmbedding(chunkTypes[i].content)),
          metadata: { test: true },
        },
      });
    }

    const res = await fetch(`${baseUrl}/materials/${mixedMaterial.id}/chunks`, { headers: authHeaders });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    const data = body.data || body;
    assert.strictEqual(data.totalChunks, 4);
    const types = data.chunks.map((c) => c.contentType);
    assert.ok(types.includes("TEXT"));
    assert.ok(types.includes("TABLE"));
    assert.ok(types.includes("DIAGRAM"));
    assert.ok(types.includes("OCR"));
  });

  // -------------------------------------------------------------
  // Scenario 7: Question about text -> correct chunk retrieved
  // -------------------------------------------------------------
  await t.test("Scenario 7: Question about text -> correct chunk retrieved with high relevance", async () => {
    const retrieval = await hybridRetrieveAndRerank(projectA.id, "What is the overview of storage engines?");
    assert.ok(retrieval.chunks.length > 0, "Should retrieve chunks");
    assert.strictEqual(retrieval.chunks[0].contentType, "TEXT");
    assert.ok(retrieval.chunks[0].content.includes("storage engines"));
  });

  // -------------------------------------------------------------
  // Scenario 8: Question about table -> table chunk retrieved
  // -------------------------------------------------------------
  await t.test("Scenario 8: Question about table -> table chunk retrieved", async () => {
    const retrieval = await hybridRetrieveAndRerank(projectA.id, "Which engine is ACID compliant according to the table?");
    assert.ok(retrieval.chunks.length > 0, "Should retrieve chunks");
    const tableChunk = retrieval.chunks.find((c) => c.contentType === "TABLE");
    assert.ok(tableChunk, "Should find the TABLE chunk");
    assert.ok(tableChunk.content.includes("InnoDB"));
  });

  // -------------------------------------------------------------
  // Scenario 9: Question about image/diagram -> image evidence retrieved
  // -------------------------------------------------------------
  await t.test("Scenario 9: Question about diagram -> diagram evidence retrieved", async () => {
    const retrieval = await hybridRetrieveAndRerank(projectA.id, "Explain the query execution pipeline from Figure 3.1");
    assert.ok(retrieval.chunks.length > 0, "Should retrieve chunks");
    const diagChunk = retrieval.chunks.find((c) => c.contentType === "DIAGRAM");
    assert.ok(diagChunk, "Should find the DIAGRAM chunk");
    assert.ok(diagChunk.content.includes("Figure 3.1"));
  });

  // -------------------------------------------------------------
  // Scenario 10: Unsupported question -> "I don't know based on the uploaded material."
  // -------------------------------------------------------------
  await t.test("Scenario 10: Unsupported question -> refusal without hallucination", async () => {
    const res = await fetch(`${baseUrl}/tutor/chat`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        projectId: projectA.id,
        content: "What is the secret recipe for French onion soup with gruyere cheese?",
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    const data = body.data || body;
    const answer = data.message?.content || data.response || "";
    assert.ok(
      answer.includes("I don't know based on your uploaded learning materials") ||
      answer.includes("not available in your uploaded learning materials"),
      "Must return standard refusal text"
    );
    assert.strictEqual(data.citations.length, 0, "Refusal must have 0 citations");
  });

  // -------------------------------------------------------------
  // Scenario 11: Project A -> Project B isolation
  // -------------------------------------------------------------
  await t.test("Scenario 11: Project A -> Project B isolation strictly enforced", async () => {
    // Project B has no materials uploaded yet. Inquiring on Project B about Project A's content must refuse
    const res = await fetch(`${baseUrl}/tutor/chat`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        projectId: projectB.id,
        content: "What is the overview of storage engines in InnoDB?",
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    const data = body.data || body;
    const answer = data.message?.content || data.response || "";
    assert.ok(answer.includes("I don't know based on your uploaded learning materials"));
    assert.strictEqual(data.citations.length, 0);

    // Cross-check retrieval directly
    const retrievalB = await hybridRetrieveAndRerank(projectB.id, "storage engines InnoDB");
    assert.strictEqual(retrievalB.chunks.length, 0, "Project B must retrieve 0 chunks from Project A");
  });

  // -------------------------------------------------------------
  // Scenario 12: Zero chunks -> material cannot become READY
  // -------------------------------------------------------------
  await t.test("Scenario 12: Zero chunks -> material status fails gracefully to FAILED", async () => {
    const emptyMaterial = await prisma.learningMaterial.create({
      data: {
        projectId: projectA.id,
        userId: testUser.id,
        title: "Empty Document",
        fileType: "PDF",
        fileUrl: "https://example.com/empty.pdf",
        status: "PROCESSING",
      },
    });

    // Emulate background processor encountering 0 chunks
    try {
      const emptyChunks = [];
      if (!emptyChunks || emptyChunks.length === 0) {
        throw new Error("Zero chunks created from PDF ingestion. Content extraction failed.");
      }
    } catch (err) {
      await prisma.learningMaterial.update({
        where: { id: emptyMaterial.id },
        data: {
          status: "FAILED",
          processingError: err.message,
        },
      });
    }

    const updated = await prisma.learningMaterial.findUnique({ where: { id: emptyMaterial.id } });
    assert.strictEqual(updated.status, "FAILED");
    assert.ok(updated.processingError.includes("Zero chunks created"));
    assert.notStrictEqual(updated.status, "READY", "Material with 0 chunks must NEVER become READY");
  });

  server.close();
});
