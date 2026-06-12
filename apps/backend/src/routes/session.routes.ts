import { Router, type Request, type Response } from "express";
import { sessionService } from "../services/session.service";
import { authenticateToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { sessionStartSchema, behaviourPacketSchema } from "./validators";
import type {
  APIResponse,
  SessionStartResponse,
  BehaviourIngestionResponse,
  AuditLogEntry,
  SessionTelemetryInfo,
  RiskStatusResponse,
} from "@sessionguard/shared-types";

const router = Router();

router.post("/start", authenticateToken, validate(sessionStartSchema), async (req: Request, res: Response) => {
  try {
    const ipAddress = req.body.ipAddress || req.ip || "unknown";
    const { userAgent } = req.body;

    const session = await sessionService.startSession(req.user!.userId, ipAddress, userAgent);

    const response: APIResponse<SessionStartResponse> = {
      success: true,
      data: session,
      message: "Session started",
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start session";
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.post("/behaviour", authenticateToken, validate(behaviourPacketSchema), async (req: Request, res: Response) => {
  try {
    const result = await sessionService.ingestBehaviour(req.user!.userId, req.body);

    const response: APIResponse<BehaviourIngestionResponse> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to ingest behaviour";
    res.status(400).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/audit/:sessionId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const logs = await sessionService.getAuditLogs(sessionId, req.user!.userId);

    const response: APIResponse<AuditLogEntry[]> = {
      success: true,
      data: logs,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch audit logs";
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/risk-status", authenticateToken, async (req: Request, res: Response) => {
  try {
    const status = await sessionService.getRiskStatus(req.user!.userId);

    if (!status) {
      res.status(404).json({
        success: false,
        error: "No active session found",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const response: APIResponse<RiskStatusResponse> = {
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch risk status";
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/telemetry/active", authenticateToken, async (req: Request, res: Response) => {
  try {
    const sessions = await sessionService.getActiveSessions();

    const response: APIResponse<SessionTelemetryInfo[]> = {
      success: true,
      data: sessions,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch telemetry";
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
