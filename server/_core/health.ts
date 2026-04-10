import type { Express, Request, Response } from "express";
import { logger } from "./logger";
import { dbPing as defaultDbPing } from "../db";

type HealthRouteOptions = {
  dbPing?: () => Promise<unknown>;
};

function buildHealthPayload() {
  return {
    version: process.env.npm_package_version ?? "unknown",
    env: process.env.NODE_ENV || "development",
    uptimeSec: Math.floor(process.uptime()),
  };
}

export function registerHealthRoutes(
  app: Express,
  options: HealthRouteOptions = {}
) {
  const dbPing = options.dbPing ?? defaultDbPing;

  app.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({
      ok: true,
      ...buildHealthPayload(),
    });
  });

  app.get("/api/ready", async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      await Promise.race([
        dbPing(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("DB ping timeout")), 3000)
        ),
      ]);

      res.status(200).json({
        ok: true,
        ...buildHealthPayload(),
        checkDurationMs: Date.now() - startTime,
      });
    } catch (error) {
      logger.warn(
        "[READY] HTTP readiness check failed",
        { reason: error instanceof Error ? error.message : String(error) },
        undefined,
        req.id
      );

      res.status(503).json({
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
        ...buildHealthPayload(),
        checkDurationMs: Date.now() - startTime,
      });
    }
  });
}
