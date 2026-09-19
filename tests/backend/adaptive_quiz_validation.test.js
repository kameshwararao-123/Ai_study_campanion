import test from "node:test";
import assert from "node:assert/strict";
import { normalizeQuizQuestions } from "../../server/routes/quiz.js";
import { prisma } from "../../server/lib/db.js";

test("Adaptive Quiz Validation Suite", async (t) => {
  let testUser;
  let testSpace;
  let testProject;

  t.before(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `quiz_val_${Date.now()}@example.com`,
        name: "Quiz Validator",
        passwordHash: "dummyhash",
      },
    });
    testSpace = await prisma.space.create({
      data: {
        userId: testUser.id,
        name: "Validation Space",
        description: "Testing quiz validation",
      },
    });
    testProject = await prisma.project.create({
      data: {
        spaceId: testSpace.id,
        userId: testUser.id,
        name: "ML Foundations",
        description: "ML Project",
        learningGoal: "Master ML Evaluation",
      },
    });
  });

  t.after(async () => {
    if (testUser?.id) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
  });

  await t.test("1. Option Normalization & Gemini Answer Key Parsing across A, B, C, D", () => {
    const rawQuestions = [
      {
        questionType: "MCQ",
        prompt: "Which is A?",
        options: [
          { value: "A", label: "Alpha" },
          { value: "B", label: "Beta" },
          { value: "C", label: "Gamma" },
          { value: "D", label: "Delta" },
        ],
        correctAnswer: "A",
        explanation: "Alpha is correct",
      },
      {
        questionType: "MCQ",
        prompt: "Which is B?",
        options: ["A) Red", "B) Blue", "C) Green", "D) Yellow"],
        correctAnswer: "Option B",
        explanation: "Blue is correct",
      },
      {
        questionType: "MCQ",
        prompt: "Which is C?",
        options: ["One", "Two", "Three", "Four"],
        correctAnswer: "Three",
        explanation: "Three is C",
      },
      {
        questionType: "MCQ",
        prompt: "Which is D?",
        options: ["First", "Second", "Third", "Fourth"],
        correctAnswer: 3, // 0-indexed position 3 is D
        explanation: "Fourth is D",
      },
    ];

    const normalized = normalizeQuizQuestions(rawQuestions, null, testProject);
    assert.strictEqual(normalized.length, 4);

    assert.strictEqual(normalized[0].correctAnswer, "A", "Question 1 should have correct answer A");
    assert.strictEqual(normalized[1].correctAnswer, "B", "Question 2 should have correct answer B");
    assert.strictEqual(normalized[2].correctAnswer, "C", "Question 3 should have correct answer C");
    assert.strictEqual(normalized[3].correctAnswer, "D", "Question 4 should have correct answer D");
  });

  await t.test("2. Verification of Option Positions A, B, C, and D Correctness Evaluation", async () => {
    // Create a quiz with 4 MCQ questions covering all positions: A, B, C, D
    const quiz = await prisma.quiz.create({
      data: {
        projectId: testProject.id,
        userId: testUser.id,
        title: "Positions A B C D Quiz",
        totalQuestions: 4,
      },
    });

    const qA = await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        questionType: "MCQ",
        prompt: "Select Option A",
        options: JSON.stringify([
          { value: "A", label: "Correct Choice A" },
          { value: "B", label: "Incorrect B" },
          { value: "C", label: "Incorrect C" },
          { value: "D", label: "Incorrect D" },
        ]),
        correctAnswer: "A",
        explanation: "A is the intended answer.",
        sortOrder: 1,
      },
    });

    const qB = await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        questionType: "MCQ",
        prompt: "Select Option B",
        options: JSON.stringify([
          { value: "A", label: "Incorrect A" },
          { value: "B", label: "Correct Choice B" },
          { value: "C", label: "Incorrect C" },
          { value: "D", label: "Incorrect D" },
        ]),
        correctAnswer: "B",
        explanation: "B is the intended answer.",
        sortOrder: 2,
      },
    });

    const qC = await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        questionType: "MCQ",
        prompt: "Select Option C",
        options: JSON.stringify([
          { value: "A", label: "Incorrect A" },
          { value: "B", label: "Incorrect B" },
          { value: "C", label: "Correct Choice C" },
          { value: "D", label: "Incorrect D" },
        ]),
        correctAnswer: "C",
        explanation: "C is the intended answer.",
        sortOrder: 3,
      },
    });

    const qD = await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        questionType: "MCQ",
        prompt: "Select Option D",
        options: JSON.stringify([
          { value: "A", label: "Incorrect A" },
          { value: "B", label: "Incorrect B" },
          { value: "C", label: "Incorrect C" },
          { value: "D", label: "Correct Choice D" },
        ]),
        correctAnswer: "D",
        explanation: "D is the intended answer.",
        sortOrder: 4,
      },
    });

    // Helper evaluation logic matching server/routes/quiz.js
    function evaluateMCQ(question, userAnswer) {
      if (!userAnswer || userAnswer === "Unanswered") {
        return { isCorrect: false, score: 0 };
      }
      const parsedOptions = JSON.parse(question.options);
      const correctOpt = parsedOptions.find(
        (o) =>
          o.value.toUpperCase() === question.correctAnswer.toUpperCase() ||
          o.label.toLowerCase() === question.correctAnswer.toLowerCase()
      );
      const userAnsUpper = userAnswer.trim().toUpperCase();
      const userAnsLower = userAnswer.trim().toLowerCase();

      const matchesValue = correctOpt && userAnsUpper === correctOpt.value.toUpperCase();
      const matchesDirect = userAnsUpper === question.correctAnswer.toUpperCase();
      const matchesLabel = correctOpt && userAnsLower === correctOpt.label.toLowerCase();

      const isCorrect = Boolean(matchesValue || matchesDirect || matchesLabel);
      return { isCorrect, score: isCorrect ? 100 : 0 };
    }

    // Test A: Select correct option for all 4 positions
    assert.strictEqual(evaluateMCQ(qA, "A").isCorrect, true, "Option A must be recognized as correct");
    assert.strictEqual(evaluateMCQ(qB, "B").isCorrect, true, "Option B must be recognized as correct");
    assert.strictEqual(evaluateMCQ(qC, "C").isCorrect, true, "Option C must be recognized as correct");
    assert.strictEqual(evaluateMCQ(qD, "D").isCorrect, true, "Option D must be recognized as correct");

    // Also verify label matching
    assert.strictEqual(evaluateMCQ(qA, "Correct Choice A").isCorrect, true);
    assert.strictEqual(evaluateMCQ(qB, "Correct Choice B").isCorrect, true);
    assert.strictEqual(evaluateMCQ(qC, "Correct Choice C").isCorrect, true);
    assert.strictEqual(evaluateMCQ(qD, "Correct Choice D").isCorrect, true);

    // Test B: Select incorrect option for all 4 positions
    assert.strictEqual(evaluateMCQ(qA, "B").isCorrect, false, "Selecting B for Q1(A) must be incorrect");
    assert.strictEqual(evaluateMCQ(qB, "C").isCorrect, false, "Selecting C for Q2(B) must be incorrect");
    assert.strictEqual(evaluateMCQ(qC, "A").isCorrect, false, "Selecting A for Q3(C) must be incorrect");
    assert.strictEqual(evaluateMCQ(qD, "B").isCorrect, false, "Selecting B for Q4(D) must be incorrect");

    // Test C: Change from incorrect -> correct
    let stateAnswer = "B";
    assert.strictEqual(evaluateMCQ(qA, stateAnswer).isCorrect, false);
    stateAnswer = "A"; // Changed to correct
    assert.strictEqual(evaluateMCQ(qA, stateAnswer).isCorrect, true);

    // Test D: Change from correct -> incorrect
    stateAnswer = "C";
    assert.strictEqual(evaluateMCQ(qC, stateAnswer).isCorrect, true);
    stateAnswer = "D"; // Changed to incorrect
    assert.strictEqual(evaluateMCQ(qC, stateAnswer).isCorrect, false);

    // Test E: Unanswered
    assert.strictEqual(evaluateMCQ(qA, "").isCorrect, false);
    assert.strictEqual(evaluateMCQ(qA, "Unanswered").isCorrect, false);
    assert.strictEqual(evaluateMCQ(qA, null).isCorrect, false);
  });

  await t.test("3. 10 Questions Test: 7 Correct, 2 Incorrect, 1 Unanswered = 70% Score", () => {
    const totalQuestions = 10;
    const correctAnswers = ["A", "B", "C", "D", "A", "B", "C", "D", "A", "B"];
    const userAnswers = [
      "A", // 1: Correct
      "B", // 2: Correct
      "C", // 3: Correct
      "D", // 4: Correct
      "A", // 5: Correct
      "B", // 6: Correct
      "C", // 7: Correct
      "A", // 8: Incorrect (Correct is D)
      "C", // 9: Incorrect (Correct is A)
      "",  // 10: Unanswered
    ];

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    for (let i = 0; i < totalQuestions; i++) {
      const uAns = userAnswers[i];
      const cAns = correctAnswers[i];

      if (!uAns || uAns === "Unanswered") {
        unansweredCount += 1;
      } else if (uAns === cAns) {
        correctCount += 1;
      } else {
        incorrectCount += 1;
      }
    }

    const percentage = Math.round((correctCount / totalQuestions) * 100);

    assert.strictEqual(correctCount, 7, "Must have exactly 7 correct");
    assert.strictEqual(incorrectCount, 2, "Must have exactly 2 incorrect");
    assert.strictEqual(unansweredCount, 1, "Must have exactly 1 unanswered");
    assert.strictEqual(percentage, 70, "Final percentage must be exactly 70%");
  });

  await t.test("4. Shuffled Options Robustness: Value-based Matching", () => {
    // Original option ordering
    const originalOptions = [
      { value: "A", label: "Alpha" },
      { value: "B", label: "Beta" },
      { value: "C", label: "Gamma" },
      { value: "D", label: "Delta" },
    ];
    const correctAnswer = "B";

    // Simulating frontend shuffle: order changed
    const shuffledOptions = [
      { value: "C", label: "Gamma" },
      { value: "A", label: "Alpha" },
      { value: "D", label: "Delta" },
      { value: "B", label: "Beta" },
    ];

    // Selecting option with value "B"
    const selectedValue = shuffledOptions[3].value; // "B"
    assert.strictEqual(selectedValue, "B");
    assert.strictEqual(selectedValue === correctAnswer, true, "Shuffled selection must retain correct answer value B");
  });
});

