export function apiSuccess(res, data, status = 200, meta = {}) {
  return res.status(status).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  });
}

export function apiError(res, message, status = 500, code = "INTERNAL_SERVER_ERROR", details = null) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}

