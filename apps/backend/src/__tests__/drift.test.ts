import { DriftService } from "../services/drift.service";
import type { BehaviouralFeatureVector } from "@sessionguard/shared-types";
import { FEATURE_KEYS } from "@sessionguard/shared-types";

const service = new DriftService();

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Create a feature vector with all features set to the same value. */
function uniformVector(value: number): BehaviouralFeatureVector {
  const vec: any = {};
  for (const key of FEATURE_KEYS) vec[key] = value;
  return vec as BehaviouralFeatureVector;
}

/** Create a baseline profile with specified means and stds. */
function makeProfile(
  means: Record<string, number>,
  stds: Record<string, number>,
) {
  return { featureMeans: means, featureStd: stds };
}

/** Create a uniform profile where all features have the same mean and std. */
function uniformProfile(mean: number, std: number) {
  const means: Record<string, number> = {};
  const stds: Record<string, number> = {};
  for (const key of FEATURE_KEYS) {
    means[key] = mean;
    stds[key] = std;
  }
  return makeProfile(means, stds);
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("DriftService", () => {
  describe("evaluate()", () => {
    it("returns zero drift when observed values match the baseline exactly", () => {
      const vector = uniformVector(10);
      const profile = uniformProfile(10, 1);
      const result = service.evaluate(vector, profile);
      expect(result.driftScore).toBe(0);
      expect(result.meanAbsZ).toBe(0);
      expect(result.saturatedFeatures).toBe(0);
    });

    it("returns drift score in [0, 1] range", () => {
      const vector = uniformVector(15);
      const profile = uniformProfile(10, 2);
      const result = service.evaluate(vector, profile);
      expect(result.driftScore).toBeGreaterThanOrEqual(0);
      expect(result.driftScore).toBeLessThanOrEqual(1);
    });

    it("produces per-feature Z-scores for all 15 features", () => {
      const vector = uniformVector(10);
      const profile = uniformProfile(10, 1);
      const result = service.evaluate(vector, profile);
      expect(Object.keys(result.perFeatureZ)).toHaveLength(FEATURE_KEYS.length);
      for (const key of FEATURE_KEYS) {
        expect(result.perFeatureZ).toHaveProperty(key);
      }
    });

    it("increases drift score as deviation increases", () => {
      const profile = uniformProfile(10, 1);
      const smallDrift = service.evaluate(uniformVector(11), profile);
      const largeDrift = service.evaluate(uniformVector(20), profile);
      expect(largeDrift.driftScore).toBeGreaterThan(smallDrift.driftScore);
    });

    it("caps drift score at 1.0 for extreme deviations", () => {
      const vector = uniformVector(999999);
      const profile = uniformProfile(0, 1);
      const result = service.evaluate(vector, profile);
      expect(result.driftScore).toBe(1);
    });

    it("handles zero standard deviation using feature-specific min floors", () => {
      // Zero std shouldn't cause Infinity — the service uses FEATURE_MIN_STD floors
      const profile = uniformProfile(10, 0);
      const vector = uniformVector(11);
      const result = service.evaluate(vector, profile);
      expect(Number.isFinite(result.driftScore)).toBe(true);
      expect(result.driftScore).toBeGreaterThanOrEqual(0);
      expect(result.driftScore).toBeLessThanOrEqual(1);
    });

    it("counts saturated features (|Z| >= 3.0)", () => {
      // Create a vector that's 5 std devs away from mean on all features
      const profile = uniformProfile(10, 1);
      const vector = uniformVector(15); // 5 std devs away
      const result = service.evaluate(vector, profile);
      expect(result.saturatedFeatures).toBeGreaterThan(0);
    });

    it("reports zero saturated features when deviation is small", () => {
      const profile = uniformProfile(10, 5);
      const vector = uniformVector(10.5); // 0.1 std devs away
      const result = service.evaluate(vector, profile);
      expect(result.saturatedFeatures).toBe(0);
    });
  });

  describe("Z-score calculation", () => {
    it("computes positive Z-scores for known deviations", () => {
      // Set all features to mean=100, std=10, observed=130
      // Note: effective std may be larger due to FEATURE_MIN_STD floors
      const profile = uniformProfile(100, 10);
      const vector = uniformVector(130);
      const result = service.evaluate(vector, profile);
      // All features should have positive Z-scores since observed != mean
      for (const key of FEATURE_KEYS) {
        expect(result.perFeatureZ[key]).toBeGreaterThan(0);
      }
      // Overall drift should be positive
      expect(result.driftScore).toBeGreaterThan(0);
    });

    it("produces symmetric Z-scores for positive and negative deviations", () => {
      const profile = uniformProfile(100, 10);
      const above = service.evaluate(uniformVector(120), profile);
      const below = service.evaluate(uniformVector(80), profile);
      // Both should have same drift score (absolute Z-score)
      expect(above.driftScore).toBeCloseTo(below.driftScore, 5);
    });
  });

  describe("drift normalization", () => {
    it("maps large deviations to high drift scores near 1.0", () => {
      // With std=100, a deviation of 300 units → Z=3.0 per feature
      // But feature-specific min stds may slightly alter results
      // The key property: very large deviations should produce drift ≥ 0.8
      const largeStdProfile = uniformProfile(0, 100);
      const vector = uniformVector(300);
      const result = service.evaluate(vector, largeStdProfile);
      expect(result.driftScore).toBeGreaterThanOrEqual(0.8);
    });

    it("maps mean |Z| of 1.5 to approximately 0.5 drift score", () => {
      const profile = uniformProfile(0, 100);
      const vector = uniformVector(150); // Z = 1.5
      const result = service.evaluate(vector, profile);
      expect(result.driftScore).toBeCloseTo(0.5, 1);
    });
  });

  describe("edge cases", () => {
    it("handles missing feature values (defaults to 0)", () => {
      const incompleteVector = {} as BehaviouralFeatureVector;
      const profile = uniformProfile(0, 1);
      const result = service.evaluate(incompleteVector, profile);
      expect(Number.isFinite(result.driftScore)).toBe(true);
    });

    it("handles NaN in feature vector gracefully", () => {
      const vector = uniformVector(NaN);
      const profile = uniformProfile(10, 1);
      const result = service.evaluate(vector, profile);
      expect(Number.isFinite(result.driftScore)).toBe(true);
    });

    it("handles negative observed values", () => {
      const vector = uniformVector(-5);
      const profile = uniformProfile(10, 2);
      const result = service.evaluate(vector, profile);
      expect(Number.isFinite(result.driftScore)).toBe(true);
      expect(result.driftScore).toBeGreaterThan(0);
    });
  });
});
