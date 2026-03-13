import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { getDb } from "../db";
import { logger } from "./logger";

export const systemRouter = router({
  health: publicProcedure.query(() => ({
    ok: true,
  })),

  /**
   * Readiness probe for load balancers
   * 
   * Checks:
   * - Database connectivity (ping with 3s timeout)
   * - Connection pool health
   * 
   * Returns:
   * - ok: true if all checks pass
   * - ok: false if any check fails (LB will remove from rotation)
   * - reason: error message if ok=false
   * - version: app version
   * - env: environment (development/production)
   * - uptimeSec: process uptime in seconds
   * - checkDurationMs: how long the check took
   */
  ready: publicProcedure.query(async (opts) => {
    const startTime = Date.now();
    const checks: Record<string, boolean> = {};
    let reason: string | null = null;
    const DB_PING_TIMEOUT_MS = 3000; // 3 秒 timeout，避免 LB 探測卡住

    try {
      // Check database connectivity with timeout
      const db = await getDb();
      if (!db) {
        checks.database = false;
        reason = "Database initialization failed";
      } else {
        try {
          // Execute a simple query to verify DB is responsive
          // 使用 Promise.race 實現 timeout
          const pingPromise = db.execute("SELECT 1");
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("DB ping timeout")), DB_PING_TIMEOUT_MS)
          );
          await Promise.race([pingPromise, timeoutPromise]);
          checks.database = true;
        } catch (dbError) {
          checks.database = false;
          reason = `Database query failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`;
          logger.warn(
            "[READY] Database ping failed",
            { reason, requestId: opts.ctx.requestId }
          );
        }
      }
    } catch (error) {
      checks.database = false;
      reason = `Database connection error: ${error instanceof Error ? error.message : String(error)}`;
      logger.warn(
        "[READY] Database connection check failed",
        { reason, requestId: opts.ctx.requestId }
      );
    }

    const ok = checks.database === true;
    const duration = Date.now() - startTime;

    if (!ok) {
      logger.warn(
        "[READY] Readiness check failed",
        { reason, duration, checks, requestId: opts.ctx.requestId }
      );
    }

    return {
      ok,
      reason: reason || undefined,
      version: "1.0.0",
      env: process.env.NODE_ENV || "development",
      uptimeSec: Math.floor(process.uptime()),
      checkDurationMs: duration,
    };
  }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
