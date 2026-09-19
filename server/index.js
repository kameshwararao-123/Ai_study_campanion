import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { authRouter } from "./routes/auth.js";
import { spacesRouter } from "./routes/spaces.js";
import { projectsRouter } from "./routes/projects.js";
import { materialsRouter } from "./routes/materials.js";
import { tutorRouter } from "./routes/tutor.js";
import { quizRouter } from "./routes/quiz.js";
import { masteryRouter } from "./routes/mastery.js";
import { recommendationsRouter } from "./routes/recommendations.js";
import { analyticsRouter } from "./routes/analytics.js";
import { adminRouter } from "./routes/admin.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { connectDB } from "./lib/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST_PATH = path.resolve(__dirname, "../client/dist");

const app = express();
const PORT = process.env.PORT || 5000;

// Strict CORS whitelist: only frontend URL and local dev
const rawOrigins = (process.env.CLIENT_URL || "https://client-ecru-theta-76.vercel.app")
  .split(",")
  .map((u) => {
    const trimmed = u.trim();
    if (!trimmed) return "";
    try {
      return new URL(trimmed).origin;
    } catch {
      return trimmed.replace(/\/+$/, "");
    }
  })
  .filter(Boolean);

const allowedOrigins = new Set([
  ...rawOrigins,
  "https://client-ecru-theta-76.vercel.app",
  "http://localhost:5173",
]);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. server-to-server, health checks) or exact frontend origin
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: Origin ${origin} is not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
}));
app.options("*", cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use("/api/auth", authRouter);
app.use("/api/spaces", spacesRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/materials", materialsRouter);
app.use("/api/tutor", tutorRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/mastery", masteryRouter);
app.use("/api/recommendations", recommendationsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/admin", adminRouter);

app.get("/api/health", (req, res) => {
  res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
});

app.get("/health", (req, res) => {
  res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
});

// In production, serve static assets and support SPA client-side routing
if (fs.existsSync(CLIENT_DIST_PATH)) {
  app.use(express.static(CLIENT_DIST_PATH));
  app.get("*", (req, res, next) => {
    // Keep 404 for unhandled API calls
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "API endpoint not found" } });
    }
    res.sendFile(path.join(CLIENT_DIST_PATH, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("Backend is running");
  });
}

app.use(errorHandler);
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const isTestEnv = process.env.NODE_ENV === "test" || process.argv.some((arg) => arg.includes("test"));
if (!isTestEnv && !isServerless) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 AI Study Companion server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      // MongoDB Atlas is the only persistence layer: without it there is no
      // trustworthy place to read or write data, so refuse to start.
      console.error(`❌ Could not start server: MongoDB Atlas is unavailable (${err.message})`);
      process.exit(1);
    });
}

export default app;

