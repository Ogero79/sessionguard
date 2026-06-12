import type {
  BehaviouralFeatureVector,
  BaselineProfile,
} from "@sessionguard/shared-types";
import { FEATURE_KEYS } from "@sessionguard/shared-types";

/**
 * Floor applied to per-feature std to avoid division-by-zero when a feature
 * was perfectly constant during the baseline window.
 */
const MIN_STD = 1e-6;

/**
 * Z-score above which a single feature is considered to be drifting hard.
 * Used only for diagnostics (number of saturated features).
 */
const HARD_DRIFT_Z = 3.0;

/**
 * Normalization constant: a mean absolute Z-score of `Z_NORMALIZER` maps to a
 * drift score of 1.0. Values beyond are clamped. Empirically, a sustained
 * |Z| ≈ 3 across all features is "very anomalous" relative to a calm baseline.
 */
const Z_NORMALIZER = 3.0;

export interface DriftResult {
  /** Aggregate drift in [0, 1]. */
  driftScore: number;
  /** Per-feature absolute Z-scores. */
  perFeatureZ: Record<string, number>;
  /** Mean absolute Z across all features (pre-normalization). */
  meanAbsZ: number;
  /** Number of features with |Z| ≥ HARD_DRIFT_Z. */
  saturatedFeatures: number;
}

/**
 * Computes statistical drift of a live feature vector against the session's
 * established baseline using per-feature Z-scores.
 */
export class DriftService {
  evaluate(
    vector: BehaviouralFeatureVector,
    profile: Pick<BaselineProfile, "featureMeans" | "featureStd">
  ): DriftResult {
    const perFeatureZ: Record<string, number> = {};
    let zSum = 0;
    let saturated = 0;

    for (const key of FEATURE_KEYS) {
      const observed = Number(vector[key] ?? 0);
      const mean = Number(profile.featureMeans[key] ?? 0);
      const rawStd = Number(profile.featureStd[key] ?? 0);
      const std = Math.max(rawStd, MIN_STD);

      const z = Math.abs((observed - mean) / std);
      const safeZ = Number.isFinite(z) ? z : 0;

      perFeatureZ[key] = safeZ;
      zSum += safeZ;
      if (safeZ >= HARD_DRIFT_Z) saturated += 1;
    }

    const meanAbsZ = zSum / FEATURE_KEYS.length;
    const normalized = Math.min(1, Math.max(0, meanAbsZ / Z_NORMALIZER));

    return {
      driftScore: normalized,
      perFeatureZ,
      meanAbsZ,
      saturatedFeatures: saturated,
    };
  }
}

export const driftService = new DriftService();
