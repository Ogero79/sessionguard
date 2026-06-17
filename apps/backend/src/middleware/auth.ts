import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { AuthTokenPayload } from "@sessionguard/shared-types";

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  // Primary: Authorization: Bearer <token>
  // Fallback: ?token= query param (only for GET download endpoints that use window.open)
  const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const queryToken = typeof req.query.token === "string" ? req.query.token : null;
  const token = headerToken ?? queryToken;

  if (!token) {
    res.status(401).json({
      success: false,
      error: "Authentication required",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({
      success: false,
      error: "Invalid or expired token",
      timestamp: new Date().toISOString(),
    });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({
      success: false,
      error: "Admin privileges required",
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next();
}

