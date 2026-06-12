// ──────────────────── Raw event types (kept for internal SDK use) ────────────────────

export type BehaviourEventType =
  | "keystroke"
  | "mouse_move"
  | "mouse_click"
  | "navigation"
  | "scroll"
  | "focus_change";

export interface KeystrokeEvent {
  key: string;
  keyCode: number;
  duration: number;
  interval: number;
  timestamp: number;
}

export interface MouseMoveEvent {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  timestamp: number;
}

export interface MouseClickEvent {
  x: number;
  y: number;
  button: number;
  target: string;
  timestamp: number;
}

export interface NavigationEvent {
  from: string;
  to: string;
  method: "push" | "replace" | "pop";
  timestamp: number;
}

export interface ScrollEvent {
  scrollX: number;
  scrollY: number;
  direction: "up" | "down";
  velocity: number;
  timestamp: number;
}

export interface FocusChangeEvent {
  focused: boolean;
  timestamp: number;
}

export interface BehaviourEventEntry {
  type: BehaviourEventType;
  data:
    | KeystrokeEvent
    | MouseMoveEvent
    | MouseClickEvent
    | NavigationEvent
    | ScrollEvent
    | FocusChangeEvent;
}

// ──────────────────── Aggregated metric summaries ────────────────────

export interface KeystrokeMetrics {
  totalKeystrokes: number;
  holdDurations: number[];
  interKeyIntervals: number[];
  burstLengths: number[];
  idleGapsMs: number[];
  avgHoldDurationMs: number;
  avgInterKeyIntervalMs: number;
}

export interface MouseMetrics {
  totalMoveEvents: number;
  totalDistance: number;
  avgVelocity: number;
  avgAcceleration: number;
  totalClicks: number;
  clickIntervals: number[];
  scrollCount: number;
  idlePausesMs: number[];
}

export interface NavigationMetrics {
  routeChanges: number;
  routes: { path: string; dwellMs: number }[];
  tabFocusChanges: number;
  totalInactiveMs: number;
  totalSessionElapsedMs: number;
}

export interface FeatureSummary {
  keystroke: KeystrokeMetrics;
  mouse: MouseMetrics;
  navigation: NavigationMetrics;
}

// ──────────────────── Packet: what the SDK sends to backend ────────────────────

export interface BehaviourPacket {
  sessionId: string;
  packetId: string;
  packetSequence: number;
  windowStart: number;
  windowEnd: number;
  currentRoute: string;
  features: FeatureSummary;
}

// ──────────────────── Ingestion response ────────────────────

export interface BehaviourIngestionResponse {
  packetId: string;
  accepted: boolean;
  packetSequence: number;
  receivedAt: string;
}

// ──────────────────── ML-ready feature vector ────────────────────

export interface BehaviouralFeatureVector {
  // Keyboard
  avgInterKeyInterval: number;
  stdInterKeyInterval: number;
  avgHoldDuration: number;
  typingBurstRate: number;
  typingIdleRatio: number;
  // Mouse
  avgMouseVelocity: number;
  mouseAccelerationVariance: number;
  clickFrequency: number;
  scrollFrequency: number;
  idleMouseRatio: number;
  // Navigation
  avgRouteDwellTime: number;
  routeTransitionCount: number;
  tabFocusLossCount: number;
  inactivityRatio: number;
  sessionElapsedRatio: number;
}

export const FEATURE_KEYS: (keyof BehaviouralFeatureVector)[] = [
  "avgInterKeyInterval",
  "stdInterKeyInterval",
  "avgHoldDuration",
  "typingBurstRate",
  "typingIdleRatio",
  "avgMouseVelocity",
  "mouseAccelerationVariance",
  "clickFrequency",
  "scrollFrequency",
  "idleMouseRatio",
  "avgRouteDwellTime",
  "routeTransitionCount",
  "tabFocusLossCount",
  "inactivityRatio",
  "sessionElapsedRatio",
];

// ──────────────────── Baseline model types ────────────────────

export type BaselineStatus =
  | "COLLECTING"
  | "ESTABLISHED"
  | "FAILED";

export interface BaselineProfile {
  featureMeans: Record<string, number>;
  featureStd: Record<string, number>;
  featureRanges: Record<string, { min: number; max: number }>;
  packetsUsed: number;
  establishedAt: string;
}

// ──────────────────── Telemetry debug DTOs ────────────────────

export interface RecentRiskAssessment {
  isolationScore: number;
  driftScore: number;
  combinedScore: number;
  riskLevel: string;
  action: string;
  evaluatedAt: string;
}

export interface SessionTelemetryInfo {
  sessionId: string;
  userId: string;
  displayName: string;
  state: string;
  riskLevel: string;
  packetCount: number;
  lastActivityAt: string | null;
  currentRoute: string | null;
  isMonitoringActive: boolean;
  startedAt: string;
  latestPacketSummary: FeatureSummary | null;
  baselineStatus: BaselineStatus | null;
  baselinePacketsCollected: number;
  baselinePacketsRequired: number;
  baselineEstablishedAt: string | null;
  baselineFeatureMeans: Record<string, number> | null;
  // Phase 4 — Risk telemetry
  mlModelTrained: boolean;
  mlModelTrainedAt: string | null;
  lastIsolationScore: number | null;
  lastDriftScore: number | null;
  lastCombinedScore: number | null;
  lastRiskEvaluatedAt: string | null;
  stepUpRequired: boolean;
  revokedAt: string | null;
  recentAssessments: RecentRiskAssessment[];
}
