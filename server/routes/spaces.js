import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { authenticate } from "../middleware/authenticate.js";
import { apiSuccess } from "../lib/response.js";
import { NotFoundError } from "../lib/errors.js";

export const spacesRouter = Router();
spacesRouter.use(authenticate);

const SpaceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().min(5, "Description must be at least 5 characters").max(500),
  visualConfig: z.object({
    color: z.string().optional(),
    icon: z.string().optional(),
  }).optional(),
});

// GET /api/spaces (REQ-011)
spacesRouter.get("/", async (req, res, next) => {
  try {
    const spaces = await prisma.space.findMany({
      where: { userId: req.user.userId },
      include: {
        _count: { select: { projects: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return apiSuccess(res, { spaces });
  } catch (err) {
    next(err);
  }
});

// POST /api/spaces (REQ-009, REQ-010)
spacesRouter.post("/", async (req, res, next) => {
  try {
    const input = SpaceSchema.parse(req.body);
    const space = await prisma.space.create({
      data: {
        userId: req.user.userId,
        name: input.name,
        description: input.description,
        visualConfig: input.visualConfig ? JSON.stringify(input.visualConfig) : null,
      },
    });
    return apiSuccess(res, { space }, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/spaces/:spaceId (REQ-012)
spacesRouter.get("/:spaceId", async (req, res, next) => {
  try {
    const space = await prisma.space.findFirst({
      where: { id: req.params.spaceId, userId: req.user.userId },
      include: {
        projects: {
          orderBy: { updatedAt: "desc" },
          include: {
            _count: { select: { materials: true, quizzes: true, concepts: true } },
          },
        },
      },
    });
    if (!space) throw new NotFoundError("Space not found or access denied");
    return apiSuccess(res, { space });
  } catch (err) {
    next(err);
  }
});

// PUT /api/spaces/:spaceId (REQ-011)
spacesRouter.put("/:spaceId", async (req, res, next) => {
  try {
    const input = SpaceSchema.parse(req.body);
    const existing = await prisma.space.findFirst({
      where: { id: req.params.spaceId, userId: req.user.userId },
    });
    if (!existing) throw new NotFoundError("Space not found or access denied");

    const space = await prisma.space.update({
      where: { id: req.params.spaceId },
      data: {
        name: input.name,
        description: input.description,
        visualConfig: input.visualConfig ? JSON.stringify(input.visualConfig) : existing.visualConfig,
      },
    });
    return apiSuccess(res, { space });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/spaces/:spaceId (REQ-011)
spacesRouter.delete("/:spaceId", async (req, res, next) => {
  try {
    const existing = await prisma.space.findFirst({
      where: { id: req.params.spaceId, userId: req.user.userId },
    });
    if (!existing) throw new NotFoundError("Space not found or access denied");

    await prisma.space.delete({ where: { id: req.params.spaceId } });
    return apiSuccess(res, { message: "Space deleted successfully" });
  } catch (err) {
    next(err);
  }
});

