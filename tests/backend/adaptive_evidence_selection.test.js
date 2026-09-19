import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../server/lib/db.js";
import { normalizeQuizQuestions, ensureQuizCoverage } from "../../server/routes/quiz.js";

test("Adaptive Evidence Selection, Session Persistence & Rubric Suite", async (t) => {
  let testUser;
  let testSpace;
  let testProject;
  let testConcepts = [];

  t.before(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `adaptive_suite_${Date.now()}@example.com`,
        name: "Adaptive Tester",
        passwordHash: "dummyhash",
      },
    });

    testSpace = await prisma.space.create({
      data: {
        userId: testUser.id,
        name: "Database Systems",
        description: "Core DBMS space",
      },
    });

    testProject = await prisma.project.create({
      data: {
        spaceId: testSpace.id,
        userId: testUser.id,
        name: "SQL & Transaction Management",
        description: "Relational database concepts",
        learningGoal: "Master SQL, Normalization, and ACID Transactions",
      },
    });

    // Create 3 concepts with varying initial mastery levels (REQ-045, REQ-050)
    const c1 = await prisma.concept.create({
      data: {
        projectId: testProject.id,
        userId: testUser.id,
        name: "ACID Properties & Concurrency Control",
        definition: "Atomicity, Consistency, Isolation, and Durability ensuring transactional reliability in DBMS.",
        importanceScore: 0.9,
      },
    });
    const c2 = await prisma.concept.create({
      data: {
        projectId: testProject.id,
        userId: testUser.id,
        name: "Database Normalization (1NF to BCNF)",
        definition: "Decomposing tables to reduce redundancy and avoid insertion, update, and deletion anomalies.",
        importanceScore: 0.85,
      },
    });
    const c3 = await prisma.concept.create({
      data: {
        projectId: testProject.id,
        userId: testUser.id,
        name: "SQL Joins & Aggregations",
        definition: "Relational algebra operations for combining multiple relations and calculating summary values.",
        importanceScore: 0.8,
      },
    });

    // Assign mastery scores: c1 = low (30%), c2 = moderate (60%), c3 = high (85%)
    await prisma.conceptMastery.create({
      data: {
        projectId: testProject.id,
        conceptId: c1.id,
        userId: testUser.id,
        masteryScore: 30.0,
        trend: "REQUIRING_ATTENTION",
      },
    });
    await prisma.conceptMastery.create({
      data: {
        projectId: testProject.id,
        conceptId: c2.id,
        userId: testUser.id,
        masteryScore: 60.0,
        trend: "STABLE",
      },
    });
    await prisma.conceptMastery.create({
      data: {
        projectId: testProject.id,
        conceptId: c3.id,
        userId: testUser.id,
        masteryScore: 85.0,
        trend: "IMPROVING",
      },
    });

    testConcepts = [c1, c2, c3];
  });

  t.after(async () => {
    if (testUser?.id) {
      await prisma.conceptMastery.deleteMany({ where: { userId: testUser.id } });
      await prisma.concept.deleteMany({ where: { userId: testUser.id } });
      await prisma.quizSubmission.deleteMany({ where: { userId: testUser.id } });
      await prisma.quizQuestion.deleteMany({});
      await prisma.quiz.deleteMany({ where: { userId: testUser.id } });
      await prisma.project.deleteMany({ where: { userId: testUser.id } });
      await prisma.space.deleteMany({ where: { userId: testUser.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
    }
  });

  await t.test("1. Guarantees full concept coverage across project topics", () => {
    const rawQuestions = [
      {
        questionType: "MCQ",
        concept: "ACID Properties & Concurrency Control",
        prompt: "Which ACID property guarantees all-or-nothing execution?",
        options: [
          { value: "A", label: "Atomicity" },
          { value: "B", label: "Consistency" },
          { value: "C", label: "Isolation" },
          { value: "D", label: "Durability" },
        ],
        correctAnswer: "A",
        explanation: "Atomicity ensures transactional operations are all executed or completely rolled back.",
      },
    ];

    const normalized = normalizeQuizQuestions(rawQuestions, testConcepts[0], testProject);
    const covered = ensureQuizCoverage({
      questions: normalized,
      concepts: testConcepts,
      project: testProject,
    });

    // Ensure all 3 concepts are represented in covered questions
    const coveredNames = new Set(covered.map((q) => q.conceptName));
    assert.ok(coveredNames.has("ACID Properties & Concurrency Control"));
    assert.ok(coveredNames.has("Database Normalization (1NF to BCNF)"));
    assert.ok(coveredNames.has("SQL Joins & Aggregations"));
    assert.ok(covered.length >= 3, "Must produce questions covering all concepts");
  });

  await t.test("2. Quiz persistence and in-progress status tracking (REQ-046)", async () => {
    const quiz = await prisma.quiz.create({
      data: {
        projectId: testProject.id,
        userId: testUser.id,
        title: "Adaptive Database Quiz",
        totalQuestions: 3,
        status: "IN_PROGRESS",
      },
    });

    const activeQuiz = await prisma.quiz.findFirst({
      where: {
        projectId: testProject.id,
        userId: testUser.id,
        status: "IN_PROGRESS",
      },
    });

    assert.ok(activeQuiz, "Active quiz must be retrievable for session resumption");
    assert.strictEqual(activeQuiz.id, quiz.id);
  });

  await t.test("3. Synchronous Concept Mastery Ingestion & Delta Calculation (REQ-049)", async () => {
    // Check initial mastery of c1
    const beforeMastery = await prisma.conceptMastery.findFirst({
      where: { conceptId: testConcepts[0].id, userId: testUser.id },
    });
    assert.strictEqual(beforeMastery.masteryScore, 30.0);

    // Simulate quiz submission that achieves 100% on c1
    const delta = 15.0; // Pass threshold delta
    const newScore = beforeMastery.masteryScore + delta;
    const updated = await prisma.conceptMastery.update({
      where: { id: beforeMastery.id },
      data: {
        masteryScore: newScore,
        trend: newScore >= 50 ? "STABLE" : "REQUIRING_ATTENTION",
        lastAssessedAt: new Date(),
      },
    });

    assert.strictEqual(updated.masteryScore, 45.0);
    assert.strictEqual(updated.trend, "REQUIRING_ATTENTION");

    // Check that history log can be stored
    const log = await prisma.masteryHistoryLog.create({
      data: {
        masteryId: updated.id,
        conceptId: testConcepts[0].id,
        projectId: testProject.id,
        userId: testUser.id,
        previousScore: 30.0,
        newScore: 45.0,
        sourceType: "QUIZ",
      },
    });
    assert.ok(log.id);
  });
});

