"use client";

import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { useTasks, useNotes, useActivities } from "@/lib/store";
import {
  CheckCircle,
  Clock,
  ListTodo,
  TrendingUp,
  Plus,
  ArrowRight,
  StickyNote,
  AlertCircle,
  Users,
  Activity,
  Beaker,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const { user } = useAuth();
  
  return (
    <AppShell>
      {user?.role === "ADMIN" ? <AdminDashboardContent /> : <DashboardContent />}
    </AppShell>
  );
}

function AdminDashboardContent() {
  const { user } = useAuth();
  const [sessionsCount, setSessionsCount] = useState<number | null>(null);
  const [usersCount, setUsersCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [sessionsRes, usersRes] = await Promise.all([
          api.get<any[]>("/api/session/telemetry/active"),
          api.get<any[]>("/api/user"),
        ]);
        if (sessionsRes.success && sessionsRes.data) {
          setSessionsCount(sessionsRes.data.length);
        }
        if (usersRes.success && usersRes.data) {
          setUsersCount(usersRes.data.length);
        }
      } catch (err) {
        console.error("Failed to load admin stats", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const adminStats = [
    {
      label: "Active Monitored Sessions",
      value: sessionsCount !== null ? sessionsCount : "...",
      icon: Activity,
      color: "text-brand-600",
      bg: "bg-brand-50",
      href: "/internal/session-monitor",
    },
    {
      label: "Registered Users",
      value: usersCount !== null ? usersCount : "...",
      icon: Users,
      color: "text-success-600",
      bg: "bg-success-50",
      href: "/internal/users",
    },
    {
      label: "Experiment Baseline Pipeline",
      value: "Active",
      icon: Beaker,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/internal/experiments",
    },
  ];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink-900">
          {greeting()}, {user?.displayName?.split(" ")[0]}
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          Welcome to the SessionGuard Admin Console. Manage system settings, users, and telemetry baseline models.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {adminStats.map((s) => (
          <Link
            href={s.href}
            key={s.label}
            className="card p-5 hover:border-brand-300 transition-colors block"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-ink-500">
                {s.label}
              </span>
              <div className={`p-2 rounded-lg ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-ink-900">{s.value}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card p-6 mb-8">
        <h2 className="text-sm font-semibold text-ink-800 mb-4">Quick Management Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/internal/users"
            className="btn-primary flex items-center justify-center gap-2 py-3 text-sm"
          >
            <Users className="h-4 w-4" /> Manage User Database
          </Link>
          <Link
            href="/internal/session-monitor"
            className="btn-secondary flex items-center justify-center gap-2 py-3 text-sm"
          >
            <Activity className="h-4 w-4" /> View Live Telemetry
          </Link>
          <Link
            href="/internal/experiments"
            className="btn-secondary flex items-center justify-center gap-2 py-3 text-sm"
          >
            <Beaker className="h-4 w-4" /> Run Adversarial Tests
          </Link>
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const { tasks } = useTasks();
  const { notes } = useNotes();
  const { activities } = useActivities();

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === "in-progress"
  ).length;
  const overdueTasks = tasks.filter(
    (t) => t.status !== "done" && new Date(t.dueDate) < new Date()
  ).length;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  const stats = [
    {
      label: "Total Tasks",
      value: totalTasks,
      icon: ListTodo,
      color: "text-brand-600",
      bg: "bg-brand-50",
    },
    {
      label: "In Progress",
      value: inProgressTasks,
      icon: Clock,
      color: "text-warning-600",
      bg: "bg-warning-50",
    },
    {
      label: "Completed",
      value: completedTasks,
      icon: CheckCircle,
      color: "text-success-600",
      bg: "bg-success-50",
    },
    {
      label: "Overdue",
      value: overdueTasks,
      icon: AlertCircle,
      color: "text-danger-600",
      bg: "bg-danger-50",
    },
  ];

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink-900">
          {greeting()}, {user?.displayName?.split(" ")[0]}
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          Here&apos;s an overview of your workspace today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-ink-500">
                {s.label}
              </span>
              <div className={`p-2 rounded-lg ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-ink-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link href="/tasks" className="btn-primary text-[13px]">
          <Plus className="h-4 w-4" /> New Task
        </Link>
        <Link href="/notes" className="btn-secondary text-[13px]">
          <StickyNote className="h-4 w-4" /> New Note
        </Link>
        <Link href="/requests" className="btn-secondary text-[13px]">
          <TrendingUp className="h-4 w-4" /> Submit Request
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
            <h2 className="text-sm font-semibold text-ink-800">
              Recent Tasks
            </h2>
            <Link
              href="/tasks"
              className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-surface-100">
            {tasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 px-5 py-3.5"
              >
                <div
                  className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    task.status === "done"
                      ? "bg-success-500"
                      : task.status === "in-progress"
                      ? "bg-warning-500"
                      : "bg-surface-300"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-[13px] font-medium truncate ${
                      task.status === "done"
                        ? "text-ink-400 line-through"
                        : "text-ink-800"
                    }`}
                  >
                    {task.title}
                  </p>
                </div>
                <span className="text-[11px] text-ink-400 flex-shrink-0">
                  {task.dueDate}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar widgets */}
        <div className="space-y-6">
          {/* Notes preview */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
              <h2 className="text-sm font-semibold text-ink-800">
                Quick Notes
              </h2>
              <Link
                href="/notes"
                className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-surface-100">
              {notes.slice(0, 3).map((note) => (
                <div key={note.id} className="px-5 py-3">
                  <p className="text-[13px] font-medium text-ink-800 truncate">
                    {note.title}
                  </p>
                  <p className="text-[11px] text-ink-400 mt-0.5 line-clamp-2">
                    {note.content.slice(0, 80)}...
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Activity feed */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
              <h2 className="text-sm font-semibold text-ink-800">
                Recent Activity
              </h2>
              <Link
                href="/activity"
                className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-surface-100">
              {activities.slice(0, 4).map((a) => (
                <div key={a.id} className="px-5 py-3">
                  <p className="text-[13px] text-ink-700">{a.description}</p>
                  <p className="text-[11px] text-ink-400 mt-0.5">
                    {new Date(a.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
