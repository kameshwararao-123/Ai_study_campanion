import { verifyToken, extractToken } from "../lib/auth.js";
import { UnauthorizedError, ForbiddenError } from "../lib/errors.js";

export function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new UnauthorizedError("No authentication token provided");
    }

    const payload = verifyToken(token);
    if (!payload) {
      throw new UnauthorizedError("Invalid or expired session token");
    }

    req.user = payload; // { userId, email, role }
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req, res, next) {
  try {
    if (!req.user) {
      throw new UnauthorizedError("Authentication required");
    }
    if (req.user.role !== "ADMIN") {
      throw new ForbiddenError("Administrative privileges required");
    }
    next();
  } catch (err) {
    next(err);
  }
}

