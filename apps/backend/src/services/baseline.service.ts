import { prisma } from "../config/prisma";
import type {
  BehaviouralFeatureVector,
  BaselineProfile,
} from "@sessionguard/shared-types";
import { FEATURE_KEYS } from "@sessionguard/shared-types";
import { mlClientService } from "./ml-client.service";

const BASELINE_PACKETS_REQUIRED = 18; // 3 minutes at 10s interval

export class BaselineService {
  /**
   * Ensure a BaselineModel record exists for the session (created on first call).
   * Returns whether the baseline is still collecting.
   */
  async ensureBaselineRecord(sessionId: string): Promise<boolean> {
    const existing = await prisma.baselineModel.findUnique({
      where: { sessionId },
    });

    if (existing) {
      return existing.baselineStatus === "COLLECTING";
    }

    await prisma.baselineModel.create({
      data: {
        sessionId,
        baselineStatus: "COLLECTING",
        packetsUsed: 0,
      },
    });

    return true;
  }

  /**
   * Called after every packet ingestion during baseline phase.
   * Increments counter and checks if we've collected enough packets
   * to establish the baseline.
   */
  async onPacketIngested(
    sessionId: string,
    featureVector: BehaviouralFeatureVector
  ): Promise<void> {
    const baseline = await prisma.baselineModel.findUnique({
      where: { sessionId },
    });

    if (!baseline || baseline.baselineStatus !== "COLLECTING") {
      return;
    }

    const newCount = baseline.packetsUsed + 1;

    await prisma.baselineModel.update({
      where: { sessionId },
      data: { packetsUsed: newCount },
    });

    if (newCount >= BASELINE_PACKETS_REQUIRED) {
      await this.establishBaseline(sessionId);
    }
  }

  /**
   * Collect all feature vectors from the baseline window,
   * compute statistical profile, persist it, and transition session state.
   */
  private async establishBaseline(sessionId: string): Promise<void> {
    const packets = await prisma.behaviouralData.findMany({
      where: { sessionId },
      orderBy: { packetSequence: "asc" },
      take: BASELINE_PACKETS_REQUIRED,
      select: { featureVectorJson: true },
    });

    const vectors: BehaviouralFeatureVector[] = packets
      .filter((p) => p.featureVectorJson !== null)
      .map((p) => p.featureVectorJson as unknown as BehaviouralFeatureVector);

    if (vectors.length < Math.floor(BASELINE_PACKETS_REQUIRED * 0.5)) {
      // Not enough valid vectors — mark as failed
      await prisma.baselineModel.update({
        where: { sessionId },
        data: { baselineStatus: "FAILED" },
      });
      return;
    }

    const profile = this.computeProfile(vectors);
    const now = new Date();

    await prisma.baselineModel.update({
      where: { sessionId },
      data: {
        baselineStatus: "ESTABLISHED",
        packetsUsed: vectors.length,
        featureMeansJson: profile.featureMeans as object,
        featureStdJson: profile.featureStd as object,
        featureRangesJson: profile.featureRanges as object,
        establishedAt: now,
        mlModelStatus: "TRAINING",
      },
    });

    await prisma.session.update({
      where: { id: sessionId },
      data: { state: "ACTIVE_MONITORING" },
    });

    await prisma.auditLog.create({
      data: {
        sessionId,
        action: "BASELINE_CREATED",
        details: {
          packetsUsed: vectors.length,
          featureCount: FEATURE_KEYS.length,
        },
      },
    });

    // Train the IsolationForest model — fire-and-forget so ingestion is not blocked.
    void this.trainMLModel(sessionId, vectors);
  }

  /**
   * Submit the baseline feature vectors to the Python ML microservice
   * for IsolationForest training, then persist the model status.
   */
  private async trainMLModel(
    sessionId: string,
    vectors: BehaviouralFeatureVector[]
  ): Promise<void> {
    const matrix = vectors.map((v) =>
      FEATURE_KEYS.map((k) => Number(v[k] ?? 0))
    );

    const result = await mlClientService.trainBaseline({
      sessionId,
      featureVectors: matrix,
    });

    if (result.status === "trained") {
      await prisma.baselineModel.update({
        where: { sessionId },
        data: {
          mlModelStatus: "TRAINED",
          mlModelId: result.modelId,
          mlModelTrainedAt: new Date(),
          mlTrainingError: null,
        },
      });

      await prisma.auditLog.create({
        data: {
          sessionId,
          action: "ML_MODEL_TRAINED",
          details: {
            modelId: result.modelId,
            samplesUsed: result.samplesUsed,
          },
        },
      });
    } else {
      await prisma.baselineModel.update({
        where: { sessionId },
        data: {
          mlModelStatus: "FAILED",
          mlTrainingError: result.message ?? "Unknown training failure",
        },
      });

      await prisma.auditLog.create({
        data: {
          sessionId,
          action: "ML_TRAINING_FAILED",
          details: {
            message: result.message ?? "Unknown training failure",
            samplesUsed: result.samplesUsed,
          },
        },
      });
    }
  }

  /**
   * Compute mean, std, and min/max ranges per feature across collected vectors.
   */
  private computeProfile(
    vectors: BehaviouralFeatureVector[]
  ): BaselineProfile {
    const featureMeans: Record<string, number> = {};
    const featureStd: Record<string, number> = {};
    const featureRanges: Record<string, { min: number; max: number }> = {};

    for (const key of FEATURE_KEYS) {
      const values = vectors.map((v) => v[key]);

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      featureMeans[key] = mean;

      const sqDiffs = values.map((v) => (v - mean) ** 2);
      const stdVal = Math.sqrt(
        sqDiffs.reduce((a, b) => a + b, 0) / values.length
      );
      featureStd[key] = stdVal;

      const min = Math.min(...values);
      const max = Math.max(...values);
      // Expand ranges by 2 std deviations for acceptable bounds
      featureRanges[key] = {
        min: Math.max(0, mean - 2 * stdVal),
        max: mean + 2 * stdVal,
      };
    }

    return {
      featureMeans,
      featureStd,
      featureRanges,
      packetsUsed: vectors.length,
      establishedAt: new Date().toISOString(),
    };
  }

  /**
   * Re-calculate the baseline profile and retrain the ML model using all
   * behavioural packets collected for the session so far.
   * Typically triggered after a successful step-up verification.
   */
  async adaptBaseline(sessionId: string): Promise<void> {
    // Get all ingested behavioral packets for this session
    const packets = await prisma.behaviouralData.findMany({
      where: { sessionId },
      orderBy: { packetSequence: "asc" },
      select: { featureVectorJson: true },
    });

    const vectors: BehaviouralFeatureVector[] = packets
      .filter((p) => p.featureVectorJson !== null)
      .map((p) => p.featureVectorJson as unknown as BehaviouralFeatureVector);

    if (vectors.length < 5) return; // not enough data to adapt

    const profile = this.computeProfile(vectors);
    const now = new Date();

    await prisma.baselineModel.update({
      where: { sessionId },
      data: {
        packetsUsed: vectors.length,
        featureMeansJson: profile.featureMeans as object,
        featureStdJson: profile.featureStd as object,
        featureRangesJson: profile.featureRanges as object,
        establishedAt: now,
        mlModelStatus: "TRAINING",
      },
    });

    await prisma.auditLog.create({
      data: {
        sessionId,
        action: "BASELINE_UPDATED",
        details: {
          reason: "STEP_UP_VERIFIED",
          packetsUsed: vectors.length,
          featureCount: FEATURE_KEYS.length,
        },
      },
    });

    // Retrain the IsolationForest model with the expanded benign dataset
    void this.trainMLModel(sessionId, vectors);
  }

  /**
   * Get the required packet count for baseline.
   */
  get requiredPackets(): number {
    return BASELINE_PACKETS_REQUIRED;
  }
}

export const baselineService = new BaselineService();
