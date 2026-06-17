"use client";

import { AuthProvider } from "@/lib/auth-context";
import { SessionProvider } from "@/lib/session-context";
import { RiskProvider } from "@/lib/risk-context";
import { StepUpModal } from "@/components/step-up-modal";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RiskProvider>
        <SessionProvider>
          {children}
          <StepUpModal />
        </SessionProvider>
      </RiskProvider>
    </AuthProvider>
  );
}
