import test from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../server/lib/db.js";
import { hashPassword, signToken } from "../../server/lib/auth.js";
import { backgroundQueue } from "../../server/lib/queue.js";
import { getMockProvider } from "../../server/lib/ai.js";

test("End-to-End User Learning Lifecycle & Data Flow Integration", async () => {
  const timestamp = Date.now();
  const testEmail = `e2e_learner_${timestamp}@example.com`;

  // 1. User Registration & Auth
  const passwordHash = await hashPassword("ValidPassword123!");
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      name: "E2E Student",
      passwordHash,
      role: "LEARNER",
    },
  });
  assert.ok(user.id);
  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  assert.ok(token);

  // 2. Space Creation
  const space = await prisma.space.create({
    data: {
      userId: user.id,
      name: "Distributed Computing",
      description: "Cloud architectures and consistency models",
      visualConfig: JSON.stringify({ color: "indigo" }),
    },
  });
  assert.ok(space.id);

  // 3. Project Creation
  const project = await prisma.project.create({
    data: {
      spaceId: space.id,
      userId: user.id,
      name: "Consensus Algorithms",
      description: "Raft, Paxos, and quorum consensus",
      learningGoal: "Understand leader election and log replication",
    },
  });
  assert.ok(project.id);

  // 4. Persistent Learner Context Initialization
  const learnerContext = await prisma.persistentLearnerContext.create({
    data: {
      projectId: project.id,
      userId: user.id,
      preferences: JSON.stringify({ learningStyle: "ANALYTICAL" }),
    },
  });
  assert.ok(learnerContext.id);

  // 5. Material Ingestion (Simulation with background queue & mock AI)
  const material = await prisma.learningMaterial.create({
    data: {
      projectId: project.id,
      userId: user.id,
      filename: "raft-consensus.pdf",
      fileUrl: "./uploads/test.pdf",
      fileSizeBytes: 102400,
      status: "QUEUED",
    },
  });
  assert.ok(material.id);

  // 6. Direct Chunk Creation & Concept Extraction
  const chunk1 = await prisma.documentChunk.create({
    data: {
      materialId: material.id,
      projectId: project.id,
      userId: user.id,
      chunkIndex: 0,
      startPage: 1,
      endPage: 1,
      content: "Raft is a consensus algorithm designed to be understandable. It decomposes consensus into leader election, log replication, and safety.",
      tokenCount: 25,
      embedding: JSON.stringify(new Array(64).fill(0.1)),
    },
  });
  const chunk2 = await prisma.documentChunk.create({
    data: {
      materialId: material.id,
      projectId: project.id,
      userId: user.id,
      chunkIndex: 1,
      startPage: 2,
      endPage: 2,
      content: "Leader election in Raft utilizes randomized election timeouts to prevent split votes across candidate nodes.",
      tokenCount: 20,
      embedding: JSON.stringify(new Array(64).fill(0.2)),
    },
  });
  assert.ok(chunk1.id);
  assert.ok(chunk2.id);

  // Mark material ready
  await prisma.learningMaterial.update({
    where: { id: material.id },
    data: { status: "READY", pageCount: 2 },
  });

  // 7. Core Concept Extraction & Baseline Mastery Initial State
  const concept = await prisma.concept.create({
    data: {
      projectId: project.id,
      userId: user.id,
      name: "Leader Election",
      definition: "Process of selecting a coordinator node using randomized election timers",
      sourceMaterialId: material.id,
      sourcePage: 2,
      importanceScore: 0.9,
    },
  });
  assert.ok(concept.id);

  const mastery = await prisma.conceptMastery.create({
    data: {
      conceptId: concept.id,
      projectId: project.id,
      userId: user.id,
      masteryScore: 40.0,
      confidenceScore: 0.5,
      trend: "REQUIRING_ATTENTION",
    },
  });
  assert.strictEqual(mastery.masteryScore, 40.0);
  assert.strictEqual(mastery.trend, "REQUIRING_ATTENTION");

  // 8. AI Tutor Interaction (Session, User Message, Grounded Response, Telemetry)
  const session = await prisma.tutorSession.create({
    data: {
      projectId: project.id,
      userId: user.id,
      title: "Raft leader election overview",
    },
  });

  const ai = getMockProvider();
  const tutorRes = await ai.generateText("Explain supervised learning"); // uses mock grounded response
  assert.ok(tutorRes.text.includes("Source:"));

  const userMessage = await prisma.tutorMessage.create({
    data: {
      sessionId: session.id,
      projectId: project.id,
      userId: user.id,
      sender: "USER",
      content: "How does leader election work?",
      mode: "NORMAL",
    },
  });

  const assistantMessage = await prisma.tutorMessage.create({
    data: {
      sessionId: session.id,
      projectId: project.id,
      userId: user.id,
      sender: "ASSISTANT",
      content: tutorRes.text,
      mode: "NORMAL",
      citations: JSON.stringify([
        {
          documentTitle: material.filename,
          pageNumber: 2,
          chunkId: chunk2.id,
          excerpt: chunk2.content.substring(0, 100),
        },
      ]),
    },
  });
  assert.ok(userMessage.id);
  assert.ok(assistantMessage.id);

  // Telemetry Log
  const telemetry = await prisma.aITelemetryLog.create({
    data: {
      userId: user.id,
      projectId: project.id,
      featureName: "TUTOR_CHAT",
      modelName: tutorRes.model,
      promptTokens: tutorRes.promptTokens,
      completionTokens: tutorRes.completionTokens,
      totalTokens: tutorRes.totalTokens,
      latencyMs: tutorRes.latencyMs,
      estimatedCostUsd: tutorRes.estimatedCostUsd,
      status: "SUCCESS",
    },
  });
  assert.ok(telemetry.id);

  // 9. Adaptive Quiz Flow & Submissions
  const quiz = await prisma.quiz.create({
    data: {
      projectId: project.id,
      userId: user.id,
      title: "Raft Assessment",
      totalQuestions: 2,
      status: "IN_PROGRESS",
    },
  });

  const q1 = await prisma.quizQuestion.create({
    data: {
      quizId: quiz.id,
      conceptId: concept.id,
      questionType: "MCQ",
      prompt: "What mechanism avoids split votes in Raft?",
      options: JSON.stringify(["Randomized election timeouts", "Round robin", "Manual intervention"]),
      correctAnswer: "Randomized election timeouts",
      explanation: "Randomized election timeouts stagger candidate terms and prevent simultaneous votes.",
      sortOrder: 1,
    },
  });

  const q2 = await prisma.quizQuestion.create({
    data: {
      quizId: quiz.id,
      conceptId: concept.id,
      questionType: "OPEN_ENDED",
      prompt: "Explain why consensus requires a quorum.",
      correctAnswer: "A quorum prevents split brain and ensures at least one node has the latest log entry.",
      explanation: "A majority quorum guarantees intersection with any previously committed quorum.",
      sortOrder: 2,
    },
  });

  // User submits quiz answers
  await prisma.quizSubmission.create({
    data: {
      quizId: quiz.id,
      questionId: q1.id,
      userId: user.id,
      userAnswer: "Randomized election timeouts",
      isCorrect: true,
      scoreEarned: 100,
    },
  });

  await prisma.quizSubmission.create({
    data: {
      quizId: quiz.id,
      questionId: q2.id,
      userId: user.id,
      userAnswer: "A quorum guarantees overlapping majorities to prevent split brain.",
      isCorrect: true,
      scoreEarned: 90,
      evalFeedback: JSON.stringify({ understanding: "Excellent explanation of quorum overlap" }),
    },
  });

  // Process Quiz completion & Mastery Update via BackgroundQueue
  await backgroundQueue.handleAssessmentEvaluation({
    quizId: quiz.id,
    projectId: project.id,
    userId: user.id,
  });

  // Verify Quiz status updated
  const completedQuiz = await prisma.quiz.findUnique({ where: { id: quiz.id } });
  assert.strictEqual(completedQuiz.status, "COMPLETED");
  assert.strictEqual(completedQuiz.score, 100);

  // Verify Concept Mastery increased from 40.0 to 55.0 or 70.0 (delta +15 per correct submission)
  const updatedMastery = await prisma.conceptMastery.findFirst({
    where: { conceptId: concept.id, userId: user.id },
  });
  assert.ok(updatedMastery.masteryScore > 40.0, "Mastery score should increase after correct assessment");

  // 10. Recommendations Generated
  const recommendations = await prisma.recommendation.findMany({
    where: { projectId: project.id, userId: user.id },
  });
  assert.ok(recommendations.length >= 1, "Targeted recommendation should be created");

  // 11. Complete Action on Recommendation
  const recToComplete = recommendations[0];
  const updatedRec = await prisma.recommendation.update({
    where: { id: recToComplete.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  assert.strictEqual(updatedRec.status, "COMPLETED");

  // 12. Cleanup
  await prisma.user.delete({ where: { id: user.id } });
});
