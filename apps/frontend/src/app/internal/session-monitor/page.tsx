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
    <div className="bg-gray-800 rounded-lg px-3 py-2">
      <p className="text-[11px] text-gray-400 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-lg font-semibold text-white">{value}</p>
      {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
    </div>
  );
}

function FeaturePanel({ features }: { features: FeatureSummary }) {
  const { keystroke, mouse, navigation } = features;
  return (
    <div className="grid grid-cols-3 gap-3 mt-3">
      <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
        <div className="flex items-center gap-1.5 mb-2">
          <Keyboard className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-medium text-blue-400">Keystroke</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-gray-500">Total keys</p>
            <p className="text-white font-mono">{keystroke.totalKeystrokes}</p>
          </div>
          <div>
            <p className="text-gray-500">Avg hold</p>
            <p className="text-white font-mono">
              {keystroke.avgHoldDurationMs.toFixed(1)}ms
            </p>
          </div>
          <div>
            <p className="text-gray-500">Avg interval</p>
            <p className="text-white font-mono">
              {keystroke.avgInterKeyIntervalMs.toFixed(1)}ms
            </p>
          </div>
          <div>
            <p className="text-gray-500">Bursts</p>
            <p className="text-white font-mono">
              {keystroke.burstLengths.length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
        <div className="flex items-center gap-1.5 mb-2">
          <Mouse className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs font-medium text-green-400">Mouse</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-gray-500">Moves</p>
            <p className="text-white font-mono">{mouse.totalMoveEvents}</p>
          </div>
          <div>
            <p className="text-gray-500">Distance</p>
            <p className="text-white font-mono">
              {mouse.totalDistance.toFixed(0)}px
            </p>
          </div>
          <div>
            <p className="text-gray-500">Clicks</p>
            <p className="text-white font-mono">{mouse.totalClicks}</p>
          </div>
          <div>
            <p className="text-gray-500">Scrolls</p>
            <p className="text-white font-mono">{mouse.scrollCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
        <div className="flex items-center gap-1.5 mb-2">
          <Navigation className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-medium text-purple-400">
            Navigation
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-gray-500">Route changes</p>
            <p className="text-white font-mono">{navigation.routeChanges}</p>
          </div>
          <div>
            <p className="text-gray-500">Tab changes</p>
            <p className="text-white font-mono">
              {navigation.tabFocusChanges}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Inactive</p>
            <p className="text-white font-mono">
              {(navigation.totalInactiveMs / 1000).toFixed(1)}s
            </p>
          </div>
          <div>
            <p className="text-gray-500">Elapsed</p>
            <p className="text-white font-mono">
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
    <div className="mt-4 bg-gray-900 border border-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-xs font-medium text-rose-400 uppercase tracking-wider">
            Adaptive Risk Engine
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] px-2 py-0.5 rounded font-medium inline-flex items-center gap-1 ${
              session.mlModelTrained
                ? "bg-emerald-900/40 text-emerald-400"
                : "bg-gray-800 text-gray-500"
            }`}
          >
            <Brain className="w-3 h-3" />
            {session.mlModelTrained ? "ML TRAINED" : "ML NOT TRAINED"}
          </span>
          {session.stepUpRequired && (
            <span className="text-[11px] px-2 py-0.5 rounded font-medium inline-flex items-center gap-1 bg-amber-900/40 text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              STEP-UP
            </span>
          )}
          {session.revokedAt && (
            <span className="text-[11px] px-2 py-0.5 rounded font-medium inline-flex items-center gap-1 bg-red-900/40 text-red-400">
              <Ban className="w-3 h-3" />
              REVOKED
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
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
        <div className="mt-3 text-[11px] text-gray-400">
          Last decision:{" "}
          <span className="text-white font-mono">
            {last.riskLevel}
          </span>
          {" → "}
          <span className="text-white font-mono">{last.action}</span>
        </div>
      )}

      {recent.length > 0 ? (
        <div className="mt-3">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">
            Recent assessments (last {recent.length})
          </p>
          <div className="bg-gray-950 rounded border border-gray-800 overflow-hidden">
            <table className="w-full text-[11px] font-mono">
              <thead className="bg-gray-900/60 text-gray-500">
                <tr>
                  <th className="text-left px-2 py-1 font-normal">Time</th>
                  <th className="text-right px-2 py-1 font-normal">IF</th>
                  <th className="text-right px-2 py-1 font-normal">Drift</th>
                  <th className="text-right px-2 py-1 font-normal">Combined</th>
                  <th className="text-left px-2 py-1 font-normal">Level</th>
                  <th className="text-left px-2 py-1 font-normal">Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a, i) => (
                  <tr
                    key={`${a.evaluatedAt}-${i}`}
                    className="border-t border-gray-800/60"
                  >
                    <td className="px-2 py-1 text-gray-400">
                      {new Date(a.evaluatedAt).toLocaleTimeString()}
                    </td>
                    <td className="px-2 py-1 text-right text-blue-300">
                      {a.isolationScore.toFixed(3)}
                    </td>
                    <td className="px-2 py-1 text-right text-purple-300">
                      {a.driftScore.toFixed(3)}
                    </td>
                    <td className="px-2 py-1 text-right text-white">
                      {a.combinedScore.toFixed(3)}
                    </td>
                    <td className="px-2 py-1">
                      <span
                        className={`${
                          a.riskLevel === "LOW"
                            ? "text-emerald-400"
                            : a.riskLevel === "MEDIUM"
                            ? "text-yellow-400"
                            : a.riskLevel === "HIGH"
                            ? "text-orange-400"
                            : "text-red-400"
                        }`}
                      >
                        {a.riskLevel}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-gray-300">{a.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-gray-600 mt-3 italic">
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
    <div className="border border-gray-700 rounded-lg mb-2 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
        )}

        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isHealthy ? (
            <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="text-sm font-medium text-white truncate">
            {session.displayName}
          </span>
          <span className="text-[11px] text-gray-500 font-mono truncate">
            {session.sessionId.slice(0, 8)}…
          </span>
        </div>

        <div className="flex items-center gap-4 shrink-0 text-xs">
          <span
            className={`px-2 py-0.5 rounded font-medium ${
              session.state === "INITIALIZING_BASELINE"
                ? "bg-cyan-900/40 text-cyan-400"
                : session.state === "ACTIVE_MONITORING"
                ? "bg-emerald-900/40 text-emerald-400"
                : session.state === "STEP_UP_REQUIRED"
                ? "bg-amber-900/40 text-amber-400"
                : session.state === "REVOKED"
                ? "bg-red-900/40 text-red-400"
                : "bg-gray-800 text-gray-400"
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
            className={`px-2 py-0.5 rounded font-medium ${
              session.riskLevel === "LOW"
                ? "bg-emerald-900/40 text-emerald-400"
                : session.riskLevel === "MEDIUM"
                ? "bg-yellow-900/40 text-yellow-400"
                : session.riskLevel === "HIGH"
                ? "bg-orange-900/40 text-orange-400"
                : "bg-red-900/40 text-red-400"
            }`}
          >
            {session.riskLevel}
          </span>
          <span className="text-gray-400 font-mono">
            {session.packetCount} pkts
          </span>
          <span className="text-gray-500 w-20 text-right">
            {timeAgo(session.lastActivityAt)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-700/50">
          <div className="grid grid-cols-4 gap-3 mt-3">
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
          <div className="mt-4 bg-gray-900 border border-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">
                Baseline Model
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                  session.baselineStatus === "ESTABLISHED"
                    ? "bg-emerald-900/40 text-emerald-400"
                    : session.baselineStatus === "COLLECTING"
                    ? "bg-cyan-900/40 text-cyan-400"
                    : session.baselineStatus === "FAILED"
                    ? "bg-red-900/40 text-red-400"
                    : "bg-gray-800 text-gray-500"
                }`}
              >
                {session.baselineStatus || "PENDING"}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-2">
              <div className="flex justify-between text-[11px] text-gray-500 mb-1">
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
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    session.baselineStatus === "ESTABLISHED"
                      ? "bg-emerald-500"
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
              <p className="text-[11px] text-gray-500">
                Established: {new Date(session.baselineEstablishedAt).toLocaleString()}
              </p>
            )}

            {/* Feature means summary */}
            {session.baselineFeatureMeans && (
              <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-1 text-[11px]">
                {Object.entries(session.baselineFeatureMeans).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-500 truncate mr-1">{key}</span>
                    <span className="text-white font-mono">
                      {typeof val === "number" ? val.toFixed(2) : val}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <RiskPanel session={session} />

          {session.latestPacketSummary ? (
            <>
              <p className="text-[11px] text-gray-500 mt-4 mb-1 uppercase tracking-wider">
                Latest Packet Feature Summary
              </p>
              <FeaturePanel features={session.latestPacketSummary} />
            </>
          ) : (
            <p className="text-xs text-gray-600 mt-3 italic">
              No packets received yet
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
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 rounded-lg">
              <Monitor className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Session Telemetry Monitor</h1>
              <p className="text-sm text-gray-500">
                Internal debug — behavioural pipeline health
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                autoRefresh
                  ? "border-emerald-600 text-emerald-400 bg-emerald-900/20"
                  : "border-gray-700 text-gray-500"
              }`}
            >
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </button>
            <button
              onClick={fetchSessions}
              className="p-2 rounded-md border border-gray-700 hover:bg-gray-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">
                Active Sessions
              </span>
            </div>
            <p className="text-2xl font-bold">{sessions.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">
                Healthy
              </span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">
              {healthySessions}
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">
                Total Packets
              </span>
            </div>
            <p className="text-2xl font-bold">{totalPackets}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">
                Baselines
              </span>
            </div>
            <p className="text-2xl font-bold text-cyan-400">
              {baselinesEstablished}
              <span className="text-sm text-gray-500 font-normal ml-1">
                / {baselinesCollecting} collecting
              </span>
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              {atRiskSessions > 0 ? (
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              )}
              <span className="text-xs text-gray-400 uppercase tracking-wider">
                At Risk
              </span>
            </div>
            <p
              className={`text-2xl font-bold ${
                atRiskSessions > 0 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {atRiskSessions}
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">
                Last Poll
              </span>
            </div>
            <p className="text-sm font-mono mt-1 text-gray-300">
              {lastPoll ? lastPoll.toLocaleTimeString() : "—"}
            </p>
          </div>
        </div>

        {/* Session List */}
        {loading ? (
          <div className="text-center py-16 text-gray-500">
            Loading telemetry data…
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            No active monitored sessions
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
              Active Monitored Sessions
            </p>
            {sessions.map((s) => (
              <SessionRow key={s.sessionId} session={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
