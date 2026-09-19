process.env.NODE_ENV = "test";
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../../server/index.js";
import { prisma, connectDB } from "../../server/lib/db.js";
import { signToken } from "../../server/lib/auth.js";

test("Phase 14: Comprehensive True Multimodal RAG Suite (Tests 1 through 11)", async (t) => {
  await connectDB();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/tutor`;

  const timestamp = Date.now();
  const testUser = await prisma.user.create({
    data: {
      email: `multimodal_eval_${timestamp}@example.com`,
      name: "Multimodal Tester",
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
      name: "Computer Science & Engineering",
      description: "Algorithms, Machine Learning and Cloud Architecture",
    },
  });

  // Project A: Algorithms & Machine Learning
  const projectA = await prisma.project.create({
    data: {
      spaceId: space.id,
      name: "Algorithms & Systems",
      description: "Core algorithms, data structures, and ML foundations",
      userId: testUser.id,
    },
  });

  // Project B: Cloud Computing (Isolated)
  const projectB = await prisma.project.create({
    data: {
      spaceId: space.id,
      name: "Cloud Computing",
      description: "Distributed networks and cloud infrastructure",
      userId: testUser.id,
    },
  });

  // Material for Project A
  const materialA = await prisma.learningMaterial.create({
    data: {
      projectId: projectA.id,
      userId: testUser.id,
      filename: "Algorithms_and_ML.pdf",
      fileUrl: "/uploads/Algorithms_and_ML.pdf",
      fileSizeBytes: 204800,
      fileHash: `hash_multimodal_${timestamp}`,
      status: "READY",
      pageCount: 15,
    },
  });

  // Material for Project B
  const materialB = await prisma.learningMaterial.create({
    data: {
      projectId: projectB.id,
      userId: testUser.id,
      filename: "Cloud_Networking.pdf",
      fileUrl: "/uploads/Cloud_Networking.pdf",
      fileSizeBytes: 102400,
      fileHash: `hash_cloud_${timestamp}`,
      status: "READY",
      pageCount: 5,
    },
  });

  // Chunks for Project A:
  // 1. Text chunk: Supervised learning uses labeled training data
  const chunkText = await prisma.documentChunk.create({
    data: {
      materialId: materialA.id,
      projectId: projectA.id,
      userId: testUser.id,
      chunkIndex: 0,
      startPage: 1,
      endPage: 1,
      contentType: "TEXT",
      content:
        "Supervised learning uses labeled training data consisting of input-output pairs to optimize internal model parameters and learn predictive mapping functions.",
      tokenCount: 25,
      metadata: JSON.stringify({ contentType: "TEXT", page: 1, sectionTitle: "1. Supervised Learning" }),
      structuredData: JSON.stringify({ pageNumber: 1, wordCount: 22 }),
      sourceMetadata: JSON.stringify({ projectId: projectA.id, filename: "Algorithms_and_ML.pdf", pageNumber: 1 }),
    },
  });

  // 2. Table chunk: Algorithm complexities (BFS, DFS)
  const chunkTable = await prisma.documentChunk.create({
    data: {
      materialId: materialA.id,
      projectId: projectA.id,
      userId: testUser.id,
      chunkIndex: 1,
      startPage: 15,
      endPage: 15,
      contentType: "TABLE",
      content:
        "### Table: Table 3 (Page 15)\n| Algorithm | Time Complexity | Space Complexity |\n| --- | --- | --- |\n| BFS | O(V+E) | O(V) |\n| DFS | O(V+E) | O(V) |\n\nStructured Table Records:\nAlgorithm: BFS, Time Complexity: O(V+E), Space Complexity: O(V)\nAlgorithm: DFS, Time Complexity: O(V+E), Space Complexity: O(V)",
      tokenCount: 65,
      metadata: JSON.stringify({ contentType: "TABLE", tableId: "Table 3", page: 15 }),
      structuredData: JSON.stringify({
        tableId: "Table 3",
        pageNumber: 15,
        headers: ["Algorithm", "Time Complexity", "Space Complexity"],
        rows: [
          ["BFS", "O(V+E)", "O(V)"],
          ["DFS", "O(V+E)", "O(V)"],
        ],
      }),
      sourceMetadata: JSON.stringify({ projectId: projectA.id, filename: "Algorithms_and_ML.pdf", pageNumber: 15, tableId: "Table 3" }),
    },
  });

  // 3. Diagram chunk: Architecture diagram with components (Client -> API Gateway -> Server -> Database)
  const chunkDiagram = await prisma.documentChunk.create({
    data: {
      materialId: materialA.id,
      projectId: projectA.id,
      userId: testUser.id,
      chunkIndex: 2,
      startPage: 7,
      endPage: 7,
      contentType: "DIAGRAM",
      content:
        "[Diagram on Page 7]: Architecture diagram depicting Client, API Gateway, Server, and Database components with directional flow arrows.\nContext: System Architecture Flow",
      tokenCount: 40,
      metadata: JSON.stringify({ contentType: "DIAGRAM", diagramId: "Figure 2", page: 7 }),
      structuredData: JSON.stringify({
        diagramId: "Figure 2",
        pageNumber: 7,
        visualDescription: "Architecture diagram showing Client, API Gateway, Server, and Database components with directional flow arrows.",
        originalDiagram: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
      }),
      sourceMetadata: JSON.stringify({ projectId: projectA.id, filename: "Algorithms_and_ML.pdf", pageNumber: 7, diagramId: "Figure 2" }),
    },
  });

  // 4. Image chunk with visible labels
  const chunkImage = await prisma.documentChunk.create({
    data: {
      materialId: materialA.id,
      projectId: projectA.id,
      userId: testUser.id,
      chunkIndex: 3,
      startPage: 12,
      endPage: 12,
      contentType: "IMAGE",
      content:
        "[Image on Page 12]: Neural network diagram figure with visible labels: Input Layer, Feature Extractor, Decision Boundary, and Classification Output.",
      tokenCount: 35,
      metadata: JSON.stringify({ contentType: "IMAGE", imageId: "Figure 5", page: 12 }),
      structuredData: JSON.stringify({
        imageId: "Figure 5",
        pageNumber: 12,
        visualDescription: "Figure depicting Input Layer, Feature Extractor, Decision Boundary, and Classification Output.",
        originalImage: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
      }),
      sourceMetadata: JSON.stringify({ projectId: projectA.id, filename: "Algorithms_and_ML.pdf", pageNumber: 12, imageId: "Figure 5" }),
    },
  });

  // 5. OCR Scanned Page chunk
  const chunkOcr = await prisma.documentChunk.create({
    data: {
      materialId: materialA.id,
      projectId: projectA.id,
      userId: testUser.id,
      chunkIndex: 4,
      startPage: 9,
      endPage: 9,
      contentType: "OCR",
      content:
        "[OCR Extracted]: Handwritten lecture notes from Page 9. Gradient descent iteratively updates model weights in the opposite direction of the gradient to minimize the empirical cost function.",
      tokenCount: 38,
      metadata: JSON.stringify({ contentType: "OCR", page: 9, isOcr: true, ocrConfidence: 94.5 }),
      structuredData: JSON.stringify({
        pageNumber: 9,
        ocrText: "Gradient descent iteratively updates model weights in the opposite direction of the gradient to minimize the empirical cost function.",
        ocrConfidence: 94.5,
      }),
      sourceMetadata: JSON.stringify({ projectId: projectA.id, filename: "Algorithms_and_ML.pdf", pageNumber: 9, ocrConfidence: 94.5 }),
    },
  });

  // Helper to query Tutor
  async function queryTutor(payload) {
    const res = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) {
      console.error("queryTutor error response:", json);
    }
    return json;
  }

  // =========================================================================
  // TEST 1 — TEXT
  // =========================================================================
  await t.test("TEST 1 — TEXT: Answers 'What does supervised learning use?' grounded in PDF text", async () => {
    const res = await queryTutor({
      projectId: projectA.id,
      content: "What does supervised learning use?",
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.data.message.content.toLowerCase().includes("labeled"));
    assert.ok(res.data.message.content.toLowerCase().includes("training data"));
    assert.ok(res.data.citations.length >= 1);
    assert.strictEqual(res.data.citations[0].contentType, "TEXT");
    assert.strictEqual(res.data.citations[0].pageNumber, 1);
  });

  // =========================================================================
  // TEST 2 — TABLE
  // =========================================================================
  await t.test("TEST 2 — TABLE: Answers 'What is the complexity of BFS?' with O(V+E) from table", async () => {
    const res = await queryTutor({
      projectId: projectA.id,
      content: "What is the complexity of BFS?",
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.data.message.content.includes("O(V+E)") || res.data.message.content.includes("O(V + E)"));
    assert.ok(res.data.citations.length >= 1);
    const tableCitation = res.data.citations.find((c) => c.contentType === "TABLE");
    assert.ok(tableCitation, "Should contain a TABLE citation");
    assert.strictEqual(tableCitation.pageNumber, 15);
  });

  // =========================================================================
  // TEST 3 — IMAGE / DIAGRAM
  // =========================================================================
  await t.test("TEST 3 — IMAGE: Answers 'What components are shown in the architecture diagram?'", async () => {
    const res = await queryTutor({
      projectId: projectA.id,
      content: "What components are shown in the architecture diagram?",
    });

    assert.strictEqual(res.success, true);
    const content = res.data.message.content.toLowerCase();
    assert.ok(content.includes("client") || content.includes("gateway") || content.includes("server") || content.includes("database"));
    assert.ok(res.data.citations.length >= 1);
    const diagCitation = res.data.citations.find((c) => c.contentType === "DIAGRAM" || c.contentType === "IMAGE");
    assert.ok(diagCitation, "Should cite visual evidence");
    assert.strictEqual(diagCitation.pageNumber, 7);
  });

  // =========================================================================
  // TEST 4 — IMAGE TEXT / LABELS
  // =========================================================================
  await t.test("TEST 4 — IMAGE TEXT: Answers 'What labels are shown in the figure?'", async () => {
    const res = await queryTutor({
      projectId: projectA.id,
      content: "What labels are shown in the figure?",
    });

    assert.strictEqual(res.success, true);
    const content = res.data.message.content.toLowerCase();
    assert.ok(content.includes("input") || content.includes("boundary") || content.includes("extractor") || content.includes("classification"));
    assert.ok(res.data.citations.length >= 1);
  });

  // =========================================================================
  // TEST 5 — SCANNED PDF / OCR
  // =========================================================================
  await t.test("TEST 5 — SCANNED PDF: Answers question about content on the scanned page using OCR", async () => {
    const res = await queryTutor({
      projectId: projectA.id,
      content: "What do the scanned notes say about gradient descent?",
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.data.message.content.toLowerCase().includes("gradient descent"));
    assert.ok(res.data.citations.length >= 1);
    const ocrCitation = res.data.citations.find((c) => c.contentType === "OCR");
    assert.ok(ocrCitation, "Should cite OCR evidence");
    assert.strictEqual(ocrCitation.pageNumber, 9);
    assert.ok(ocrCitation.ocrConfidence >= 90);
  });

  // =========================================================================
  // TEST 6 — CROSS-MODAL
  // =========================================================================
  await t.test("TEST 6 — CROSS-MODAL: Synthesizes information across multiple modalities", async () => {
    const res = await queryTutor({
      projectId: projectA.id,
      content: "Can you combine what the text and table say about machine learning accuracy?",
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.data.message.content.length > 20);
    assert.ok(res.data.citations.length >= 1);
  });

  // =========================================================================
  // TEST 7 — UNSUPPORTED QUESTION (NVIDIA Stock Price)
  // =========================================================================
  await t.test("TEST 7 — UNSUPPORTED: 'What is the current stock price of NVIDIA?' strictly refuses", async () => {
    const res = await queryTutor({
      projectId: projectA.id,
      content: "What is the current stock price of NVIDIA?",
    });

    assert.strictEqual(res.success, true);
    assert.ok(
      res.data.message.content.includes("I don't know based on") ||
      res.data.message.content.includes("not available in your uploaded learning materials")
    );
    assert.strictEqual(res.data.evidenceDecision, "INSUFFICIENT");
    assert.strictEqual(res.data.citations.length, 0);
  });

  // =========================================================================
  // TEST 8 — UNRELATED KNOWLEDGE (President of US)
  // =========================================================================
  await t.test("TEST 8 — UNRELATED KNOWLEDGE: 'Who is the president of the United States?' strictly refuses", async () => {
    const res = await queryTutor({
      projectId: projectA.id,
      content: "Who is the president of the United States?",
    });

    assert.strictEqual(res.success, true);
    assert.ok(
      res.data.message.content.includes("I don't know based on") ||
      res.data.message.content.includes("not available in your uploaded learning materials")
    );
    assert.strictEqual(res.data.evidenceDecision, "INSUFFICIENT");
    assert.strictEqual(res.data.citations.length, 0);
  });

  // =========================================================================
  // TEST 9 — PROJECT ISOLATION
  // =========================================================================
  await t.test("TEST 9 — PROJECT ISOLATION: Asking Project B about ML returns 0 Project A evidence", async () => {
    const res = await queryTutor({
      projectId: projectB.id,
      content: "What is supervised learning and labeled data?",
    });

    assert.strictEqual(res.success, true);
    // Project B has no ML materials
    assert.strictEqual(res.data.evidenceDecision, "INSUFFICIENT");
    assert.strictEqual(res.data.citations.length, 0);
  });

  // =========================================================================
  // TEST 10 — CITATIONS VALIDATION
  // =========================================================================
  await t.test("TEST 10 — CITATIONS: Every grounded answer retains real source and page metadata", async () => {
    const res = await queryTutor({
      projectId: projectA.id,
      content: "Explain supervised learning",
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.data.citations.length > 0);
    for (const cit of res.data.citations) {
      assert.ok(cit.documentTitle === "Algorithms_and_ML.pdf");
      assert.ok(cit.pageNumber >= 1);
      assert.ok(["TEXT", "TABLE", "IMAGE", "DIAGRAM", "OCR", "CHART"].includes(cit.contentType));
    }
  });

  // =========================================================================
  // TEST 11 — HALLUCINATION PREVENTION
  // =========================================================================
  await t.test("TEST 11 — HALLUCINATION: Questions close to material with unsupported details strictly refuse", async () => {
    const res = await queryTutor({
      projectId: projectA.id,
      content: "What is quantum machine learning and qubit optimization in this course?",
    });

    assert.strictEqual(res.success, true);
    assert.ok(
      res.data.message.content.includes("I don't know based on") ||
      res.data.message.content.includes("not available in your uploaded learning materials")
    );
    assert.strictEqual(res.data.citations.length, 0);
  });

  server.close();
});
