"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useRisk } from "@/lib/risk-context";
import {
  FileText,
  CheckCircle,
  Info,
  BarChart2,
} from "lucide-react";

export default function FormPage() {
  return (
    <AppShell>
      <FormContent />
    </AppShell>
  );
}

function FormContent() {
  const { status } = useRisk();

  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    projectName: "",
    projectCode: "",
    description: "",
    priority: "medium",
    category: "feature",
    estimatedHours: "",
    assignee: "",
    dueDate: "",
    complexity: "3",
    tags: "",
    acceptanceCriteria: "",
    notes: "",
    notifyStakeholders: false,
    requiresReview: true,
    isBlocking: false,
  });

  const update = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSubmitted(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // Reset after a moment so user can keep interacting
    setTimeout(() => {
      setSubmitted(false);
      setForm({
        projectName: "",
        projectCode: "",
        description: "",
        priority: "medium",
        category: "feature",
        estimatedHours: "",
        assignee: "",
        dueDate: "",
        complexity: "3",
        tags: "",
        acceptanceCriteria: "",
        notes: "",
        notifyStakeholders: false,
        requiresReview: true,
        isBlocking: false,
      });
    }, 2500);
  };

  const baselineState = status?.state;
  const isCollecting = baselineState === "INITIALIZING_BASELINE";
  const isMonitoring =
    baselineState === "ACTIVE_MONITORING" ||
    baselineState === "STEP_UP_REQUIRED" ||
    baselineState === "ACTIVE";

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">New Work Item</h1>
        <p className="text-sm text-ink-500 mt-0.5">
          Submit a new project request, feature, or task to the team backlog
        </p>
      </div>

      {/* Telemetry status banner */}
      {isCollecting && (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-brand-50 border border-brand-200 px-4 py-3 text-sm text-brand-800">
          <BarChart2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-brand-500" />
          <div>
            <p className="font-medium">Behavioural baseline building</p>
            <p className="text-brand-700 text-[12px] mt-0.5">
              Continue typing, clicking, and interacting with this form. The
              system is learning your normal interaction patterns (~3 minutes).
            </p>
          </div>
        </div>
      )}
      {isMonitoring && (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-success-50 border border-success-200 px-4 py-3 text-sm text-success-800">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-success-500" />
          <div>
            <p className="font-medium">Active monitoring enabled</p>
            <p className="text-success-700 text-[12px] mt-0.5">
              Your behavioural baseline is established. Continuous anomaly
              detection is running in the background.
            </p>
          </div>
        </div>
      )}

      {submitted && (
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-success-50 border border-success-500/20 px-4 py-3 text-sm text-success-600">
          <CheckCircle className="h-4 w-4" /> Work item submitted successfully
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Basic Info */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="h-4 w-4 text-ink-500" />
            <h2 className="text-sm font-semibold text-ink-800">
              Basic Information
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Project / Feature Name</label>
              <input
                type="text"
                id="form-project-name"
                value={form.projectName}
                onChange={(e) => update("projectName", e.target.value)}
                className="input"
                placeholder="e.g. User onboarding redesign"
                required
              />
            </div>
            <div>
              <label className="label">Project Code</label>
              <input
                type="text"
                id="form-project-code"
                value={form.projectCode}
                onChange={(e) => update("projectCode", e.target.value)}
                className="input"
                placeholder="e.g. PROJ-042"
              />
            </div>
            <div>
              <label className="label">Assignee</label>
              <input
                type="text"
                id="form-assignee"
                value={form.assignee}
                onChange={(e) => update("assignee", e.target.value)}
                className="input"
                placeholder="e.g. Jane Smith"
              />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea
                id="form-description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={4}
                className="input resize-none"
                placeholder="Describe the work item in detail. What problem does it solve? What are the expected outcomes?"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 2: Classification */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-ink-800 mb-5">
            Classification &amp; Scheduling
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Priority</label>
              <select
                id="form-priority"
                value={form.priority}
                onChange={(e) => update("priority", e.target.value)}
                className="input"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select
                id="form-category"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className="input"
              >
                <option value="feature">Feature</option>
                <option value="bug">Bug Fix</option>
                <option value="improvement">Improvement</option>
                <option value="research">Research</option>
                <option value="maintenance">Maintenance</option>
                <option value="security">Security</option>
              </select>
            </div>
            <div>
              <label className="label">Estimated Hours</label>
              <input
                type="number"
                id="form-hours"
                value={form.estimatedHours}
                onChange={(e) => update("estimatedHours", e.target.value)}
                min="0"
                max="999"
                step="0.5"
                className="input"
                placeholder="e.g. 8"
              />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input
                type="date"
                id="form-due-date"
                value={form.dueDate}
                onChange={(e) => update("dueDate", e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Complexity slider */}
          <div className="mt-4">
            <label className="label">
              Complexity Score:{" "}
              <span className="text-brand-600 font-semibold">
                {form.complexity} / 5
              </span>
            </label>
            <input
              type="range"
              id="form-complexity"
              min="1"
              max="5"
              step="1"
              value={form.complexity}
              onChange={(e) => update("complexity", e.target.value)}
              className="w-full accent-brand-600 mt-1"
            />
            <div className="flex justify-between text-[11px] text-ink-400 mt-0.5">
              <span>Trivial</span>
              <span>Simple</span>
              <span>Moderate</span>
              <span>Complex</span>
              <span>Very Complex</span>
            </div>
          </div>

          {/* Tags */}
          <div className="mt-4">
            <label className="label">Tags (comma-separated)</label>
            <input
              type="text"
              id="form-tags"
              value={form.tags}
              onChange={(e) => update("tags", e.target.value)}
              className="input"
              placeholder="e.g. ux, api, mobile, backend"
            />
          </div>
        </div>

        {/* Section 3: Details */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-ink-800 mb-5">
            Acceptance Criteria &amp; Notes
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label">Acceptance Criteria</label>
              <textarea
                id="form-acceptance"
                value={form.acceptanceCriteria}
                onChange={(e) => update("acceptanceCriteria", e.target.value)}
                rows={4}
                className="input resize-none"
                placeholder="List the conditions that must be met for this work item to be considered done..."
              />
            </div>
            <div>
              <label className="label">Additional Notes</label>
              <textarea
                id="form-notes"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
                className="input resize-none"
                placeholder="Any dependencies, risks, links to designs, or other relevant context..."
              />
            </div>
          </div>
        </div>

        {/* Section 4: Flags */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-ink-800 mb-4">Options</h2>

          <div className="space-y-4">
            {/* Radio group */}
            <div>
              <p className="label mb-2">Review requirement</p>
              <div className="flex gap-6">
                {[
                  { value: "true", label: "Requires peer review" },
                  { value: "false", label: "No review needed" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 text-[13px] text-ink-700 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="requiresReview"
                      value={opt.value}
                      checked={form.requiresReview === (opt.value === "true")}
                      onChange={() =>
                        update("requiresReview", opt.value === "true")
                      }
                      className="accent-brand-600"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-col gap-3">
              {[
                {
                  key: "notifyStakeholders" as const,
                  label: "Notify stakeholders on submission",
                  desc: "Send an email update to all stakeholders when this item is created",
                },
                {
                  key: "isBlocking" as const,
                  label: "Blocking other work",
                  desc: "Mark this as a blocker so dependent items are flagged",
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    id={`form-${item.key}`}
                    checked={form[item.key] as boolean}
                    onChange={(e) => update(item.key, e.target.checked)}
                    className="mt-0.5 accent-brand-600 h-4 w-4 flex-shrink-0"
                  />
                  <div>
                    <p className="text-[13px] font-medium text-ink-800 group-hover:text-ink-900">
                      {item.label}
                    </p>
                    <p className="text-[12px] text-ink-400">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pb-4">
          <p className="text-[12px] text-ink-400">
            All fields marked with * are required
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() =>
                setForm({
                  projectName: "",
                  projectCode: "",
                  description: "",
                  priority: "medium",
                  category: "feature",
                  estimatedHours: "",
                  assignee: "",
                  dueDate: "",
                  complexity: "3",
                  tags: "",
                  acceptanceCriteria: "",
                  notes: "",
                  notifyStakeholders: false,
                  requiresReview: true,
                  isBlocking: false,
                })
              }
              className="btn-secondary"
            >
              Clear
            </button>
            <button type="submit" className="btn-primary">
              <CheckCircle className="h-4 w-4" /> Submit Work Item
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
