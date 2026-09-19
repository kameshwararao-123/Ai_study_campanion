import "dotenv/config";

import express from "express";
import cors from "cors";

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

const app = express();

const PORT = process.env.PORT || 5000;

// --------------------------------------------------
// CORS
// --------------------------------------------------

const rawOrigins = (
  process.env.CLIENT_URL ||
  "http://localhost:5173"
)
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...rawOrigins,
  "http://localhost:5173",
]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // (curl, health checks, server-to-server requests)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      console.log(`❌ CORS blocked: ${origin}`);

      return callback(
        new Error(`CORS blocked: Origin ${origin} is not allowed`)
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
  })
);

app.options("*", cors());

// --------------------------------------------------
// BODY PARSING
// --------------------------------------------------

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// --------------------------------------------------
// API ROUTES
// --------------------------------------------------

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

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  });
});

// --------------------------------------------------
// ROOT
// --------------------------------------------------

app.get("/", (req, res) => {
  res.send("AI Study Companion Backend is running");
});

// --------------------------------------------------
// ERROR HANDLER
// --------------------------------------------------

app.use(errorHandler);

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

const isTestEnv =
  process.env.NODE_ENV === "test" ||
  process.argv.some((arg) => arg.includes("test"));

if (!isTestEnv) {
  connectDB()
    .then(() => {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(
          `🚀 AI Study Companion server running on port ${PORT}`
        );
      });
    })
    .catch((err) => {
      console.error(
        `❌ Could not start server: MongoDB Atlas is unavailable (${err.message})`
      );

      process.exit(1);
    });
}

export default app;