import { Router } from "express";
import { prisma } from "../lib/db.js";
import { authenticate, requireAdmin } from "../middleware/authenticate.js";
import { apiSuccess } from "../lib/response.js";
import { NotFoundError } from "../lib/errors.js";
import { backgroundQueue } from "../lib/queue.js";

export const adminRouter = Router();
adminRouter.use(authenticate);
adminRouter.use(requireAdmin); // Strictly protected by RBAC (REQ-002, REQ-083)

// GET /api/admin/overview (REQ-083)
adminRouter.get("/overview", async (req, res, next) => {
  try {
    const usersCount = await prisma.user.count();
    const spacesCount = await prisma.space.count();
    const projectsCount = await prisma.project.count();
    const jobsCount = await prisma.backgroundJob.count();
    const failedJobsCount = await prisma.backgroundJob.count({ where: { status: "FAILED" } });

    const aiStats = await prisma.aITelemetryLog.aggregate({
      _sum: { totalTokens: true, estimatedCostUsd: true },
      _count: { id: true },
      _avg: { latencyMs: true },
    });

    return apiSuccess(res, {
      kpis: {
        totalUsers: usersCount,
        totalSpaces: spacesCount,
        totalProjects: projectsCount,
        totalAIRequests: aiStats._count.id || 0,
        totalTokens: aiStats._sum.totalTokens || 0,
        totalSpendUsd: Number((aiStats._sum.estimatedCostUsd || 0).toFixed(4)),
        avgLatencyMs: Math.round(aiStats._avg.latencyMs || 0),
        activeJobs: jobsCount,
        failedJobs: failedJobsCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users (REQ-084)
adminRouter.get("/users", async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: { spaces: true, projects: true, submissions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess(res, { users });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users/:userId (REQ-084)
adminRouter.get("/users/:userId", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      include: {
        spaces: {
          include: { projects: true },
        },
        submissions: {
          take: 10,
          orderBy: { answeredAt: "desc" },
        },
        telemetry: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!user) throw new NotFoundError("User not found");
    return apiSuccess(res, { user });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/activity (REQ-085)
adminRouter.get("/activity", async (req, res, next) => {
  try {
    const { eventType, userId, projectId } = req.query;
    const where = {};
    if (eventType) where.eventType = String(eventType);
    if (userId) where.userId = String(userId);
    if (projectId) where.projectId = String(projectId);

    const events = await prisma.learningEvent.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: 50,
      include: { project: true },
    });

    return apiSuccess(res, { events });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/ai/usage (REQ-075, REQ-076, REQ-077)
adminRouter.get("/ai/usage", async (req, res, next) => {
  try {
    const logs = await prisma.aITelemetryLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { email: true, name: true } } },
    });
    return apiSuccess(res, { logs });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/jobs (REQ-073, REQ-086)
adminRouter.get("/jobs", async (req, res, next) => {
  try {
    const jobs = await prisma.backgroundJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return apiSuccess(res, { jobs });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/jobs/:jobId/retry (REQ-086)
adminRouter.post("/jobs/:jobId/retry", async (req, res, next) => {
  try {
    const job = await prisma.backgroundJob.findUnique({
      where: { id: req.params.jobId },
    });
    if (!job) throw new NotFoundError("Job not found");

    const updated = await prisma.backgroundJob.update({
      where: { id: req.params.jobId },
      data: { status: "QUEUED", errorMessage: null },
    });

    setImmediate(() => backgroundQueue.processNext());
    return apiSuccess(res, { job: updated });
  } catch (err) {
    next(err);
  }
});

