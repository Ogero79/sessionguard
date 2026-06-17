"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  CheckSquare,
  StickyNote,
  User,
  Settings,
  FileText,
  Clock,
  HelpCircle,
  Layers,
  Beaker,
  Activity,
  ClipboardList,
  Users,
} from "lucide-react";

const USER_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "My Tasks", icon: CheckSquare },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/requests", label: "Service Requests", icon: FileText },
  { href: "/form", label: "Work Item Form", icon: ClipboardList },
  { href: "/activity", label: "Activity", icon: Clock },
];

const ADMIN_NAV_ITEMS = [
  { href: "/dashboard", label: "Admin Dashboard", icon: LayoutDashboard },
  { href: "/internal/experiments", label: "Experiment Lab", icon: Beaker },
  { href: "/internal/session-monitor", label: "Telemetry Monitor", icon: Activity },
  { href: "/internal/users", label: "User Management", icon: Users },
];

const BOTTOM_ITEMS = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help & Resources", icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAltIcon = (item: any) => {
    // If it's the User Management item, use the Settings icon or similar, or Users icon.
    // Wait, let's import the Users icon as we planned.
  };

  const navItems = user?.role === "ADMIN" ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS;
  const sectionTitle = user?.role === "ADMIN" ? "Admin Console" : "Workspace";

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-60 flex-col border-r border-surface-200 bg-white">
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-surface-200">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
          <Layers className="h-4.5 w-4.5 text-white" />
        </div>
        <span className="text-[15px] font-semibold text-ink-900 tracking-tight">
          TaskFlow
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
          {sectionTitle}
        </div>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-500 hover:bg-surface-50 hover:text-ink-700"
                  }`}
                >
                  <item.icon
                    className={`h-[18px] w-[18px] ${
                      active ? "text-brand-600" : "text-ink-400"
                    }`}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-surface-200 px-3 py-3">
        <ul className="space-y-0.5">
          {BOTTOM_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-500 hover:bg-surface-50 hover:text-ink-700"
                  }`}
                >
                  <item.icon
                    className={`h-[18px] w-[18px] ${
                      active ? "text-brand-600" : "text-ink-400"
                    }`}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
