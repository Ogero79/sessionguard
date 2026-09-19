/**
 * Tests for the risk service helper functions and risk model configuration.
 *
 * The RiskService.evaluatePacket() method depends on Prisma and the ML service,
 * so we test the exported pure functions and configuration constants here.
 * Full integration tests require a running database and ML service.
 */
import { RISK_WEIGHTS, RISK_THRESHOLDS } from "../services/risk.service";
import { FEATURE_KEYS } from "@sessionguard/shared-types";

// Re-create the pure helper functions from risk.service.ts for testing
// (they're module-scoped, so we replicate them here to verify the logic)
function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

type RiskLevelType = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type RiskAction = "NONE" | "STEP_UP_REQUIRED" | "SESSION_REVOKED";

function classifyRisk(
  combinedScore: number,
  mediumThreshold: number,
  highThreshold: number,
): RiskLevelType {
  if (combinedScore >= highThreshold) return "HIGH";
  if (combinedScore >= mediumThreshold) return "MEDIUM";
  return "LOW";
}

function decideAction(level: RiskLevelType): RiskAction {
  if (level === "HIGH" || level === "CRITICAL") return "SESSION_REVOKED";
  if (level === "MEDIUM") return "STEP_UP_REQUIRED";
  return "NONE";
}

function computeCombinedScore(isolationScore: number, driftScore: number): number {
  return clamp01(
    isolationScore * RISK_WEIGHTS.isolationForest +
    driftScore * RISK_WEIGHTS.zScoreDrift,
  );
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("Risk Model Configuration", () => {
  it("weights sum to 1.0", () => {
    const total = RISK_WEIGHTS.isolationForest + RISK_WEIGHTS.zScoreDrift;
    expect(total).toBeCloseTo(1.0);
  });

  it("isolation forest has higher weight than drift", () => {
    expect(RISK_WEIGHTS.isolationForest).toBeGreaterThan(RISK_WEIGHTS.zScoreDrift);
  });

  it("medium threshold is less than high threshold", () => {
    expect(RISK_THRESHOLDS.medium).toBeLessThan(RISK_THRESHOLDS.high);
  });

  it("thresholds are within [0, 1] range", () => {
    expect(RISK_THRESHOLDS.medium).toBeGreaterThanOrEqual(0);
    expect(RISK_THRESHOLDS.medium).toBeLessThanOrEqual(1);
    expect(RISK_THRESHOLDS.high).toBeGreaterThanOrEqual(0);
    expect(RISK_THRESHOLDS.high).toBeLessThanOrEqual(1);
  });
});

describe("clamp01()", () => {
  it("returns value unchanged when in [0, 1]", () => {
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(0)).toBe(0);
    expect(clamp01(1)).toBe(1);
  });

  it("clamps negative values to 0", () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(-100)).toBe(0);
  });

  it("clamps values above 1 to 1", () => {
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(100)).toBe(1);
  });

  it("returns 0 for NaN", () => {
    expect(clamp01(NaN)).toBe(0);
  });

  it("returns 0 for Infinity", () => {
    expect(clamp01(Infinity)).toBe(0);
    expect(clamp01(-Infinity)).toBe(0);
  });
});

describe("classifyRisk()", () => {
  const medium = RISK_THRESHOLDS.medium; // 0.4
  const high = RISK_THRESHOLDS.high;     // 0.7

  it("classifies LOW when below medium threshold", () => {
    expect(classifyRisk(0.0, medium, high)).toBe("LOW");
    expect(classifyRisk(0.39, medium, high)).toBe("LOW");
  });

  it("classifies MEDIUM at exactly the medium threshold", () => {
    expect(classifyRisk(0.4, medium, high)).toBe("MEDIUM");
  });

  it("classifies MEDIUM between medium and high thresholds", () => {
    expect(classifyRisk(0.5, medium, high)).toBe("MEDIUM");
    expect(classifyRisk(0.69, medium, high)).toBe("MEDIUM");
  });

  it("classifies HIGH at exactly the high threshold", () => {
    expect(classifyRisk(0.7, medium, high)).toBe("HIGH");
  });

  it("classifies HIGH above the high threshold", () => {
    expect(classifyRisk(0.9, medium, high)).toBe("HIGH");
    expect(classifyRisk(1.0, medium, high)).toBe("HIGH");
  });
});

describe("decideAction()", () => {
  it("returns NONE for LOW risk", () => {
    expect(decideAction("LOW")).toBe("NONE");
  });

  it("returns STEP_UP_REQUIRED for MEDIUM risk", () => {
    expect(decideAction("MEDIUM")).toBe("STEP_UP_REQUIRED");
  });

  it("returns SESSION_REVOKED for HIGH risk", () => {
    expect(decideAction("HIGH")).toBe("SESSION_REVOKED");
  });

  it("returns SESSION_REVOKED for CRITICAL risk", () => {
    expect(decideAction("CRITICAL")).toBe("SESSION_REVOKED");
  });
});

describe("computeCombinedScore()", () => {
  it("computes weighted sum correctly", () => {
    // 0.5 * 0.7 + 0.5 * 0.3 = 0.35 + 0.15 = 0.5
    expect(computeCombinedScore(0.5, 0.5)).toBeCloseTo(0.5);
  });

  it("returns 0 when both scores are 0", () => {
    expect(computeCombinedScore(0, 0)).toBe(0);
  });

  it("returns weighted max when both scores are 1", () => {
    // 1.0 * 0.7 + 1.0 * 0.3 = 1.0
    expect(computeCombinedScore(1, 1)).toBeCloseTo(1.0);
  });

  it("correctly weights isolation forest higher", () => {
    const highIsolation = computeCombinedScore(1.0, 0.0); // 0.7
    const highDrift = computeCombinedScore(0.0, 1.0);      // 0.3
    expect(highIsolation).toBeGreaterThan(highDrift);
    expect(highIsolation).toBeCloseTo(0.7);
    expect(highDrift).toBeCloseTo(0.3);
  });

  it("clamps result to [0, 1]", () => {
    expect(computeCombinedScore(1.5, 1.5)).toBe(1);
    expect(computeCombinedScore(-1, -1)).toBe(0);
  });

  it("handles edge case: isolation-only detection triggers MEDIUM", () => {
    // Isolation score of 0.6 with no drift
    // 0.6 * 0.7 + 0 * 0.3 = 0.42 → MEDIUM
    const combined = computeCombinedScore(0.6, 0);
    expect(combined).toBeCloseTo(0.42);
    expect(classifyRisk(combined, RISK_THRESHOLDS.medium, RISK_THRESHOLDS.high)).toBe("MEDIUM");
  });

  it("handles edge case: drift-only detection stays LOW", () => {
    // Drift score of 1.0 with no isolation anomaly
    // 0 * 0.7 + 1.0 * 0.3 = 0.3 → LOW (below 0.4 threshold)
    const combined = computeCombinedScore(0, 1.0);
    expect(combined).toBeCloseTo(0.3);
    expect(classifyRisk(combined, RISK_THRESHOLDS.medium, RISK_THRESHOLDS.high)).toBe("LOW");
  });

  it("handles edge case: both moderate signals trigger HIGH", () => {
    // Isolation 0.8, drift 0.8
    // 0.8 * 0.7 + 0.8 * 0.3 = 0.56 + 0.24 = 0.80 → HIGH
    const combined = computeCombinedScore(0.8, 0.8);
    expect(combined).toBeCloseTo(0.8);
    expect(classifyRisk(combined, RISK_THRESHOLDS.medium, RISK_THRESHOLDS.high)).toBe("HIGH");
  });
});

describe("FEATURE_KEYS constant", () => {
  it("contains exactly 15 features", () => {
    expect(FEATURE_KEYS).toHaveLength(15);
  });

  it("has no duplicates", () => {
    const unique = new Set(FEATURE_KEYS);
    expect(unique.size).toBe(FEATURE_KEYS.length);
  });

  it("covers keyboard, mouse, and navigation categories", () => {
    const keyboard = FEATURE_KEYS.filter(
      (k) => k.includes("Key") || k.includes("Hold") || k.includes("typing") || k.includes("Burst"),
    );
    const mouse = FEATURE_KEYS.filter(
      (k) => k.includes("Mouse") || k.includes("mouse") || k.includes("click") || k.includes("scroll") || k.includes("idle"),
    );
    const navigation = FEATURE_KEYS.filter(
      (k) => k.includes("Route") || k.includes("route") || k.includes("tab") || k.includes("inactivity") || k.includes("session"),
    );
    expect(keyboard.length).toBeGreaterThan(0);
    expect(mouse.length).toBeGreaterThan(0);
    expect(navigation.length).toBeGreaterThan(0);
  });
});
