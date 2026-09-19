import test from "node:test";
import assert from "node:assert";
import { prisma } from "../../server/lib/db.js";
import { ValidationError, UnauthorizedError, NotFoundError, AIProviderError } from "../../server/lib/errors.js";
import { getMockProvider } from "../../server/lib/ai.js";

test("Phase 1: Database connection & schema integrity", async () => {
  const count = await prisma.user.count();
  assert.strictEqual(typeof count, "number", "User count should be numeric");

  const testEmail = `phase1_test_${Date.now()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      name: "Phase 1 Tester",
      passwordHash: "mock_hash_xyz",
      role: "LEARNER",
    },
  });

  assert.ok(user.id, "Created user should have an ID");
  assert.strictEqual(user.email, testEmail);

  await prisma.user.delete({ where: { id: user.id } });
});

test("Phase 1: Domain error classes & HTTP status mappings", () => {
  const valErr = new ValidationError("Invalid field", { field: "email" });
  assert.strictEqual(valErr.statusCode, 400);
  assert.strictEqual(valErr.errorCode, "VALIDATION_ERROR");
  assert.deepStrictEqual(valErr.details, { field: "email" });

  const authErr = new UnauthorizedError();
  assert.strictEqual(authErr.statusCode, 401);
  assert.strictEqual(authErr.errorCode, "UNAUTHORIZED");

  const notFoundErr = new NotFoundError();
  assert.strictEqual(notFoundErr.statusCode, 404);
  assert.strictEqual(notFoundErr.errorCode, "NOT_FOUND");

  const aiErr = new AIProviderError("Provider unavailable");
  assert.strictEqual(aiErr.statusCode, 502);
  assert.strictEqual(aiErr.errorCode, "AI_PROVIDER_ERROR");
});

test("Phase 1: AI Provider Abstraction (text, streaming, structured, embeddings)", async () => {
  const provider = getMockProvider();
  assert.ok(provider.name, "Provider should have a name");

  const textRes = await provider.generateText("Hello AI Study Companion");
  assert.ok(textRes.text.length > 0, "Text response should not be empty");
  assert.ok(textRes.promptTokens > 0, "Prompt tokens should be counted");
  assert.ok(textRes.latencyMs >= 0, "Latency should be non-negative");

  const structuredRes = await provider.generateStructured("extract concepts");
  assert.ok(Array.isArray(structuredRes.data), "Structured concepts should be an array");
  assert.ok(structuredRes.data.length > 0, "Concepts list should not be empty");
  assert.ok(structuredRes.data[0].name, "Concept item should have a name");

  const embeddings = await provider.generateEmbeddings(["sample text chunk"]);
  assert.strictEqual(embeddings.length, 1, "Should generate 1 embedding array");
  assert.strictEqual(embeddings[0].length, 64, "Mock embedding should have 64 dimensions");

  let streamOutput = "";
  for await (const chunk of provider.generateStream("Stream test")) {
    streamOutput += chunk;
  }
  assert.ok(streamOutput.length > 0, "Stream output should not be empty");
});

