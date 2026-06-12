import { Router, type Request, type Response } from "express";
import { authService } from "../services/auth.service";
import { sessionService } from "../services/session.service";
import { authenticateToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { registerSchema, loginSchema, stepUpVerifySchema, updateProfileSchema } from "./validators";
import type {
  APIResponse,
  AuthResponse,
  StepUpVerifyResponse,
  UserProfile,
} from "@sessionguard/shared-types";

const router = Router();

router.post("/register", validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    const ipAddress = req.ip || "unknown";
    const user = await authService.register(email, password, displayName, ipAddress);

    const response: APIResponse<UserProfile> = {
      success: true,
      data: user,
      message: "Registration successful",
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    res.status(400).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.post("/login", validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || "unknown";
    const result = await authService.login(email, password, ipAddress);

    const response: APIResponse<AuthResponse> = {
      success: true,
      data: result,
      message: "Login successful",
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    res.status(401).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.post("/logout", authenticateToken, async (req: Request, res: Response) => {
  try {
    const ipAddress = req.ip || "unknown";
    const sessionId = req.user?.sessionId;
    await authService.logout(req.user!.userId, sessionId, ipAddress);

    res.status(200).json({
      success: true,
      message: "Logout successful",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Logout failed",
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/me", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await authService.getProfile(req.user!.userId);

    const response: APIResponse<UserProfile> = {
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch profile";
    res.status(404).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.post(
  "/verify-password",
  authenticateToken,
  validate(stepUpVerifySchema),
  async (req: Request, res: Response) => {
    try {
      const { password } = req.body as { password: string };
      const ok = await authService.verifyPassword(req.user!.userId, password);

      if (!ok) {
        const response: APIResponse<StepUpVerifyResponse> = {
          success: false,
          error: "Password verification failed",
          timestamp: new Date().toISOString(),
        };
        res.status(401).json(response);
        return;
      }

      const status = await sessionService.clearStepUp(req.user!.userId);

      const response: APIResponse<StepUpVerifyResponse> = {
        success: true,
        data: {
          verified: true,
          state: status?.state ?? "ACTIVE_MONITORING",
        },
        message: "Step-up verification successful",
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Verification failed";
      res.status(500).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

router.patch("/profile", authenticateToken, validate(updateProfileSchema), async (req: Request, res: Response) => {
  try {
    const { displayName } = req.body as { displayName: string };
    const updated = await authService.updateProfile(req.user!.userId, displayName);

    const response: APIResponse<UserProfile> = {
      success: true,
      data: updated,
      message: "Profile updated successfully",
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update profile",
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/preferences", authenticateToken, async (req: Request, res: Response) => {
  try {
    const prefs = await authService.getPreferences(req.user!.userId);
    res.status(200).json({ success: true, data: prefs, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get preferences",
      timestamp: new Date().toISOString(),
    });
  }
});

router.patch("/preferences", authenticateToken, async (req: Request, res: Response) => {
  try {
    const prefs = req.body as Record<string, unknown>;
    const updated = await authService.updatePreferences(req.user!.userId, prefs);
    res.status(200).json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update preferences",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
