import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  console.log(`🛡️  [SessionGuard API] Server running on http://localhost:${PORT}`);
  console.log(`⚙️  [SessionGuard API] Environment: ${env.NODE_ENV}`);
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

async function handleShutdown(signal: string): Promise<void> {
  console.log(`\n🛑 [SessionGuard API] Received ${signal}. Initiating graceful shutdown...`);

  // Force close after 10 seconds if connections refuse to terminate
  const forceExitTimeout = setTimeout(() => {
    console.error("⚠️ [SessionGuard API] Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10_000);
  forceExitTimeout.unref();

  server.close(async (err) => {
    if (err) {
      console.error("❌ [SessionGuard API] Error closing HTTP server:", err);
      process.exit(1);
    }

    try {
      console.log("🔌 [SessionGuard API] Disconnecting database connection pool...");
      await prisma.$disconnect();
      console.log("✅ [SessionGuard API] Database disconnected cleanly.");
      process.exit(0);
    } catch (dbErr) {
      console.error("❌ [SessionGuard API] Error disconnecting database:", dbErr);
      process.exit(1);
    }
  });
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

process.on("unhandledRejection", (reason: any) => {
  console.error("🚨 [SessionGuard API] Unhandled Promise Rejection:", reason?.stack || reason);
});

process.on("uncaughtException", (error: Error) => {
  console.error("🚨 [SessionGuard API] Uncaught Exception:", error.stack || error.message);
  process.exit(1);
});
