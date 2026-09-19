process.env.NODE_ENV = "test";
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../../server/index.js";
import { prisma, connectDB } from "../../server/lib/db.js";
import { signToken } from "../../server/lib/auth.js";

const REFUSAL_TEXT =
  "I don't know based on your uploaded learning materials. This information is not available in your uploaded learning materials.";

test("AI Tutor Evaluation Suite: 8 Required Verification Tests (A-H)", async (t) => {
  await connectDB();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/tutor`;

  const timestamp = Date.now();
  const testUser = await prisma.user.create({
    data: {
      email: `tutor_eval_${timestamp}@example.com`,
      name: "Evaluation Tester",
      passwordHash: "dummyhash",
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
      name: "Computer Science",
      description: "CS & AI Studies",
    },
  });

  // Project A: Machine Learning
  const projectA = await prisma.project.create({
    data: {
      spaceId: space.id,
      name: "Machine Learning Basics",
      description: "Supervised and Unsupervised Learning notes",
      userId: testUser.id,
    },
  });

  // Project B: Web Architecture (Isolated)
  const projectB = await prisma.project.create({
    data: {
      spaceId: space.id,
      name: "Web Architecture",
      description: "HTTP, REST APIs and Microservices",
      userId: testUser.id,
    },
  });

  const materialA = await prisma.learningMaterial.create({
    data: {
      title: "ML_Foundations.pdf",
      filename: "ML_Foundations.pdf",
      fileUrl: "/uploads/ML_Foundations.pdf",
      fileType: "application/pdf",
      fileSize: 1048576,
      status: "READY",
      extractedText: "Supervised learning overview",
      userId: testUser.id,
      projectId: projectA.id,
    },
  });

  // Chunk 1: Page 1 - Supervised Learning & Labeled Data
  const chunkP1 = await prisma.documentChunk.create({
    data: {
      materialId: materialA.id,
      projectId: projectA.id,
      userId: testUser.id,
      chunkIndex: 0,
      startPage: 1,
      endPage: 1,
      contentType: "TEXT",
      content:
        "Supervised learning is a machine learning paradigm where an algorithm is trained on labeled input-output pairs (x, y) to learn a general mapping function. Training data provides ground-truth pairs to optimize model parameters.",
      tokenCount: 45,
      metadata: JSON.stringify({ contentType: "TEXT", page: 1, sectionTitle: "1. Supervised Learning" }),
      structuredData: JSON.stringify({ pageNumber: 1, wordCount: 35 }),
      sourceMetadata: JSON.stringify({
        projectId: projectA.id,
        filename: "ML_Foundations.pdf",
        pageNumber: 1,
      }),
    },
  });

  // Chunk 2: Page 2 - Classification vs Regression
  const chunkP2 = await prisma.documentChunk.create({
    data: {
      materialId: materialA.id,
      projectId: projectA.id,
      userId: testUser.id,
      chunkIndex: 1,
      startPage: 2,
      endPage: 2,
      contentType: "TEXT",
      content:
        "Supervised tasks are divided into classification and regression. Classification maps inputs to discrete categorical labels (e.g. spam detection). Regression predicts continuous numerical outcomes (e.g. house prices).",
      tokenCount: 40,
      metadata: JSON.stringify({ contentType: "TEXT", page: 2, sectionTitle: "2. Task Types" }),
      structuredData: JSON.stringify({ pageNumber: 2, wordCount: 30 }),
      sourceMetadata: JSON.stringify({
        projectId: projectA.id,
        filename: "ML_Foundations.pdf",
        pageNumber: 2,
      }),
    },
  });

  // Chunk 3: Page 3 - Gradient Descent
  const chunkP3 = await prisma.documentChunk.create({
    data: {
      materialId: materialA.id,
      projectId: projectA.id,
      userId: testUser.id,
      chunkIndex: 2,
      startPage: 3,
      endPage: 3,
      contentType: "TEXT",
      content:
        "Gradient descent is an iterative first-order optimization algorithm for finding a local minimum of a differentiable objective function. The primary limitations of gradient descent include extreme sensitivity to learning rates and potential convergence to suboptimal local minima.",
      tokenCount: 42,
      metadata: JSON.stringify({ contentType: "TEXT", page: 3, sectionTitle: "3. Optimization" }),
      structuredData: JSON.stringify({ pageNumber: 3, wordCount: 35 }),
      sourceMetadata: JSON.stringify({
        projectId: projectA.id,
        filename: "ML_Foundations.pdf",
        pageNumber: 3,
      }),
    },
  });

  // Helper for requests
  async function askTutor(body) {
    const res = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(body),
    });
    return await res.json();
  }

  // =========================================================================
  // TEST A: Direct question
  // =========================================================================
  await t.test("Test A: Direct question - answers accurately and cites correctly", async () => {
    const res = await askTutor({
      projectId: projectA.id,
      content: "What is supervised learning?",
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.data.message.content.length > 20);
    assert.ok(!res.data.message.content.includes(REFUSAL_TEXT));
    assert.strictEqual(res.data.evidenceDecision, "STRONG");
    assert.ok(res.data.citations.length >= 1);
    assert.strictEqual(res.data.citations[0].pageNumber, 1);
    assert.strictEqual(res.data.citations[0].documentTitle, "ML_Foundations.pdf");
  });

  // =========================================================================
  // TEST B: Paraphrased question
  // =========================================================================
  await t.test("Test B: Paraphrased question - succeeds without false refusal", async () => {
    const res = await askTutor({
      projectId: projectA.id,
      content: "What type of data is required for supervised learning?",
    });

    assert.strictEqual(res.success, true);
    assert.ok(!res.data.message.content.includes(REFUSAL_TEXT));
    assert.ok(
      res.data.message.content.toLowerCase().includes("labeled") ||
      res.data.message.content.toLowerCase().includes("data")
    );
    assert.ok(res.data.citations.length >= 1);
    assert.strictEqual(res.data.citations[0].pageNumber, 1);
  });

  // =========================================================================
  // TEST C: Follow-up question
  // =========================================================================
  await t.test("Test C: Follow-up question - resolves context without history hallucination", async () => {
    // 1. Initial query
    const sessionRes = await askTutor({
      projectId: projectA.id,
      content: "What is supervised learning?",
    });
    assert.strictEqual(sessionRes.success, true);
    const sessionId = sessionRes.data.sessionId;

    // 2. Follow-up query using pronoun "it"
    const followUpRes = await askTutor({
      projectId: projectA.id,
      sessionId,
      content: "Why is it important?",
    });

    assert.strictEqual(followUpRes.success, true);
    assert.ok(!followUpRes.data.message.content.includes(REFUSAL_TEXT));
    assert.ok(followUpRes.data.citations.length >= 1);
    assert.strictEqual(followUpRes.data.citations[0].pageNumber, 1);
  });

  // =========================================================================
  // TEST D: Out-of-material question
  // =========================================================================
  await t.test("Test D: Out-of-material question - strictly refuses without hallucinating", async () => {
    const res = await askTutor({
      projectId: projectA.id,
      content: "What is the capital of Japan?",
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.message.content, REFUSAL_TEXT);
    assert.strictEqual(res.data.evidenceDecision, "INSUFFICIENT");
    assert.strictEqual(res.data.citations.length, 0);
  });

  // =========================================================================
  // TEST E: Partially supported question
  // =========================================================================
  await t.test("Test E: Partially supported question - identifies missing topic and tags PARTIAL", async () => {
    try {
      const res = await askTutor({
        projectId: projectA.id,
        content: "Can you explain supervised learning and reinforcement learning?",
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data.evidenceDecision, "PARTIAL");
      assert.ok(res.data.message.content.length > 20);
      assert.ok(res.data.citations.length >= 1);
      assert.strictEqual(res.data.citations[0].pageNumber, 1);
    } catch (err) {
      console.error("TEST E ASSERTION ERROR:", err);
      throw err;
    }
  });

  // =========================================================================
  // TEST F: Wrong project isolation
  // =========================================================================
  await t.test("Test F: Wrong project isolation - strictly prevents cross-project leakage", async () => {
    const res = await askTutor({
      projectId: projectB.id,
      content: "What is supervised learning?",
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.message.content, REFUSAL_TEXT);
    assert.strictEqual(res.data.evidenceDecision, "INSUFFICIENT");
    assert.strictEqual(res.data.citations.length, 0);
  });

  // =========================================================================
  // TEST G: Citation validation
  // =========================================================================
  await t.test("Test G: Citation validation - all citations correspond to real verified chunks", async () => {
    const res = await askTutor({
      projectId: projectA.id,
      content: "Explain classification vs regression tasks.",
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.data.citations.length >= 1);

    for (const cit of res.data.citations) {
      assert.ok(cit.chunkId, "Citation must have a chunkId");
      assert.ok(cit.documentTitle, "Citation must have a documentTitle");
      assert.ok(typeof cit.pageNumber === "number", "Citation must have numeric pageNumber");

      // Verify in DB that chunk exists in this project
      const chunkInDb = await prisma.documentChunk.findUnique({
        where: { id: cit.chunkId },
      });
      assert.ok(chunkInDb, "Cited chunk must exist in DB");
      assert.strictEqual(chunkInDb.projectId, projectA.id, "Cited chunk must belong to Project A");
      assert.strictEqual(chunkInDb.startPage, cit.pageNumber);
    }
  });

  // =========================================================================
  // TEST H: Hallucination test
  // =========================================================================
  await t.test("Test H: Hallucination test - does not manufacture ungrounded claims", async () => {
    const res = await askTutor({
      projectId: projectA.id,
      content: "What is quantum machine learning and qubit optimization in this course?",
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.message.content, REFUSAL_TEXT);
    assert.strictEqual(res.data.citations.length, 0);
  });
  // Teardown
  server.close();
});
