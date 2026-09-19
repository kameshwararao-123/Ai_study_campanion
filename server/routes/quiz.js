import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { authenticate } from "../middleware/authenticate.js";
import { apiSuccess } from "../lib/response.js";
import { NotFoundError, ValidationError } from "../lib/errors.js";
import { getAIProvider } from "../lib/ai.js";
import { backgroundQueue } from "../lib/queue.js";

export const quizRouter = Router();
quizRouter.use(authenticate);

/**
 * Normalizes and validates raw quiz questions from Gemini AI or mock generator.
 * Enforces stable option values ("A", "B", "C", "D"), reliable correct answer resolution,
 * and eliminates arbitrary option-0 bias.
 */
export function normalizeQuizQuestions(rawQuizData, targetConcept, project) {
  let rawList = [];
  if (Array.isArray(rawQuizData)) {
    rawList = rawQuizData;
  } else if (rawQuizData && typeof rawQuizData === "object") {
    if (Array.isArray(rawQuizData.questions)) {
      rawList = rawQuizData.questions;
    } else if (Array.isArray(rawQuizData.quiz?.questions)) {
      rawList = rawQuizData.quiz.questions;
    } else if (Array.isArray(rawQuizData.data?.questions)) {
      rawList = rawQuizData.data.questions;
    }
  }

  const optionLetters = ["A", "B", "C", "D", "E", "F"];
  const normalized = [];

  for (let i = 0; i < rawList.length; i++) {
    const q = rawList[i];
    if (!q || typeof q !== "object") continue;

    const promptText = q.prompt || q.question || q.text || q.questionText || q.question_text;
    if (!promptText || typeof promptText !== "string" || !promptText.trim()) continue;

    let qType = String(q.questionType || q.type || "").toUpperCase();
    if (qType.includes("OPEN") || qType.includes("ESSAY") || qType.includes("TEXT")) {
      qType = "OPEN_ENDED";
    } else {
      qType = "MCQ";
    }

    if (qType === "MCQ") {
      let rawOptions = q.options;
      if (!Array.isArray(rawOptions) || rawOptions.length < 2) {
        qType = "OPEN_ENDED";
      }
    }

    if (qType === "MCQ") {
      const parsedOptions = [];
      const rawOptions = q.options;

      for (let j = 0; j < rawOptions.length; j++) {
        const opt = rawOptions[j];
        if (!opt) continue;

        let val = optionLetters[j] || String(j + 1);
        let lbl = "";

        if (typeof opt === "object") {
          val = opt.value ? String(opt.value).trim().toUpperCase() : optionLetters[j] || String(j + 1);
          lbl = String(opt.label || opt.text || opt.title || opt.content || opt.value || "").trim();
        } else if (typeof opt === "string") {
          const trimmed = opt.trim();
          const match = trimmed.match(/^(?:option\s+)?([A-Fa-f])(?:[\.\)\:\-]\s*|\s+)(.*)$/i);
          if (match) {
            val = match[1].toUpperCase();
            lbl = match[2].trim() || trimmed;
          } else {
            val = optionLetters[j] || String(j + 1);
            lbl = trimmed;
          }
        }

        if (lbl) {
          parsedOptions.push({ value: val, label: lbl });
        }
      }

      if (parsedOptions.length < 2) {
        continue;
      }

      // Resolve the correct answer reliably
      let rawCorrect =
        q.correctAnswer ??
        q.answer ??
        q.correct_answer ??
        q.correct_option_index ??
        (Array.isArray(q.correctValues) ? q.correctValues[0] : null);

      let matchedValue = null;

      if (rawCorrect !== null && rawCorrect !== undefined) {
        const rawStr = String(rawCorrect).trim();
        const rawUpper = rawStr.toUpperCase();
        const rawLower = rawStr.toLowerCase();

        // 1. Exact match with option value (e.g. "B" === "B")
        const byValue = parsedOptions.find((o) => o.value.toUpperCase() === rawUpper);
        if (byValue) {
          matchedValue = byValue.value;
        }

        // 2. Match with prefix (e.g. "Option B" or "B) Description")
        if (!matchedValue) {
          const prefixMatch = rawStr.match(/^(?:option\s+)?([A-Fa-f])(?:[\.\)\:\-]\s*|\s+|$)/i);
          if (prefixMatch) {
            const letter = prefixMatch[1].toUpperCase();
            const byPrefix = parsedOptions.find((o) => o.value.toUpperCase() === letter);
            if (byPrefix) matchedValue = byPrefix.value;
          }
        }

        // 3. Match with full option label
        if (!matchedValue) {
          const byLabel = parsedOptions.find(
            (o) =>
              o.label.toLowerCase() === rawLower ||
              o.label.toLowerCase().includes(rawLower) ||
              rawLower.includes(o.label.toLowerCase())
          );
          if (byLabel) {
            matchedValue = byLabel.value;
          }
        }

        // 4. Numeric index (0-based or 1-based)
        if (!matchedValue && !isNaN(Number(rawStr))) {
          const idx = Number(rawStr);
          if (parsedOptions[idx]) {
            matchedValue = parsedOptions[idx].value;
          } else if (parsedOptions[idx - 1]) {
            matchedValue = parsedOptions[idx - 1].value;
          }
        }
      }

      // Check if option object itself has isCorrect flag
      if (!matchedValue && Array.isArray(q.options)) {
        const markedOpt = q.options.find(
          (o) => o && typeof o === "object" && (o.isCorrect === true || o.correct === true)
        );
        if (markedOpt && markedOpt.value) {
          matchedValue = String(markedOpt.value).toUpperCase();
        }
      }

      // If still not matched, check explanation for which option it mentions
      if (!matchedValue && q.explanation) {
        const explanation = String(q.explanation).toLowerCase();
        const foundInExpl = parsedOptions.find((o) => explanation.includes(o.label.toLowerCase()));
        if (foundInExpl) {
          matchedValue = foundInExpl.value;
        }
      }

      // If still undetermined, pick first option value as safe fallback
      if (!matchedValue) {
        matchedValue = parsedOptions[0].value;
      }

      normalized.push({
        questionType: "MCQ",
        prompt: String(promptText).trim(),
        options: parsedOptions,
        correctAnswer: matchedValue,
        explanation: String(q.explanation || q.rationale || "Explanation grounded in study concepts.").trim(),
        difficultyScore: Number(q.difficultyScore) || 0.5,
        // Which project topic this question assesses (resolved by the route).
        conceptId: q.conceptId || null,
        conceptName: String(q.concept || q.conceptName || q.topic || "").trim() || null,
      });
    } else {
      // OPEN_ENDED Question
      normalized.push({
        questionType: "OPEN_ENDED",
        prompt: String(promptText).trim(),
        options: null,
        correctAnswer: String(q.correctAnswer || q.answer || "Key concepts and theoretical principles.").trim(),
        explanation: String(q.explanation || q.rationale || "Grounded conceptual explanation.").trim(),
        difficultyScore: Number(q.difficultyScore) || 0.7,
        conceptId: q.conceptId || null,
        conceptName: String(q.concept || q.conceptName || q.topic || "").trim() || null,
      });
    }
  }

  // GUARANTEE: If empty, provide 2 high-quality fallback questions with verified answer keys
  if (normalized.length === 0) {
    const conceptName = targetConcept?.name || "Core Principles";
    const conceptDef =
      targetConcept?.definition || "Key concepts covered in the project materials";

    normalized.push({
      questionType: "MCQ",
      prompt: `Which statement accurately characterizes "${conceptName}"?`,
      options: [
        { value: "A", label: "An obsolete technique not applicable to modern workflows" },
        { value: "B", label: `${conceptDef}` },
        { value: "C", label: "A method used exclusively for hardware-level compilation" },
        { value: "D", label: "An unverified experimental hypothesis without practical utility" },
      ],
      correctAnswer: "B", // Option B is the verified correct answer
      explanation: `By definition, ${conceptName} refers to: ${conceptDef}.`,
      difficultyScore: 0.5,
      conceptId: targetConcept?.id || null,
      conceptName: conceptName,
    });

    normalized.push({
      questionType: "OPEN_ENDED",
      prompt: `Explain the fundamental importance of "${conceptName}" within ${project.name} and provide a practical use-case.`,
      options: null,
      correctAnswer: `Understanding ${conceptName} is vital for mastering ${project.name}. It ensures correct implementation, avoids common pitfalls, and aligns with best practices.`,
      explanation: `A comprehensive answer defines ${conceptName}, explains its rationale, and describes how it is applied.`,
      difficultyScore: 0.7,
      conceptId: targetConcept?.id || null,
      conceptName: conceptName,
    });
  }

  return normalized;
}

/** Every generated quiz must assess at least this many questions. */
export const MIN_QUIZ_QUESTIONS = 5;
const MAX_QUIZ_QUESTIONS = 20;
const OPTION_LETTERS = ["A", "B", "C", "D"];

function conceptLookupKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchConceptByName(byKey, hint) {
  const key = conceptLookupKey(hint);
  if (!key) return null;
  if (byKey.has(key)) return byKey.get(key);
  for (const [candidate, concept] of byKey) {
    if (candidate && (key.includes(candidate) || candidate.includes(key))) return concept;
  }
  return null;
}

/** Deterministic MCQ fallback anchored to a specific project topic. */
function buildTopicMcq(concept, index, project) {
  const topic = concept?.name || project.name;
  const definition =
    concept?.definition || `${topic} is a core topic covered in ${project.name}.`;
  const correctIndex = index % OPTION_LETTERS.length;
  const distractors = [
    `An unrelated technique that does not appear in ${project.name}`,
    `A deprecated practice that contradicts the principles of ${topic}`,
    `A hardware-only detail outside the scope of ${topic}`,
  ];

  const options = [];
  let distractorIndex = 0;
  for (let i = 0; i < OPTION_LETTERS.length; i++) {
    options.push({
      value: OPTION_LETTERS[i],
      label: i === correctIndex ? definition : distractors[distractorIndex++],
    });
  }

  return {
    questionType: "MCQ",
    prompt: `Which statement best describes "${topic}" as covered in ${project.name}?`,
    options,
    correctAnswer: OPTION_LETTERS[correctIndex],
    explanation: `According to the uploaded material, ${topic}: ${definition}`,
    difficultyScore: 0.4,
    conceptId: concept?.id || null,
    conceptName: topic,
  };
}

/** Deterministic open-ended fallback anchored to a specific project topic. */
function buildTopicOpenEnded(concept, project) {
  const topic = concept?.name || project.name;
  const definition =
    concept?.definition || `${topic} is a core topic covered in ${project.name}.`;

  return {
    questionType: "OPEN_ENDED",
    prompt: `Explain the role of "${topic}" in ${project.name} and give one practical example.`,
    options: null,
    correctAnswer: definition,
    explanation: `A strong answer defines ${topic}, explains why it matters, and applies it to a concrete case.`,
    difficultyScore: 0.6,
    conceptId: concept?.id || null,
    conceptName: topic,
  };
}

/**
 * Guarantees full topic coverage and a minimum question count.
 *
 * The AI is asked to cover every topic, but its output is treated as a draft:
 * untagged questions are distributed across uncovered topics, missing topics
 * get a deterministic fallback question, and the total is padded to the minimum.
 */
export function ensureQuizCoverage({ questions, concepts, project }) {
  const coverage = concepts.length
    ? concepts
    : [
        {
          id: null,
          name: project.name,
          definition: project.learningGoal || `Core concepts of ${project.name}.`,
        },
      ];

  const keyOf = (concept) =>
    concept.id != null ? `id:${concept.id}` : `name:${conceptLookupKey(concept.name)}`;
  const byKey = new Map(coverage.map((concept) => [conceptLookupKey(concept.name), concept]));
  const covered = new Set();

  // 1. Honour the topics the model tagged explicitly.
  for (const question of questions) {
    let concept = null;
    if (question.conceptId) {
      concept = coverage.find((c) => String(c.id) === String(question.conceptId)) || null;
    }
    if (!concept) concept = matchConceptByName(byKey, question.conceptName);
    if (concept) {
      question.conceptId = concept.id || null;
      question.conceptName = concept.name;
      covered.add(keyOf(concept));
    } else {
      question.conceptId = null;
      question.conceptName = null;
    }
  }

  // 2. Spread untagged questions across the topics still missing coverage.
  for (const question of questions) {
    if (question.conceptId || question.conceptName) continue;
    const remaining = coverage.filter((c) => !covered.has(keyOf(c)));
    const concept = remaining[0] || coverage[questions.indexOf(question) % coverage.length];
    question.conceptId = concept.id || null;
    question.conceptName = concept.name;
    covered.add(keyOf(concept));
  }

  // 3. Any topic with no question at all gets a grounded fallback question.
  let nextIndex = questions.length;
  for (const concept of coverage) {
    if (covered.has(keyOf(concept))) continue;
    questions.push(buildTopicMcq(concept, nextIndex++, project));
    covered.add(keyOf(concept));
  }

  // 4. Guarantee the minimum question count.
  let guard = 0;
  while (questions.length < MIN_QUIZ_QUESTIONS && guard < MAX_QUIZ_QUESTIONS * 2) {
    const concept = coverage[nextIndex % coverage.length];
    questions.push(
      nextIndex % 4 === 3
        ? buildTopicOpenEnded(concept, project)
        : buildTopicMcq(concept, nextIndex, project)
    );
    nextIndex++;
    guard++;
  }

  return questions;
}

// POST /api/quiz/generate (REQ-042, REQ-045)
quizRouter.post("/generate", async (req, res, next) => {
  try {
    const { projectId } = req.body;
    if (!projectId) throw new ValidationError("projectId is required");

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.userId },
      include: {
        concepts: {
          include: {
            masteryRecords: { where: { userId: req.user.userId } },
          },
        },
      },
    });
    if (!project) throw new NotFoundError("Project not found or access denied");

    // Fetch document chunks from uploaded materials for real project context
    const projectChunks = await prisma.documentChunk.findMany({
      where: { projectId },
      orderBy: { chunkIndex: "asc" },
      take: 20,
    });

    // Detect if existing concepts are corrupted from legacy mock ML templates
    let concepts = [...(project.concepts || [])];
    const isCorruptedMLConcepts =
      concepts.length > 0 &&
      concepts.every(
        (c) =>
          (c.name === "Supervised Learning" || c.name === "Loss Function") &&
          !project.name.toLowerCase().includes("learning") &&
          !project.name.toLowerCase().includes("ml") &&
          !project.learningGoal.toLowerCase().includes("ml") &&
          !project.learningGoal.toLowerCase().includes("learning")
      );

    // If concepts are missing, corrupted, or fewer than 2 while materials exist, extract fresh concepts
    if (isCorruptedMLConcepts || concepts.length < 2) {
      const ai = getAIProvider();
      let newConcepts = [];

      if (projectChunks.length > 0) {
        const materialSample = projectChunks
          .map((c) => c.content)
          .join("\n\n")
          .substring(0, 3500);

        try {
          const extractedRes = await ai.generateStructured(
            `Extract 5 to 8 core concepts and definitions from this learning material for project "${project.name}" (Goal: ${project.learningGoal}):\n${materialSample}\n\nRespond strictly with JSON array: [{"name": "Concept Name", "definition": "Clear concise definition", "importanceScore": 0.85}]`
          );
          if (Array.isArray(extractedRes.data) && extractedRes.data.length > 0) {
            newConcepts = extractedRes.data.filter((c) => c && c.name && c.definition);
          }
        } catch (e) {
          console.warn("[Quiz] Dynamic concept extraction warning:", e.message);
        }
      }

      if (newConcepts.length === 0) {
        newConcepts = [
          {
            name: `${project.name} Architecture & Fundamentals`,
            definition: `Core principles, representations, and operational foundations of ${project.name}.`,
            importanceScore: 0.9,
          },
          {
            name: `${project.name} Core Mechanisms & Workflows`,
            definition: `Essential mechanisms, algorithms, and practical processes used in ${project.name}.`,
            importanceScore: 0.85,
          },
          {
            name: `${project.name} Implementation & Best Practices`,
            definition: `Practical implementation, design considerations, and verification rules in ${project.name}.`,
            importanceScore: 0.8,
          },
        ];
      }

      if (isCorruptedMLConcepts) {
        await prisma.concept.deleteMany({ where: { projectId } });
      }

      // Persist real concepts for this project
      for (const item of newConcepts) {
        const savedConcept = await prisma.concept.create({
          data: {
            projectId,
            userId: req.user.userId,
            name: item.name,
            definition: item.definition,
            importanceScore: item.importanceScore || 0.85,
            sourcePage: 1,
          },
        });
        await prisma.conceptMastery.upsert({
          where: {
            projectId_conceptId_userId: {
              projectId,
              conceptId: savedConcept.id,
              userId: req.user.userId,
            },
          },
          create: {
            conceptId: savedConcept.id,
            projectId,
            userId: req.user.userId,
            masteryScore: 40.0,
            confidenceScore: 0.5,
            trend: "REQUIRING_ATTENTION",
          },
          update: {},
        });
      }

      // Reload fresh concepts
      concepts = await prisma.concept.findMany({
        where: { projectId },
        include: { masteryRecords: { where: { userId: req.user.userId } } },
      });
    }

    // Deduplicate any repeated concepts by name
    const seenConceptNames = new Set();
    const uniqueConcepts = [];
    for (const c of concepts) {
      const lowerName = String(c.name || "").toLowerCase().trim();
      if (!seenConceptNames.has(lowerName)) {
        seenConceptNames.add(lowerName);
        uniqueConcepts.push(c);
      }
    }
    concepts = uniqueConcepts;

    // Adaptive ordering: weakest topics first so the learner is assessed hardest on
    // what they know least about, while still covering EVERY topic (REQ-045).
    concepts.sort((a, b) => {
      const aScore = a.masteryRecords?.[0]?.masteryScore ?? 0;
      const bScore = b.masteryRecords?.[0]?.masteryScore ?? 0;
      return aScore - bScore;
    });

    // Retrieve recent mistakes for this user and project to target reinforcement (REQ-045)
    let recentMistakesText = "";
    try {
      const recentSubmissions = await prisma.quizSubmission.findMany({
        where: { userId: req.user.userId, isCorrect: false },
        include: { question: true },
        take: 12,
      });
      const mistakeItems = recentSubmissions
        .filter((s) => s.question?.conceptId && concepts.some((c) => c.id === s.question.conceptId))
        .map((s) => {
          const c = concepts.find((c) => c.id === s.question.conceptId);
          return `- ${c?.name}: previously missed concept testing "${s.question.prompt.substring(0, 90)}..."`;
        });
      if (mistakeItems.length > 0) {
        recentMistakesText = `Recent student mistakes requiring targeted reinforcement:\n${mistakeItems.slice(0, 5).join("\n")}\n\n`;
      }
    } catch (e) {
      console.warn("[Quiz] Could not query past mistakes:", e.message);
    }

    const questionTarget = Math.min(
      MAX_QUIZ_QUESTIONS,
      Math.max(MIN_QUIZ_QUESTIONS, concepts.length)
    );

    // Multi-factor topic catalog with explicit adaptive difficulty targets (REQ-045)
    const topicCatalog = concepts.length
      ? concepts
          .map((c) => {
            const score = c.masteryRecords?.[0]?.masteryScore ?? 40;
            let levelGuidance = "FOUNDATIONAL (Target difficulty: 0.35 - 0.50): Test basic definitions, core syntax, and essential rules";
            if (score >= 75) {
              levelGuidance = "ADVANCED (Target difficulty: 0.75 - 0.90): Test edge cases, trade-offs, optimization, and synthesis";
            } else if (score >= 50) {
              levelGuidance = "INTERMEDIATE (Target difficulty: 0.55 - 0.70): Test scenario-based application, workflows, and problem solving";
            }
            return `- "${c.name}" [Mastery: ${Math.round(score)}% | ${levelGuidance}]: ${c.definition}`;
          })
          .join("\n")
      : `- "${project.name}": ${project.learningGoal || "core project concepts"}`;

    const materialSnippets = projectChunks.length > 0
      ? projectChunks
          .slice(0, 8)
          .map((c) => `[Page ${c.startPage} (${c.contentType})]: ${c.content.substring(0, 280).replace(/\n+/g, " ")}`)
          .join("\n\n")
      : "";

    const ai = getAIProvider();
    const prompt = `Generate a high-quality, comprehensive adaptive quiz for students studying "${project.name}" (Learning goal: ${project.learningGoal}).

${recentMistakesText}${materialSnippets ? `Course Material Excerpts:\n${materialSnippets}\n\n` : ""}Topics to assess with adaptive difficulty levels:
${topicCatalog}

Requirements:
- Produce at least ${questionTarget} questions in total.
- You MUST assess EVERY topic listed above with at least one question.
- CRITICAL: All questions MUST be strictly about "${project.name}" and the topics listed above. Do NOT introduce machine learning questions unless "${project.name}" is specifically about machine learning.
- Calibrate each question's difficulty according to the target level specified above for that concept.
- Prioritize reinforcement questions for topics with lower mastery or noted mistakes.
- Mix "MCQ" and "OPEN_ENDED" questions (at least 1 open-ended question).
- Every question MUST include a "concept" field with the exact topic name from the list.
- Vary which option letter is correct across MCQ questions; do not default to the same option.

Respond strictly with a JSON object matching this exact schema:
{
  "title": "Short quiz title",
  "questions": [
    {
      "questionType": "MCQ",
      "concept": "Exact topic name from the list above",
      "prompt": "Clear question text",
      "options": [
        { "value": "A", "label": "Option text" },
        { "value": "B", "label": "Option text" },
        { "value": "C", "label": "Option text" },
        { "value": "D", "label": "Option text" }
      ],
      "correctAnswer": "B",
      "explanation": "Detailed explanation grounded in the concepts",
      "difficultyScore": 0.5
    },
    {
      "questionType": "OPEN_ENDED",
      "concept": "Exact topic name from the list above",
      "prompt": "Clear open-ended question asking for explanation or reasoning",
      "correctAnswer": "Ideal expected answer description",
      "explanation": "Key points that should be included in the answer",
      "difficultyScore": 0.7
    }
  ]
}`;

    const generated = await ai.generateStructured(prompt);
    const quizData = generated.data || {};

    const questionsList = normalizeQuizQuestions(quizData, concepts[0] || null, project);

    // The AI output is a draft: enforce full topic coverage and the minimum
    // question count before anything is persisted.
    ensureQuizCoverage({ questions: questionsList, concepts, project });

    const quizTitle =
      typeof quizData.title === "string" && quizData.title.trim()
        ? quizData.title.trim()
        : `Adaptive Quiz: ${concepts.length ? project.name + " Topics" : "Core Concepts"}`;

    // Persist Quiz and Questions in Database
    const quiz = await prisma.quiz.create({
      data: {
        projectId,
        userId: req.user.userId,
        title: quizTitle,
        totalQuestions: questionsList.length,
        status: "IN_PROGRESS",
      },
    });

    for (let i = 0; i < questionsList.length; i++) {
      const q = questionsList[i];
      await prisma.quizQuestion.create({
        data: {
          quizId: quiz.id,
          conceptId: q.conceptId || null,
          questionType: q.questionType,
          prompt: q.prompt,
          options: q.options ? JSON.stringify(q.options) : null,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficultyScore: q.difficultyScore,
          sortOrder: i + 1,
        },
      });
    }

    const coveredConceptIds = new Set(
      questionsList.map((q) => q.conceptId).filter((id) => id != null)
    );
    console.log(
      `[Quiz] project=${projectId} topics=${concepts.length} questions=${questionsList.length} ` +
        `coveredTopics=${coveredConceptIds.size}/${concepts.length}`
    );

    const createdQuiz = await prisma.quiz.findUnique({
      where: { id: quiz.id },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
      },
    });

    return apiSuccess(res, { quiz: createdQuiz }, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/quiz/project/:projectId/active (REQ-046: Resume in-progress session)
quizRouter.get("/project/:projectId/active", async (req, res, next) => {
  try {
    const quiz = await prisma.quiz.findFirst({
      where: {
        projectId: req.params.projectId,
        userId: req.user.userId,
        status: "IN_PROGRESS",
      },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
      },
    });
    return apiSuccess(res, { quiz: quiz || null });
  } catch (err) {
    next(err);
  }
});

// GET /api/quiz/:quizId (REQ-046)
quizRouter.get("/:quizId", async (req, res, next) => {
  try {
    const quiz = await prisma.quiz.findFirst({
      where: { id: req.params.quizId, userId: req.user.userId },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
        submissions: true,
      },
    });
    if (!quiz) throw new NotFoundError("Quiz not found");
    return apiSuccess(res, { quiz });
  } catch (err) {
    next(err);
  }
});

const GRADING_STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "than", "that", "this", "these", "those",
  "is", "are", "was", "were", "be", "been", "being", "am", "do", "does", "did", "done",
  "have", "has", "had", "having", "will", "would", "shall", "should", "can", "could", "may",
  "might", "must", "of", "in", "on", "at", "to", "for", "from", "by", "with", "as", "into",
  "about", "over", "under", "between", "it", "its", "their", "there", "here", "which", "who",
  "whom", "what", "when", "where", "why", "how", "not", "no", "yes", "also", "such", "each",
  "more", "most", "some", "any", "all", "both", "other", "only", "own", "same", "so", "too",
  "very", "just", "example", "used", "using", "use", "explain", "explains", "described",
]);

function keywordSet(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !GRADING_STOPWORDS.has(word))
  );
}

/**
 * Local, deterministic partial-credit grader for open-ended answers.
 * Used when the AI grader is unavailable so a failed call can never be scored as
 * a pass (the previous behaviour awarded a fabricated 75/100).
 */
export function gradeOpenEndedAnswer(referenceAnswer, explanation, userAnswer) {
  const expected = keywordSet(`${referenceAnswer} ${explanation}`);
  const given = keywordSet(userAnswer);

  if (expected.size === 0) {
    const lengthScore = String(userAnswer || "").trim().length >= 40 ? 60 : 35;
    return { score: lengthScore, matched: [], missing: [], coverage: 0, method: "heuristic-length" };
  }

  const matched = [...expected].filter((word) => given.has(word));
  const missing = [...expected].filter((word) => !given.has(word));
  const coverage = matched.length / expected.size;
  const score = Math.max(0, Math.min(100, Math.round(40 + coverage * 60)));
  return { score, matched, missing, coverage, method: "heuristic-overlap" };
}

function understandingLabel(score) {
  if (score >= 85) return "Proficient";
  if (score >= 70) return "Developing";
  if (score >= 40) return "Needs Review";
  return "Insufficient";
}

// POST /api/quiz/:quizId/submit (REQ-043, REQ-044, REQ-047, REQ-049)
quizRouter.post("/:quizId/submit", async (req, res, next) => {
  try {
    const rawAnswers = req.body.answers; // Array of { questionId, userAnswer }
    const answers = Array.isArray(rawAnswers) ? rawAnswers : [];

    const quiz = await prisma.quiz.findFirst({
      where: { id: req.params.quizId, userId: req.user.userId },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!quiz) throw new NotFoundError("Quiz not found or access denied");

    const ai = getAIProvider();
    const evaluatedSubmissions = [];

    const projectConcepts = await prisma.concept.findMany({ where: { projectId: quiz.projectId } });
    const conceptNameById = new Map(projectConcepts.map((c) => [c.id, c.name]));

    // Evaluate EVERY question of the quiz (including unanswered questions)
    for (const question of quiz.questions) {
      const submitted = answers.find((a) => a.questionId === question.id);
      const rawUserAnswer =
        submitted && typeof submitted.userAnswer === "string"
          ? submitted.userAnswer.trim()
          : "";

      let isCorrect = false;
      let scoreEarned = 0;
      let evalFeedback = null;
      const isUnanswered = !rawUserAnswer || rawUserAnswer.toLowerCase() === "unanswered";

      // Parse question options if MCQ
      let parsedOptions = [];
      try {
        if (question.options) {
          const raw = typeof question.options === "string" ? JSON.parse(question.options) : question.options;
          if (Array.isArray(raw)) {
            parsedOptions = raw.map((opt, idx) => {
              if (typeof opt === "object" && opt !== null) {
                return {
                  value: opt.value ? String(opt.value).trim().toUpperCase() : ["A", "B", "C", "D", "E", "F"][idx],
                  label: String(opt.label || opt.text || opt.title || opt.value || "").trim(),
                };
              }
              return {
                value: ["A", "B", "C", "D", "E", "F"][idx] || String(idx),
                label: String(opt).trim(),
              };
            });
          }
        }
      } catch (e) {
        parsedOptions = [];
      }

      // Locate correct option for reference
      const correctOpt = parsedOptions.find(
        (o) =>
          o.value.toUpperCase() === question.correctAnswer.toUpperCase() ||
          o.label.toLowerCase() === question.correctAnswer.toLowerCase()
      );
      const correctAnswerDisplay = correctOpt
        ? `${correctOpt.value}: ${correctOpt.label}`
        : question.correctAnswer;

      const questionConceptName = question.conceptId
        ? conceptNameById.get(question.conceptId) || null
        : null;

      if (isUnanswered) {
        // Explicitly evaluate unanswered question as incorrect (0 score)
        isCorrect = false;
        scoreEarned = 0;
        evalFeedback = {
          understanding: "Unanswered",
          understandingScore: 0,
          comments: `This question was left unanswered. The correct answer is: ${correctAnswerDisplay}. ${question.explanation}`,
          feedback: `This question was left unanswered. The correct answer is: ${correctAnswerDisplay}. ${question.explanation}`,
          explanation: question.explanation,
          concept: questionConceptName,
          correctAnswer: correctAnswerDisplay,
        };
      } else if (question.questionType === "MCQ") {
        const userAnsUpper = rawUserAnswer.toUpperCase();
        const userAnsLower = rawUserAnswer.toLowerCase();

        // 1. Direct match with option value (e.g. "B" === "B")
        const matchesValue = correctOpt && userAnsUpper === correctOpt.value.toUpperCase();
        const matchesDirectCorrect = userAnsUpper === question.correctAnswer.toUpperCase();

        // 2. Match with option label text
        const matchesLabel =
          correctOpt &&
          (userAnsLower === correctOpt.label.toLowerCase() ||
            userAnsLower === question.correctAnswer.toLowerCase());

        // 3. Match with prefix notation (e.g. "B) ...")
        const prefixMatch = rawUserAnswer.match(/^(?:option\s+)?([A-Fa-f])(?:[\.\)\:\-]\s*|\s+|$)/i);
        const matchesPrefix =
          prefixMatch && correctOpt && prefixMatch[1].toUpperCase() === correctOpt.value.toUpperCase();

        if (matchesValue || matchesDirectCorrect || matchesLabel || matchesPrefix) {
          isCorrect = true;
          scoreEarned = 100;
          evalFeedback = {
            understanding: "Proficient",
            understandingScore: 100,
            concept: questionConceptName,
            comments: `Correct! ${question.explanation}`,
            feedback: `Correct! ${question.explanation}`,
            explanation: question.explanation,
            correctAnswer: correctAnswerDisplay,
            selectedAnswer: rawUserAnswer,
            reviewSuggestion: null,
          };
        } else {
          isCorrect = false;
          scoreEarned = 0;
          evalFeedback = {
            understanding: "Needs Review",
            understandingScore: 0,
            concept: questionConceptName,
            comments: `Incorrect. You selected "${rawUserAnswer}". The correct answer is: ${correctAnswerDisplay}. ${question.explanation}`,
            feedback: `Incorrect. You selected "${rawUserAnswer}". The correct answer is: ${correctAnswerDisplay}. ${question.explanation}`,
            explanation: question.explanation,
            correctAnswer: correctAnswerDisplay,
            selectedAnswer: rawUserAnswer,
            reviewSuggestion: `Review the foundational definitions and rules for "${questionConceptName || "this concept"}" in your course materials.`,
          };
        }
      } else {
        // Open-ended response evaluation: rubric-based AI grading with a
        // deterministic partial-credit fallback. A grading failure can never be
        // recorded as a pass.
        if (rawUserAnswer.length < 15) {
          isCorrect = false;
          scoreEarned = 0;
          evalFeedback = {
            understanding: "Insufficient",
            understandingScore: 0,
            concept: questionConceptName,
            comments:
              "The answer provided is too short to demonstrate understanding. Please provide a detailed explanation covering the core concepts.",
            feedback:
              "The answer provided is too short to demonstrate understanding. Please provide a detailed explanation covering the core concepts.",
            explanation: question.explanation,
            correctAnswer: question.correctAnswer,
            selectedAnswer: rawUserAnswer,
            keyConceptsCovered: [],
            missingConcepts: [questionConceptName || "Core principles"],
            reviewSuggestion: `Study the fundamentals of "${questionConceptName || "this topic"}" and provide a complete conceptual answer.`,
          };
        } else {
          let graded = null;
          try {
            const evalRes = await ai.generateStructured(
              `Evaluate this student's open-ended answer on conceptual correctness and completeness (not writing style).
Topic: ${questionConceptName || "General"}
Question: ${question.prompt}
Reference answer: ${question.correctAnswer}
Grading notes: ${question.explanation}
Student answer: ${rawUserAnswer}

Respond strictly with JSON: { "understandingScore": <0-100 integer>, "keyConceptsCovered": ["..."], "missingConcepts": ["..."], "feedback": "2-3 sentences of specific actionable feedback" }`
            );
            const evalData = evalRes?.data || {};
            const rawScore = Number(evalData.understandingScore);
            if (Number.isFinite(rawScore)) {
              const fb = evalData.feedback || evalData.comments || "Answer evaluated against the reference concepts.";
              graded = {
                score: Math.max(0, Math.min(100, Math.round(rawScore))),
                keyConceptsCovered: Array.isArray(evalData.keyConceptsCovered) ? evalData.keyConceptsCovered : [],
                missingConcepts: Array.isArray(evalData.missingConcepts) ? evalData.missingConcepts : [],
                feedback: fb,
                comments: fb,
                method: "ai-rubric",
              };
            }
          } catch (e) {
            graded = null;
          }

          if (!graded) {
            // AI grader unavailable: grade locally instead of inventing a score.
            const heuristic = gradeOpenEndedAnswer(
              question.correctAnswer,
              question.explanation,
              rawUserAnswer
            );
            const fb = "Graded with the offline rubric because the AI grader was unavailable. " +
                (heuristic.coverage >= 0.5
                  ? `Your answer effectively covers key aspects (${heuristic.matched.slice(0, 3).join(", ")}).`
                  : `Your answer is missing key concepts (${heuristic.missing.slice(0, 3).join(", ")}).`);
            graded = {
              score: heuristic.score,
              keyConceptsCovered: heuristic.matched.slice(0, 6),
              missingConcepts: heuristic.missing.slice(0, 6),
              feedback: fb,
              comments: fb,
              method: heuristic.method,
            };
          }

          scoreEarned = graded.score;
          isCorrect = scoreEarned >= 70;
          const reviewSuggestion = scoreEarned >= 75
            ? null
            : `Review the course material sections covering ${graded.missingConcepts.length > 0 ? graded.missingConcepts.slice(0, 3).join(", ") : questionConceptName || "this concept"}.`;

          evalFeedback = {
            understanding: understandingLabel(scoreEarned),
            understandingScore: scoreEarned,
            concept: questionConceptName,
            keyConceptsCovered: graded.keyConceptsCovered,
            missingConcepts: graded.missingConcepts,
            feedback: graded.feedback,
            comments: graded.comments || graded.feedback,
            explanation: question.explanation,
            gradedBy: graded.method,
            correctAnswer: question.correctAnswer,
            selectedAnswer: rawUserAnswer,
            reviewSuggestion,
          };
        }
      }

      // Record QuizSubmission in database
      const sub = await prisma.quizSubmission.create({
        data: {
          quizId: quiz.id,
          questionId: question.id,
          userId: req.user.userId,
          userAnswer: isUnanswered ? "Unanswered" : rawUserAnswer,
          isCorrect,
          scoreEarned,
          evalFeedback: JSON.stringify(evalFeedback),
        },
      });

      evaluatedSubmissions.push({
        id: sub.id,
        questionId: question.id,
        prompt: question.prompt,
        questionType: question.questionType,
        conceptId: question.conceptId || null,
        conceptName: questionConceptName,
        difficultyScore: question.difficultyScore ?? 0.5,
        userAnswer: isUnanswered ? "Unanswered" : rawUserAnswer,
        correctAnswer: correctAnswerDisplay,
        isCorrect,
        scoreEarned,
        isUnanswered,
        evalFeedback,
      });
    }

    // ---- Aggregated performance --------------------------------------------
    const total = quiz.questions.length;
    const correctCount = evaluatedSubmissions.filter((s) => s.isCorrect).length;
    const unansweredCount = evaluatedSubmissions.filter((s) => s.isUnanswered).length;
    const incorrectCount = total - correctCount - unansweredCount;

    // Accuracy = strictly correct answers (kept stable for stored quiz.score).
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    // Mastery = average per-question score, so open-ended depth earns partial credit
    // instead of collapsing to a binary pass/fail.
    const totalScoreEarned = evaluatedSubmissions.reduce((acc, s) => acc + (s.scoreEarned || 0), 0);
    const weightedPercentage = total > 0 ? Math.round(totalScoreEarned / total) : 0;

    // Per-topic breakdown so the learner can see which project topics are weak.
    const conceptBreakdownMap = new Map();
    for (const sub of evaluatedSubmissions) {
      const key = sub.conceptId || sub.conceptName || "unmapped";
      if (!conceptBreakdownMap.has(key)) {
        conceptBreakdownMap.set(key, {
          conceptId: sub.conceptId || null,
          conceptName: sub.conceptName || "General",
          total: 0,
          scoreEarned: 0,
          correct: 0,
        });
      }
      const bucket = conceptBreakdownMap.get(key);
      bucket.total += 1;
      bucket.scoreEarned += sub.scoreEarned || 0;
      if (sub.isCorrect) bucket.correct += 1;
    }
    const conceptBreakdown = [...conceptBreakdownMap.values()].map((b) => ({
      ...b,
      percentage: Math.round(b.scoreEarned / b.total),
    }));

    // Immediately mark quiz COMPLETED in database with exact validated score
    await prisma.quiz.update({
      where: { id: quiz.id },
      data: {
        status: "COMPLETED",
        score: percentage,
        completedAt: new Date(),
      },
    });

    // Synchronous mastery ingestion (REQ-049, REQ-051):
    // Immediately compute and persist per-concept mastery deltas, logs, and recommendations
    // so returning to /growth, /analytics, or the project dashboard reflects the updated state instantly.
    const submissionsByConcept = new Map();
    for (const sub of evaluatedSubmissions) {
      const conceptId = sub.conceptId;
      if (!conceptId) continue;
      if (!submissionsByConcept.has(conceptId)) submissionsByConcept.set(conceptId, []);
      submissionsByConcept.get(conceptId).push(sub);
    }

    const updatedMasteries = [];
    for (const [conceptId, conceptSubmissions] of submissionsByConcept) {
      const answeredCount = conceptSubmissions.filter((s) => !s.isUnanswered).length;
      const averageScore = Math.round(
        conceptSubmissions.reduce((acc, s) => acc + (s.scoreEarned || 0), 0) / conceptSubmissions.length
      );

      const existing = await prisma.conceptMastery.findFirst({
        where: { conceptId, userId: req.user.userId, projectId: quiz.projectId },
      });
      if (!existing) continue;

      const delta = averageScore >= 70 ? 15.0 : averageScore >= 40 ? -5.0 : -10.0;
      const newScore = Math.max(0, Math.min(100, existing.masteryScore + delta));
      const trend = newScore >= 75 ? "IMPROVING" : newScore >= 50 ? "STABLE" : "REQUIRING_ATTENTION";

      await prisma.conceptMastery.update({
        where: { id: existing.id },
        data: {
          masteryScore: newScore,
          confidenceScore: Number((answeredCount / conceptSubmissions.length).toFixed(2)),
          trend,
          lastAssessedAt: new Date(),
        },
      });

      await prisma.masteryHistoryLog.create({
        data: {
          masteryId: existing.id,
          conceptId,
          projectId: quiz.projectId,
          userId: req.user.userId,
          previousScore: existing.masteryScore,
          newScore,
          sourceType: "QUIZ",
        },
      });

      updatedMasteries.push({
        conceptId,
        conceptName: conceptNameById.get(conceptId) || "General",
        previousScore: existing.masteryScore,
        newScore,
        trend,
        delta,
      });
    }

    // Refresh targeted recommendation for the weakest concept (REQ-055, REQ-056)
    try {
      const weakConcept = await prisma.conceptMastery.findFirst({
        where: { projectId: quiz.projectId, userId: req.user.userId, trend: "REQUIRING_ATTENTION" },
        include: { concept: true },
      });

      if (weakConcept && weakConcept.concept) {
        await prisma.recommendation.create({
          data: {
            projectId: quiz.projectId,
            userId: req.user.userId,
            conceptId: weakConcept.conceptId,
            title: `Reinforce ${weakConcept.concept.name}`,
            message: `Your current mastery of ${weakConcept.concept.name} is ${weakConcept.masteryScore.toFixed(0)}%. Review your notes and take another short quiz to improve retention.`,
            actionType: "TAKE_QUIZ",
            actionTargetId: weakConcept.conceptId,
            status: "ACTIVE",
          },
        });
      }

      await prisma.learningEvent.create({
        data: {
          userId: req.user.userId,
          projectId: quiz.projectId,
          eventType: "QUIZ_COMPLETED",
          payload: JSON.stringify({
            quizId: quiz.id,
            score: percentage,
            weightedPercentage,
            totalQuestions: total,
            correctCount,
            updatedMasteries,
          }),
        },
      });
    } catch (e) {
      console.warn("[Quiz Submit] Background logging warning:", e.message);
    }

    return apiSuccess(res, {
      quizId: quiz.id,
      score: correctCount,
      total,
      percentage,
      weightedPercentage,
      totalScoreEarned,
      correct: correctCount,
      incorrect: incorrectCount,
      unanswered: unansweredCount,
      conceptBreakdown,
      updatedMasteries,
      submissions: evaluatedSubmissions,
      results: evaluatedSubmissions,
    });
  } catch (err) {
    next(err);
  }
});
