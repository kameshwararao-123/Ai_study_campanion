import "dotenv/config";
import mongoose from "mongoose";
import * as models from "../models/index.js";

export * from "../models/index.js";

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "";

// Only one connection attempt may be in flight at a time.
let connecting = null;

function redact(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * MongoDB Atlas is the ONLY persistence layer.
 *
 * There is deliberately no in-memory fallback: silently serving reads/writes
 * from a volatile Map made rejected writes look successful (ingestion reported
 * "chunks stored" while nothing reached Atlas, so the tutor then refused every
 * question). A missing database must surface as an explicit error, never as
 * phantom data.
 */
function assertConnected(modelName) {
  if (!isDbConnected()) {
    throw new Error(
      `[db] MongoDB Atlas is not connected (readyState=${mongoose.connection.readyState}); ` +
        `refusing to serve ${modelName} from a volatile in-memory store. ` +
        `Verify MONGODB_URI and network access, then retry.`
    );
  }
}

/**
 * Waits for an in-flight (or not-yet-started) Atlas connection before a query.
 * Startup code and tests often issue their first query while the connection is
 * still being established; waiting is safe, a silent in-memory fallback is not.
 */
async function ensureConnected(modelName) {
  if (isDbConnected()) return;

  if (connecting) {
    try {
      await connecting;
    } catch (_) {
      // fall through to the explicit error below
    }
  } else if (mongoose.connection.readyState === 0) {
    try {
      await connectDB();
    } catch (_) {
      // fall through to the explicit error below
    }
  }

  assertConnected(modelName);
}

export async function connectDB(uri = MONGODB_URI) {
  if (isDbConnected()) return mongoose.connection;

  if (!uri || !/^mongodb(\+srv)?:\/\//i.test(uri)) {
    throw new Error(
      "[db] A MongoDB connection string is required. Set MONGODB_URI (MongoDB Atlas) in the environment."
    );
  }

  if (connecting) return connecting;

  const safeUri = redact(uri);
  const isAtlas = uri.startsWith("mongodb+srv://");

  connecting = mongoose
    .connect(uri, {
      // Force IPv4 to avoid IPv6 DNS resolution failures (common with Atlas SRV records)
      family: 4,
      serverSelectionTimeoutMS: isAtlas ? 30000 : 5000,
      connectTimeoutMS: isAtlas ? 30000 : 5000,
      socketTimeoutMS: isAtlas ? 45000 : 10000,
      heartbeatFrequencyMS: 10000,
    })
    .then((conn) => {
      console.log(`🍃 Connected to MongoDB at ${safeUri}`);
      return conn;
    })
    .catch((err) => {
      console.error(`❌ MongoDB connection to ${safeUri} failed: ${err.message}`);
      throw err;
    })
    .finally(() => {
      connecting = null;
    });

  return connecting;
}

// Auto-connect on import (server runtime). Tests connect explicitly via connectDB().
if (process.env.NODE_ENV !== "test") {
  connectDB().catch(() => {});
}

// ---- Query translation (Prisma-flavoured adapter -> Mongoose) ----------------

const MONGO_OPERATORS = {
  in: "$in",
  nin: "$nin",
  gt: "$gt",
  gte: "$gte",
  lt: "$lt",
  lte: "$lte",
  ne: "$ne",
  not: "$not",
  equals: "$eq",
};

/**
 * Translates a Prisma-style `where` object into a Mongo query.
 *
 * Also understands Prisma composite unique keys such as
 * `{ projectId_conceptId_userId: { projectId, conceptId, userId } }`, which the
 * ingestion pipeline uses to upsert baseline concept mastery.
 */
function toMongoQuery(where = {}) {
  const query = {};

  for (const [key, raw] of Object.entries(where)) {
    if (raw === undefined) continue;

    const isPlainObject =
      raw !== null && typeof raw === "object" && !Array.isArray(raw) && !(raw instanceof Date);

    // Composite unique key -> flatten to the individual fields it references.
    if (isPlainObject && !Object.keys(raw).some((k) => k in MONGO_OPERATORS)) {
      for (const [compositeKey, compositeValue] of Object.entries(raw)) {
        query[compositeKey === "id" ? "_id" : compositeKey] = compositeValue;
      }
      continue;
    }

    const field = key === "id" ? "_id" : key;

    if (isPlainObject) {
      const operators = {};
      let hasOperators = false;
      for (const [op, opValue] of Object.entries(raw)) {
        if (MONGO_OPERATORS[op]) {
          operators[MONGO_OPERATORS[op]] = opValue;
          hasOperators = true;
        }
      }
      if (hasOperators) {
        query[field] = operators;
        continue;
      }
    }

    query[field] = raw;
  }

  return query;
}

function toMongoSort(orderBy) {
  if (!orderBy) return null;
  const sort = {};
  for (const [key, dir] of Object.entries(orderBy)) {
    sort[key === "id" ? "_id" : key] = dir === "desc" ? -1 : 1;
  }
  return sort;
}

// ---- Document formatting ----------------------------------------------------

function formatDoc(raw) {
  if (!raw) return null;
  const doc = JSON.parse(JSON.stringify(raw));
  if (doc._id && !doc.id) {
    doc.id = doc._id.toString();
  }
  if (doc.materialId) {
    doc.documentId = doc.materialId;
  }
  if (doc.id) {
    doc.chunkId = doc.id;
  }
  return doc;
}

// ---- Relation hydration -----------------------------------------------------

async function applyIncludes(modelName, items, include, adapter) {
  if (!include || items.length === 0) return items;

  for (const item of items) {
    if (include._count && include._count.select) {
      item._count = item._count || {};
      for (const rel of Object.keys(include._count.select)) {
        if (modelName === "space" && rel === "projects") {
          item._count.projects = await adapter.project.count({ where: { spaceId: item.id } });
        } else if (modelName === "project") {
          if (rel === "materials") item._count.materials = await adapter.learningMaterial.count({ where: { projectId: item.id } });
          if (rel === "quizzes") item._count.quizzes = await adapter.quiz.count({ where: { projectId: item.id } });
          if (rel === "concepts") item._count.concepts = await adapter.concept.count({ where: { projectId: item.id } });
          if (rel === "tutorSessions") item._count.tutorSessions = await adapter.tutorSession.count({ where: { projectId: item.id } });
        } else if (modelName === "user") {
          if (rel === "spaces") item._count.spaces = await adapter.space.count({ where: { userId: item.id } });
          if (rel === "projects") item._count.projects = await adapter.project.count({ where: { userId: item.id } });
          if (rel === "submissions") item._count.submissions = await adapter.quizSubmission.count({ where: { userId: item.id } });
        } else if (modelName === "learningMaterial" && rel === "chunks") {
          item._count.chunks = await adapter.documentChunk.count({ where: { materialId: item.id } });
        }
      }
    }

    if (include.projects) {
      const opts = typeof include.projects === "object" ? include.projects : {};
      item.projects = await adapter.project.findMany({
        where: { spaceId: item.id, ...(opts.where || {}) },
        include: opts.include,
        orderBy: opts.orderBy,
        take: opts.take,
      });
    }

    if (include.space) {
      item.space = await adapter.space.findFirst({ where: { id: item.spaceId } });
    }

    if (include.user) {
      item.user = await adapter.user.findFirst({ where: { id: item.userId } });
    }

    if (include.concepts) {
      const opts = typeof include.concepts === "object" ? include.concepts : {};
      item.concepts = await adapter.concept.findMany({
        where: { projectId: item.id, ...(opts.where || {}) },
        include: opts.include,
        orderBy: opts.orderBy,
        take: opts.take,
      });
    }

    if (include.masteryRecords) {
      const opts = typeof include.masteryRecords === "object" ? include.masteryRecords : {};
      item.masteryRecords = await adapter.conceptMastery.findMany({
        where: { conceptId: item.id, ...(opts.where || {}) },
      });
    }

    if (include.concept) {
      item.concept = await adapter.concept.findFirst({ where: { id: item.conceptId } });
    }

    if (include.project) {
      item.project = await adapter.project.findFirst({ where: { id: item.projectId } });
    }

    if (include.questions) {
      const opts = typeof include.questions === "object" ? include.questions : {};
      item.questions = await adapter.quizQuestion.findMany({
        where: { quizId: item.id, ...(opts.where || {}) },
        orderBy: opts.orderBy || { sortOrder: "asc" },
      });
    }

    if (include.question) {
      item.question = await adapter.quizQuestion.findFirst({ where: { id: item.questionId } });
    }

    if (include.submissions) {
      const opts = typeof include.submissions === "object" ? include.submissions : {};
      item.submissions = await adapter.quizSubmission.findMany({
        where: { quizId: item.id, ...(opts.where || {}) },
        orderBy: opts.orderBy,
        take: opts.take,
      });
    }

    if (include.messages) {
      const opts = typeof include.messages === "object" ? include.messages : {};
      item.messages = await adapter.tutorMessage.findMany({
        where: { sessionId: item.id, ...(opts.where || {}) },
        orderBy: opts.orderBy || { createdAt: "asc" },
      });
    }

    if (include.chunks) {
      const opts = typeof include.chunks === "object" ? include.chunks : {};
      item.chunks = await adapter.documentChunk.findMany({
        where: { materialId: item.id, ...(opts.where || {}) },
        orderBy: opts.orderBy || { chunkIndex: "asc" },
      });
    }

    if (include.recommendations) {
      const opts = typeof include.recommendations === "object" ? include.recommendations : {};
      item.recommendations = await adapter.recommendation.findMany({
        where: { projectId: item.id, ...(opts.where || {}) },
        orderBy: opts.orderBy,
        take: opts.take,
      });
    }

    if (include.telemetry) {
      const opts = typeof include.telemetry === "object" ? include.telemetry : {};
      item.telemetry = await adapter.aITelemetryLog.findMany({
        where: { userId: item.id, ...(opts.where || {}) },
        orderBy: opts.orderBy,
        take: opts.take,
      });
    }

    if (include.material) {
      item.material = await adapter.learningMaterial.findFirst({ where: { id: item.materialId } });
    }
  }

  return items;
}

// ---- Model adapter ----------------------------------------------------------

function createModelAdapter(modelName, MongooseModel) {
  return {
    async findUnique({ where, select, include } = {}) {
      return this.findFirst({ where, select, include });
    },

    async findFirst({ where, select, include, orderBy } = {}) {
      await ensureConnected(modelName);

      let query = MongooseModel.findOne(toMongoQuery(where));
      const sort = toMongoSort(orderBy);
      if (sort) query = query.sort(sort);

      const doc = await query.lean().exec();
      if (!doc) return null;

      const formatted = formatDoc(doc);
      if (include) {
        const [withIncludes] = await applyIncludes(modelName, [formatted], include, prisma);
        return withIncludes;
      }
      return formatted;
    },

    async findMany({ where, select, include, orderBy, take } = {}) {
      await ensureConnected(modelName);

      let query = MongooseModel.find(toMongoQuery(where));
      const sort = toMongoSort(orderBy);
      if (sort) query = query.sort(sort);
      if (take) query = query.limit(take);

      const docs = await query.lean().exec();
      const formatted = docs.map(formatDoc);

      if (include) {
        return applyIncludes(modelName, formatted, include, prisma);
      }
      return formatted;
    },

    async create({ data, select } = {}) {
      await ensureConnected(modelName);

      const doc = new MongooseModel(data);
      await doc.save();
      return formatDoc(doc.toObject ? doc.toObject() : doc);
    },

    async update({ where, data, select } = {}) {
      await ensureConnected(modelName);

      const $set = {};
      const $inc = {};
      for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === "object" && value.increment !== undefined) {
          $inc[key] = value.increment;
        } else {
          $set[key] = value;
        }
      }
      $set.updatedAt = new Date();

      const updateDoc = Object.keys($inc).length > 0 ? { $set, $inc } : { $set };

      const doc = await MongooseModel.findOneAndUpdate(toMongoQuery(where), updateDoc, {
        returnDocument: "after",
        lean: true,
      }).exec();

      if (!doc) {
        throw new Error(`Record to update not found in ${modelName}`);
      }
      return formatDoc(doc);
    },

    async upsert({ where, create, update } = {}) {
      const existing = await this.findFirst({ where });
      if (existing) {
        return this.update({ where: { id: existing.id }, data: update });
      }
      return this.create({ data: create });
    },

    async delete({ where } = {}) {
      await ensureConnected(modelName);

      const existing = await this.findFirst({ where });
      if (!existing) {
        throw new Error(`Record to delete not found in ${modelName}`);
      }

      await MongooseModel.findByIdAndDelete(existing.id).exec();
      return existing;
    },

    async deleteMany({ where } = {}) {
      await ensureConnected(modelName);

      const result = await MongooseModel.deleteMany(toMongoQuery(where)).exec();
      return { count: result.deletedCount || 0 };
    },

    async count({ where } = {}) {
      await ensureConnected(modelName);
      return MongooseModel.countDocuments(toMongoQuery(where)).exec();
    },
  };
}

export const prisma = {
  user: createModelAdapter("user", models.User),
  space: createModelAdapter("space", models.Space),
  project: createModelAdapter("project", models.Project),
  learningMaterial: createModelAdapter("learningMaterial", models.LearningMaterial),
  documentChunk: createModelAdapter("documentChunk", models.DocumentChunk),
  knowledgeChunk: createModelAdapter("documentChunk", models.DocumentChunk),
  concept: createModelAdapter("concept", models.Concept),
  conceptMastery: createModelAdapter("conceptMastery", models.ConceptMastery),
  masteryHistoryLog: createModelAdapter("masteryHistoryLog", models.MasteryHistoryLog),
  tutorSession: createModelAdapter("tutorSession", models.TutorSession),
  tutorMessage: createModelAdapter("tutorMessage", models.TutorMessage),
  quiz: createModelAdapter("quiz", models.Quiz),
  quizQuestion: createModelAdapter("quizQuestion", models.QuizQuestion),
  quizSubmission: createModelAdapter("quizSubmission", models.QuizSubmission),
  persistentLearnerContext: createModelAdapter("persistentLearnerContext", models.PersistentLearnerContext),
  recommendation: createModelAdapter("recommendation", models.Recommendation),
  learningEvent: createModelAdapter("learningEvent", models.LearningEvent),
  aITelemetryLog: {
    ...createModelAdapter("aITelemetryLog", models.AITelemetryLog),
    async aggregate({ _sum, _count, _avg } = {}) {
      const logs = await this.findMany();
      const totalTokens = logs.reduce((a, b) => a + (b.totalTokens || 0), 0);
      const estimatedCostUsd = logs.reduce((a, b) => a + (b.estimatedCostUsd || 0), 0);
      const latencies = logs.map((l) => l.latencyMs || 0);
      const avgLatencyMs = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

      return {
        _sum: { totalTokens, estimatedCostUsd },
        _count: { id: logs.length },
        _avg: { latencyMs: avgLatencyMs },
      };
    },
  },
  aIEvaluationRecord: createModelAdapter("aIEvaluationRecord", models.AIEvaluationRecord),
  backgroundJob: createModelAdapter("backgroundJob", models.BackgroundJob),
};
