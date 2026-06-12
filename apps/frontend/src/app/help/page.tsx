"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  BookOpen,
  MessageCircle,
  Zap,
  Shield,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Keyboard,
  Users,
  Settings,
} from "lucide-react";

const GUIDES = [
  {
    icon: Zap,
    title: "Getting Started",
    desc: "Learn the basics of TaskFlow Workspace",
    articles: [
      "Creating your first task",
      "Navigating the dashboard",
      "Setting up your profile",
      "Understanding workspace settings",
    ],
  },
  {
    icon: Keyboard,
    title: "Tasks & Productivity",
    desc: "Master task management features",
    articles: [
      "Creating and editing tasks",
      "Using filters and views",
      "Setting due dates and priorities",
      "Tracking task progress",
    ],
  },
  {
    icon: BookOpen,
    title: "Notes & Documentation",
    desc: "Capture and organize your ideas",
    articles: [
      "Writing and formatting notes",
      "Organizing notes effectively",
      "Searching your notes",
      "Sharing notes with team members",
    ],
  },
  {
    icon: Users,
    title: "Collaboration",
    desc: "Work together with your team",
    articles: [
      "Inviting team members",
      "Assigning tasks",
      "Activity feeds and updates",
      "Communication best practices",
    ],
  },
  {
    icon: Settings,
    title: "Account & Settings",
    desc: "Manage your workspace preferences",
    articles: [
      "Updating your profile",
      "Notification preferences",
      "Privacy and security settings",
      "Changing your password",
    ],
  },
  {
    icon: Shield,
    title: "Security & Privacy",
    desc: "Keep your account safe",
    articles: [
      "Two-factor authentication",
      "Session management",
      "Data privacy overview",
      "Reporting security issues",
    ],
  },
];

const FAQ = [
  {
    q: "How do I reset my password?",
    a: "Go to Settings > Change Password, enter your current password, then set a new one. If you've forgotten your password, use the 'Forgot password' link on the login page.",
  },
  {
    q: "Can I export my tasks and notes?",
    a: "Yes. Navigate to the respective section and use the export option in the top-right menu. We support CSV and JSON formats.",
  },
  {
    q: "How do I change my notification preferences?",
    a: "Go to Settings > Notifications. You can toggle email notifications, push notifications, task reminders, and weekly digest emails.",
  },
  {
    q: "Is my data backed up?",
    a: "All workspace data is automatically backed up daily. You can request a full data export at any time from Account Settings.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Settings > Account, scroll to the bottom, and click 'Delete Account'. This action is permanent and cannot be undone.",
  },
];

export default function HelpPage() {
  return (
    <AppShell>
      <HelpContent />
    </AppShell>
  );
}

function HelpContent() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openGuide, setOpenGuide] = useState<number | null>(null);

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink-900">Help & Resources</h1>
        <p className="text-sm text-ink-500 mt-0.5">
          Find answers, guides, and documentation for TaskFlow Workspace
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="card p-5 hover:shadow-card-hover transition-shadow cursor-pointer">
          <BookOpen className="h-5 w-5 text-brand-600 mb-3" />
          <h3 className="text-[13px] font-semibold text-ink-800">
            Documentation
          </h3>
          <p className="text-[12px] text-ink-400 mt-1">
            Browse full product documentation
          </p>
        </div>
        <div className="card p-5 hover:shadow-card-hover transition-shadow cursor-pointer">
          <MessageCircle className="h-5 w-5 text-brand-600 mb-3" />
          <h3 className="text-[13px] font-semibold text-ink-800">
            Contact Support
          </h3>
          <p className="text-[12px] text-ink-400 mt-1">
            Get help from our support team
          </p>
        </div>
        <div className="card p-5 hover:shadow-card-hover transition-shadow cursor-pointer">
          <Zap className="h-5 w-5 text-brand-600 mb-3" />
          <h3 className="text-[13px] font-semibold text-ink-800">
            What&apos;s New
          </h3>
          <p className="text-[12px] text-ink-400 mt-1">
            Latest features and updates
          </p>
        </div>
      </div>

      {/* Guides */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">
          Guides & Tutorials
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {GUIDES.map((guide, i) => (
            <div key={i} className="card">
              <button
                onClick={() => setOpenGuide(openGuide === i ? null : i)}
                className="w-full flex items-start gap-3 p-5 text-left"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 flex-shrink-0">
                  <guide.icon className="h-4.5 w-4.5 text-brand-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[13px] font-semibold text-ink-800">
                    {guide.title}
                  </h3>
                  <p className="text-[12px] text-ink-400 mt-0.5">
                    {guide.desc}
                  </p>
                </div>
                {openGuide === i ? (
                  <ChevronDown className="h-4 w-4 text-ink-400 mt-0.5" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-ink-400 mt-0.5" />
                )}
              </button>
              {openGuide === i && (
                <div className="border-t border-surface-100 px-5 py-3">
                  <ul className="space-y-2">
                    {guide.articles.map((article, j) => (
                      <li key={j}>
                        <button className="flex items-center gap-2 text-[13px] text-brand-600 hover:text-brand-700">
                          <ExternalLink className="h-3 w-3" />
                          {article}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">
          Frequently Asked Questions
        </h2>
        <div className="card divide-y divide-surface-100">
          {FAQ.map((item, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="text-[13px] font-medium text-ink-800">
                  {item.q}
                </span>
                {openFaq === i ? (
                  <ChevronDown className="h-4 w-4 text-ink-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-ink-400 flex-shrink-0" />
                )}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4">
                  <p className="text-[13px] text-ink-500 leading-relaxed">
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
