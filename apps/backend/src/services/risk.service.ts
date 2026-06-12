import { prisma } from "../config/prisma";
import type {
  BaselineProfile,
  BehaviouralFeatureVector,
  RiskAction,
  RiskAssessment,
  RiskEvaluationResponse,
  RiskLevelType,
} from "@sessionguard/shared-types";
import { FEATURE_KEYS } from "@sessionguard/shared-types";
import { mlClientService } from "./ml-client.service";
import { driftService } from "./drift.service";

// ──────────────────── Risk model configuration ────────────────────

/** Methodology: IsolationForest weighted 70%, Z-score drift weighted 30%. */
export const RISK_WEIGHTS = {
  isolationForest: 0.7,
  zScoreDrift: 0.3,
} as const;

/** Combined-score thresholds for risk classification. */
export const RISK_THRESHOLDS = {
  medium: 0.4,
  high: 0.7,
} as const;

// ──────────────────── Service ────────────────────

export class RiskService {
  /**
   * Score a single live feature vector for a monitored session.
   *
   * Pipeline:
   *  1. IsolationForest anomaly score from ML service (70% weight)
   *  2. Z-score statistical drift against baseline profile (30% weight)
   *  3. Combined risk score → classification → action
   *  4. Persist assessment + update session state
   */
  async evaluatePacket(
    sessionId: string,
    featureVector: BehaviouralFeatureVector
  ): Promise<RiskAssessment | null> {
    // Load baseline profile — required for both ML scoring and drift.
    const baseline = await prisma.baselineModel.findUnique({
      where: { sessionId },
    });

    if (
      !baseline ||
      baseline.baselineStatus !== "ESTABLISHED" ||
      !baseline.featureMeansJson ||
      !baseline.featureStdJson
    ) {
      return null;
    }

    const profile: Pick<BaselineProfile, "featureMeans" | "featureStd"> = {
      featureMeans: baseline.featureMeansJson as Record<string, number>,
      featureStd: baseline.featureStdJson as Record<string, number>,
    };

    // 1. Isolation Forest score (only meaningful once the ML model is trained)
    const numericVector = FEATURE_KEYS.map((k) =>
      Number(featureVector[k] ?? 0)
    );
    const mlResult =
      baseline.mlModelStatus === "TRAINED"
        ? await mlClientService.scoreAnomaly({
            sessionId,
            featureVector: numericVector,
          })
        : { sessionId, anomalyScore: 0, rawScore: 0, modelFound: false };

    const isolationScore = mlResult.modelFound
      ? clamp01(mlResult.anomalyScore)
      : 0;

    // 2. Statistical drift
    const drift = driftService.evaluate(featureVector, profile);

    // 3. Weighted combination
    const combinedScore = clamp01(
      isolationScore * RISK_WEIGHTS.isolationForest +
        drift.driftScore * RISK_WEIGHTS.zScoreDrift
    );

    // Load dynamic thresholds from system settings
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "global" },
    }) || { mediumThreshold: 0.4, highThreshold: 0.7 };

    // Calculate feature-level drift explanations
    const zSum = Object.values(drift.perFeatureZ).reduce((a, b) => a + b, 0);
    const explanations = FEATURE_KEYS.map((key) => {
      const observed = Number(featureVector[key] ?? 0);
      const mean = Number(profile.featureMeans[key] ?? 0);
      const std = Number(profile.featureStd[key] ?? 0);
      const zScore = drift.perFeatureZ[key] ?? 0;
      const contribution = zSum > 0 ? (zScore / zSum) * 100 : 0;
      return {
        feature: key,
        observed,
        mean,
        std,
        zScore,
        contribution,
      };
    }).sort((a, b) => b.zScore - a.zScore);

    // 4. Classify
    const riskLevel: RiskLevelType =
      combinedScore >= settings.highThreshold
        ? "HIGH"
        : combinedScore >= settings.mediumThreshold
        ? "MEDIUM"
        : "LOW";
    const action: RiskAction = decideAction(riskLevel);

    const evaluatedAt = new Date();

    // 5. Persist assessment
    const assessmentRecord = await prisma.riskAssessment.create({
      data: {
        sessionId,
        isolationScore,
        driftScore: drift.driftScore,
        combinedScore,
        riskLevel,
        action,
        evaluatedAt,
        explanations: explanations as any,
      },
    });

    // 6. Apply session-level effects (state transitions + audit log)
    await this.applyAction({
      sessionId,
      riskLevel,
      action,
      isolationScore,
      driftScore: drift.driftScore,
      combinedScore,
      meanAbsZ: drift.meanAbsZ,
      saturatedFeatures: drift.saturatedFeatures,
      assessmentId: assessmentRecord.id,
      evaluatedAt,
    });

    // 7. Check for active experiment and log packet details
    try {
      const activeExperiment = await prisma.experiment.findFirst({
        where: { sessionId, status: "RUNNING" },
      });
      if (activeExperiment) {
        const currentGroundTruth = activeExperiment.attackInjected ? "ATTACK" : "BENIGN";
        const predictedLabel = riskLevel === "LOW" ? "BENIGN" : riskLevel === "MEDIUM" ? "SUSPICIOUS" : "ATTACK";
        const packetCount = await prisma.behaviouralData.count({
          where: { sessionId },
        });

        await prisma.experimentLog.create({
          data: {
            experimentId: activeExperiment.id,
            packetSequence: packetCount,
            anomalyScore: isolationScore,
            driftScore: drift.driftScore,
            combinedScore,
            predictedLabel,
            groundTruth: currentGroundTruth,
            action,
            explanations: explanations as any,
          },
        });
      }
    } catch (err) {
      console.error("[risk.service] Failed to log experiment packet:", err);
    }

    return {
      sessionId,
      isolationScore,
      driftScore: drift.driftScore,
      combinedScore,
      riskLevel,
      action,
      evaluatedAt: evaluatedAt.toISOString(),
    };
  }

  /**
   * Apply the policy decided by the risk engine:
   *  - LOW    → audit log only
   *  - MEDIUM → set stepUpRequired + transition session state
   *  - HIGH   → revoke session (state = REVOKED, revokedAt = now)
   */
  private async applyAction(params: {
    sessionId: string;
    riskLevel: RiskLevelType;
    action: RiskAction;
    isolationScore: number;
    driftScore: number;
    combinedScore: number;
    meanAbsZ: number;
    saturatedFeatures: number;
    assessmentId: string;
    evaluatedAt: Date;
  }): Promise<void> {
    const {
      sessionId,
      riskLevel,
      action,
      isolationScore,
      driftScore,
      combinedScore,
      meanAbsZ,
      saturatedFeatures,
      assessmentId,
      evaluatedAt,
    } = params;

    // Always update last-known risk telemetry on the session row.
    const baseUpdate = {
      riskLevel,
      lastIsolationScore: isolationScore,
      lastDriftScore: driftScore,
      lastCombinedScore: combinedScore,
      lastRiskEvaluatedAt: evaluatedAt,
    };

    if (action === "SESSION_REVOKED") {
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          ...baseUpdate,
          state: "REVOKED",
          revokedAt: evaluatedAt,
          stepUpRequired: false,
          isMonitoringActive: false,
          endedAt: evaluatedAt,
        },
      });

      await prisma.auditLog.createMany({
        data: [
          {
            sessionId,
            action: "RISK_ESCALATED",
            details: {
              level: riskLevel,
              combinedScore,
              isolationScore,
              driftScore,
              meanAbsZ,
              saturatedFeatures,
              assessmentId,
            },
          },
          {
            sessionId,
            action: "SESSION_REVOKED",
            details: { reason: "HIGH risk detected", assessmentId },
          },
        ],
      });
      return;
    }

    if (action === "STEP_UP_REQUIRED") {
      // Only escalate state if the session is currently in a normal monitoring state.
      const current = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { state: true, stepUpRequired: true },
      });

      const shouldEscalateState =
        current &&
        (current.state === "ACTIVE_MONITORING" ||
          current.state === "ACTIVE");

      await prisma.session.update({
        where: { id: sessionId },
        data: {
          ...baseUpdate,
          stepUpRequired: true,
          ...(shouldEscalateState ? { state: "STEP_UP_REQUIRED" } : {}),
        },
      });

      // Avoid spamming the audit log: only emit STEP_UP_REQUIRED on transition.
      if (current && !current.stepUpRequired) {
        await prisma.auditLog.create({
          data: {
            sessionId,
            action: "STEP_UP_REQUIRED",
            details: {
              level: riskLevel,
              combinedScore,
              isolationScore,
              driftScore,
              meanAbsZ,
              saturatedFeatures,
              assessmentId,
            },
          },
        });
      }
      return;
    }

    // LOW → just record the evaluation
    await prisma.session.update({
      where: { id: sessionId },
      data: baseUpdate,
    });

    await prisma.auditLog.create({
      data: {
        sessionId,
        action: "RISK_EVALUATED",
        details: {
          level: riskLevel,
          combinedScore,
          isolationScore,
          driftScore,
          assessmentId,
        },
      },
    });
  }

  /**
   * Legacy single-shot evaluation used by `POST /api/risk/evaluate`.
   * Backed by the latest stored assessment so the public API stays consistent
   * with the live continuous pipeline.
   */
  async evaluate(sessionId: string): Promise<RiskEvaluationResponse> {
    const latest = await prisma.riskAssessment.findFirst({
      where: { sessionId },
      orderBy: { evaluatedAt: "desc" },
    });

    if (!latest) {
      return {
        sessionId,
        riskLevel: "LOW",
        score: 0,
        factors: [
          {
            name: "no_assessment",
            weight: 0,
            description:
              "No risk assessment available yet — baseline or ML model still initializing.",
          },
        ],
        evaluatedAt: new Date().toISOString(),
      };
    }

    return {
      sessionId,
      riskLevel: latest.riskLevel as RiskLevelType,
      score: latest.combinedScore,
      factors: [
        {
          name: "isolation_forest",
          weight: RISK_WEIGHTS.isolationForest,
          description: `IsolationForest anomaly score: ${latest.isolationScore.toFixed(3)}`,
        },
        {
          name: "z_score_drift",
          weight: RISK_WEIGHTS.zScoreDrift,
          description: `Statistical drift score: ${latest.driftScore.toFixed(3)}`,
        },
      ],
      evaluatedAt: latest.evaluatedAt.toISOString(),
    };
  }
}

// ──────────────────── helpers ────────────────────

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function decideAction(level: RiskLevelType): RiskAction {
  if (level === "HIGH" || level === "CRITICAL") return "SESSION_REVOKED";
  if (level === "MEDIUM") return "STEP_UP_REQUIRED";
  return "NONE";
}

export const riskService = new RiskService();
