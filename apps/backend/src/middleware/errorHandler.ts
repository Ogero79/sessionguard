import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";

export interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isDev = env.NODE_ENV === "development";

  // 1. Zod validation error
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: "Validation failed",
      details: err.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // 2. JWT authentication errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    res.status(401).json({
      success: false,
      error: "Invalid or expired authentication token",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // 3. Prisma database errors
  if (err.code === "P2002") {
    const target = (err.meta?.target as string[])?.join(", ") || "resource";
    res.status(409).json({
      success: false,
      error: `A record with this ${target} already exists.`,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (err.code === "P2025") {
    res.status(404).json({
      success: false,
      error: "Requested record not found.",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // 4. Custom HTTP exceptions with explicit status codes
  const statusCode = typeof err.statusCode === "number" ? err.statusCode : 500;

  // Log error details (in dev full stack, in prod concise log)
  if (statusCode >= 500) {
    console.error(`[Server Error] ${err.name || "Error"}: ${err.message}`, isDev ? err.stack : undefined);
  }

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 && !isDev ? "Internal server error" : (err.message || "An unexpected error occurred"),
    ...(isDev && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
}
