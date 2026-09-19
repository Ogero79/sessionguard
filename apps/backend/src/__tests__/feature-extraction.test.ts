import { FeatureExtractionService } from "../services/feature-extraction.service";
import type {
  FeatureSummary,
  KeystrokeMetrics,
  MouseMetrics,
  NavigationMetrics,
} from "@sessionguard/shared-types";

const service = new FeatureExtractionService();

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeKeystroke(overrides: Partial<KeystrokeMetrics> = {}): KeystrokeMetrics {
  return {
    totalKeystrokes: 50,
    holdDurations: [80, 90, 100, 110, 120],
    interKeyIntervals: [150, 200, 180, 160, 170],
    burstLengths: [5, 8, 3],
    idleGapsMs: [500, 1200, 800],
    avgHoldDurationMs: 100,
    avgInterKeyIntervalMs: 172,
    ...overrides,
  };
}

function makeMouse(overrides: Partial<MouseMetrics> = {}): MouseMetrics {
  return {
    totalMoveEvents: 200,
    totalDistance: 5000,
    avgVelocity: 2.5,
    avgAcceleration: 0.8,
    totalClicks: 12,
    clickIntervals: [400, 600, 500],
    scrollCount: 8,
    idlePausesMs: [300, 700, 500],
    ...overrides,
  };
}

function makeNavigation(overrides: Partial<NavigationMetrics> = {}): NavigationMetrics {
  return {
    routeChanges: 3,
    routes: [
      { path: "/dashboard", dwellMs: 5000 },
      { path: "/tasks", dwellMs: 3000 },
      { path: "/notes", dwellMs: 2000 },
    ],
    tabFocusChanges: 4,
    totalInactiveMs: 2000,
    totalSessionElapsedMs: 60000,
    ...overrides,
  };
}

function makeSummary(overrides: Partial<FeatureSummary> = {}): FeatureSummary {
  return {
    keystroke: makeKeystroke(),
    mouse: makeMouse(),
    navigation: makeNavigation(),
    ...overrides,
  };
}

const WINDOW_MS = 10_000; // 10 second window

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("FeatureExtractionService", () => {
  describe("extract()", () => {
    it("returns a 15-dimensional feature vector", () => {
      const result = service.extract(makeSummary(), WINDOW_MS);
      const keys = Object.keys(result);
      expect(keys).toHaveLength(15);
    });

    it("includes all expected feature keys", () => {
      const result = service.extract(makeSummary(), WINDOW_MS);
      const expectedKeys = [
        "avgInterKeyInterval", "stdInterKeyInterval", "avgHoldDuration",
        "typingBurstRate", "typingIdleRatio",
        "avgMouseVelocity", "mouseAccelerationVariance",
        "clickFrequency", "scrollFrequency", "idleMouseRatio",
        "avgRouteDwellTime", "routeTransitionCount", "tabFocusLossCount",
        "inactivityRatio", "sessionElapsedRatio",
      ];
      for (const key of expectedKeys) {
        expect(result).toHaveProperty(key);
        expect(typeof (result as any)[key]).toBe("number");
      }
    });

    it("produces all non-negative values", () => {
      const result = service.extract(makeSummary(), WINDOW_MS);
      for (const [key, value] of Object.entries(result)) {
        expect(value).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("keyboard features", () => {
    it("correctly extracts avgInterKeyInterval from keystroke metrics", () => {
      const summary = makeSummary({
        keystroke: makeKeystroke({ avgInterKeyIntervalMs: 250 }),
      });
      const result = service.extract(summary, WINDOW_MS);
      expect(result.avgInterKeyInterval).toBe(250);
    });

    it("correctly extracts avgHoldDuration from keystroke metrics", () => {
      const summary = makeSummary({
        keystroke: makeKeystroke({ avgHoldDurationMs: 95 }),
      });
      const result = service.extract(summary, WINDOW_MS);
      expect(result.avgHoldDuration).toBe(95);
    });

    it("calculates typingBurstRate as bursts per second", () => {
      const summary = makeSummary({
        keystroke: makeKeystroke({ burstLengths: [5, 8, 3, 6] }), // 4 bursts
      });
      const result = service.extract(summary, WINDOW_MS);
      // 4 bursts * 1000 / 10000ms = 0.4 bursts/sec
      expect(result.typingBurstRate).toBeCloseTo(0.4);
    });

    it("calculates typingIdleRatio as idle time / window", () => {
      const summary = makeSummary({
        keystroke: makeKeystroke({ idleGapsMs: [2000, 3000] }), // 5000ms idle
      });
      const result = service.extract(summary, WINDOW_MS);
      // 5000 / 10000 = 0.5
      expect(result.typingIdleRatio).toBeCloseTo(0.5);
    });

    it("handles zero bursts gracefully", () => {
      const summary = makeSummary({
        keystroke: makeKeystroke({ burstLengths: [] }),
      });
      const result = service.extract(summary, WINDOW_MS);
      expect(result.typingBurstRate).toBe(0);
    });

    it("handles zero idle gaps gracefully", () => {
      const summary = makeSummary({
        keystroke: makeKeystroke({ idleGapsMs: [] }),
      });
      const result = service.extract(summary, WINDOW_MS);
      expect(result.typingIdleRatio).toBe(0);
    });
  });

  describe("mouse features", () => {
    it("correctly extracts avgMouseVelocity", () => {
      const summary = makeSummary({
        mouse: makeMouse({ avgVelocity: 3.7 }),
      });
      const result = service.extract(summary, WINDOW_MS);
      expect(result.avgMouseVelocity).toBe(3.7);
    });

    it("calculates clickFrequency as clicks per second", () => {
      const summary = makeSummary({
        mouse: makeMouse({ totalClicks: 20 }),
      });
      const result = service.extract(summary, WINDOW_MS);
      // 20 * 1000 / 10000 = 2.0
      expect(result.clickFrequency).toBeCloseTo(2.0);
    });

    it("calculates scrollFrequency as scrolls per second", () => {
      const summary = makeSummary({
        mouse: makeMouse({ scrollCount: 5 }),
      });
      const result = service.extract(summary, WINDOW_MS);
      // 5 * 1000 / 10000 = 0.5
      expect(result.scrollFrequency).toBeCloseTo(0.5);
    });

    it("calculates idleMouseRatio correctly", () => {
      const summary = makeSummary({
        mouse: makeMouse({ idlePausesMs: [4000, 1000] }), // 5000ms idle
      });
      const result = service.extract(summary, WINDOW_MS);
      expect(result.idleMouseRatio).toBeCloseTo(0.5);
    });
  });

  describe("navigation features", () => {
    it("calculates avgRouteDwellTime as mean of dwell times", () => {
      const summary = makeSummary({
        navigation: makeNavigation({
          routes: [
            { path: "/a", dwellMs: 3000 },
            { path: "/b", dwellMs: 7000 },
          ],
        }),
      });
      const result = service.extract(summary, WINDOW_MS);
      expect(result.avgRouteDwellTime).toBeCloseTo(5000);
    });

    it("uses windowMs as default dwell when no routes visited", () => {
      const summary = makeSummary({
        navigation: makeNavigation({ routes: [] }),
      });
      const result = service.extract(summary, WINDOW_MS);
      expect(result.avgRouteDwellTime).toBe(WINDOW_MS);
    });

    it("extracts routeTransitionCount from routeChanges", () => {
      const summary = makeSummary({
        navigation: makeNavigation({ routeChanges: 7 }),
      });
      const result = service.extract(summary, WINDOW_MS);
      expect(result.routeTransitionCount).toBe(7);
    });

    it("calculates tabFocusLossCount as half of tabFocusChanges", () => {
      const summary = makeSummary({
        navigation: makeNavigation({ tabFocusChanges: 6 }),
      });
      const result = service.extract(summary, WINDOW_MS);
      expect(result.tabFocusLossCount).toBe(3);
    });

    it("calculates inactivityRatio correctly", () => {
      const summary = makeSummary({
        navigation: makeNavigation({
          totalInactiveMs: 15000,
          totalSessionElapsedMs: 60000,
        }),
      });
      const result = service.extract(summary, WINDOW_MS);
      expect(result.inactivityRatio).toBeCloseTo(0.25);
    });

    it("caps sessionElapsedRatio at 1.0", () => {
      const summary = makeSummary({
        navigation: makeNavigation({ totalSessionElapsedMs: 3_600_000 }), // 60 min
      });
      const result = service.extract(summary, WINDOW_MS);
      expect(result.sessionElapsedRatio).toBe(1);
    });

    it("normalizes sessionElapsedRatio to 30-minute window", () => {
      const summary = makeSummary({
        navigation: makeNavigation({ totalSessionElapsedMs: 900_000 }), // 15 min
      });
      const result = service.extract(summary, WINDOW_MS);
      // 900000 / 1800000 = 0.5
      expect(result.sessionElapsedRatio).toBeCloseTo(0.5);
    });
  });

  describe("edge cases", () => {
    it("handles zero windowDuration without crashing", () => {
      const result = service.extract(makeSummary(), 0);
      expect(result.typingBurstRate).toBe(0);
      expect(result.clickFrequency).toBe(0);
      expect(result.scrollFrequency).toBe(0);
    });

    it("handles completely empty metrics", () => {
      const emptyKeystroke: KeystrokeMetrics = {
        totalKeystrokes: 0, holdDurations: [], interKeyIntervals: [],
        burstLengths: [], idleGapsMs: [], avgHoldDurationMs: 0, avgInterKeyIntervalMs: 0,
      };
      const emptyMouse: MouseMetrics = {
        totalMoveEvents: 0, totalDistance: 0, avgVelocity: 0, avgAcceleration: 0,
        totalClicks: 0, clickIntervals: [], scrollCount: 0, idlePausesMs: [],
      };
      const emptyNav: NavigationMetrics = {
        routeChanges: 0, routes: [], tabFocusChanges: 0,
        totalInactiveMs: 0, totalSessionElapsedMs: 0,
      };
      const result = service.extract(
        { keystroke: emptyKeystroke, mouse: emptyMouse, navigation: emptyNav },
        WINDOW_MS,
      );
      expect(Object.keys(result)).toHaveLength(15);
      // All values should be finite numbers
      for (const val of Object.values(result)) {
        expect(Number.isFinite(val)).toBe(true);
      }
    });
  });
});
