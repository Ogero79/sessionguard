import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import type { AuthTokenPayload, UserProfile } from "@sessionguard/shared-types";

const SALT_ROUNDS = 12;

export class AuthService {
  async register(email: string, password: string, displayName: string, ipAddress: string = "unknown"): Promise<UserProfile> {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error("User with this email already exists");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { email, passwordHash, displayName },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REGISTER",
        ipAddress,
        details: { email, displayName },
      },
    });

    return this.toProfile(user);
  }

  async login(email: string, password: string, ipAddress: string = "unknown"): Promise<{ token: string; user: UserProfile }> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid email or password");
    }

    const payload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const signOptions: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    };
    const token = jwt.sign(payload, env.JWT_SECRET, signOptions);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        ipAddress,
      },
    });

    return { token, user: this.toProfile(user) };
  }

  async logout(userId: string, sessionId?: string, ipAddress: string = "unknown"): Promise<void> {
    if (sessionId) {
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          state: "TERMINATED",
          isMonitoringActive: false,
          endedAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          sessionId,
          action: "LOGOUT",
          ipAddress,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          sessionId,
          action: "SESSION_END",
          ipAddress,
          details: { reason: "User requested logout" },
        },
      });
    } else {
      const latest = await prisma.session.findFirst({
        where: {
          userId,
          state: {
            in: ["ACTIVE", "ACTIVE_MONITORING", "STEP_UP_REQUIRED", "INITIALIZING_BASELINE"],
          },
        },
        orderBy: { startedAt: "desc" },
      });

      if (latest) {
        await prisma.session.update({
          where: { id: latest.id },
          data: {
            state: "TERMINATED",
            isMonitoringActive: false,
            endedAt: new Date(),
          },
        });

        await prisma.auditLog.create({
          data: {
            userId,
            sessionId: latest.id,
            action: "LOGOUT",
            ipAddress,
          },
        });

        await prisma.auditLog.create({
          data: {
            userId,
            sessionId: latest.id,
            action: "SESSION_END",
            ipAddress,
            details: { reason: "User requested logout (fallback)" },
          },
        });
      }
    }
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }
    return this.toProfile(user);
  }

  /**
   * Update a user's display name. Returns the updated profile.
   */
  async updateProfile(userId: string, displayName: string): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { displayName },
    });
    return this.toProfile(user);
  }

  /**
   * Retrieve persisted UI preferences for the user.
   * Returns an empty object if none saved yet.
   */
  async getPreferences(userId: string): Promise<Record<string, unknown>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });
    return (user?.preferences as Record<string, unknown>) ?? {};
  }

  /**
   * Merge-update user preferences. Stored as a flat JSON blob on the User row.
   */
  async updatePreferences(
    userId: string,
    prefs: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const existing = await this.getPreferences(userId);
    const merged = { ...existing, ...prefs };
    await prisma.user.update({
      where: { id: userId },
      data: { preferences: merged as any },
    });
    return merged;
  }

  /**
   * Verify the user's password without issuing a new token.
   * Used for step-up re-authentication when the risk engine demands it.
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;
    return bcrypt.compare(password, user.passwordHash);
  }

  private toProfile(user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    createdAt: Date;
    preferences?: unknown;
  }): UserProfile {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }
}

export const authService = new AuthService();

