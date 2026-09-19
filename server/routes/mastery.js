import { Router } from "express";
import { prisma } from "../lib/db.js";
import { authenticate } from "../middleware/authenticate.js";
import { apiSuccess } from "../lib/response.js";
import { NotFoundError } from "../lib/errors.js";

export const masteryRouter = Router();
masteryRouter.use(authenticate);

// GET /api/mastery/:projectId (REQ-050, REQ-051)
masteryRouter.get("/:projectId", async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, userId: req.user.userId },
      include: {
        concepts: {
          include: {
            masteryRecords: { where: { userId: req.user.userId } },
          },
        },
      },
    });
    if (!project) throw new NotFoundError("Project not found");

    const conceptsWithMastery = project.concepts.map((c) => ({
      id: c.id,
      name: c.name,
      definition: c.definition,
      sourcePage: c.sourcePage,
      masteryScore: c.masteryRecords[0]?.masteryScore ?? 40.0,
      confidenceScore: c.masteryRecords[0]?.confidenceScore ?? 0.5,
      trend: c.masteryRecords[0]?.trend ?? "REQUIRING_ATTENTION",
      lastAssessedAt: c.masteryRecords[0]?.lastAssessedAt ?? null,
    }));

    return apiSuccess(res, { concepts: conceptsWithMastery });
  } catch (err) {
    next(err);
  }
});

// GET /api/mastery/:projectId/growth (REQ-053, REQ-054)
masteryRouter.get("/:projectId/growth", async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, userId: req.user.userId },
      include: {
        concepts: {
          include: {
            masteryRecords: { where: { userId: req.user.userId } },
          },
        },
      },
    });
    if (!project) throw new NotFoundError("Project not found");

    const improving = [];
    const stable = [];
    const requiringAttention = [];

    for (const c of project.concepts) {
      const score = c.masteryRecords[0]?.masteryScore ?? 40.0;
      const trend = c.masteryRecords[0]?.trend ?? "REQUIRING_ATTENTION";
      const item = {
        id: c.id,
        name: c.name,
        definition: c.definition,
        masteryScore: score,
        trend,
      };

      if (trend === "IMPROVING" || score >= 75) {
        improving.push(item);
      } else if (trend === "STABLE" || (score >= 50 && score < 75)) {
        stable.push(item);
      } else {
        requiringAttention.push(item);
      }
    }

    return apiSuccess(res, {
      growth: {
        improving,
        stable,
        requiringAttention,
      },
    });
  } catch (err) {
    next(err);
  }
});

