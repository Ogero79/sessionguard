export interface StartExperimentRequest {
  name: string;
  description?: string;
  groundTruth: "BENIGN" | "HIJACKED";
  sessionId: string;
}

export interface ExperimentSummary {
  id: string;
  name: string;
  description: string | null;
  status: string;
  groundTruth: string;
  attackInjected: boolean;
  attackInjectedAt: string | null;
  startedAt: string;
  endedAt: string | null;
  sessionId: string | null;
  truePositive: boolean | null;
  trueNegative: boolean | null;
  falsePositive: boolean | null;
  falseNegative: boolean | null;
  detectionAccuracy: number | null;
  falsePositiveRate: number | null;
  detectionLatencyMs: number | null;
  responseLatencyMs: number | null;
}

export interface ExperimentDetail extends ExperimentSummary {
  logs: ExperimentLogEntry[];
}

export interface ExperimentLogEntry {
  id: string;
  experimentId: string;
  packetSequence: number;
  timestamp: string;
  anomalyScore: number;
  driftScore: number;
  combinedScore: number;
  predictedLabel: string;
  groundTruth: string;
  action: string;
  receivedAt: string;
  explanations?: any;
}

export interface GlobalEvaluationMetrics {
  totalExperiments: number;
  completedExperiments: number;
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
  overallAccuracy: number;
  overallFalsePositiveRate: number;
  averageDetectionLatencyMs: number | null;
  averageResponseLatencyMs: number | null;
}
