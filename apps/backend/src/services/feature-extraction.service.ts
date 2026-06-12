import type {
  FeatureSummary,
  KeystrokeMetrics,
  MouseMetrics,
  NavigationMetrics,
  BehaviouralFeatureVector,
} from "@sessionguard/shared-types";

function std(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}

function safeDiv(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

export class FeatureExtractionService {
  /**
   * Transform a FeatureSummary (raw aggregated telemetry)
   * into a normalized 15-dimensional BehaviouralFeatureVector.
   */
  extract(summary: FeatureSummary, windowDurationMs: number): BehaviouralFeatureVector {
    const keyboard = this.extractKeyboard(summary.keystroke, windowDurationMs);
    const mouse = this.extractMouse(summary.mouse, windowDurationMs);
    const navigation = this.extractNavigation(summary.navigation, windowDurationMs);

    return { ...keyboard, ...mouse, ...navigation };
  }

  private extractKeyboard(
    k: KeystrokeMetrics,
    windowMs: number
  ): Pick<
    BehaviouralFeatureVector,
    | "avgInterKeyInterval"
    | "stdInterKeyInterval"
    | "avgHoldDuration"
    | "typingBurstRate"
    | "typingIdleRatio"
  > {
    const avgInterKeyInterval = k.avgInterKeyIntervalMs;
    const stdInterKeyInterval = std(
      k.interKeyIntervals,
      k.avgInterKeyIntervalMs
    );
    const avgHoldDuration = k.avgHoldDurationMs;

    // Burst rate: bursts per second
    const totalBursts = k.burstLengths.length;
    const typingBurstRate = safeDiv(totalBursts * 1000, windowMs);

    // Idle ratio: total idle gap time vs window
    const totalIdleMs = k.idleGapsMs.reduce((a, b) => a + b, 0);
    const typingIdleRatio = safeDiv(totalIdleMs, windowMs);

    return {
      avgInterKeyInterval,
      stdInterKeyInterval,
      avgHoldDuration,
      typingBurstRate,
      typingIdleRatio,
    };
  }

  private extractMouse(
    m: MouseMetrics,
    windowMs: number
  ): Pick<
    BehaviouralFeatureVector,
    | "avgMouseVelocity"
    | "mouseAccelerationVariance"
    | "clickFrequency"
    | "scrollFrequency"
    | "idleMouseRatio"
  > {
    const avgMouseVelocity = m.avgVelocity;

    // Acceleration variance — use velocity changes between consecutive samples
    // Since we only have the average acceleration, approximate variance from idle pauses
    const mouseAccelerationVariance = m.avgAcceleration > 0
      ? variance(m.idlePausesMs.map((p) => 1 / (p + 1)))
      : 0;

    // Clicks per second
    const clickFrequency = safeDiv(m.totalClicks * 1000, windowMs);

    // Scrolls per second
    const scrollFrequency = safeDiv(m.scrollCount * 1000, windowMs);

    // Mouse idle ratio: total idle pause time vs window
    const totalIdleMs = m.idlePausesMs.reduce((a, b) => a + b, 0);
    const idleMouseRatio = safeDiv(totalIdleMs, windowMs);

    return {
      avgMouseVelocity,
      mouseAccelerationVariance,
      clickFrequency,
      scrollFrequency,
      idleMouseRatio,
    };
  }

  private extractNavigation(
    n: NavigationMetrics,
    windowMs: number
  ): Pick<
    BehaviouralFeatureVector,
    | "avgRouteDwellTime"
    | "routeTransitionCount"
    | "tabFocusLossCount"
    | "inactivityRatio"
    | "sessionElapsedRatio"
  > {
    // Average dwell time across visited routes in this window
    const dwellTimes = n.routes.map((r) => r.dwellMs);
    const avgRouteDwellTime =
      dwellTimes.length > 0
        ? dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length
        : windowMs;

    const routeTransitionCount = n.routeChanges;

    // Tab focus losses = focus change events that are blur (approx half of tabFocusChanges)
    const tabFocusLossCount = Math.floor(n.tabFocusChanges / 2);

    // Inactivity ratio: inactive time vs total elapsed
    const inactivityRatio = safeDiv(
      n.totalInactiveMs,
      n.totalSessionElapsedMs || windowMs
    );

    // Session elapsed ratio: how much of the session has elapsed
    // Normalize: elapsed time / 30 min (1_800_000ms) — capped at 1
    const sessionElapsedRatio = Math.min(
      safeDiv(n.totalSessionElapsedMs, 1_800_000),
      1
    );

    return {
      avgRouteDwellTime,
      routeTransitionCount,
      tabFocusLossCount,
      inactivityRatio,
      sessionElapsedRatio,
    };
  }
}

export const featureExtractionService = new FeatureExtractionService();
