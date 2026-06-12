"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Beaker,
  Plus,
  Play,
  StopCircle,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldAlert,
  HelpCircle,
  Activity,
  User,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  ExperimentSummary,
  ExperimentDetail,
  GlobalEvaluationMetrics,
  SessionTelemetryInfo,
  ExperimentLogEntry,
} from "@sessionguard/shared-types";

export default function ExperimentsPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  // State
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [metrics, setMetrics] = useState<GlobalEvaluationMetrics | null>(null);
  const [activeSessions, setActiveSessions] = useState<SessionTelemetryInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Threshold Settings State
  const [mediumThreshold, setMediumThreshold] = useState(0.4);
  const [highThreshold, setHighThreshold] = useState(0.7);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New experiment form
  const [showStartForm, setShowStartForm] = useState(false);
  const [newTrialName, setNewTrialName] = useState("");
  const [newTrialDesc, setNewTrialDesc] = useState("");
  const [newTrialGT, setNewTrialGT] = useState<"BENIGN" | "HIJACKED">("HIJACKED");
  const [newTrialSessionId, setNewTrialSessionId] = useState("");

  // Active Experiment detail for chart
  const [activeDetail, setActiveDetail] = useState<ExperimentDetail | null>(null);
  const [pollIntervalId, setPollIntervalId] = useState<ReturnType<typeof setInterval> | null>(null);

  // Modal / Detail view of completed trial
  const [selectedExperiment, setSelectedExperiment] = useState<ExperimentDetail | null>(null);

  // Active log packets explainability selection
  const [selectedActiveLog, setSelectedActiveLog] = useState<ExperimentLogEntry | null>(null);
  const [selectedModalLog, setSelectedModalLog] = useState<ExperimentLogEntry | null>(null);

  // Load basic lists
  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const expRes = await api.get<ExperimentSummary[]>("/api/experiment/list");
      if (expRes.success && expRes.data) {
        setExperiments(expRes.data);

        // Find if there is an active running experiment
        const running = expRes.data.find((e) => e.status === "RUNNING");
        if (running) {
          fetchActiveDetail(running.id);
        } else {
          setActiveDetail(null);
        }
      }

      const metRes = await api.get<GlobalEvaluationMetrics>("/api/experiment/metrics");
      if (metRes.success && metRes.data) {
        setMetrics(metRes.data);
      }

      const setRes = await api.get<{ mediumThreshold: number; highThreshold: number }>("/api/experiment/settings");
      if (setRes.success && setRes.data) {
        setMediumThreshold(setRes.data.mediumThreshold);
        setHighThreshold(setRes.data.highThreshold);
      }

      const sesRes = await api.get<SessionTelemetryInfo[]>("/api/session/telemetry/active");
      if (sesRes.success && sesRes.data) {
        // Only keep sessions that are actively monitoring or initializing baseline
        setActiveSessions(
          sesRes.data.filter((s) => s.state !== "REVOKED")
        );
      }
    } catch (err) {
      console.error("Failed to load evaluation data:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchActiveDetail = async (id: string) => {
    try {
      const res = await api.get<ExperimentDetail>(`/api/experiment/detail/${id}`);
      if (res.success && res.data) {
        setActiveDetail(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch running trial logs:", err);
    }
  };

  // Auth Redirects
  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    if (user && user.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    loadData();
  }, [token, user, router, loadData]);

  // Polling for active experiment logs
  useEffect(() => {
    const active = experiments.find((e) => e.status === "RUNNING");
    if (active) {
      const id = setInterval(() => {
        fetchActiveDetail(active.id);
      }, 5000);
      setPollIntervalId(id);
      return () => clearInterval(id);
    } else {
      if (pollIntervalId) {
        clearInterval(pollIntervalId);
        setPollIntervalId(null);
      }
    }
  }, [experiments]);

  // Actions
  const handleStartExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrialSessionId || !newTrialName) return;

    try {
      setLoading(true);
      const res = await api.post<ExperimentSummary>("/api/experiment/start", {
        name: newTrialName,
        description: newTrialDesc,
        groundTruth: newTrialGT,
        sessionId: newTrialSessionId,
      });

      if (res.success && res.data) {
        setShowStartForm(false);
        setNewTrialName("");
        setNewTrialDesc("");
        setNewTrialSessionId("");
        setSelectedActiveLog(null); // Reset active log selection
        await loadData();
      }
    } catch (err) {
      alert("Failed to start experiment");
    } finally {
      setLoading(false);
    }
  };

  const handleInjectAttack = async (id: string) => {
    try {
      const res = await api.post<ExperimentSummary>("/api/experiment/inject-attack", {
        experimentId: id,
      });
      if (res.success) {
        await loadData();
      }
    } catch (err) {
      alert("Failed to inject simulated attack");
    }
  };

  const handleEndExperiment = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.post<ExperimentSummary>("/api/experiment/end", {
        experimentId: id,
      });
      if (res.success) {
        setActiveDetail(null);
        setSelectedActiveLog(null); // Reset active log selection
        await loadData();
      }
    } catch (err) {
      alert("Failed to complete experiment");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (id: string) => {
    try {
      const res = await api.get<ExperimentDetail>(`/api/experiment/detail/${id}`);
      if (res.success && res.data) {
        setSelectedExperiment(res.data);
        setSelectedModalLog(null); // Reset modal log selection
      }
    } catch (err) {
      alert("Failed to fetch trial details");
    }
  };

  // CSV Export Trigger
  const handleExportSummary = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/experiment/export?token=${token}`, "_blank");
  };

  const handleExportLogs = (id: string) => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/experiment/export?experimentId=${id}&token=${token}`, "_blank");
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mediumThreshold >= highThreshold) {
      alert("Medium threshold must be strictly less than high threshold");
      return;
    }
    setSaveLoading(true);
    setSaveSuccess(false);
    try {
      const res = await api.post<{ mediumThreshold: number; highThreshold: number }>("/api/experiment/settings", {
        mediumThreshold,
        highThreshold,
      });
      if (res.success && res.data) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        await loadData();
      }
    } catch {
      alert("Failed to update thresholds");
    } finally {
      setSaveLoading(false);
    }
  };

  if (!user || user.role !== "ADMIN") return null;

  const activeExperiment = experiments.find((e) => e.status === "RUNNING");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-950 border border-indigo-500/30 rounded-xl">
              <Beaker className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Experimentation & Chapter Four Lab</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Designated researcher workspace for simulated attacks, ground-truth logging, and metrics validation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportSummary}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 text-xs font-semibold tracking-wide text-gray-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export Summary CSV
            </button>
            <button
              onClick={() => setShowStartForm(!showStartForm)}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold tracking-wide text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Trial Run
            </button>
          </div>
        </div>

        {/* Start Experiment Form Modal Overlay */}
        {showStartForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg mx-4 rounded-xl bg-gray-900 border border-gray-800 shadow-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4">Start Simulated Control Experiment</h3>
              <form onSubmit={handleStartExperiment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Trial Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Trial 12 - Keystroke Anomalous Hijack"
                    value={newTrialName}
                    onChange={(e) => setNewTrialName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded bg-gray-850 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Description / Hypothesis
                  </label>
                  <textarea
                    placeholder="Describe behavioral conditions or attack vector injected."
                    value={newTrialDesc}
                    onChange={(e) => setNewTrialDesc(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded bg-gray-850 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-white h-20 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Control Session
                    </label>
                    <select
                      required
                      value={newTrialSessionId}
                      onChange={(e) => setNewTrialSessionId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded bg-gray-850 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-white"
                    >
                      <option value="">Select active session...</option>
                      {activeSessions.map((s) => (
                        <option key={s.sessionId} value={s.sessionId}>
                          {s.displayName} ({s.sessionId.slice(0, 6)}…)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Experiment Mode
                    </label>
                    <select
                      value={newTrialGT}
                      onChange={(e) => setNewTrialGT(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm rounded bg-gray-850 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-white"
                    >
                      <option value="HIJACKED">HIJACKED (Inject Attack Mid-run)</option>
                      <option value="BENIGN">BENIGN (Static baseline control)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setShowStartForm(false)}
                    className="px-4 py-2 rounded text-xs text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white"
                  >
                    Launch Experiment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Global Metrics Bar */}
        {metrics && (
          <div className="grid grid-cols-6 gap-4 mb-8">
            <div className="bg-gray-900 border border-gray-800/80 rounded-xl p-4">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Trials</p>
              <p className="text-xl font-bold mt-1 text-white">{metrics.completedExperiments}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{metrics.totalExperiments} registered</p>
            </div>
            <div className="bg-gray-900 border border-gray-800/80 rounded-xl p-4">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Detection Accuracy</p>
              <p className="text-xl font-bold mt-1 text-emerald-400">
                {(metrics.overallAccuracy * 100).toFixed(1)}%
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">packet-level mean</p>
            </div>
            <div className="bg-gray-900 border border-gray-800/80 rounded-xl p-4">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">False Positive Rate</p>
              <p className="text-xl font-bold mt-1 text-amber-500">
                {(metrics.overallFalsePositiveRate * 100).toFixed(2)}%
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">benign packet error</p>
            </div>
            <div className="bg-gray-900 border border-gray-800/80 rounded-xl p-4">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Avg Detection Latency</p>
              <p className="text-xl font-bold mt-1 text-indigo-300">
                {metrics.averageDetectionLatencyMs !== null
                  ? `${(metrics.averageDetectionLatencyMs / 1000).toFixed(1)}s`
                  : "—"}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">from attack start</p>
            </div>
            <div className="bg-gray-900 border border-gray-800/80 rounded-xl p-4">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Avg Response Latency</p>
              <p className="text-xl font-bold mt-1 text-purple-300">
                {metrics.averageResponseLatencyMs !== null
                  ? `${metrics.averageResponseLatencyMs}ms`
                  : "—"}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">mitigation enforcement</p>
            </div>
            <div className="bg-gray-900 border border-gray-800/80 rounded-xl p-4">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Matrix (TP/TN/FP/FN)</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-2 text-[10px] font-mono text-gray-400">
                <div>TP: <span className="text-emerald-400">{metrics.truePositives}</span></div>
                <div>TN: <span className="text-emerald-400">{metrics.trueNegatives}</span></div>
                <div>FP: <span className="text-rose-400">{metrics.falsePositives}</span></div>
                <div>FN: <span className="text-rose-400">{metrics.falseNegatives}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Active Experiment Console */}
        {activeExperiment && activeDetail && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-8">
            <div className="flex items-start justify-between mb-4 border-b border-gray-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs text-rose-500 font-semibold tracking-wider uppercase">Active Trial Running</span>
                  <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                    activeExperiment.groundTruth === "BENIGN" ? "bg-slate-800 text-gray-400" : "bg-rose-950 text-rose-400 border border-rose-900/40"
                  }`}>
                    {activeExperiment.groundTruth === "BENIGN" ? "BENIGN CONTROL" : "HIJACKED SIMULATION"}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1.5">{activeExperiment.name}</h2>
                {activeExperiment.description && (
                  <p className="text-xs text-gray-400 mt-1">{activeExperiment.description}</p>
                )}
                <p className="text-[11px] text-gray-500 mt-1 font-mono">
                  Session ID: {activeExperiment.sessionId} | Started: {new Date(activeExperiment.startedAt).toLocaleTimeString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {activeExperiment.groundTruth === "HIJACKED" && !activeExperiment.attackInjected && (
                  <button
                    onClick={() => handleInjectAttack(activeExperiment.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Inject Attack Simulation
                  </button>
                )}
                {activeExperiment.attackInjected && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 text-rose-400 border border-rose-900/60 text-xs font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    ATTACK INJECTED
                  </span>
                )}
                <button
                  onClick={() => handleEndExperiment(activeExperiment.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-850 hover:bg-gray-800 border border-gray-700 text-xs font-bold text-white transition-colors"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  Complete Trial Run
                </button>
              </div>
            </div>

            {/* Active Session Lifecycle Timeline */}
            <div className="mb-6 bg-gray-950 border border-gray-850 rounded-xl p-4">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-4">Active Session Lifecycle Timeline</p>
              <div className="flex items-center justify-between relative px-4">
                <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-800 z-0" />
                {(() => {
                  const isBGT = activeExperiment.groundTruth === "BENIGN";
                  const totalP = activeDetail.logs.length;
                  const baselineDone = totalP >= 18;
                  const attackInjected = activeExperiment.attackInjected;
                  const alarmed = activeDetail.logs.some(l => l.action !== "NONE");

                  const nodes = [
                    { label: "Start Session", cond: true, desc: "Telemetry active" },
                    { label: "Baseline Ingest", cond: totalP > 0, desc: baselineDone ? "Done (18 packets)" : `${totalP}/18 packets` },
                    { label: "ML Classifier", cond: baselineDone, desc: baselineDone ? "Model trained" : "Pending baseline" },
                    { label: "Simulated Attack", cond: isBGT ? false : attackInjected, desc: isBGT ? "Control Run (Benign)" : (attackInjected ? "Attack Active" : "Waiting...") },
                    { label: "Remediation", cond: alarmed, desc: alarmed ? "Mitigation active" : "Silent monitoring" },
                  ];

                  return nodes.map((n, i) => {
                    const status = n.cond ? "done" : (i === 1 && !baselineDone ? "current" : (i === 3 && !isBGT && !attackInjected && baselineDone ? "current" : "pending"));
                    return (
                      <div key={i} className="flex flex-col items-center z-10 w-24 text-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-xs ${
                          status === "done"
                            ? "bg-indigo-600 border-indigo-400 text-white"
                            : status === "current"
                            ? "bg-gray-950 border-blue-500 text-blue-400 animate-pulse"
                            : "bg-gray-950 border-gray-800 text-gray-500"
                        }`}>
                          {i + 1}
                        </div>
                        <p className="text-[10px] font-bold text-white mt-1.5 leading-tight">{n.label}</p>
                        <p className="text-[8px] text-gray-500 font-mono mt-0.5 leading-tight">{n.desc}</p>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Score Trend Visualizer timeseries chart */}
            <div className="mt-5">
              <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">
                <span>Multi-Layer Score Trendline (Live Ingestion)</span>
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-500/50 rounded-sm inline-block" /> ML Anomaly
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-purple-500/50 rounded-sm inline-block" /> Statistical Drift
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-indigo-500 rounded-sm inline-block" /> Combined Risk
                  </span>
                </span>
              </div>
              <div className="h-44 bg-gray-950 rounded-xl border border-gray-800/80 p-4 flex items-end justify-between relative overflow-hidden gap-1.5">
                
                {/* Horizontal gridlines */}
                <div className="absolute inset-x-0 bottom-[4%] border-b border-gray-900/40 text-[9px] text-gray-600 flex justify-between px-2 select-none pointer-events-none">
                  <span>0.0</span>
                </div>
                <div 
                  className="absolute inset-x-0 border-b border-amber-500/20 text-[9px] text-amber-500/70 flex justify-between px-2 select-none pointer-events-none transition-all duration-500 z-10"
                  style={{ bottom: `${mediumThreshold * 100}%` }}
                >
                  <span>{mediumThreshold.toFixed(2)} (Medium Threshold)</span>
                </div>
                <div 
                  className="absolute inset-x-0 border-b border-rose-500/20 text-[9px] text-rose-500/70 flex justify-between px-2 select-none pointer-events-none transition-all duration-500 z-10"
                  style={{ bottom: `${highThreshold * 100}%` }}
                >
                  <span>{highThreshold.toFixed(2)} (High Threshold)</span>
                </div>

                {activeDetail.logs.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-600 italic">
                    Waiting for telemetry packets (10s intervals)...
                  </div>
                ) : (
                  activeDetail.logs.map((log) => {
                    const isAttack = log.groundTruth === "ATTACK";
                    const isAlarm = log.action !== "NONE";
                    const displayLog = selectedActiveLog || activeDetail.logs[activeDetail.logs.length - 1];
                    const isSelected = displayLog?.id === log.id;
                    const firstAttackLog = activeDetail.logs.find(l => l.groundTruth === "ATTACK");
                    const isFirstAttackPacket = firstAttackLog && log.id === firstAttackLog.id;

                    return (
                      <div
                        key={log.id}
                        onClick={() => setSelectedActiveLog(log)}
                        className={`flex-1 group flex flex-col items-center justify-end h-full relative cursor-pointer rounded-lg p-0.5 transition-colors ${
                          isSelected ? "bg-gray-800/60 ring-1 ring-indigo-500" : "hover:bg-gray-900/40"
                        }`}
                      >
                        {/* Attack boundary marker */}
                        {isFirstAttackPacket && (
                          <div className="absolute inset-y-0 -left-[3px] w-[2px] bg-rose-500 z-10 select-none pointer-events-none">
                            <span className="absolute top-2 left-1.5 whitespace-nowrap bg-rose-950/90 text-rose-400 font-mono text-[8px] font-bold px-1 py-0.5 rounded border border-rose-800 z-20 shadow-lg">
                              SIMULATION ATTACK INJECTED
                            </span>
                          </div>
                        )}

                        {/* Overlapping scores bars */}
                        <div className="w-full h-full relative flex items-end justify-between gap-[2px]">
                          <div
                            className="w-[28%] bg-blue-500/40 rounded-t-xs transition-all duration-300"
                            style={{ height: `${Math.max(6, log.anomalyScore * 100)}%` }}
                          />
                          <div
                            className={`w-[40%] rounded-t-sm transition-all duration-300 relative ${
                              isAttack ? "bg-rose-500" : "bg-indigo-500"
                            }`}
                            style={{ height: `${Math.max(8, log.combinedScore * 100)}%` }}
                          >
                            {isAlarm && (
                              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400 border border-gray-950" />
                            )}
                          </div>
                          <div
                            className="w-[28%] bg-purple-500/40 rounded-t-xs transition-all duration-300"
                            style={{ height: `${Math.max(6, log.driftScore * 100)}%` }}
                          />
                        </div>

                        {/* Sequence Label */}
                        <span className="text-[8px] text-gray-500 mt-1 font-mono">#{log.packetSequence}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Live Click-to-Explain Packet Ingest Details Panel */}
            {(() => {
              const displayLog = selectedActiveLog || (activeDetail.logs.length > 0 ? activeDetail.logs[activeDetail.logs.length - 1] : null);
              if (!displayLog) return null;

              return (
                <div className="mt-5 border-t border-gray-800 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      Explainability & Attribution (Packet #{displayLog.packetSequence})
                    </h4>
                    <span className="text-[10px] text-gray-500 font-mono">
                      Ingested: {new Date(displayLog.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 mb-4 bg-gray-950 border border-gray-800/80 rounded-xl p-3 text-xs">
                    <div>
                      <span className="text-gray-500 text-[10px] font-semibold uppercase block">Combined Score</span>
                      <strong className="text-white text-sm font-mono">{displayLog.combinedScore.toFixed(4)}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] font-semibold uppercase block">Anomaly Score (IF)</span>
                      <strong className="text-blue-400 text-sm font-mono">{displayLog.anomalyScore.toFixed(4)}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] font-semibold uppercase block">Statistical Drift Score</span>
                      <strong className="text-purple-400 text-sm font-mono">{displayLog.driftScore.toFixed(4)}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] font-semibold uppercase block">Remediation Action</span>
                      <strong className={`text-sm font-mono ${displayLog.action !== "NONE" ? "text-amber-400" : "text-gray-400"}`}>
                        {displayLog.action}
                      </strong>
                    </div>
                  </div>

                  {displayLog.explanations && Array.isArray(displayLog.explanations) ? (
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Top Drifting Behavioral Features</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {displayLog.explanations.slice(0, 6).map((item: any) => (
                          <div key={item.feature} className="bg-gray-950 border border-gray-800 rounded-lg p-2.5">
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-bold text-gray-300 font-mono block truncate max-w-[170px]" title={item.feature}>
                                {item.feature}
                              </span>
                              <span className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded ${
                                item.zScore >= 3.0 ? "bg-rose-950/60 text-rose-400" : item.zScore >= 1.5 ? "bg-amber-950/60 text-amber-400" : "bg-gray-800 text-gray-400"
                              }`}>
                                Z = {item.zScore.toFixed(2)}
                              </span>
                            </div>
                            <div className="mt-1 flex justify-between text-[9px] text-gray-500">
                              <span>Observed: <strong className="text-white font-mono">{Number(item.observed).toFixed(3)}</strong></span>
                              <span>Baseline: <strong className="text-gray-400 font-mono">{Number(item.mean).toFixed(3)}</strong></span>
                            </div>
                            <div className="mt-2">
                              <div className="flex justify-between text-[8px] text-gray-600 mb-0.5">
                                <span>Attribution Contribution</span>
                                <span>{item.contribution.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-900 rounded-full h-1 overflow-hidden">
                                <div
                                  className={`h-1 rounded-full ${item.zScore >= 3.0 ? "bg-rose-500" : "bg-indigo-500"}`}
                                  style={{ width: `${item.contribution}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-500 italic">
                      Feature-level Z-score explanations are not available for this baseline packet.
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Trials History & Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* History */}
          <div className="lg:col-span-2 bg-gray-900 border border-gray-850 rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-4">Completed Trial History</h2>
          
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading trial history...</div>
          ) : experiments.filter(e => e.status !== "RUNNING").length === 0 ? (
            <div className="text-center py-12 text-gray-600 italic">No completed trial runs available yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-950 text-gray-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Trial ID/Name</th>
                    <th className="px-4 py-3">Ground Truth</th>
                    <th className="px-4 py-3">Acc</th>
                    <th className="px-4 py-3">FPR</th>
                    <th className="px-4 py-3">Detection Latency</th>
                    <th className="px-4 py-3">Response Latency</th>
                    <th className="px-4 py-3">Outcome</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {experiments
                    .filter((e) => e.status !== "RUNNING")
                    .map((e) => {
                      const isBenignGT = e.groundTruth === "BENIGN";
                      return (
                        <tr key={e.id} className="hover:bg-gray-850/50">
                          <td className="px-4 py-3 font-medium text-white">
                            <div>{e.name}</div>
                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{e.id.slice(0, 8)}…</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                              isBenignGT ? "bg-slate-800 text-gray-400" : "bg-rose-950/40 text-rose-400"
                            }`}>
                              {e.groundTruth}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {e.detectionAccuracy !== null ? `${(e.detectionAccuracy * 100).toFixed(1)}%` : "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-amber-500">
                            {e.falsePositiveRate !== null ? `${(e.falsePositiveRate * 100).toFixed(2)}%` : "—"}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {e.detectionLatencyMs !== null ? `${(e.detectionLatencyMs / 1000).toFixed(1)}s` : "—"}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {e.responseLatencyMs !== null ? `${e.responseLatencyMs}ms` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {e.truePositive && (
                                <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/60 text-[9px] px-1.5 py-0.5 rounded">
                                  TP (True Positive)
                                </span>
                              )}
                              {e.trueNegative && (
                                <span className="bg-slate-800 text-gray-400 border border-gray-700/60 text-[9px] px-1.5 py-0.5 rounded">
                                  TN (True Negative)
                                </span>
                              )}
                              {e.falsePositive && (
                                <span className="bg-rose-950/40 text-rose-400 border border-rose-900/60 text-[9px] px-1.5 py-0.5 rounded">
                                  FP (False Positive)
                                </span>
                              )}
                              {e.falseNegative && (
                                <span className="bg-rose-950/40 text-rose-400 border border-rose-900/60 text-[9px] px-1.5 py-0.5 rounded">
                                  FN (False Negative)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-3">
                              <button
                                onClick={() => handleViewDetails(e.id)}
                                className="text-indigo-400 hover:text-indigo-300 font-medium"
                              >
                                View Logs
                              </button>
                              <button
                                onClick={() => handleExportLogs(e.id)}
                                className="text-gray-400 hover:text-gray-200"
                                title="Download Log CSV"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
          </div>

          {/* Settings Configuration Card & Metrics Reference Card */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-gray-900 border border-gray-850 rounded-xl p-5 h-fit">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">System Settings</h2>
              </div>
              <p className="text-xs text-gray-400 mb-5">
                Configure baseline alert thresholds for continuous anomaly risk levels. Changes propagate in real time.
              </p>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Medium Risk (Step-Up)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.99"
                    required
                    value={mediumThreshold}
                    onChange={(e) => setMediumThreshold(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded bg-gray-850 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    High Risk (Revocation)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.99"
                    required
                    value={highThreshold}
                    onChange={(e) => setHighThreshold(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded bg-gray-850 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-white font-mono"
                  />
                </div>
                {saveSuccess && (
                  <p className="text-xs text-emerald-400 font-semibold" role="alert">
                    Thresholds updated successfully!
                  </p>
                )}
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="w-full px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-colors disabled:opacity-50"
                >
                  {saveLoading ? "Saving..." : "Save Configuration"}
                </button>
              </form>
            </div>

            <div className="bg-gray-900 border border-gray-850 rounded-xl p-5 h-fit">
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Evaluation Reference</h2>
              </div>
              <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                SessionGuard calculates trial metrics automatically to support academic evaluation criteria:
              </p>
              <div className="space-y-3.5 text-xs text-gray-300">
                <div className="border-l-2 border-emerald-500 pl-2">
                  <strong className="text-emerald-400">True Positive (TP)</strong>
                  <p className="text-[10px] text-gray-400 mt-0.5">Alert/Mitigation correctly triggered during simulated hijack activity.</p>
                </div>
                <div className="border-l-2 border-slate-600 pl-2">
                  <strong className="text-gray-400">True Negative (TN)</strong>
                  <p className="text-[10px] text-gray-400 mt-0.5">No alarm triggered during benign baseline activity control runs.</p>
                </div>
                <div className="border-l-2 border-rose-500 pl-2">
                  <strong className="text-rose-400">False Positive (FP)</strong>
                  <p className="text-[10px] text-gray-400 mt-0.5">Alarm triggered during normal behavioral activity (false alert rate).</p>
                </div>
                <div className="border-l-2 border-rose-500 pl-2">
                  <strong className="text-rose-400">False Negative (FN)</strong>
                  <p className="text-[10px] text-gray-400 mt-0.5">Attacker activity failed to trigger mitigation (detection leak).</p>
                </div>
                <div className="border-t border-gray-800 pt-2 text-[10px] text-gray-500 space-y-1.5">
                  <p>• <strong>Detection Accuracy</strong>: percentage of telemetry packets correctly identified as benign/attacker.</p>
                  <p>• <strong>Detection Latency</strong>: elapsed milliseconds from attack injection to first mitigation alarm.</p>
                </div>
              </div>
            </div>
          </div>
          {/* end lg:col-span-1 sidebar */}
        </div>
        {/* end grid */}

        {/* Experiment Detail Logs Modal Overlay */}
        {selectedExperiment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-6xl mx-4 rounded-xl bg-gray-900 border border-gray-800 shadow-2xl p-6 h-[85vh] flex flex-col">
              
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-4 border-b border-gray-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                      selectedExperiment.groundTruth === "BENIGN" ? "bg-slate-800 text-gray-400" : "bg-rose-950 text-rose-400 border border-rose-900/40"
                    }`}>
                      {selectedExperiment.groundTruth === "BENIGN" ? "BENIGN CONTROL" : "HIJACKED SIMULATION"}
                    </span>
                    <span className="text-xs text-gray-500">|</span>
                    <h3 className="text-base font-bold text-white inline-block">{selectedExperiment.name}</h3>
                  </div>
                  {selectedExperiment.description && (
                    <p className="text-xs text-gray-400 mt-1">{selectedExperiment.description}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedExperiment(null)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Close
                </button>
              </div>

              {/* Metrics block */}
              <div className="grid grid-cols-4 gap-3 bg-gray-950 border border-gray-855 p-3 rounded-lg mb-4 text-xs">
                <div>
                  <p className="text-gray-500 font-semibold uppercase text-[10px]">Accuracy</p>
                  <p className="text-sm font-bold text-white font-mono mt-0.5">
                    {selectedExperiment.detectionAccuracy !== null ? `${(selectedExperiment.detectionAccuracy * 100).toFixed(1)}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-semibold uppercase text-[10px]">False Positive Rate</p>
                  <p className="text-sm font-bold text-amber-500 font-mono mt-0.5">
                    {selectedExperiment.falsePositiveRate !== null ? `${(selectedExperiment.falsePositiveRate * 100).toFixed(2)}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-semibold uppercase text-[10px]">Detection Latency</p>
                  <p className="text-sm font-bold text-white font-mono mt-0.5">
                    {selectedExperiment.detectionLatencyMs !== null ? `${(selectedExperiment.detectionLatencyMs / 1000).toFixed(1)}s` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-semibold uppercase text-[10px]">Response Latency</p>
                  <p className="text-sm font-bold text-white font-mono mt-0.5">
                    {selectedExperiment.responseLatencyMs !== null ? `${selectedExperiment.responseLatencyMs}ms` : "—"}
                  </p>
                </div>
              </div>

              {/* Dual-Pane View */}
              <div className="flex-1 flex gap-5 overflow-hidden min-h-0">
                {/* Left Pane: Logs List */}
                <div className="w-[45%] overflow-y-auto bg-gray-950 rounded-lg border border-gray-850">
                  <table className="w-full text-[11px] font-mono text-left">
                    <thead className="bg-gray-900 sticky top-0 text-gray-500 border-b border-gray-800 uppercase tracking-wider text-[9px]">
                      <tr>
                        <th className="px-3 py-2">Seq</th>
                        <th className="px-3 py-2 text-right">IF</th>
                        <th className="px-3 py-2 text-right">Drift</th>
                        <th className="px-3 py-2 text-right">Combined</th>
                        <th className="px-3 py-2">Predicted</th>
                        <th className="px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900/60">
                      {selectedExperiment.logs.map((log) => {
                        const displayModalLog = selectedModalLog || selectedExperiment.logs[selectedExperiment.logs.length - 1];
                        const isSelected = displayModalLog?.id === log.id;
                        return (
                          <tr
                            key={log.id}
                            onClick={() => setSelectedModalLog(log)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? "bg-gray-800 text-white font-bold" : "hover:bg-gray-900/40 text-gray-400"
                            }`}
                          >
                            <td className="px-3 py-2">#{log.packetSequence}</td>
                            <td className="px-3 py-2 text-right text-blue-400">{log.anomalyScore.toFixed(3)}</td>
                            <td className="px-3 py-2 text-right text-purple-400">{log.driftScore.toFixed(3)}</td>
                            <td className="px-3 py-2 text-right text-white">{log.combinedScore.toFixed(3)}</td>
                            <td className="px-3 py-2">
                              <span className={log.predictedLabel === "ATTACK" ? "text-rose-400" : log.predictedLabel === "SUSPICIOUS" ? "text-amber-400" : "text-gray-400"}>
                                {log.predictedLabel}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-[10px]">
                              {log.action !== "NONE" ? <span className="text-amber-400 font-bold">{log.action}</span> : <span className="text-gray-600">NONE</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Right Pane: Visual details & attributions */}
                {(() => {
                  const displayModalLog = selectedModalLog || (selectedExperiment.logs.length > 0 ? selectedExperiment.logs[selectedExperiment.logs.length - 1] : null);
                  const firstAttackLog = selectedExperiment.logs.find(l => l.groundTruth === "ATTACK");

                  return (
                    <div className="w-[55%] flex flex-col gap-4 overflow-y-auto min-h-0">
                      
                      {/* Sub Chart */}
                      <div className="bg-gray-950 border border-gray-800/60 rounded-xl p-4">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Trial Score Trendline Visualization</p>
                        <div className="h-32 bg-gray-950 flex items-end justify-between relative overflow-hidden gap-1 p-2 border border-gray-900 rounded-lg">
                          
                          {/* Horizontal guidelines */}
                          <div 
                            className="absolute inset-x-0 border-b border-amber-500/20 text-[8px] text-amber-500/50 flex justify-between px-2 select-none pointer-events-none"
                            style={{ bottom: `${mediumThreshold * 100}%` }}
                          >
                            <span>{mediumThreshold.toFixed(2)} (Medium Threshold)</span>
                          </div>
                          <div 
                            className="absolute inset-x-0 border-b border-rose-500/20 text-[8px] text-rose-500/50 flex justify-between px-2 select-none pointer-events-none"
                            style={{ bottom: `${highThreshold * 100}%` }}
                          >
                            <span>{highThreshold.toFixed(2)} (High Threshold)</span>
                          </div>

                          {selectedExperiment.logs.map((log) => {
                            const isAttack = log.groundTruth === "ATTACK";
                            const isAlarm = log.action !== "NONE";
                            const isSelected = displayModalLog?.id === log.id;
                            const isFirstAttackPacket = firstAttackLog && log.id === firstAttackLog.id;

                            return (
                              <div
                                key={log.id}
                                onClick={() => setSelectedModalLog(log)}
                                className={`flex-1 group flex flex-col items-center justify-end h-full relative cursor-pointer p-0.5 rounded transition-colors ${
                                  isSelected ? "bg-gray-800/60 ring-1 ring-indigo-500" : "hover:bg-gray-900/40"
                                }`}
                              >
                                {isFirstAttackPacket && (
                                  <div className="absolute inset-y-0 -left-[2px] w-[1px] bg-rose-500 z-10 select-none pointer-events-none">
                                    <span className="absolute top-1 left-1 bg-rose-950/90 text-rose-400 font-mono text-[7px] font-bold px-0.5 py-0.2 rounded border border-rose-800 z-20">
                                      ATTACK
                                    </span>
                                  </div>
                                )}

                                <div className="w-full h-full relative flex items-end justify-between gap-[1px]">
                                  <div
                                    className="w-[28%] bg-blue-500/30 rounded-t-xs"
                                    style={{ height: `${Math.max(6, log.anomalyScore * 100)}%` }}
                                  />
                                  <div
                                    className={`w-[40%] rounded-t-xs relative ${
                                      isAttack ? "bg-rose-500" : "bg-indigo-500"
                                    }`}
                                    style={{ height: `${Math.max(8, log.combinedScore * 100)}%` }}
                                  />
                                  <div
                                    className="w-[28%] bg-purple-500/30 rounded-t-xs"
                                    style={{ height: `${Math.max(6, log.driftScore * 100)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Modal Click-to-Explain attributions */}
                      {displayModalLog && (
                        <div className="bg-gray-950 border border-gray-800/60 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                              Attribution Details (Packet #{displayModalLog.packetSequence})
                            </h4>
                            <span className="text-[10px] text-gray-505 font-mono">
                              Combined Risk: <strong>{displayModalLog.combinedScore.toFixed(4)}</strong>
                            </span>
                          </div>

                          {displayModalLog.explanations && Array.isArray(displayModalLog.explanations) ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {displayModalLog.explanations.slice(0, 4).map((item: any) => (
                                <div key={item.feature} className="bg-gray-900 border border-gray-850 rounded-lg p-2.5">
                                  <div className="flex justify-between items-start">
                                    <span className="text-[10px] font-bold text-gray-300 font-mono block truncate max-w-[140px]" title={item.feature}>
                                      {item.feature}
                                    </span>
                                    <span className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded ${
                                      item.zScore >= 3.0 ? "bg-rose-950/60 text-rose-400" : item.zScore >= 1.5 ? "bg-amber-950/60 text-amber-400" : "bg-gray-800 text-gray-400"
                                    }`}>
                                      Z = {item.zScore.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex justify-between text-[9px] text-gray-500">
                                    <span>Obs: <strong>{Number(item.observed).toFixed(3)}</strong></span>
                                    <span>Base: <strong>{Number(item.mean).toFixed(3)}</strong></span>
                                  </div>
                                  <div className="mt-1.5 w-full bg-gray-950 rounded-full h-1 overflow-hidden">
                                    <div
                                      className={`h-1 rounded-full ${item.zScore >= 3.0 ? "bg-rose-500" : "bg-indigo-500"}`}
                                      style={{ width: `${item.contribution}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[11px] text-gray-500 italic">
                              Attribution drift metrics are not available for this baseline packet.
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })()}
              </div>

              {/* Modal Actions Footer */}
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-800">
                <button
                  onClick={() => handleExportLogs(selectedExperiment.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-850 hover:bg-gray-800 border border-gray-700 text-xs font-semibold text-white"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Trial CSV
                </button>
                <button
                  onClick={() => setSelectedExperiment(null)}
                  className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white"
                >
                  Done
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
