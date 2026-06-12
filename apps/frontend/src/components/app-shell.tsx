"use client";

import { AuthGuard } from "./auth-guard";
import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-60">
          <TopBar />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
