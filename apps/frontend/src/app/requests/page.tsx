"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { Send, CheckCircle } from "lucide-react";

export default function RequestsPage() {
  return (
    <AppShell>
      <RequestsContent />
    </AppShell>
  );
}

function RequestsContent() {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    category: "",
    subject: "",
    description: "",
    urgency: "normal",
    department: "",
    additionalComments: "",
    contactName: user?.displayName || "",
    contactEmail: user?.email || "",
    contactPhone: "",
    preferredContact: "email",
    approvalManager: "",
    budgetCode: "",
  });

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setForm({
      category: "",
      subject: "",
      description: "",
      urgency: "normal",
      department: "",
      additionalComments: "",
      contactName: user?.displayName || "",
      contactEmail: user?.email || "",
      contactPhone: "",
      preferredContact: "email",
      approvalManager: "",
      budgetCode: "",
    });
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-50 mx-auto mb-5">
          <CheckCircle className="h-7 w-7 text-success-500" />
        </div>
        <h2 className="text-xl font-bold text-ink-900 mb-2">
          Request Submitted
        </h2>
        <p className="text-sm text-ink-500 mb-6 max-w-md mx-auto">
          Your workspace support request has been received. Our team will review
          it and respond within 1-2 business days.
        </p>
        <div className="card p-5 text-left max-w-sm mx-auto mb-8">
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-ink-400">Request ID</span>
              <span className="font-mono text-ink-700">
                REQ-{Math.random().toString(36).slice(2, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-400">Category</span>
              <span className="text-ink-700">{form.category || "General"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-400">Urgency</span>
              <span className="text-ink-700 capitalize">{form.urgency}</span>
            </div>
          </div>
        </div>
        <button onClick={handleReset} className="btn-primary">
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">
          Workspace Support Request
        </h1>
        <p className="text-sm text-ink-500 mt-0.5">
          Submit a resource request, report an issue, or ask for support
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Request details */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-ink-800 mb-4">
            Request Details
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  required
                  className="input"
                >
                  <option value="">Select a category</option>
                  <option value="technical">Technical Support</option>
                  <option value="access">Access & Permissions</option>
                  <option value="resource">Resource Request</option>
                  <option value="billing">Billing & Subscription</option>
                  <option value="feedback">Feature Request</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Department</label>
                <select
                  value={form.department}
                  onChange={(e) => update("department", e.target.value)}
                  className="input"
                >
                  <option value="">Select department</option>
                  <option value="engineering">Engineering</option>
                  <option value="design">Design</option>
                  <option value="marketing">Marketing</option>
                  <option value="sales">Sales</option>
                  <option value="hr">Human Resources</option>
                  <option value="finance">Finance</option>
                  <option value="operations">Operations</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
                required
                className="input"
                placeholder="Brief summary of your request"
              />
            </div>

            <div>
              <label className="label">Detailed Description</label>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                required
                rows={5}
                className="input resize-none"
                placeholder="Please describe your request in detail. Include any relevant context, steps to reproduce issues, or specific requirements..."
              />
            </div>

            <div>
              <label className="label">Urgency Level</label>
              <div className="grid grid-cols-4 gap-2">
                {["low", "normal", "high", "critical"].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => update("urgency", level)}
                    className={`py-2 px-3 rounded-lg text-[13px] font-medium border transition-colors ${
                      form.urgency === level
                        ? level === "critical"
                          ? "border-danger-500 bg-danger-50 text-danger-600"
                          : level === "high"
                          ? "border-warning-500 bg-warning-50 text-warning-600"
                          : "border-brand-500 bg-brand-50 text-brand-600"
                        : "border-surface-200 text-ink-500 hover:bg-surface-50"
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Additional Comments</label>
              <textarea
                value={form.additionalComments}
                onChange={(e) => update("additionalComments", e.target.value)}
                rows={3}
                className="input resize-none"
                placeholder="Any additional context or notes..."
              />
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-ink-800 mb-4">
            Contact Information
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => update("contactName", e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => update("contactEmail", e.target.value)}
                  className="input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Phone (optional)</label>
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => update("contactPhone", e.target.value)}
                  className="input"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className="label">Preferred Contact Method</label>
                <select
                  value={form.preferredContact}
                  onChange={(e) => update("preferredContact", e.target.value)}
                  className="input"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="slack">Slack</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Approval */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-ink-800 mb-4">
            Approval & Budget
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Approving Manager</label>
              <input
                type="text"
                value={form.approvalManager}
                onChange={(e) => update("approvalManager", e.target.value)}
                className="input"
                placeholder="Manager name"
              />
            </div>
            <div>
              <label className="label">Budget Code (if applicable)</label>
              <input
                type="text"
                value={form.budgetCode}
                onChange={(e) => update("budgetCode", e.target.value)}
                className="input"
                placeholder="e.g., DEPT-2026-042"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-4">
          <button type="button" onClick={handleReset} className="btn-secondary">
            Clear Form
          </button>
          <button type="submit" className="btn-primary">
            <Send className="h-4 w-4" /> Submit Request
          </button>
        </div>
      </form>
    </div>
  );
}
