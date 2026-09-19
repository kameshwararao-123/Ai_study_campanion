import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "../lib/db.js";
import { authenticate } from "../middleware/authenticate.js";
import { apiSuccess } from "../lib/response.js";
import crypto from "node:crypto";
import { NotFoundError, ValidationError, ConflictError } from "../lib/errors.js";
import { backgroundQueue } from "../lib/queue.js";

export const materialsRouter = Router();
materialsRouter.use(authenticate);

// Ensure upload directory exists
const UPLOAD_DIR = path.resolve(
  process.env.UPLOADS_DIR || (process.env.VERCEL ? "/tmp/uploads" : "./uploads")
);
await fs.mkdir(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB (REQ-007)
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new ValidationError("Only PDF format documents are supported for ingestion"));
    }
  },
});

// GET /api/materials/project/:projectId (REQ-020, REQ-023)
materialsRouter.get("/project/:projectId", async (req, res, next) => {
  try {
    const materials = await prisma.learningMaterial.findMany({
      where: { projectId: req.params.projectId, userId: req.user.userId },
      include: {
        _count: { select: { chunks: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess(res, { materials });
  } catch (err) {
    next(err);
  }
});

// POST /api/materials/upload (REQ-017, REQ-019)
materialsRouter.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    const { projectId } = req.body;
    if (!projectId) throw new ValidationError("projectId is required");
    if (!req.file) throw new ValidationError("PDF file is required");

    // Verify project ownership (REQ-003)
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.userId },
    });
    if (!project) throw new NotFoundError("Project not found or access denied");

    // Compute SHA-256 hash for duplicate-job protection and idempotency
    const fileBytes = await fs.readFile(req.file.path);
    const fileHash = crypto.createHash("sha256").update(fileBytes).digest("hex");

    // Check for duplicate uploads within the same project
    const duplicate = await prisma.learningMaterial.findFirst({
      where: { projectId, fileHash },
    });
    if (duplicate && duplicate.status !== "FAILED") {
      throw new ConflictError(
        `Duplicate document: "${duplicate.filename}" has already been uploaded in this project (Current Status: ${duplicate.status})`,
        { existingMaterialId: duplicate.id, fileHash }
      );
    }

    const material = await prisma.learningMaterial.create({
      data: {
        projectId,
        userId: req.user.userId,
        filename: req.file.originalname,
        fileUrl: req.file.path,
        fileSizeBytes: req.file.size,
        fileHash,
        status: "QUEUED",
        retryCount: 0,
      },
    });

    // Enqueue asynchronous background ingestion job (REQ-019, REQ-069)
    await backgroundQueue.enqueue("PROCESS_MATERIAL", {
      materialId: material.id,
      projectId,
      userId: req.user.userId,
      filePath: req.file.path,
      fileHash,
    });

    return apiSuccess(res, { material }, 202, { message: "Document uploaded and queued for processing" });
  } catch (err) {
    next(err);
  }
});

// POST /api/materials/:materialId/retry (Retry failed processing)
materialsRouter.post("/:materialId/retry", async (req, res, next) => {
  try {
    const material = await prisma.learningMaterial.findFirst({
      where: { id: req.params.materialId, userId: req.user.userId },
    });
    if (!material) throw new NotFoundError("Material not found or access denied");

    // Re-queue failed material
    const updated = await prisma.learningMaterial.update({
      where: { id: req.params.materialId },
      data: {
        status: "QUEUED",
        errorMessage: null,
        retryCount: { increment: 1 },
      },
    });

    await backgroundQueue.enqueue("PROCESS_MATERIAL", {
      materialId: updated.id,
      projectId: updated.projectId,
      userId: req.user.userId,
      filePath: updated.fileUrl,
      fileHash: updated.fileHash,
    });

    return apiSuccess(
      res,
      { material: updated },
      202,
      { message: "Document ingestion job re-queued for processing" }
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/materials/:materialId (REQ-020)
materialsRouter.get("/:materialId", async (req, res, next) => {
  try {
    const material = await prisma.learningMaterial.findFirst({
      where: { id: req.params.materialId, userId: req.user.userId },
      include: {
        chunks: {
          select: { id: true, chunkIndex: true, startPage: true, endPage: true, tokenCount: true },
        },
      },
    });
    if (!material) throw new NotFoundError("Material not found");
    return apiSuccess(res, { material });
  } catch (err) {
    next(err);
  }
});

// GET /api/materials/:materialId/chunks (REQ-026, REQ-035)
materialsRouter.get("/:materialId/chunks", async (req, res, next) => {
  try {
    const material = await prisma.learningMaterial.findFirst({
      where: { id: req.params.materialId, userId: req.user.userId },
    });
    if (!material) throw new NotFoundError("Material not found or access denied");

    const chunks = await prisma.documentChunk.findMany({
      where: { materialId: req.params.materialId, userId: req.user.userId },
      orderBy: { chunkIndex: "asc" },
    });

    const formattedChunks = chunks.map((c) => ({
      id: c.id,
      chunkIndex: c.chunkIndex,
      pageNumber: c.startPage,
      startPage: c.startPage,
      endPage: c.endPage,
      contentType: c.contentType,
      content: c.content,
      tokenCount: c.tokenCount,
      metadata: c.metadata,
      structuredData: c.structuredData,
    }));

    return apiSuccess(res, {
      materialId: req.params.materialId,
      totalChunks: chunks.length,
      chunks: formattedChunks,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/materials/:materialId (REQ-023)
materialsRouter.delete("/:materialId", async (req, res, next) => {
  try {
    const material = await prisma.learningMaterial.findFirst({
      where: { id: req.params.materialId, userId: req.user.userId },
    });
    if (!material) throw new NotFoundError("Material not found");

    // Remove file from disk
    try {
      await fs.unlink(material.fileUrl);
    } catch {}

    await prisma.learningMaterial.delete({ where: { id: req.params.materialId } });
    return apiSuccess(res, { message: "Material and associated chunks deleted successfully" });
  } catch (err) {
    next(err);
  }
});

