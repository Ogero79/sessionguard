"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Layers, Mail, Lock, ArrowRight, ShieldAlert } from "lucide-react";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams?.get("reason");
  const sessionRevoked = reason === "session_revoked";
  const sessionExpired = reason === "session_expired";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px]">
      <div className="lg:hidden flex items-center gap-2.5 mb-10">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
          <Layers className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-ink-900">
          SessionGuard
        </span>
      </div>

      <h2 className="text-2xl font-bold text-ink-900 mb-1">
        Welcome back
      </h2>
      <p className="text-sm text-ink-500 mb-8">
        Sign in to continue to your workspace
      </p>

      {sessionRevoked && (
        <div className="mb-5 rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-900 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-700" />
          <div>
            <p className="font-medium">Your session was ended for security.</p>
            <p className="text-amber-800/90 mt-0.5">
              We detected unusual activity and signed you out as a
              precaution. Please sign in again to continue.
            </p>
          </div>
        </div>
      )}

      {sessionExpired && (
        <div className="mb-5 rounded-lg bg-brand-50 border border-brand-200 px-4 py-3 text-sm text-brand-900 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-500" />
          <div>
            <p className="font-medium">Your session has expired.</p>
            <p className="text-brand-800/90 mt-0.5">
              Please sign in again to continue.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-lg bg-danger-50 border border-danger-500/20 px-4 py-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input pl-10"
              placeholder="name@company.com"
            />
          </div>
        </div>

        <div>
          <label className="label">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input pl-10"
              placeholder="Enter your password"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-ink-500">
            <input
              type="checkbox"
              className="rounded border-surface-300"
            />
            Remember me
          </label>
          <Link
            href="/forgot-password"
            className="text-brand-600 hover:text-brand-700 font-medium"
          >
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Signing in..." : "Sign in"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-brand-600 hover:text-brand-700 font-medium"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[480px] bg-brand-950 text-white flex-col justify-between p-12">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            SessionGuard
          </span>
        </div>
        <div>
          <h1 className="text-3xl font-bold leading-tight mb-3">
            Your workspace,
            <br />
            your way.
          </h1>
          <p className="text-brand-200 text-[15px] leading-relaxed max-w-sm">
            Manage tasks, capture notes, track progress, and stay organized —
            all in one place.
          </p>
        </div>
        <p className="text-brand-400 text-xs">
          &copy; 2025 SessionGuard Contributors. Apache-2.0 License.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-50">
        <Suspense fallback={<div className="text-center text-sm text-ink-500">Loading form...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
