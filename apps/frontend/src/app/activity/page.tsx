"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useActivities } from "@/lib/store";
import type { ActivityItem } from "@/lib/mock-data";
import {
  CheckSquare,
  StickyNote,
  User,
  LogIn,
  FileText,
  Filter,
} from "lucide-react";

type ActivityFilter = "all" | "task" | "note" | "profile" | "login" | "request";

const ICON_MAP: Record<ActivityItem["type"], typeof CheckSquare> = {
  task: CheckSquare,
  note: StickyNote,
  profile: User,
  login: LogIn,
  request: FileText,
};

const COLOR_MAP: Record<ActivityItem["type"], string> = {
  task: "bg-brand-50 text-brand-600",
  note: "bg-warning-50 text-warning-600",
  profile: "bg-success-50 text-success-600",
  login: "bg-surface-100 text-ink-500",
  request: "bg-brand-50 text-brand-600",
};

const LABEL_MAP: Record<ActivityItem["type"], string> = {
  task: "Task",
  note: "Note",
  profile: "Profile",
  login: "Login",
  request: "Request",
};

export default function ActivityPage() {
  return (
    <AppShell>
      <ActivityContent />
    </AppShell>
  );
}

function ActivityContent() {
  const { activities } = useActivities();
  const [filter, setFilter] = useState<ActivityFilter>("all");

  const filtered =
    filter === "all" ? activities : activities.filter((a) => a.type === filter);

  const filters: { key: ActivityFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "task", label: "Tasks" },
    { key: "note", label: "Notes" },
    { key: "profile", label: "Profile" },
    { key: "login", label: "Logins" },
    { key: "request", label: "Requests" },
  ];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Activity History</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            A log of your recent workspace activity
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-ink-400 text-[13px]">
          <Filter className="h-4 w-4" />
          <span>{filtered.length} events</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
              filter === f.key
                ? "border-brand-500 bg-brand-50 text-brand-600"
                : "border-surface-200 text-ink-500 hover:bg-surface-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="card">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-ink-400">No activity found</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {filtered.map((activity) => {
              const Icon = ICON_MAP[activity.type];
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 px-5 py-4"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${
                      COLOR_MAP[activity.type]
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-ink-800">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-ink-400">
                        {new Date(activity.timestamp).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          COLOR_MAP[activity.type]
                        }`}
                      >
                        {LABEL_MAP[activity.type]}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
