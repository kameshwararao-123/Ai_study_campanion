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
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));
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

app.use(errorHandler);
app.get("/", (req, res) => {
  res.send("Backend is running");
});
const isTestEnv = process.env.NODE_ENV === "test" || process.argv.some((arg) => arg.includes("test"));
if (!isTestEnv) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 AI Study Companion server running on http://localhost:${PORT}`);
    });
  });
}

export default app;

