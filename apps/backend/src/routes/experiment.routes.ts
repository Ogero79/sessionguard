import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { experimentService } from "../services/experiment.service";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { prisma } from "../config/prisma";

const router = Router();

const startSchema = z.object({
  name: z.string().min(1, "Experiment name is required"),
  description: z.string().optional(),
  groundTruth: z.enum(["BENIGN", "HIJACKED"]),
  sessionId: z.string().uuid("Invalid session ID"),
});

router.post("/start", authenticateToken, requireAdmin, validate(startSchema), async (req: Request, res: Response) => {
  try {
    const { name, description, groundTruth, sessionId } = req.body;
    const experiment = await experimentService.startExperiment(name, description, groundTruth, sessionId);
    res.status(201).json({
      success: true,
      data: experiment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to start experiment",
      timestamp: new Date().toISOString(),
    });
  }
});

router.post("/inject-attack", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { experimentId } = req.body;
    if (!experimentId) {
      res.status(400).json({ success: false, error: "experimentId is required" });
      return;
    }
    const experiment = await experimentService.injectAttack(experimentId);
    res.status(200).json({
      success: true,
      data: experiment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to inject attack",
      timestamp: new Date().toISOString(),
    });
  }
});

router.post("/end", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { experimentId } = req.body;
    if (!experimentId) {
      res.status(400).json({ success: false, error: "experimentId is required" });
      return;
    }
    const experiment = await experimentService.endExperiment(experimentId);
    res.status(200).json({
      success: true,
      data: experiment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to end experiment",
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/list", authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const experiments = await experimentService.getExperiments();
    res.status(200).json({
      success: true,
      data: experiments,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch experiments",
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/metrics", authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const metrics = await experimentService.getGlobalMetrics();
    res.status(200).json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch metrics",
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/detail/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const detail = await experimentService.getExperimentDetail(id);
    res.status(200).json({
      success: true,
      data: detail,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch experiment details",
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/export", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { experimentId } = req.query;

    if (experimentId && typeof experimentId === "string") {
      const detail = await experimentService.getExperimentDetail(experimentId);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=experiment_${experimentId}_logs.csv`
      );

      let csv = "Sequence,Timestamp,AnomalyScore,DriftScore,CombinedScore,PredictedLabel,GroundTruth,EnforcedAction,TopDriftingFeatures\n";
      for (const log of detail.logs) {
        let topFeaturesStr = "";
        if (log.explanations && Array.isArray(log.explanations)) {
          const significant = log.explanations
            .filter((e: any) => e.zScore > 1.5)
            .slice(0, 3)
            .map((e: any) => `${e.feature} (Z=${e.zScore.toFixed(2)})`);
          topFeaturesStr = significant.join("; ");
        }
        csv += `${log.packetSequence},${log.timestamp},${log.anomalyScore.toFixed(4)},${log.driftScore.toFixed(4)},${log.combinedScore.toFixed(4)},${log.predictedLabel},${log.groundTruth},${log.action},"${topFeaturesStr.replace(/"/g, '""')}"\n`;
      }
      res.status(200).send(csv);
    } else {
      const list = await experimentService.getExperiments();
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=experiments_summary.csv");

      let csv = "ID,Name,Status,GroundTruth,AttackInjected,StartedAt,EndedAt,TP,TN,FP,FN,Accuracy,FPR,DetectionLatencyMs,ResponseLatencyMs\n";
      for (const e of list) {
        csv += `"${e.id}","${e.name.replace(/"/g, '""')}",${e.status},${e.groundTruth},${e.attackInjected},${e.startedAt},${e.endedAt || ""},${e.truePositive || false},${e.trueNegative || false},${e.falsePositive || false},${e.falseNegative || false},${e.detectionAccuracy !== null ? e.detectionAccuracy.toFixed(4) : ""},${e.falsePositiveRate !== null ? e.falsePositiveRate.toFixed(4) : ""},${e.detectionLatencyMs ?? ""},${e.responseLatencyMs ?? ""}\n`;
      }
      res.status(200).send(csv);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to export data",
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/settings", authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.systemSettings.upsert({
      where: { id: "global" },
      update: {},
      create: {
        id: "global",
        mediumThreshold: 0.4,
        highThreshold: 0.7,
      },
    });
    res.status(200).json({
      success: true,
      data: settings,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch settings",
      timestamp: new Date().toISOString(),
    });
  }
});

const settingsSchema = z.object({
  mediumThreshold: z.number().min(0.01).max(0.99),
  highThreshold: z.number().min(0.01).max(0.99),
});

router.post("/settings", authenticateToken, requireAdmin, validate(settingsSchema), async (req: Request, res: Response) => {
  try {
    const { mediumThreshold, highThreshold } = req.body;
    if (mediumThreshold >= highThreshold) {
      res.status(400).json({
        success: false,
        error: "Medium threshold must be strictly less than high threshold",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const previous = await prisma.systemSettings.findUnique({
      where: { id: "global" },
    });

    const settings = await prisma.systemSettings.upsert({
      where: { id: "global" },
      update: {
        mediumThreshold,
        highThreshold,
      },
      create: {
        id: "global",
        mediumThreshold,
        highThreshold,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: "SETTINGS_CHANGED",
        ipAddress: req.ip || "unknown",
        details: {
          previous: previous || { mediumThreshold: 0.4, highThreshold: 0.7 },
          updated: { mediumThreshold, highThreshold },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: settings,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update settings",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
