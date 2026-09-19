import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { authenticate } from "../middleware/authenticate.js";
import { apiSuccess } from "../lib/response.js";
import { NotFoundError } from "../lib/errors.js";

export const projectsRouter = Router();
projectsRouter.use(authenticate);

const ProjectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters").max(100),
  description: z.string().min(5, "Description must be at least 5 characters").max(500),
  learningGoal: z.string().min(5, "Learning goal must be defined").max(500),
});

// GET /api/projects/space/:spaceId (REQ-013)
projectsRouter.get("/space/:spaceId", async (req, res, next) => {
  try {
    const space = await prisma.space.findFirst({
      where: { id: req.params.spaceId, userId: req.user.userId },
    });
    if (!space) throw new NotFoundError("Space not found or access denied");

    const projects = await prisma.project.findMany({
      where: { spaceId: req.params.spaceId, userId: req.user.userId },
      include: {
        _count: { select: { materials: true, quizzes: true, concepts: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return apiSuccess(res, { projects });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/space/:spaceId (REQ-013, REQ-016)
projectsRouter.post("/space/:spaceId", async (req, res, next) => {
  try {
    const space = await prisma.space.findFirst({
      where: { id: req.params.spaceId, userId: req.user.userId },
    });
    if (!space) throw new NotFoundError("Space not found or access denied");

    const input = ProjectSchema.parse(req.body);
    const project = await prisma.project.create({
      data: {
        spaceId: req.params.spaceId,
        userId: req.user.userId,
        name: input.name,
        description: input.description,
        learningGoal: input.learningGoal,
      },
    });

    // Initialize persistent learner context (REQ-059)
    await prisma.persistentLearnerContext.create({
      data: {
        projectId: project.id,
        userId: req.user.userId,
      },
    });

    // Emit PROJECT_CREATED event (REQ-063)
    await prisma.learningEvent.create({
      data: {
        userId: req.user.userId,
        projectId: project.id,
        eventType: "PROJECT_CREATED",
        payload: JSON.stringify({ projectName: project.name, learningGoal: project.learningGoal }),
      },
    });

    return apiSuccess(res, { project }, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:projectId (REQ-014)
projectsRouter.get("/:projectId", async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, userId: req.user.userId },
      include: {
        space: true,
        concepts: {
          include: {
            masteryRecords: { where: { userId: req.user.userId } },
          },
        },
        recommendations: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
        _count: {
          select: { materials: true, quizzes: true, tutorSessions: true, concepts: true },
        },
      },
    });
    if (!project) throw new NotFoundError("Project not found or access denied");

    // Calculate overall project mastery
    const masteryScores = project.concepts
      .map((c) => c.masteryRecords[0]?.masteryScore ?? 0)
      .filter((s) => s > 0);
    const overallProgress =
      masteryScores.length > 0
        ? Math.round(masteryScores.reduce((a, b) => a + b, 0) / masteryScores.length)
        : 0;

    return apiSuccess(res, { project, overallProgress });
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:projectId (REQ-016)
projectsRouter.put("/:projectId", async (req, res, next) => {
  try {
    const input = ProjectSchema.parse(req.body);
    const existing = await prisma.project.findFirst({
      where: { id: req.params.projectId, userId: req.user.userId },
    });
    if (!existing) throw new NotFoundError("Project not found or access denied");

    const project = await prisma.project.update({
      where: { id: req.params.projectId },
      data: {
        name: input.name,
        description: input.description,
        learningGoal: input.learningGoal,
      },
    });
    return apiSuccess(res, { project });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:projectId
projectsRouter.delete("/:projectId", async (req, res, next) => {
  try {
    const existing = await prisma.project.findFirst({
      where: { id: req.params.projectId, userId: req.user.userId },
    });
    if (!existing) throw new NotFoundError("Project not found or access denied");

    await prisma.project.delete({ where: { id: req.params.projectId } });
    return apiSuccess(res, { message: "Project deleted successfully" });
  } catch (err) {
    next(err);
  }
});

