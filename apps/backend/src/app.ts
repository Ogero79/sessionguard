import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { errorHandler } from "./middleware/errorHandler";
import { standardApiLimiter, authLimiter, telemetryLimiter } from "./middleware/rateLimiter";
import authRoutes from "./routes/auth.routes";
import sessionRoutes from "./routes/session.routes";
import riskRoutes from "./routes/risk.routes";
import experimentRoutes from "./routes/experiment.routes";
import userRoutes from "./routes/user.routes";

const app = express();

app.use(helmet());

const allowedOrigins = env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",").map((o) => o.trim()) : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like curl, postman, health probes, or server-to-server)
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes(origin.replace(/\/$/, "")) ||
        /^http:\/\/localhost(:\d+)?$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "short"));

// Global API Rate Limiting
app.use("/api", standardApiLimiter);

// ─── Health & Readiness Probes ───────────────────────────────────────────────

// Liveness check (shallow)
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "backend",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Readiness check (deep: validates DB and ML service reachability)
app.get("/api/health/ready", async (_req, res) => {
  const checks: Record<string, "ok" | "unhealthy"> = {
    database: "unhealthy",
    mlService: "unhealthy",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch (err) {
    console.error("[Readiness Probe] Database check failed:", err);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const mlRes = await fetch(`${env.ML_SERVICE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (mlRes.ok) {
      checks.mlService = "ok";
    }
  } catch {
    // ML service down or unreachable
  }

  const isReady = checks.database === "ok";
  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    status: isReady ? "ready" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  });
});

// ─── Protected Routes with Tiered Rate Limiting ─────────────────────────────

// Dedicated limits on auth attempts and telemetry streaming
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/session/behaviour", telemetryLimiter);

// Core route mounts
app.use("/api/auth", authRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/risk", riskRoutes);
app.use("/api/experiment", experimentRoutes);
app.use("/api/user", userRoutes);

// 404 Handler for unmatched API routes
app.use("/api/*", (_req, res) => {
  res.status(404).json({
    success: false,
    error: "API endpoint not found",
    timestamp: new Date().toISOString(),
  });
});

// Global centralized error handler
app.use(errorHandler);

export default app;
