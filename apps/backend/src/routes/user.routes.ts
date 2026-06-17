import { Router, type Request, type Response } from "express";
import { prisma } from "../config/prisma";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { APIResponse } from "@sessionguard/shared-types";

const router = Router();
const SALT_ROUNDS = 12;

// Apply middlewares globally to these routes
router.use(authenticateToken);
router.use(requireAdmin);

const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(1, "Display name is required").max(100),
  role: z.enum(["USER", "ADMIN"]),
});

const updateUserSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  displayName: z.string().min(1, "Display name is required").max(100).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

// GET /api/user - Get all users
router.get("/", async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Remove passwordHash before returning
    const profiles = users.map(user => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }));

    const response: APIResponse<any> = {
      success: true,
      data: profiles,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch users";
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/user - Create a user
router.post("/", validate(createUserSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, displayName, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({
        success: false,
        error: "A user with this email already exists",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        role,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: "REGISTER",
        ipAddress: req.ip || "unknown",
        details: { createdUserEmail: email, createdUserRole: role, actionBy: req.user!.email },
      },
    });

    const profile = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    const response: APIResponse<any> = {
      success: true,
      data: profile,
      message: "User created successfully",
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create user";
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/user/:id - Update user details
router.put("/:id", validate(updateUserSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, password, displayName, role } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: "User not found",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Prevent demoting oneself
    if (id === req.user!.userId && role && role !== "ADMIN") {
      res.status(400).json({
        success: false,
        error: "You cannot change your own admin role",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // If changing email, check uniqueness
    if (email && email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        res.status(400).json({
          success: false,
          error: "A user with this email already exists",
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    const updateData: any = {};
    if (email) updateData.email = email;
    if (displayName) updateData.displayName = displayName;
    if (role) updateData.role = role;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: "SETTINGS_CHANGED",
        ipAddress: req.ip || "unknown",
        details: { updatedUserId: id, updatedFields: Object.keys(updateData), actionBy: req.user!.email },
      },
    });

    const profile = {
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
    };

    const response: APIResponse<any> = {
      success: true,
      data: profile,
      message: "User updated successfully",
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update user";
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/user/:id - Delete a user
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: "User not found",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Prevent deleting oneself
    if (id === req.user!.userId) {
      res.status(400).json({
        success: false,
        error: "You cannot delete your own active admin account",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await prisma.user.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: "SETTINGS_CHANGED",
        ipAddress: req.ip || "unknown",
        details: { deletedUserId: id, deletedUserEmail: existingUser.email, actionBy: req.user!.email },
      },
    });

    const response: APIResponse<null> = {
      success: true,
      data: null,
      message: "User deleted successfully",
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete user";
    res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
