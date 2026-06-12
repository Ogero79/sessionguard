"use client";

import React, { useState } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { useRisk } from "@/lib/risk-context";
import { useAuth } from "@/lib/auth-context";

/**
 * Blocking modal shown when the adaptive risk engine demands step-up
 * re-authentication. Renders nothing when `stepUpRequired` is false.
 *
 * The modal cannot be dismissed by clicking outside — the user must either
 * verify their password or log out.
 */
export function StepUpModal() {
  const { stepUpRequired, verifyStepUp } = useRisk();
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!stepUpRequired) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await verifyStepUp(password);
      if (!result.verified) {
        setError("Incorrect password. Please try again.");
        setPassword("");
      } else {
        setPassword("");
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stepup-title"
    >
      <div className="w-full max-w-md mx-4 rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 bg-amber-50 border-b border-amber-200 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100">
            <ShieldAlert className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h2
              id="stepup-title"
              className="text-base font-semibold text-amber-900"
            >
              Verify it&apos;s really you
            </h2>
            <p className="text-sm text-amber-800 mt-0.5">
              Unusual activity was detected on your session. Please confirm
              your password to continue.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label
              htmlFor="stepup-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="stepup-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              disabled={submitting}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none disabled:bg-gray-50"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={logout}
              disabled={submitting}
              className="text-sm text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline disabled:opacity-50"
            >
              Sign out instead
            </button>
            <button
              type="submit"
              disabled={submitting || password.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Verifying…" : "Verify"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
