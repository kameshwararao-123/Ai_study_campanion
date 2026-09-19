import test from "node:test";
import assert from "node:assert/strict";
import { getAIProvider } from "../../server/lib/ai.js";

test("AI Tutor Behavior Test Suite (8 Required Test Cases)", async (t) => {
  const ai = getAIProvider();

  await t.test("CASE 1: Directly Related — What is classification?", async () => {
    const res = await ai.generateText("What is classification?", {
      systemInstruction: "Current topic: Supervised Learning. Explain classification.",
    });
    assert.ok(res.text);
    assert.ok(res.text.toLowerCase().includes("classification"));
    assert.ok(!res.text.toLowerCase().includes("i don't have information"));
    assert.ok(!res.text.toLowerCase().includes("cannot answer"));
  });

  await t.test("CASE 2: Related Concept — What is regression?", async () => {
    const res = await ai.generateText("What is regression?", {
      systemInstruction: "Current topic: Supervised Learning.",
    });
    assert.ok(res.text);
    assert.ok(res.text.toLowerCase().includes("regression"));
    assert.ok(res.text.toLowerCase().includes("supervised") || res.text.toLowerCase().includes("continuous"));
    assert.ok(!res.text.toLowerCase().includes("i don't have information"));
  });

  await t.test("CASE 3: Tangent / Slightly Unrelated — How does Netflix recommend movies?", async () => {
    const res = await ai.generateText("How does Netflix recommend movies?", {
      systemInstruction: "Current topic: Machine Learning.",
    });
    assert.ok(res.text);
    assert.ok(res.text.toLowerCase().includes("netflix") || res.text.toLowerCase().includes("recommend"));
    assert.ok(res.text.toLowerCase().includes("machine learning") || res.text.toLowerCase().includes("model"));
    assert.ok(!res.text.toLowerCase().includes("i don't have information"));
  });

  await t.test("CASE 4: Completely Unrelated / Out of Box — Who is Virat Kohli?", async () => {
    const res = await ai.generateText("Who is Virat Kohli?", {
      systemInstruction: "Evidence Status: NO_EVIDENCE_FOUND. Topic is outside uploaded materials.",
    });
    assert.ok(res.text);
    assert.ok(
      res.text.toLowerCase().includes("not contain") ||
      res.text.toLowerCase().includes("grounded") ||
      res.text.toLowerCase().includes("not available in your uploaded learning materials")
    );
    assert.ok(res.text.toLowerCase().includes("uploaded") || res.text.toLowerCase().includes("materials"));
  });

  await t.test("CASE 5: Out of Box / Lifestyle — What should I eat for breakfast?", async () => {
    const res = await ai.generateText("What should I eat for breakfast?", {
      systemInstruction: "Evidence Status: NO_EVIDENCE_FOUND. Current topic: Machine Learning.",
    });
    assert.ok(res.text);
    assert.ok(
      res.text.toLowerCase().includes("not contain") ||
      res.text.toLowerCase().includes("grounded") ||
      res.text.toLowerCase().includes("not available in your uploaded learning materials")
    );
    assert.ok(res.text.toLowerCase().includes("uploaded") || res.text.toLowerCase().includes("materials"));
  });

  await t.test("CASE 6: Casual Interaction — Tell me a joke.", async () => {
    const res = await ai.generateText("Tell me a joke.", {
      systemInstruction: "Current topic: Machine Learning.",
    });
    assert.ok(res.text);
    assert.ok(res.text.length > 20);
    assert.ok(!res.text.toLowerCase().includes("i don't have information"));
    assert.ok(!res.text.toLowerCase().includes("cannot answer"));
  });

  await t.test("CASE 7: Course Material Grounding — Explain entropy according to our course.", async () => {
    const res = await ai.generateText("Explain entropy according to our course.", {
      systemInstruction: "Course notes: Entropy measures impurity in decision trees. Source: Machine Learning Notes, Page 14.",
    });
    assert.ok(res.text);
    assert.ok(res.text.toLowerCase().includes("entropy"));
    assert.ok(res.text.includes("Source: Machine Learning Notes"));
  });

  await t.test("CASE 8: Short-term Conversation Memory — What did you mean by the previous example?", async () => {
    const res = await ai.generateText("What did you mean by the previous example?", {
      systemInstruction: "Recent history: Learner asked about training features and target labels.",
    });
    assert.ok(res.text);
    assert.ok(res.text.toLowerCase().includes("example") || res.text.toLowerCase().includes("feature") || res.text.toLowerCase().includes("parameter"));
    assert.ok(!res.text.toLowerCase().includes("i don't have information"));
  });
});

