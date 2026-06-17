"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Activity,
  Monitor,
  RefreshCw,
  Keyboard,
  Mouse,
  Navigation,
  Clock,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Brain,
  AlertTriangle,
  Ban,
} from "lucide-react";
import type {
  SessionTelemetryInfo,
  FeatureSummary,
  BaselineStatus,
} from "@sessionguard/shared-types";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";

const POLL_INTERVAL = 5_000;

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-surface-50 rounded-lg border border-surface-200 px-3 py-2 shadow-xs">
      <p className="text-[11px] text-ink-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-lg font-semibold text-ink-900">{value}</p>
      {sub && <p className="text-[11px] text-ink-400">{sub}</p>}
    </div>
  );
}

function FeaturePanel({ features }: { features: FeatureSummary }) {
  const { keystroke, mouse, navigation } = features;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
      <div className="bg-white rounded-lg p-3 border border-surface-200 shadow-xs">
        <div className="flex items-center gap-1.5 mb-2">
          <Keyboard className="w-3.5 h-3.5 text-brand-600" />
          <span className="text-xs font-semibold text-brand-600">Keystroke</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-ink-400">Total keys</p>
            <p className="text-ink-900 font-mono font-semibold">{keystroke.totalKeystrokes}</p>
          </div>
          <div>
            <p className="text-ink-400">Avg hold</p>
            <p className="text-ink-900 font-mono font-semibold">
              {keystroke.avgHoldDurationMs.toFixed(1)}ms
            </p>
          </div>
          <div>
            <p className="text-ink-400">Avg interval</p>
            <p className="text-ink-900 font-mono font-semibold">
              {keystroke.avgInterKeyIntervalMs.toFixed(1)}ms
            </p>
          </div>
          <div>
            <p className="text-ink-400">Bursts</p>
            <p className="text-ink-900 font-mono font-semibold">
              {keystroke.burstLengths.length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-3 border border-surface-200 shadow-xs">
        <div className="flex items-center gap-1.5 mb-2">
          <Mouse className="w-3.5 h-3.5 text-success-600" />
          <span className="text-xs font-semibold text-success-600">Mouse</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-ink-400">Moves</p>
            <p className="text-ink-900 font-mono font-semibold">{mouse.totalMoveEvents}</p>
          </div>
          <div>
            <p className="text-ink-400">Distance</p>
            <p className="text-ink-900 font-mono font-semibold">
              {mouse.totalDistance.toFixed(0)}px
            </p>
          </div>
          <div>
            <p className="text-ink-400">Clicks</p>
            <p className="text-ink-900 font-mono font-semibold">{mouse.totalClicks}</p>
          </div>
          <div>
            <p className="text-ink-400">Scrolls</p>
            <p className="text-ink-900 font-mono font-semibold">{mouse.scrollCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-3 border border-surface-200 shadow-xs">
        <div className="flex items-center gap-1.5 mb-2">
          <Navigation className="w-3.5 h-3.5 text-purple-600" />
          <span className="text-xs font-semibold text-purple-600">
            Navigation
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-ink-400">Route changes</p>
            <p className="text-ink-900 font-mono font-semibold">{navigation.routeChanges}</p>
          </div>
          <div>
            <p className="text-ink-400">Tab changes</p>
            <p className="text-ink-900 font-mono font-semibold">
              {navigation.tabFocusChanges}
            </p>
          </div>
          <div>
            <p className="text-ink-400">Inactive</p>
            <p className="text-ink-900 font-mono font-semibold">
              {(navigation.totalInactiveMs / 1000).toFixed(1)}s
            </p>
          </div>
          <div>
            <p className="text-ink-400">Elapsed</p>
            <p className="text-ink-900 font-mono font-semibold">
              {(navigation.totalSessionElapsedMs / 1000).toFixed(0)}s
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskPanel({ session }: { session: SessionTelemetryInfo }) {
  const recent = session.recentAssessments ?? [];
  const last = recent[0];

  const fmt = (v: number | null | undefined) =>
    typeof v === "number" ? v.toFixed(3) : "—";

  return (
    <div className="mt-4 bg-surface-50 border border-surface-200 rounded-lg p-3 shadow-xs">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-danger-500" />
          <span className="text-xs font-bold text-ink-700 uppercase tracking-wider">
            Adaptive Risk Engine
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-1 border ${
              session.mlModelTrained
                ? "bg-success-50 text-success-600 border-success-100"
                : "bg-surface-100 text-ink-400 border-surface-200"
            }`}
          >
            <Brain className="w-3 h-3" />
            {session.mlModelTrained ? "ML TRAINED" : "ML NOT TRAINED"}
          </span>
          {session.stepUpRequired && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-1 bg-warning-50 text-warning-600 border border-warning-100">
              <AlertTriangle className="w-3 h-3" />
              STEP-UP
            </span>
          )}
          {session.revokedAt && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-1 bg-danger-50 text-danger-600 border border-danger-100">
              <Ban className="w-3 h-3" />
              REVOKED
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Combined"
          value={fmt(session.lastCombinedScore)}
          sub={
            session.lastRiskEvaluatedAt
              ? `eval ${timeAgo(session.lastRiskEvaluatedAt)}`
              : "no evaluation"
          }
        />
        <MetricCard
          label="Isolation"
          value={fmt(session.lastIsolationScore)}
          sub="weight 0.7"
        />
        <MetricCard
          label="Drift (Z)"
          value={fmt(session.lastDriftScore)}
          sub="weight 0.3"
        />
        <MetricCard
          label="ML Model"
          value={
            session.mlModelTrainedAt
              ? new Date(session.mlModelTrainedAt).toLocaleTimeString()
              : "—"
          }
          sub={session.mlModelTrained ? "trained" : "pending"}
        />
      </div>

      {last && (
        <div className="mt-3 text-[11px] text-ink-500">
          Last decision:{" "}
          <span className="text-ink-900 font-mono font-bold">
            {last.riskLevel}
          </span>
          {" → "}
          <span className="text-ink-900 font-mono font-bold">{last.action}</span>
        </div>
      )}

      {recent.length > 0 ? (
        <div className="mt-3">
          <p className="text-[11px] text-ink-500 uppercase tracking-wider mb-1 font-semibold">
            Recent assessments (last {recent.length})
          </p>
          <div className="bg-white rounded border border-surface-200 overflow-hidden shadow-xs">
            <table className="w-full text-[11px] font-mono text-left">
              <thead className="bg-surface-50 text-ink-500 border-b border-surface-200">
                <tr>
                  <th className="px-2 py-1 font-semibold">Time</th>
                  <th className="text-right px-2 py-1 font-semibold">IF</th>
                  <th className="text-right px-2 py-1 font-semibold">Drift</th>
                  <th className="text-right px-2 py-1 font-semibold">Combined</th>
                  <th className="px-2 py-1 font-semibold">Level</th>
                  <th className="px-2 py-1 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {recent.map((a, i) => (
                  <tr
                    key={`${a.evaluatedAt}-${i}`}
                    className="hover:bg-surface-50 transition-colors"
                  >
                    <td className="px-2 py-1 text-ink-500">
                      {new Date(a.evaluatedAt).toLocaleTimeString()}
                    </td>
                    <td className="px-2 py-1 text-right text-blue-600 font-semibold">
                      {a.isolationScore.toFixed(3)}
                    </td>
                    <td className="px-2 py-1 text-right text-purple-600 font-semibold">
                      {a.driftScore.toFixed(3)}
                    </td>
                    <td className="px-2 py-1 text-right text-ink-900 font-bold">
                      {a.combinedScore.toFixed(3)}
                    </td>
                    <td className="px-2 py-1">
                      <span
                        className={`font-semibold ${
                          a.riskLevel === "LOW"
                            ? "text-success-600"
                            : a.riskLevel === "MEDIUM"
                            ? "text-warning-600"
                            : "text-danger-600"
                        }`}
                      >
                        {a.riskLevel}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-ink-700 font-medium">{a.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-ink-400 mt-3 italic">
          No risk assessments recorded yet
        </p>
      )}
    </div>
  );
}

function SessionRow({ session }: { session: SessionTelemetryInfo }) {
  const [expanded, setExpanded] = useState(false);
  const isHealthy =
    session.isMonitoringActive &&
    session.lastActivityAt &&
    Date.now() - new Date(session.lastActivityAt).getTime() < 30_000;

  return (
    <div className="border border-surface-200 rounded-lg mb-2 bg-white overflow-hidden shadow-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 hover:bg-surface-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-ink-400 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-ink-400 shrink-0" />
          )}

          <div className="flex items-center gap-2 min-w-0">
            {isHealthy ? (
              <Wifi className="w-4 h-4 text-success-500 shrink-0" />
            ) : (
              <WifiOff className="w-4 h-4 text-danger-500 shrink-0" />
            )}
            <span className="text-sm font-semibold text-ink-900 truncate">
              {session.displayName}
            </span>
            <span className="text-[11px] text-ink-400 font-mono truncate">
              {session.sessionId.slice(0, 8)}…
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-xs self-start md:self-auto flex-wrap">
          <span
            className={`px-2 py-0.5 rounded font-semibold text-[10px] border ${
              session.state === "INITIALIZING_BASELINE"
                ? "bg-cyan-50 text-cyan-600 border-cyan-100"
                : session.state === "ACTIVE_MONITORING"
                ? "bg-success-50 text-success-600 border-success-100"
                : session.state === "STEP_UP_REQUIRED"
                ? "bg-warning-50 text-warning-600 border-warning-100 animate-pulse"
                : session.state === "REVOKED"
                ? "bg-danger-50 text-danger-600 border-danger-100"
                : "bg-surface-100 text-ink-500 border-surface-200"
            }`}
          >
            {session.state === "INITIALIZING_BASELINE"
              ? "BASELINE"
              : session.state === "ACTIVE_MONITORING"
              ? "MONITORING"
              : session.state === "STEP_UP_REQUIRED"
              ? "STEP-UP"
              : session.state === "REVOKED"
              ? "REVOKED"
              : session.state}
          </span>
          <span
            className={`px-2 py-0.5 rounded font-semibold text-[10px] border ${
              session.riskLevel === "LOW"
                ? "bg-success-50 text-success-600 border-success-100"
                : session.riskLevel === "MEDIUM"
                ? "bg-warning-50 text-warning-600 border-warning-100"
                : "bg-danger-50 text-danger-600 border-danger-100"
            }`}
          >
            {session.riskLevel}
          </span>
          <span className="text-ink-500 font-mono">
            {session.packetCount} pkts
          </span>
          <span className="text-ink-400 w-20 text-right">
            {timeAgo(session.lastActivityAt)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-surface-200 bg-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <MetricCard
              label="Packet Count"
              value={session.packetCount}
            />
            <MetricCard
              label="Current Route"
              value={session.currentRoute || "—"}
            />
            <MetricCard
              label="Last Activity"
              value={timeAgo(session.lastActivityAt)}
            />
            <MetricCard
              label="Session Start"
              value={new Date(session.startedAt).toLocaleTimeString()}
            />
          </div>

          {/* Baseline Progress */}
          <div className="mt-4 bg-surface-50 border border-surface-200 rounded-lg p-3 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-600 uppercase tracking-wider">
                Baseline Model
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                  session.baselineStatus === "ESTABLISHED"
                    ? "bg-success-50 text-success-600 border-success-100"
                    : session.baselineStatus === "COLLECTING"
                    ? "bg-cyan-50 text-cyan-600 border-cyan-100"
                    : session.baselineStatus === "FAILED"
                    ? "bg-danger-50 text-danger-600 border-danger-100"
                    : "bg-surface-100 text-ink-400 border-surface-200"
                }`}
              >
                {session.baselineStatus || "PENDING"}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-2">
              <div className="flex justify-between text-[11px] text-ink-500 mb-1">
                <span>
                  Packets: {session.baselinePacketsCollected} / {session.baselinePacketsRequired}
                </span>
                <span>
                  {Math.min(
                    100,
                    Math.round(
                      (session.baselinePacketsCollected / session.baselinePacketsRequired) * 100
                    )
                  )}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-surface-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    session.baselineStatus === "ESTABLISHED"
                      ? "bg-success-500"
                      : "bg-cyan-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (session.baselinePacketsCollected / session.baselinePacketsRequired) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {session.baselineEstablishedAt && (
              <p className="text-[10px] text-ink-400">
                Established: {new Date(session.baselineEstablishedAt).toLocaleString()}
              </p>
            )}

            {/* Feature means summary */}
            {session.baselineFeatureMeans && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-[11px] border-t border-surface-200 pt-2">
                {Object.entries(session.baselineFeatureMeans).map(([key, val]) => (
                  <div key={key} className="flex justify-between border-b border-surface-100/40 pb-0.5">
                    <span className="text-ink-500 truncate mr-1 font-mono">{key}</span>
                    <span className="text-ink-900 font-mono font-semibold">
                      {typeof val === "number" ? val.toFixed(3) : val}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <RiskPanel session={session} />

          {session.latestPacketSummary ? (
            <>
              <p className="text-[11px] text-ink-500 mt-4 mb-1 uppercase tracking-wider font-bold">
                Latest Ingested Feature Summary
              </p>
              <FeaturePanel features={session.latestPacketSummary} />
            </>
          ) : (
            <p className="text-xs text-ink-400 mt-3 italic">
              No telemetry packets ingested yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SessionMonitorPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionTelemetryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.get<SessionTelemetryInfo[]>(
        "/api/session/telemetry/active"
      );
      if (res.success && res.data) {
        setSessions(res.data);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
      setLastPoll(new Date());
    }
  }, []);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    fetchSessions();
  }, [token, router, fetchSessions]);

  useEffect(() => {
    if (!autoRefresh || !token) return;
    const id = setInterval(fetchSessions, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [autoRefresh, token, fetchSessions]);

  const totalPackets = sessions.reduce((s, x) => s + x.packetCount, 0);
  const healthySessions = sessions.filter(
    (s) =>
      s.isMonitoringActive &&
      s.lastActivityAt &&
      Date.now() - new Date(s.lastActivityAt).getTime() < 30_000
  ).length;
  const baselinesEstablished = sessions.filter(
    (s) => s.baselineStatus === "ESTABLISHED"
  ).length;
  const baselinesCollecting = sessions.filter(
    (s) => s.baselineStatus === "COLLECTING"
  ).length;
  const atRiskSessions = sessions.filter(
    (s) =>
      s.riskLevel === "MEDIUM" ||
      s.riskLevel === "HIGH" ||
      s.riskLevel === "CRITICAL" ||
      s.stepUpRequired ||
      s.state === "REVOKED"
  ).length;

  if (!user) return null;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-surface-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-50 border border-brand-200 rounded-xl">
              <Monitor className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-ink-900">Session Telemetry Monitor</h1>
              <p className="text-xs text-ink-500 mt-0.5">
                Internal researcher dashboard to audit continuous behavioral telemetry stream and pipeline health
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-xs px-3.5 py-1.5 rounded-lg border font-semibold transition-colors shadow-sm ${
                autoRefresh
                  ? "border-success-200 text-success-600 bg-success-50 hover:bg-success-100/60"
                  : "border-surface-200 text-ink-500 bg-white hover:bg-surface-50"
              }`}
            >
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </button>
            <button
              onClick={fetchSessions}
              className="p-2 rounded-lg border border-surface-200 bg-white hover:bg-surface-50 transition-colors shadow-sm"
              title="Manual Poll Ingest"
            >
              <RefreshCw className="w-4 h-4 text-ink-500" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-brand-600" />
              <span className="text-xs text-ink-400 font-bold uppercase tracking-wider">
                Active Sessions
              </span>
            </div>
            <p className="text-2xl font-bold text-ink-900">{sessions.length}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wifi className="w-4 h-4 text-success-500" />
              <span className="text-xs text-ink-400 font-bold uppercase tracking-wider">
                Healthy
              </span>
            </div>
            <p className="text-2xl font-bold text-success-600">
              {healthySessions}
            </p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-ink-400 font-bold uppercase tracking-wider">
                Total Packets
              </span>
            </div>
            <p className="text-2xl font-bold text-ink-900">{totalPackets}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-cyan-500" />
              <span className="text-xs text-ink-400 font-bold uppercase tracking-wider">
                Baselines
              </span>
            </div>
            <p className="text-2xl font-bold text-cyan-600">
              {baselinesEstablished}
              <span className="text-xs text-ink-400 font-normal ml-1">
                / {baselinesCollecting} col
              </span>
            </p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              {atRiskSessions > 0 ? (
                <ShieldAlert className="w-4 h-4 text-danger-500 animate-pulse" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-success-500" />
              )}
              <span className="text-xs text-ink-400 font-bold uppercase tracking-wider">
                At Risk
              </span>
            </div>
            <p
              className={`text-2xl font-bold ${
                atRiskSessions > 0 ? "text-danger-600" : "text-success-600"
              }`}
            >
              {atRiskSessions}
            </p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-warning-500" />
              <span className="text-xs text-ink-400 font-bold uppercase tracking-wider">
                Last Poll
              </span>
            </div>
            <p className="text-sm font-mono mt-2 text-ink-700 font-semibold">
              {lastPoll ? lastPoll.toLocaleTimeString() : "—"}
            </p>
          </div>
        </div>

        {/* Session List */}
        {loading ? (
          <div className="text-center py-16 text-ink-400">
            Loading telemetry data…
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 text-ink-400 italic">
            No active monitored sessions currently connected.
          </div>
        ) : (
          <div>
            <p className="text-xs text-ink-500 uppercase tracking-wider mb-3 font-bold">
              Active Monitored Sessions
            </p>
            {sessions.map((s) => (
              <SessionRow key={s.sessionId} session={s} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
