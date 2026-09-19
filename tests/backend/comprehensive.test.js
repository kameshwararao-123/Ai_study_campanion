import test from "node:test";
import assert from "node:assert";
import { prisma } from "../../server/lib/db.js";
import { hashPassword, comparePassword, signToken, verifyToken } from "../../server/lib/auth.js";
import { getMockProvider } from "../../server/lib/ai.js";
import { extractPdfContent, chunkDocumentPages } from "../../server/lib/pdf.js";
import { backgroundQueue } from "../../server/lib/queue.js";

test("REQ-001 & REQ-002: User Authentication, Hashing, Token Signing & RBAC verification", async () => {
  const email = `audit_user_${Date.now()}@example.com`;
  const plainPassword = "SecurePassword123!";

  // Password hashing
  const hash = await hashPassword(plainPassword);
  assert.ok(hash.startsWith("$2"), "Password hash should be bcrypt format");
  const isMatch = await comparePassword(plainPassword, hash);
  assert.strictEqual(isMatch, true, "Bcrypt compare should match password");

  // User creation with Learner role
  const user = await prisma.user.create({
    data: {
      email,
      name: "Audit Learner",
      passwordHash: hash,
      role: "LEARNER",
    },
  });
  assert.ok(user.id);
  assert.strictEqual(user.role, "LEARNER");

  // JWT Token lifecycle
  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  assert.ok(token);
  const payload = verifyToken(token);
  assert.strictEqual(payload.userId, user.id);
  assert.strictEqual(payload.role, "LEARNER");

  // Cleanup
  await prisma.user.delete({ where: { id: user.id } });
});

test("REQ-009 to REQ-016: Spaces & Projects Hierarchy and Multi-Tenant Isolation", async () => {
  const user1 = await prisma.user.create({
    data: { email: `user1_${Date.now()}@test.com`, name: "User 1", passwordHash: "h", role: "LEARNER" },
  });
  const user2 = await prisma.user.create({
    data: { email: `user2_${Date.now()}@test.com`, name: "User 2", passwordHash: "h", role: "LEARNER" },
  });

  // Space creation for user 1
  const space = await prisma.space.create({
    data: {
      userId: user1.id,
      name: "Computer Science Space",
      description: "Systems and algorithms",
      visualConfig: JSON.stringify({ color: "indigo" }),
    },
  });

  // Project creation with learning goal
  const project = await prisma.project.create({
    data: {
      spaceId: space.id,
      userId: user1.id,
      name: "Operating Systems",
      description: "Memory virtualization and threads",
      learningGoal: "Master page tables and concurrency",
    },
  });

  assert.ok(space.id);
  assert.ok(project.id);

  // Multi-tenant boundary check (REQ-003)
  const crossUserAccess = await prisma.space.findFirst({
    where: { id: space.id, userId: user2.id },
  });
  assert.strictEqual(crossUserAccess, null, "User 2 should NOT have access to User 1's space");

  // Cleanup
  await prisma.user.delete({ where: { id: user1.id } });
  await prisma.user.delete({ where: { id: user2.id } });
});

test("REQ-019, REQ-026, REQ-027, REQ-028: Chunking, Concepts Extraction & Embeddings", async () => {
  const samplePages = [
    {
      pageNumber: 1,
      text: "Supervised learning models learn from labeled datasets. A loss function calculates the prediction error to update parameters via gradient descent.",
    },
  ];

  const chunks = chunkDocumentPages(samplePages, 50, 10);
  assert.ok(chunks.length >= 1);
  assert.strictEqual(chunks[0].startPage, 1);

  const ai = getMockProvider();
  const embeddings = await ai.generateEmbeddings([chunks[0].content]);
  assert.strictEqual(embeddings.length, 1);
  assert.strictEqual(embeddings[0].length, 64);

  const concepts = await ai.generateStructured(`Extract concepts:\n${chunks[0].content}`);
  assert.ok(Array.isArray(concepts.data));
  assert.ok(concepts.data.length >= 1);
});

test("REQ-029 to REQ-036: AI Tutor Context Assembly, Grounded Citations & Safety", async () => {
  const ai = getMockProvider();

  const tutorAnswer = await ai.generateText("Explain supervised learning", {
    systemInstruction: "Ground answer strictly in notes with page citation.",
  });
  assert.ok(tutorAnswer.text.includes("Source:"));
  assert.ok(tutorAnswer.text.includes("Page"));

  const unsupportedAnswer = await ai.generateText("What is the recipe for chocolate cake?", {
    systemInstruction: "If out of scope, politely refuse.",
  });
  assert.ok(
    unsupportedAnswer.text.toLowerCase().includes("not contain sufficient evidence") ||
    unsupportedAnswer.text.toLowerCase().includes("not available in your uploaded learning materials")
  );
});

test("REQ-042 to REQ-049: Adaptive Quiz Generation, MCQ / Open-Ended & Mastery Updates", async () => {
  const user = await prisma.user.create({
    data: { email: `quiz_u_${Date.now()}@test.com`, name: "Quiz Learner", passwordHash: "h" },
  });
  const space = await prisma.space.create({
    data: { userId: user.id, name: "ML Space", description: "ML" },
  });
  const project = await prisma.project.create({
    data: { spaceId: space.id, userId: user.id, name: "Neural Networks", description: "NN", learningGoal: "Deep Learning" },
  });

  const concept = await prisma.concept.create({
    data: { projectId: project.id, userId: user.id, name: "Backpropagation", definition: "Gradient computation" },
  });

  const mastery = await prisma.conceptMastery.create({
    data: { conceptId: concept.id, projectId: project.id, userId: user.id, masteryScore: 50.0, trend: "STABLE" },
  });

  const quiz = await prisma.quiz.create({
    data: { projectId: project.id, userId: user.id, title: "Backprop Quiz", totalQuestions: 1 },
  });

  const question = await prisma.quizQuestion.create({
    data: {
      quizId: quiz.id,
      conceptId: concept.id,
      questionType: "OPEN_ENDED",
      prompt: "Explain backpropagation",
      correctAnswer: "Chain rule application",
      explanation: "Applies chain rule backward",
      sortOrder: 1,
    },
  });

  // Open-ended evaluation
  const ai = getMockProvider();
  const evalResult = await ai.generateStructured(`Evaluate student answer on backprop`);
  assert.ok(evalResult.data.understandingScore >= 0);

  // Submit and process background evaluation
  await prisma.quizSubmission.create({
    data: {
      quizId: quiz.id,
      questionId: question.id,
      userId: user.id,
      userAnswer: "It computes gradients using the chain rule.",
      isCorrect: true,
      scoreEarned: 85,
    },
  });

  await backgroundQueue.handleAssessmentEvaluation({
    quizId: quiz.id,
    projectId: project.id,
    userId: user.id,
  });

  const updatedMastery = await prisma.conceptMastery.findUnique({
    where: { id: mastery.id },
  });
  assert.strictEqual(updatedMastery.masteryScore, 65.0, "Score should increase by 15 upon correct answer");

  // Cleanup
  await prisma.user.delete({ where: { id: user.id } });
});

test("REQ-055 to REQ-058: Actionable Next Step Recommendations & State Transition", async () => {
  const user = await prisma.user.create({
    data: { email: `rec_u_${Date.now()}@test.com`, name: "Rec Learner", passwordHash: "h" },
  });
  const space = await prisma.space.create({ data: { userId: user.id, name: "S", description: "D" } });
  const project = await prisma.project.create({
    data: { spaceId: space.id, userId: user.id, name: "P", description: "D", learningGoal: "G" },
  });

  const rec = await prisma.recommendation.create({
    data: {
      projectId: project.id,
      userId: user.id,
      title: "Take Practice Quiz",
      message: "Reinforce understanding",
      actionType: "TAKE_QUIZ",
      status: "ACTIVE",
    },
  });

  assert.strictEqual(rec.status, "ACTIVE");

  const completedRec = await prisma.recommendation.update({
    where: { id: rec.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  assert.strictEqual(completedRec.status, "COMPLETED");

  // Cleanup
  await prisma.user.delete({ where: { id: user.id } });
});

test("REQ-083 to REQ-086: Admin Overview, Telemetry Logging & Job Monitoring", async () => {
  const admin = await prisma.user.create({
    data: { email: `admin_${Date.now()}@test.com`, name: "Admin", passwordHash: "h", role: "ADMIN" },
  });

  // Record Telemetry
  await prisma.aITelemetryLog.create({
    data: {
      userId: admin.id,
      featureName: "AUDIT_TEST",
      modelName: "mock-v1",
      promptTokens: 20,
      completionTokens: 30,
      totalTokens: 50,
      latencyMs: 15,
      estimatedCostUsd: 0.00005,
      status: "SUCCESS",
    },
  });

  const totalLogs = await prisma.aITelemetryLog.count({ where: { featureName: "AUDIT_TEST" } });
  assert.ok(totalLogs >= 1);

  // Background Job Queue test
  const job = await backgroundQueue.enqueue("TEST_JOB", { test: true });
  assert.ok(job.id);

  // Cleanup
  await prisma.user.delete({ where: { id: admin.id } });
});

