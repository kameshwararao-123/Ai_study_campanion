import { AppError } from "../lib/errors.js";

export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        details: err.details,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  }

  if (err.name === "ZodError") {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.errors ? err.errors.map((e) => ({ path: e.path.join("."), message: e.message })) : err.message,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      error: {
        code: "FILE_TOO_LARGE",
        message: "File size exceeds limit of 25MB",
        details: null,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  }

  console.error("Unhandled Error:", err);
  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: err.message || "An unexpected server error occurred",
      details: null,
    },
    meta: { timestamp: new Date().toISOString() },
  });
}

