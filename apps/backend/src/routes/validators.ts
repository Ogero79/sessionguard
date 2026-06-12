import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(1, "Display name is required").max(100),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const sessionStartSchema = z.object({
  userAgent: z.string().min(1, "User agent is required"),
  ipAddress: z.string().optional(),
});

export const behaviourPacketSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  packetId: z.string().min(1),
  packetSequence: z.number().int().min(1),
  windowStart: z.number(),
  windowEnd: z.number(),
  currentRoute: z.string(),
  features: z.object({
    keystroke: z.object({
      totalKeystrokes: z.number(),
      holdDurations: z.array(z.number()),
      interKeyIntervals: z.array(z.number()),
      burstLengths: z.array(z.number()),
      idleGapsMs: z.array(z.number()),
      avgHoldDurationMs: z.number(),
      avgInterKeyIntervalMs: z.number(),
    }),
    mouse: z.object({
      totalMoveEvents: z.number(),
      totalDistance: z.number(),
      avgVelocity: z.number(),
      avgAcceleration: z.number(),
      totalClicks: z.number(),
      clickIntervals: z.array(z.number()),
      scrollCount: z.number(),
      idlePausesMs: z.array(z.number()),
    }),
    navigation: z.object({
      routeChanges: z.number(),
      routes: z.array(z.object({ path: z.string(), dwellMs: z.number() })),
      tabFocusChanges: z.number(),
      totalInactiveMs: z.number(),
      totalSessionElapsedMs: z.number(),
    }),
  }),
});

export const riskEvaluationSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  behaviourPacketIds: z.array(z.string()).optional(),
});

export const stepUpVerifySchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(100),
});

