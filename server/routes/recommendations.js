import { Router } from "express";
import { prisma } from "../lib/db.js";
import { authenticate } from "../middleware/authenticate.js";
import { apiSuccess } from "../lib/response.js";
import { NotFoundError } from "../lib/errors.js";
import { getAIProvider } from "../lib/ai.js";

export const recommendationsRouter = Router();
recommendationsRouter.use(authenticate);

// GET /api/recommendations/:projectId (REQ-055, REQ-056)
recommendationsRouter.get("/:projectId", async (req, res, next) => {
  try {
    let recommendations = await prisma.recommendation.findMany({
      where: { projectId: req.params.projectId, userId: req.user.userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    // If no active recommendation, synthesize one (REQ-055)
    if (recommendations.length === 0) {
      const project = await prisma.project.findFirst({
        where: { id: req.params.projectId, userId: req.user.userId },
        include: {
          concepts: {
            include: { masteryRecords: { where: { userId: req.user.userId } } },
          },
        },
      });

      if (project) {
        const ai = getAIProvider();
        const synth = await ai.generateStructured(
          `Synthesize actionable learning recommendation for project: "${project.name}" (Goal: "${project.learningGoal}")`
        );
        const data = synth.data;

        const rec = await prisma.recommendation.create({
          data: {
            projectId: project.id,
            userId: req.user.userId,
            title: data.title || "Continue Your Learning Journey",
            message: data.message || "Review core concepts and complete an assessment to measure your growth.",
            actionType: data.actionType || "TAKE_QUIZ",
            status: "ACTIVE",
          },
        });
        recommendations = [rec];
      }
    }

    return apiSuccess(res, { recommendations });
  } catch (err) {
    next(err);
  }
});

// POST /api/recommendations/:recommendationId/action (REQ-057, REQ-058)
recommendationsRouter.post("/:recommendationId/action", async (req, res, next) => {
  try {
    const rec = await prisma.recommendation.findFirst({
      where: { id: req.params.recommendationId, userId: req.user.userId },
    });
    if (!rec) throw new NotFoundError("Recommendation not found");

    const updated = await prisma.recommendation.update({
      where: { id: req.params.recommendationId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    return apiSuccess(res, { recommendation: updated });
  } catch (err) {
    next(err);
  }
});

