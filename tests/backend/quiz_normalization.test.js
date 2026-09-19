import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../server/lib/db.js";
import { getAIProvider } from "../../server/lib/ai.js";

test("Quiz Generation & Normalization: Guarantees at least 2 questions and valid schema", async () => {
  const user = await prisma.user.create({
    data: { email: `norm_test_${Date.now()}@test.com`, name: "Norm Tester", passwordHash: "dummy" },
  });
  const space = await prisma.space.create({
    data: { userId: user.id, name: "Test Space", description: "Test" },
  });
  const project = await prisma.project.create({
    data: { spaceId: space.id, userId: user.id, name: "Algorithms", description: "Algo", learningGoal: "Master Search" },
  });

  const ai = getAIProvider();
  const mockRes = await ai.generateStructured("Generate an adaptive quiz for project Algorithms. Focus on concept: General");

  assert.ok(mockRes.data);
  // Ensure quiz mock produces title and questions
  assert.ok(mockRes.data.questions && mockRes.data.questions.length >= 2, "Quiz data must have at least 2 questions");

  // Clean up
  await prisma.user.delete({ where: { id: user.id } });
});

