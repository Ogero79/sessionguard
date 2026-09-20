import rateLimit from "express-rate-limit";
import { env } from "../config/env";

const isTest = env.NODE_ENV === "test";

/**
 * Global rate limiter: prevents resource starvation and DoS attacks.
 * Standard allowance: 120 requests per minute per IP.
 */
export const standardApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 0 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests. Please slow down and try again later.",
    timestamp: new Date().toISOString(),
  },
});

/**
 * Strict authentication limiter: defends against credential stuffing and brute-force attacks.
 * Max 15 attempts per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 0 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many login/registration attempts from this IP. Please try again after 15 minutes.",
    timestamp: new Date().toISOString(),
  },
});

/**
 * Telemetry ingestion limiter: prevents denial-of-service against the Python ML microservice.
 * Normal usage sends 1 packet every 10 seconds (~6/min). Allowance is 60 packets per minute per IP.
 */
export const telemetryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 0 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Telemetry ingestion rate limit exceeded. Batch ingestion rate is capped.",
    timestamp: new Date().toISOString(),
  },
});
