"use client";

import { useAuth } from "@/lib/auth-context";
import { LogOut, Search } from "lucide-react";

export function TopBar() {
  const { user, logout } = useAuth();

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-surface-200 bg-white/80 backdrop-blur-sm px-6">
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="text"
          placeholder="Search workspace..."
          className="input pl-9 py-2 text-[13px]"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right mr-1 hidden sm:block">
          <p className="text-[13px] font-medium text-ink-800 leading-tight">
            {user?.displayName}
          </p>
          <p className="text-[11px] text-ink-400">{user?.email}</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-semibold">
          {initials}
        </div>
        <button
          onClick={logout}
          className="btn-ghost p-2 text-ink-400 hover:text-danger-500"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
