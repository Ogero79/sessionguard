export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "REGISTER"
  | "SESSION_START"
  | "SESSION_END"
  | "BEHAVIOUR_INGESTED"
  | "RISK_EVALUATED"
  | "RISK_ESCALATED"
  | "BASELINE_CREATED"
  | "BASELINE_UPDATED"
  | "SETTINGS_CHANGED"
  | "STEP_UP_REQUIRED"
  | "STEP_UP_VERIFIED"
  | "SESSION_REVOKED"
  | "ML_MODEL_TRAINED"
  | "ML_TRAINING_FAILED";

export interface AuditLogEntry {
  id: string;
  userId?: string;
  sessionId?: string;
  action: AuditAction;
  details?: Record<string, unknown> | null;
  ipAddress?: string;
  createdAt: string;
}

export interface AuditLogQuery {
  sessionId?: string;
  userId?: string;
  action?: AuditAction;
  page?: number;
  pageSize?: number;
}
