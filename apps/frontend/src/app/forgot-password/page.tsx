"use client";

import { useState } from "react";
import Link from "next/link";
import { Layers, Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-8">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-ink-900">
            SessionGuard
          </span>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-50 mx-auto mb-4">
              <CheckCircle className="h-6 w-6 text-success-500" />
            </div>
            <h2 className="text-xl font-bold text-ink-900 mb-2">
              Check your email
            </h2>
            <p className="text-sm text-ink-500 mb-8">
              If an account exists for <strong>{email}</strong>, we&apos;ve sent
              password reset instructions to your inbox.
            </p>
            <Link href="/login" className="btn-primary">
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-ink-900 mb-1">
              Forgot your password?
            </h2>
            <p className="text-sm text-ink-500 mb-8">
              Enter your email and we&apos;ll send you a link to reset it.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email address</label>
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

              <button type="submit" className="btn-primary w-full">
                Send reset link
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-ink-500">
              <Link
                href="/login"
                className="text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
