"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { Save, CheckCircle, AlertCircle, User } from "lucide-react";

export default function ProfilePage() {
  return (
    <AppShell>
      <ProfileContent />
    </AppShell>
  );
}

function ProfileContent() {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Keep form in sync if user loads async
  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
  }, [user?.displayName]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Display name cannot be empty.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await updateProfile(displayName.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">Profile</h1>
        <p className="text-sm text-ink-500 mt-0.5">
          Manage your account information
        </p>
      </div>

      {saved && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-success-50 border border-success-500/20 px-4 py-3 text-sm text-success-600">
          <CheckCircle className="h-4 w-4" /> Profile updated successfully
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-danger-50 border border-danger-500/20 px-4 py-3 text-sm text-danger-600">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar + Identity */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-ink-800 mb-5">
            Personal Information
          </h2>
          <div className="flex items-start gap-5 mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xl font-bold flex-shrink-0">
              {initials || <User className="h-6 w-6" />}
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Display Name</label>
                  <input
                    id="profile-display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setSaved(false);
                    }}
                    className="input"
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={user?.email ?? ""}
                    disabled
                    className="input bg-surface-50 text-ink-400 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-ink-400 mt-1">
                    Email cannot be changed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Info (read-only) */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-ink-800 mb-4">
            Account Details
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">User ID</label>
              <input
                type="text"
                value={user?.id ?? ""}
                disabled
                className="input bg-surface-50 text-ink-400 cursor-not-allowed font-mono text-xs"
              />
            </div>
            <div>
              <label className="label">Role</label>
              <input
                type="text"
                value={user?.role ?? ""}
                disabled
                className="input bg-surface-50 text-ink-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="label">Member since</label>
              <input
                type="text"
                value={
                  user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : ""
                }
                disabled
                className="input bg-surface-50 text-ink-400 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            <Save className="h-4 w-4" />
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
