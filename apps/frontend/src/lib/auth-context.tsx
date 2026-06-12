"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import type { UserProfile, AuthResponse } from "@sessionguard/shared-types";
import { api } from "./api";

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  preferences: Record<string, unknown>;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  logout: () => void;
  updateProfile: (displayName: string) => Promise<void>;
  updatePreferences: (prefs: Record<string, unknown>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<Record<string, unknown>>({});
  const router = useRouter();

  const doLogout = useCallback(
    (reason?: string) => {
      if (localStorage.getItem("tf_token")) {
        api.post("/api/auth/logout", {}).catch(() => {});
      }
      localStorage.removeItem("tf_token");
      setToken(null);
      setUser(null);
      setPreferences({});
      const url = reason ? `/login?reason=${reason}` : "/login";
      router.push(url);
    },
    [router]
  );

  const fetchMe = useCallback(async () => {
    try {
      const res = await api.get<UserProfile>("/api/auth/me");
      if (res.success && res.data) {
        setUser(res.data);
        // Load preferences
        const prefRes = await api.get<Record<string, unknown>>(
          "/api/auth/preferences"
        );
        if (prefRes.success && prefRes.data) {
          setPreferences(prefRes.data);
        }
      } else {
        doLogout();
      }
    } catch {
      doLogout();
    } finally {
      setLoading(false);
    }
  }, [doLogout]);

  useEffect(() => {
    const stored = localStorage.getItem("tf_token");
    if (stored) {
      setToken(stored);
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  // Listen for token expiry events dispatched by api.ts on 401/403
  useEffect(() => {
    const handler = () => doLogout("session_expired");
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, [doLogout]);

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>("/api/auth/login", {
      email,
      password,
    });
    if (!res.success || !res.data)
      throw new Error(res.error || "Login failed");
    localStorage.setItem("tf_token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    // Load preferences after login
    const prefRes = await api.get<Record<string, unknown>>(
      "/api/auth/preferences"
    );
    if (prefRes.success && prefRes.data) {
      setPreferences(prefRes.data);
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    const res = await api.post<UserProfile>("/api/auth/register", {
      email,
      password,
      displayName,
    });
    if (!res.success) throw new Error(res.error || "Registration failed");
    await login(email, password);
  };

  const logout = useCallback(() => doLogout(), [doLogout]);

  const updateProfile = useCallback(
    async (displayName: string) => {
      const res = await api.patch<UserProfile>("/api/auth/profile", {
        displayName,
      });
      if (!res.success || !res.data)
        throw new Error(res.error || "Failed to update profile");
      setUser(res.data);
    },
    []
  );

  const updatePreferences = useCallback(
    async (prefs: Record<string, unknown>) => {
      const res = await api.patch<Record<string, unknown>>(
        "/api/auth/preferences",
        prefs
      );
      if (res.success && res.data) {
        setPreferences(res.data);
      }
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        preferences,
        login,
        register,
        logout,
        updateProfile,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
