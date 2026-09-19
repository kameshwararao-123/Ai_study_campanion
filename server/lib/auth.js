import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "study_companion_super_secret_jwt_key_2026_change_in_production";
const TOKEN_EXPIRY = "7d";

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function extractToken(req) {
  const auth = req.headers["authorization"];
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  const cookieHeader = req.headers["cookie"] || "";
  const match = cookieHeader.match(/(^|;\s*)auth_token=([^;]*)/);
  if (match && match[2]) {
    return decodeURIComponent(match[2]);
  }
  return null;
}

