import { Router } from "express";
import { prisma } from "../lib/db.js";
import { authenticate } from "../middleware/authenticate.js";
import { apiSuccess } from "../lib/response.js";

export const analyticsRouter = Router();
analyticsRouter.use(authenticate);

// GET /api/analytics/project/:projectId (REQ-065)
analyticsRouter.get("/project/:projectId", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    const quizzes = await prisma.quiz.findMany({
      where: { projectId, userId, status: "COMPLETED" },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, score: true, completedAt: true },
    });

    const events = await prisma.learningEvent.findMany({
      where: { projectId, userId },
      orderBy: { timestamp: "desc" },
      take: 20,
    });

    const concepts = await prisma.conceptMastery.findMany({
      where: { projectId, userId },
      include: { concept: true },
    });

    const aiLogs = await prisma.aITelemetryLog.findMany({
      where: { projectId, userId },
      select: { totalTokens: true, latencyMs: true, estimatedCostUsd: true, featureName: true },
    });

    return apiSuccess(res, {
      quizHistory: quizzes,
      events,
      conceptMastery: concepts.map((c) => ({
        name: c.concept.name,
        score: c.masteryScore,
        trend: c.trend,
      })),
      aiStats: {
        totalCalls: aiLogs.length,
        totalTokens: aiLogs.reduce((a, b) => a + b.totalTokens, 0),
        totalCost: aiLogs.reduce((a, b) => a + b.estimatedCostUsd, 0),
        avgLatencyMs:
          aiLogs.length > 0 ? Math.round(aiLogs.reduce((a, b) => a + b.latencyMs, 0) / aiLogs.length) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/global (REQ-066, REQ-082)
analyticsRouter.get("/global", async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const spacesCount = await prisma.space.count({ where: { userId } });
    const projectsCount = await prisma.project.count({ where: { userId } });
    const quizzesCount = await prisma.quiz.count({ where: { userId, status: "COMPLETED" } });
    const conceptsCount = await prisma.conceptMastery.count({ where: { userId, masteryScore: { gte: 75 } } });

    const recentProjects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: {
        space: true,
        _count: { select: { materials: true, quizzes: true } },
      },
    });

    const weakAreas = await prisma.conceptMastery.findMany({
      where: { userId, trend: "REQUIRING_ATTENTION" },
      include: { concept: true, project: true },
      take: 5,
    });

    return apiSuccess(res, {
      summary: {
        totalSpaces: spacesCount,
        totalProjects: projectsCount,
        completedQuizzes: quizzesCount,
        masteredConcepts: conceptsCount,
      },
      recentProjects,
      weakAreas: weakAreas.map((w) => ({
        conceptName: w.concept.name,
        projectName: w.project.name,
        projectId: w.projectId,
        score: w.masteryScore,
      })),
    });
  } catch (err) {
    next(err);
  }
});

