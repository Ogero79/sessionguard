import type { RiskLevelType, SessionState } from "./session";

export interface RiskEvaluationRequest {
  sessionId: string;
  behaviourPacketIds?: string[];
}

export interface RiskEvaluationResponse {
  sessionId: string;
  riskLevel: RiskLevelType;
  score: number;
  factors: RiskFactor[];
  evaluatedAt: string;
}

export interface RiskFactor {
  name: string;
  weight: number;
  description: string;
}

// ──────────────────── Phase 4: Anomaly Detection ────────────────────

export type RiskAction =
  | "NONE"
  | "STEP_UP_REQUIRED"
  | "SESSION_REVOKED";

export interface RiskAssessment {
  sessionId: string;
  isolationScore: number;       // 0–1, normalized; 1 = highly anomalous
  driftScore: number;           // 0–1, normalized Z-score drift
  combinedScore: number;        // 0–1, weighted combination
  riskLevel: RiskLevelType;
  action: RiskAction;
  evaluatedAt: string;
  explanations?: any;
}

/**
 * Polled by the frontend to detect adaptive security state changes.
 * Does not expose technical anomaly scores to the end user.
 */
export interface RiskStatusResponse {
  sessionId: string;
  state: SessionState;
  riskLevel: RiskLevelType;
  stepUpRequired: boolean;
  revoked: boolean;
  revokedAt: string | null;
  lastEvaluatedAt: string | null;
}

export interface StepUpVerifyRequest {
  password: string;
}

export interface StepUpVerifyResponse {
  verified: boolean;
  state: SessionState;
}

// ──────────────────── ML Service contracts ────────────────────

export interface MLTrainBaselineRequest {
  sessionId: string;
  featureVectors: number[][]; // 2-D matrix: rows = packets, cols = features
}

export interface MLTrainBaselineResponse {
  sessionId: string;
  modelId: string;
  status: "trained" | "failed";
  samplesUsed: number;
  message?: string;
}

export interface MLScoreAnomalyRequest {
  sessionId: string;
  featureVector: number[];
}

export interface MLScoreAnomalyResponse {
  sessionId: string;
  anomalyScore: number; // 0–1 normalized, higher = more anomalous
  rawScore: number;     // raw IsolationForest score
  modelFound: boolean;
}
