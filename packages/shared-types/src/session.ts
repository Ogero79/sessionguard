export type SessionState =
  | "INITIALIZING_BASELINE"
  | "ACTIVE_MONITORING"
  | "STEP_UP_REQUIRED"
  | "REVOKED"
  | "ACTIVE"
  | "SUSPICIOUS"
  | "TERMINATED"
  | "EXPIRED";

export interface SessionStartRequest {
  userAgent: string;
  ipAddress?: string;
}

export interface SessionStartResponse {
  sessionId: string;
  state: SessionState;
  startedAt: string;
}

export interface SessionInfo {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  state: SessionState;
  riskLevel: RiskLevelType;
  startedAt: string;
  endedAt?: string;
}

export type RiskLevelType = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
