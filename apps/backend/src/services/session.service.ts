import { prisma } from "../config/prisma";
import type {
  SessionStartResponse,
  BehaviourIngestionResponse,
  BehaviourPacket,
  SessionTelemetryInfo,
  FeatureSummary,
  BaselineStatus,
  RiskStatusResponse,
  RecentRiskAssessment,
  RiskLevelType,
  SessionState,
} from "@sessionguard/shared-types";
import { featureExtractionService } from "./feature-extraction.service";
import { baselineService } from "./baseline.service";
import { riskService } from "./risk.service";

export class SessionService {
  async startSession(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<SessionStartResponse> {
    const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
    const existingSession = await prisma.session.findFirst({
      where: {
        userId,
        state: {
          notIn: ["REVOKED", "TERMINATED", "EXPIRED"],
        },
      },
      orderBy: { startedAt: "desc" },
    });

    if (existingSession) {
      const elapsed = Date.now() - (existingSession.lastActivityAt?.getTime() ?? 0);
      if (elapsed < INACTIVITY_TIMEOUT_MS) {
        // Reuse the active session, updating its last activity timestamp
        const updated = await prisma.session.update({
          where: { id: existingSession.id },
          data: { lastActivityAt: new Date() },
        });

        return {
          sessionId: updated.id,
          state: updated.state as SessionState,
          startedAt: updated.startedAt.toISOString(),
        };
      } else {
        // Mark the idle session as EXPIRED in the database
        await prisma.session.update({
          where: { id: existingSession.id },
          data: {
            state: "EXPIRED",
            isMonitoringActive: false,
            endedAt: new Date(),
          },
        });
        await prisma.auditLog.create({
          data: {
            sessionId: existingSession.id,
            userId,
            action: "SESSION_END",
            details: { reason: "Session expired due to inactivity during startSession" },
          },
        });
      }
    }

    const session = await prisma.session.create({
      data: {
        userId,
        ipAddress,
        userAgent,
        state: "INITIALIZING_BASELINE",
        riskLevel: "LOW",
        isMonitoringActive: true,
        lastActivityAt: new Date(),
      },
    });

    // Create baseline collection record
    await baselineService.ensureBaselineRecord(session.id);

    await prisma.auditLog.create({
      data: {
        userId,
        sessionId: session.id,
        action: "SESSION_START",
        ipAddress,
        details: { userAgent },
      },
    });

    return {
      sessionId: session.id,
      state: session.state,
      startedAt: session.startedAt.toISOString(),
    };
  }

  async ingestBehaviour(
    userId: string,
    packet: BehaviourPacket
  ): Promise<BehaviourIngestionResponse> {
    const session = await prisma.session.findFirst({
      where: {
        id: packet.sessionId,
        userId,
        state: {
          in: [
            "INITIALIZING_BASELINE",
            "ACTIVE_MONITORING",
            "STEP_UP_REQUIRED",
            "ACTIVE",
          ],
        },
      },
    });

    if (!session) {
      throw new Error("Active session not found or revoked");
    }

    // Check expiration before ingestion (30 min threshold)
    const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
    if (session.lastActivityAt) {
      const elapsed = Date.now() - session.lastActivityAt.getTime();
      if (elapsed > INACTIVITY_TIMEOUT_MS) {
        await prisma.session.update({
          where: { id: session.id },
          data: {
            state: "EXPIRED",
            isMonitoringActive: false,
            endedAt: new Date(),
          },
        });
        await prisma.auditLog.create({
          data: {
            sessionId: session.id,
            userId,
            action: "SESSION_END",
            details: { reason: "Session expired due to inactivity (30m)" },
          },
        });
        throw new Error("Active session not found or revoked");
      }
    }

    const now = new Date();
    const windowDurationMs = packet.windowEnd - packet.windowStart;

    // Extract ML-ready feature vector from raw metrics
    const featureVector = featureExtractionService.extract(
      packet.features,
      windowDurationMs
    );

    await prisma.behaviouralData.create({
      data: {
        sessionId: session.id,
        packetId: packet.packetId,
        packetSequence: packet.packetSequence,
        packetWindowStart: new Date(packet.windowStart),
        packetWindowEnd: new Date(packet.windowEnd),
        currentRoute: packet.currentRoute,
        keystrokeMetricsJson: packet.features.keystroke as object,
        mouseMetricsJson: packet.features.mouse as object,
        navigationMetricsJson: packet.features.navigation as object,
        featureSummaryJson: packet.features as object,
        featureVectorJson: featureVector as object,
        receivedAt: now,
      },
    });

    await prisma.session.update({
      where: { id: session.id },
      data: {
        packetCount: { increment: 1 },
        lastActivityAt: now,
        currentRoute: packet.currentRoute,
      },
    });

    // Trigger baseline collection if session is in baseline phase
    if (session.state === "INITIALIZING_BASELINE") {
      await baselineService.onPacketIngested(session.id, featureVector);
    } else if (
      session.state === "ACTIVE_MONITORING" ||
      session.state === "STEP_UP_REQUIRED" ||
      session.state === "ACTIVE"
    ) {
      // Continuous risk evaluation against the established baseline + ML model.
      // Fire-and-forget so packet ingestion latency stays low.
      void riskService.evaluatePacket(session.id, featureVector).catch((err) => {
        console.error(
          `[session] risk evaluation failed for ${session.id}:`,
          err
        );
      });
    }

    return {
      packetId: packet.packetId,
      accepted: true,
      packetSequence: packet.packetSequence,
      receivedAt: now.toISOString(),
    };
  }

  /**
   * Returns the current adaptive-security state for the active session owned
   * by `userId`. Used by the frontend to drive the step-up modal and forced
   * logout. Does NOT expose raw anomaly/drift scores to end users.
   */
  async getRiskStatus(userId: string): Promise<RiskStatusResponse | null> {
    const session = await prisma.session.findFirst({
      where: { userId },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        state: true,
        riskLevel: true,
        stepUpRequired: true,
        revokedAt: true,
        lastRiskEvaluatedAt: true,
        lastActivityAt: true,
      },
    });

    if (!session) return null;

    // Check expiration during status check (30 min threshold)
    const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
    let isExpired = false;
    if (
      session.lastActivityAt &&
      session.state !== "REVOKED" &&
      session.state !== "TERMINATED" &&
      session.state !== "EXPIRED"
    ) {
      const elapsed = Date.now() - session.lastActivityAt.getTime();
      if (elapsed > INACTIVITY_TIMEOUT_MS) {
        await prisma.session.update({
          where: { id: session.id },
          data: {
            state: "EXPIRED",
            isMonitoringActive: false,
            endedAt: new Date(),
          },
        });
        await prisma.auditLog.create({
          data: {
            sessionId: session.id,
            userId,
            action: "SESSION_END",
            details: { reason: "Session expired due to inactivity (30m)" },
          },
        });
        isExpired = true;
      }
    }

    const stateVal = isExpired ? "EXPIRED" : session.state;

    return {
      sessionId: session.id,
      state: stateVal as SessionState,
      riskLevel: session.riskLevel as RiskLevelType,
      stepUpRequired: session.stepUpRequired && !isExpired,
      revoked: stateVal === "REVOKED",
      revokedAt: session.revokedAt?.toISOString() ?? null,
      lastEvaluatedAt: session.lastRiskEvaluatedAt?.toISOString() ?? null,
    };
  }

  /**
   * Clear a step-up requirement after the user successfully re-verifies.
   * The session returns to ACTIVE_MONITORING and a STEP_UP_VERIFIED audit
   * log entry is recorded.
   */
  async clearStepUp(userId: string): Promise<RiskStatusResponse | null> {
    const session = await prisma.session.findFirst({
      where: { userId, state: { in: ["STEP_UP_REQUIRED", "ACTIVE_MONITORING", "ACTIVE"] } },
      orderBy: { startedAt: "desc" },
    });

    if (!session) return null;

    const targetState: SessionState =
      session.state === "ACTIVE" ? "ACTIVE" : "ACTIVE_MONITORING";

    const updated = await prisma.session.update({
      where: { id: session.id },
      data: {
        stepUpRequired: false,
        state: targetState,
        riskLevel: "LOW",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        sessionId: session.id,
        action: "STEP_UP_VERIFIED",
        details: { previousState: session.state },
      },
    });

    // Adapt the baseline to incorporate the recently verified benign behavior
    void baselineService.adaptBaseline(session.id).catch((err) => {
      console.error(`[session] failed to adapt baseline on stepup verification:`, err);
    });

    return {
      sessionId: updated.id,
      state: updated.state as SessionState,
      riskLevel: updated.riskLevel as RiskLevelType,
      stepUpRequired: updated.stepUpRequired,
      revoked: updated.state === "REVOKED",
      revokedAt: updated.revokedAt?.toISOString() ?? null,
      lastEvaluatedAt: updated.lastRiskEvaluatedAt?.toISOString() ?? null,
    };
  }

  async getAuditLogs(
    sessionId: string,
    userId: string
  ): Promise<import("@sessionguard/shared-types").AuditLogEntry[]> {
    const logs = await prisma.auditLog.findMany({
      where: { sessionId, userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return logs.map((log) => ({
      id: log.id,
      userId: log.userId ?? undefined,
      sessionId: log.sessionId ?? undefined,
      action: log.action,
      details: (log.details ?? null) as Record<string, unknown> | null,
      ipAddress: log.ipAddress ?? undefined,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  async getActiveSessions(): Promise<SessionTelemetryInfo[]> {
    const sessions = await prisma.session.findMany({
      where: {
        state: {
          in: [
            "INITIALIZING_BASELINE",
            "ACTIVE_MONITORING",
            "STEP_UP_REQUIRED",
            "REVOKED",
            "ACTIVE",
          ],
        },
      },
      include: {
        user: { select: { displayName: true } },
        behaviouralData: {
          orderBy: { receivedAt: "desc" },
          take: 1,
          select: { featureSummaryJson: true },
        },
        baselineModels: {
          take: 1,
          select: {
            baselineStatus: true,
            packetsUsed: true,
            establishedAt: true,
            featureMeansJson: true,
            mlModelStatus: true,
            mlModelTrainedAt: true,
          },
        },
        riskAssessments: {
          orderBy: { evaluatedAt: "desc" },
          take: 10,
          select: {
            isolationScore: true,
            driftScore: true,
            combinedScore: true,
            riskLevel: true,
            action: true,
            evaluatedAt: true,
          },
        },
      },
      orderBy: { lastActivityAt: "desc" },
    });

    return sessions.map((s) => {
      const baseline = s.baselineModels[0] ?? null;
      const recentAssessments: RecentRiskAssessment[] = s.riskAssessments.map(
        (a) => ({
          isolationScore: a.isolationScore,
          driftScore: a.driftScore,
          combinedScore: a.combinedScore,
          riskLevel: a.riskLevel,
          action: a.action,
          evaluatedAt: a.evaluatedAt.toISOString(),
        })
      );

      return {
        sessionId: s.id,
        userId: s.userId,
        displayName: s.user.displayName,
        state: s.state,
        riskLevel: s.riskLevel,
        packetCount: s.packetCount,
        lastActivityAt: s.lastActivityAt?.toISOString() ?? null,
        currentRoute: s.currentRoute,
        isMonitoringActive: s.isMonitoringActive,
        startedAt: s.startedAt.toISOString(),
        latestPacketSummary:
          s.behaviouralData.length > 0
            ? (s.behaviouralData[0].featureSummaryJson as unknown as FeatureSummary)
            : null,
        baselineStatus: baseline
          ? (baseline.baselineStatus as BaselineStatus)
          : null,
        baselinePacketsCollected: baseline?.packetsUsed ?? 0,
        baselinePacketsRequired: baselineService.requiredPackets,
        baselineEstablishedAt: baseline?.establishedAt?.toISOString() ?? null,
        baselineFeatureMeans: baseline?.featureMeansJson
          ? (baseline.featureMeansJson as Record<string, number>)
          : null,
        // Phase 4 — Risk telemetry
        mlModelTrained: baseline?.mlModelStatus === "TRAINED",
        mlModelTrainedAt: baseline?.mlModelTrainedAt?.toISOString() ?? null,
        lastIsolationScore: s.lastIsolationScore,
        lastDriftScore: s.lastDriftScore,
        lastCombinedScore: s.lastCombinedScore,
        lastRiskEvaluatedAt: s.lastRiskEvaluatedAt?.toISOString() ?? null,
        stepUpRequired: s.stepUpRequired,
        revokedAt: s.revokedAt?.toISOString() ?? null,
        recentAssessments,
      };
    });
  }
}

export const sessionService = new SessionService();
