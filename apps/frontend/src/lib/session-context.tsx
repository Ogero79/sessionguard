"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { usePathname } from "next/navigation";
import { BehaviouralTracker } from "@sessionguard/behavioural-sdk";
import type { SessionStartResponse } from "@sessionguard/shared-types";
import { api } from "./api";
import { useAuth } from "./auth-context";
import { useRisk } from "./risk-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface SessionContextValue {
  sessionId: string | null;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const { stepUpRequired } = useRisk();
  const pathname = usePathname();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tracker, setTracker] = useState<BehaviouralTracker | null>(null);
  const trackerRef = useRef<BehaviouralTracker | null>(null);
  const startedRef = useRef(false);
  const prevPathRef = useRef<string>(pathname);

  const startSession = useCallback(async () => {
    if (!token || startedRef.current || user?.role === "ADMIN") return;
    startedRef.current = true;

    try {
      const res = await api.post<SessionStartResponse>("/api/session/start", {
        userAgent: navigator.userAgent,
      });

      if (res.success && res.data) {
        setSessionId(res.data.sessionId);

        const trackerInstance = new BehaviouralTracker({
          sessionId: res.data.sessionId,
          apiUrl: API_URL,
          authToken: token,
          batchIntervalMs: 10_000,
          enabled: true,
        });
        trackerInstance.setCurrentRoute(pathname);
        if (!stepUpRequired) {
          trackerInstance.start();
        }
        trackerRef.current = trackerInstance;
        setTracker(trackerInstance);
      }
    } catch {
      startedRef.current = false;
    }
  }, [token, pathname, user, stepUpRequired]);

  // Start/stop tracking when auth state changes
  useEffect(() => {
    if (user && token && user.role !== "ADMIN") {
      startSession();
    }
    return () => {
      if (trackerRef.current) {
        trackerRef.current.stop();
        trackerRef.current = null;
        setTracker(null);
      }
      startedRef.current = false;
    };
  }, [user, token, startSession]);

  // Pause/resume tracking during step-up challenges
  useEffect(() => {
    if (!tracker) return;

    if (stepUpRequired) {
      tracker.stop();
    } else {
      tracker.start();
    }
  }, [tracker, stepUpRequired]);

  // Track route changes as navigation events
  useEffect(() => {
    const activeTracker = trackerRef.current;
    if (!activeTracker) return;
    const prev = prevPathRef.current;
    if (prev !== pathname) {
      activeTracker.recordNavigation(prev, pathname, "push");
      prevPathRef.current = pathname;
    }
  }, [pathname]);

  return (
    <SessionContext.Provider value={{ sessionId }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
