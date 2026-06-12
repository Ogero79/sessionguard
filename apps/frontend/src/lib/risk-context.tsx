"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type {
  RiskStatusResponse,
  StepUpVerifyResponse,
} from "@sessionguard/shared-types";
import { api } from "./api";
import { useAuth } from "./auth-context";

/**
 * Polling cadence for the adaptive-security state machine.
 * Kept short enough that a user notices an escalation within ~6 seconds.
 */
const POLL_INTERVAL_MS = 6_000;

interface RiskContextValue {
  status: RiskStatusResponse | null;
  stepUpRequired: boolean;
  revoked: boolean;
  /** Submit a password to clear an outstanding step-up requirement. */
  verifyStepUp: (password: string) => Promise<StepUpVerifyResponse>;
  /** Trigger an immediate poll (e.g., after closing the step-up modal). */
  refresh: () => Promise<void>;
}

const RiskContext = createContext<RiskContextValue | undefined>(undefined);

export function RiskProvider({ children }: { children: React.ReactNode }) {
  const { token, user, logout } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<RiskStatusResponse | null>(null);
  const revokedHandledRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get<RiskStatusResponse>("/api/session/risk-status");
      if (res.success && res.data) {
        setStatus(res.data);

        // Forced logout on revocation — happens at most once per session.
        if (res.data.revoked && !revokedHandledRef.current) {
          revokedHandledRef.current = true;
          logout();
          router.push("/login?reason=session_revoked");
        }
      }
    } catch {
      // Polling failure is non-fatal; keep last known status.
    }
  }, [token, logout, router]);

  const verifyStepUp = useCallback(
    async (password: string): Promise<StepUpVerifyResponse> => {
      const res = await api.post<StepUpVerifyResponse>(
        "/api/auth/verify-password",
        { password }
      );

      if (!res.success || !res.data?.verified) {
        return {
          verified: false,
          state: status?.state ?? "STEP_UP_REQUIRED",
        };
      }

      // Refresh immediately so the gate clears.
      await refresh();
      return res.data;
    },
    [refresh, status]
  );

  // Start polling when authenticated, stop on logout.
  useEffect(() => {
    if (!user || !token) {
      setStatus(null);
      revokedHandledRef.current = false;
      return;
    }

    void refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [user, token, refresh]);

  const stepUpRequired =
    !!status &&
    !status.revoked &&
    (status.stepUpRequired || status.state === "STEP_UP_REQUIRED");

  return (
    <RiskContext.Provider
      value={{
        status,
        stepUpRequired,
        revoked: !!status?.revoked,
        verifyStepUp,
        refresh,
      }}
    >
      {children}
    </RiskContext.Provider>
  );
}

export function useRisk(): RiskContextValue {
  const ctx = useContext(RiskContext);
  if (!ctx) throw new Error("useRisk must be used within a RiskProvider");
  return ctx;
}
