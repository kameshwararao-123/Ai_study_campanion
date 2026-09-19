import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { hashPassword, comparePassword, signToken } from "../lib/auth.js";
import { authenticate } from "../middleware/authenticate.js";
import { apiSuccess } from "../lib/response.js";
import { ConflictError, UnauthorizedError } from "../lib/errors.js";

export const authRouter = Router();

const RegisterSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(6).max(100),
  role: z.enum(["LEARNER", "ADMIN"]).optional().default("LEARNER"),
});

const LoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

// POST /api/auth/register (REQ-001)
authRouter.post("/register", async (req, res, next) => {
  try {
    const input = RegisterSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictError("An account with this email address already exists");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return apiSuccess(res, { user, token }, 201);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login (REQ-001)
authRouter.post("/login", async (req, res, next) => {
  try {
    const input = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isMatch = await comparePassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return apiSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me (REQ-001, REQ-002)
authRouter.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError("User session no longer valid");
    }

    return apiSuccess(res, { user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout (REQ-001)
authRouter.post("/logout", (req, res) => {
  return apiSuccess(res, { message: "Logged out successfully" });
});

