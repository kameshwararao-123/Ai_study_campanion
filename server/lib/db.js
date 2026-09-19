import "dotenv/config";
import mongoose from "mongoose";
import * as models from "../models/index.js";

export * from "../models/index.js";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  "mongodb://localhost:27017/ai_study_companion";

let isConnected = false;
const inMemoryStore = new Map();

function getStore(modelName) {
  if (!inMemoryStore.has(modelName)) {
    inMemoryStore.set(modelName, new Map());
  }
  return inMemoryStore.get(modelName);
}

export async function connectDB(uri = MONGODB_URI) {
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return mongoose.connection;
  }

  // If URI starts with file: or sqlite, use default mongodb URI
  const mongoUri = uri.startsWith("file:") ? "mongodb://localhost:27017/ai_study_companion" : uri;
  const isAtlas = mongoUri.startsWith("mongodb+srv://");
  const safeUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: isAtlas ? 10000 : 2500,
      connectTimeoutMS: isAtlas ? 10000 : 2500,
    });
    isConnected = true;
    console.log(`🍃 Connected to MongoDB Atlas/Database at ${safeUri}`);
    return conn;
  } catch (err) {
    isConnected = false;
    console.warn(
      `⚠️ MongoDB connection at ${safeUri} could not be established (${err.message}). Running with in-memory persistence adapter.`
    );
    return null;
  }
}

// Auto-connect if not in test
if (process.env.NODE_ENV !== "test") {
  connectDB().catch(() => {});
}

// Helper for deep cloning & formatting documents
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

// Check where match
function matchesWhere(item, where) {
  if (!where || Object.keys(where).length === 0) return true;

  for (const [key, val] of Object.entries(where)) {
    if (val === undefined) continue;

    if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      // Comparison operator object
      const itemVal = item[key];
      for (const [op, opVal] of Object.entries(val)) {
        if (op === "equals" && itemVal !== opVal) return false;
        if (op === "not" && itemVal === opVal) return false;
        if (op === "gt" && !(itemVal > opVal)) return false;
        if (op === "gte" && !(itemVal >= opVal)) return false;
        if (op === "lt" && !(itemVal < opVal)) return false;
        if (op === "lte" && !(itemVal <= opVal)) return false;
        if (op === "in" && (!Array.isArray(opVal) || !opVal.includes(itemVal))) return false;
      }
      continue;
    }

    if ((key === "id" || key === "chunkId") && item.id !== val && item._id !== val && item.chunkId !== val) {
      return false;
    }

    if ((key === "materialId" || key === "documentId") && item.materialId !== val && item.documentId !== val) {
      return false;
    }

    if (key !== "id" && key !== "chunkId" && key !== "materialId" && key !== "documentId") {
      if (val instanceof Date) {
        const itemDate = item[key] ? new Date(item[key]).getTime() : null;
        if (itemDate !== val.getTime()) return false;
      } else if (item[key] !== val) {
        return false;
      }
    }
  }

  return true;
}

// Apply relations & selects
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

function createModelAdapter(modelName, MongooseModel) {
  return {
    async findUnique({ where, select, include } = {}) {
      return this.findFirst({ where, select, include });
    },

    async findFirst({ where, select, include, orderBy } = {}) {
      if (mongoose.connection.readyState === 1) {
        try {
          const query = { ...where };
          if (query.id) {
            query._id = query.id;
            delete query.id;
          }
          let q = MongooseModel.findOne(query);
          if (orderBy) {
            const sort = {};
            for (const [k, v] of Object.entries(orderBy)) {
              sort[k] = v === "desc" ? -1 : 1;
            }
            q = q.sort(sort);
          }
          const doc = await q.lean().exec();
          if (doc) {
            const formatted = formatDoc(doc);
            if (include) {
              const [withInc] = await applyIncludes(modelName, [formatted], include, prisma);
              return withInc;
            }
            return formatted;
          }
        } catch (e) {
          // fallback to in-memory if query error
        }
      }

      // In-memory fallback
      const store = getStore(modelName);
      let matches = [];
      for (const item of store.values()) {
        if (matchesWhere(item, where)) {
          matches.push(formatDoc(item));
        }
      }

      if (orderBy) {
        const [field, dir] = Object.entries(orderBy)[0] || [];
        if (field) {
          matches.sort((a, b) => {
            const va = a[field] ?? 0;
            const vb = b[field] ?? 0;
            return dir === "desc" ? (va < vb ? 1 : -1) : (va > vb ? 1 : -1);
          });
        }
      }

      const match = matches[0] || null;
      if (match && include) {
        const [withInc] = await applyIncludes(modelName, [match], include, prisma);
        return withInc;
      }
      return match;
    },

    async findMany({ where, select, include, orderBy, take } = {}) {
      if (mongoose.connection.readyState === 1) {
        try {
          const query = {};
          if (where) {
            for (const [k, v] of Object.entries(where)) {
              if (k === "id") query._id = v;
              else if (v && typeof v === "object" && v.gte !== undefined) query[k] = { $gte: v.gte };
              else query[k] = v;
            }
          }
          let q = MongooseModel.find(query);
          if (orderBy) {
            const sort = {};
            for (const [k, v] of Object.entries(orderBy)) {
              sort[k] = v === "desc" ? -1 : 1;
            }
            q = q.sort(sort);
          }
          if (take) q = q.limit(take);
          const docs = await q.lean().exec();
          const formatted = docs.map(formatDoc);
          if (include) {
            return applyIncludes(modelName, formatted, include, prisma);
          }
          return formatted;
        } catch (e) {
          // fallback
        }
      }

      const store = getStore(modelName);
      let results = [];
      for (const item of store.values()) {
        if (matchesWhere(item, where)) {
          results.push(formatDoc(item));
        }
      }

      if (orderBy) {
        const [field, dir] = Object.entries(orderBy)[0] || [];
        if (field) {
          results.sort((a, b) => {
            const va = a[field] ?? 0;
            const vb = b[field] ?? 0;
            return dir === "desc" ? (va < vb ? 1 : -1) : (va > vb ? 1 : -1);
          });
        }
      }

      if (take && take > 0) {
        results = results.slice(0, take);
      }

      if (include) {
        return applyIncludes(modelName, results, include, prisma);
      }
      return results;
    },

    async create({ data, select } = {}) {
      const now = new Date();
      const id = data.id || data._id || new mongoose.Types.ObjectId().toString();
      const payload = {
        ...data,
        _id: id,
        id,
        createdAt: data.createdAt || now,
        updatedAt: data.updatedAt || now,
      };

      if (mongoose.connection.readyState === 1) {
        try {
          const doc = new MongooseModel(payload);
          await doc.save();
          const formatted = formatDoc(doc.toObject ? doc.toObject() : doc);
          getStore(modelName).set(id, formatted);
          return formatted;
        } catch (e) {
          // fallback
        }
      }

      const formatted = formatDoc(payload);
      getStore(modelName).set(id, formatted);
      return formatted;
    },

    async update({ where, data, select } = {}) {
      const existing = await this.findFirst({ where });
      if (!existing) {
        throw new Error(`Record to update not found in ${modelName}`);
      }

      const updatedFields = {};
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === "object" && v.increment !== undefined) {
          updatedFields[k] = (existing[k] || 0) + v.increment;
        } else {
          updatedFields[k] = v;
        }
      }
      updatedFields.updatedAt = new Date();

      if (mongoose.connection.readyState === 1) {
        try {
          const targetId = existing.id || existing._id;
          const doc = await MongooseModel.findByIdAndUpdate(
            targetId,
            { $set: updatedFields },
            { returnDocument: "after", lean: true }
          ).exec();
          if (doc) {
            const formatted = formatDoc(doc);
            getStore(modelName).set(targetId, formatted);
            return formatted;
          }
        } catch (e) {
          // fallback
        }
      }

      const merged = { ...existing, ...updatedFields };
      const formatted = formatDoc(merged);
      getStore(modelName).set(formatted.id, formatted);
      return formatted;
    },

    async upsert({ where, create, update } = {}) {
      const existing = await this.findFirst({ where });
      if (existing) {
        return this.update({ where: { id: existing.id }, data: update });
      }
      return this.create({ data: create });
    },

    async delete({ where } = {}) {
      const existing = await this.findFirst({ where });
      if (!existing) {
        throw new Error(`Record to delete not found in ${modelName}`);
      }
      const targetId = existing.id || existing._id;

      if (mongoose.connection.readyState === 1) {
        try {
          await MongooseModel.findByIdAndDelete(targetId).exec();
        } catch (e) {}
      }

      getStore(modelName).delete(targetId);
      return existing;
    },

    async deleteMany({ where } = {}) {
      const items = await this.findMany({ where });
      for (const it of items) {
        await this.delete({ where: { id: it.id } });
      }
      return { count: items.length };
    },

    async count({ where } = {}) {
      if (mongoose.connection.readyState === 1) {
        try {
          const query = {};
          if (where) {
            for (const [k, v] of Object.entries(where)) {
              if (k === "id") query._id = v;
              else if (v && typeof v === "object" && v.gte !== undefined) query[k] = { $gte: v.gte };
              else query[k] = v;
            }
          }
          return await MongooseModel.countDocuments(query).exec();
        } catch (e) {}
      }

      const items = await this.findMany({ where });
      return items.length;
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
