import { Router, type Request, type Response } from "express";
import { riskService } from "../services/risk.service";
import { authenticateToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { riskEvaluationSchema } from "./validators";
import type { APIResponse, RiskEvaluationResponse } from "@sessionguard/shared-types";

const router = Router();

router.post("/evaluate", authenticateToken, validate(riskEvaluationSchema), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const result = await riskService.evaluate(sessionId);

    const response: APIResponse<RiskEvaluationResponse> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Risk evaluation failed";
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
