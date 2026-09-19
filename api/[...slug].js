import app from "../server/index.js";
import { connectDB } from "../server/lib/db.js";

// Vercel Serverless Function Catch-All Handler for all /api/* routes
export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    console.error("[Vercel Handler] MongoDB connection error:", err.message);
  }
  return app(req, res);
}

