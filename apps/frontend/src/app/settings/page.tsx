"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import {
  Bell,
  Eye,
  Palette,
  Lock,
  Shield,
  Save,
  CheckCircle,
} from "lucide-react";

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsContent />
    </AppShell>
  );
}

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
        enabled ? "bg-brand-600" : "bg-surface-200"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

const DEFAULT_PREFS = {
  notifEmail: true,
  notifPush: true,
  notifTaskReminders: true,
  notifWeeklyDigest: false,
  privacyShowProfile: true,
  privacyShowActivity: true,
  privacyShowEmail: false,
  appearanceTheme: "light",
  appearanceDensity: "comfortable",
};

function SettingsContent() {
  const { preferences, updatePreferences } = useAuth();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const [notifications, setNotifications] = useState({
    email: DEFAULT_PREFS.notifEmail,
    push: DEFAULT_PREFS.notifPush,
    taskReminders: DEFAULT_PREFS.notifTaskReminders,
    weeklyDigest: DEFAULT_PREFS.notifWeeklyDigest,
  });

  const [privacy, setPrivacy] = useState({
    showProfile: DEFAULT_PREFS.privacyShowProfile,
    showActivity: DEFAULT_PREFS.privacyShowActivity,
    showEmail: DEFAULT_PREFS.privacyShowEmail,
  });

  const [appearance, setAppearance] = useState({
    theme: DEFAULT_PREFS.appearanceTheme,
    density: DEFAULT_PREFS.appearanceDensity,
  });

  const [passwords, setPasswords] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });

  // Hydrate from persisted preferences once loaded
  useEffect(() => {
    if (!preferences || Object.keys(preferences).length === 0) return;
    const p = preferences as Record<string, unknown>;
    setNotifications({
      email: (p.notifEmail as boolean) ?? DEFAULT_PREFS.notifEmail,
      push: (p.notifPush as boolean) ?? DEFAULT_PREFS.notifPush,
      taskReminders: (p.notifTaskReminders as boolean) ?? DEFAULT_PREFS.notifTaskReminders,
      weeklyDigest: (p.notifWeeklyDigest as boolean) ?? DEFAULT_PREFS.notifWeeklyDigest,
    });
    setPrivacy({
      showProfile: (p.privacyShowProfile as boolean) ?? DEFAULT_PREFS.privacyShowProfile,
      showActivity: (p.privacyShowActivity as boolean) ?? DEFAULT_PREFS.privacyShowActivity,
      showEmail: (p.privacyShowEmail as boolean) ?? DEFAULT_PREFS.privacyShowEmail,
    });
    setAppearance({
      theme: (p.appearanceTheme as string) ?? DEFAULT_PREFS.appearanceTheme,
      density: (p.appearanceDensity as string) ?? DEFAULT_PREFS.appearanceDensity,
    });
  }, [preferences]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updatePreferences({
        notifEmail: notifications.email,
        notifPush: notifications.push,
        notifTaskReminders: notifications.taskReminders,
        notifWeeklyDigest: notifications.weeklyDigest,
        privacyShowProfile: privacy.showProfile,
        privacyShowActivity: privacy.showActivity,
        privacyShowEmail: privacy.showEmail,
        appearanceTheme: appearance.theme,
        appearanceDensity: appearance.density,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // silent — preferences are non-critical
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">Settings</h1>
        <p className="text-sm text-ink-500 mt-0.5">
          Configure your workspace and account preferences
        </p>
      </div>

      {saved && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-success-50 border border-success-500/20 px-4 py-3 text-sm text-success-600">
          <CheckCircle className="h-4 w-4" /> Settings saved successfully
        </div>
      )}

      <div className="space-y-6">
        {/* Notifications */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="h-4 w-4 text-ink-500" />
            <h2 className="text-sm font-semibold text-ink-800">
              Notifications
            </h2>
          </div>
          <div className="space-y-4">
            {[
              {
                key: "email" as const,
                label: "Email notifications",
                desc: "Receive email updates about your workspace activity",
              },
              {
                key: "push" as const,
                label: "Push notifications",
                desc: "Get browser push notifications for important updates",
              },
              {
                key: "taskReminders" as const,
                label: "Task reminders",
                desc: "Remind me about upcoming task deadlines",
              },
              {
                key: "weeklyDigest" as const,
                label: "Weekly digest",
                desc: "Receive a weekly summary of your workspace activity",
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-1"
              >
                <div>
                  <p className="text-[13px] font-medium text-ink-800">
                    {item.label}
                  </p>
                  <p className="text-[12px] text-ink-400">{item.desc}</p>
                </div>
                <Toggle
                  enabled={notifications[item.key]}
                  onChange={(v) =>
                    setNotifications((prev) => ({ ...prev, [item.key]: v }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Eye className="h-4 w-4 text-ink-500" />
            <h2 className="text-sm font-semibold text-ink-800">Privacy</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                key: "showProfile" as const,
                label: "Public profile",
                desc: "Allow other workspace members to see your profile",
              },
              {
                key: "showActivity" as const,
                label: "Activity visibility",
                desc: "Show your recent activity to team members",
              },
              {
                key: "showEmail" as const,
                label: "Show email address",
                desc: "Display your email on your public profile",
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-1"
              >
                <div>
                  <p className="text-[13px] font-medium text-ink-800">
                    {item.label}
                  </p>
                  <p className="text-[12px] text-ink-400">{item.desc}</p>
                </div>
                <Toggle
                  enabled={privacy[item.key]}
                  onChange={(v) =>
                    setPrivacy((prev) => ({ ...prev, [item.key]: v }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* Appearance */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Palette className="h-4 w-4 text-ink-500" />
            <h2 className="text-sm font-semibold text-ink-800">Appearance</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Theme</label>
              <select
                value={appearance.theme}
                onChange={(e) =>
                  setAppearance((prev) => ({ ...prev, theme: e.target.value }))
                }
                className="input"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="label">Display density</label>
              <select
                value={appearance.density}
                onChange={(e) =>
                  setAppearance((prev) => ({
                    ...prev,
                    density: e.target.value,
                  }))
                }
                className="input"
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </div>
          </div>
        </div>

        {/* Password */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="h-4 w-4 text-ink-500" />
            <h2 className="text-sm font-semibold text-ink-800">
              Change Password
            </h2>
          </div>
          <div className="space-y-4 max-w-sm">
            <div>
              <label className="label">Current password</label>
              <input
                type="password"
                value={passwords.current}
                onChange={(e) =>
                  setPasswords((p) => ({ ...p, current: e.target.value }))
                }
                className="input"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="label">New password</label>
              <input
                type="password"
                value={passwords.newPass}
                onChange={(e) =>
                  setPasswords((p) => ({ ...p, newPass: e.target.value }))
                }
                className="input"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) =>
                  setPasswords((p) => ({ ...p, confirm: e.target.value }))
                }
                className="input"
                placeholder="Repeat new password"
              />
            </div>
            <p className="text-[11px] text-ink-400">
              Password change is not available in this research prototype.
            </p>
          </div>
        </div>

        {/* Account */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="h-4 w-4 text-ink-500" />
            <h2 className="text-sm font-semibold text-ink-800">Account</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-danger-600">
                Delete account
              </p>
              <p className="text-[12px] text-ink-400">
                Permanently delete your workspace and all associated data
              </p>
            </div>
            <button className="btn-danger text-[12px] py-1.5 px-3" disabled>
              Delete Account
            </button>
          </div>
        </div>

        <div className="flex justify-end pb-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary"
          >
            <Save className="h-4 w-4" />
            {loading ? "Saving..." : "Save All Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
