import express from "express";
import { createServer } from "http";
import { afterEach, describe, expect, it } from "vitest";
import { registerHealthRoutes } from "./_core/health";
import { requestIdMiddleware } from "./_core/requestId";

async function withServer(
  app: express.Express,
  run: (baseUrl: string) => Promise<void>
) {
  const server = createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Failed to get server address");
  }

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}

describe("health routes", () => {
  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it("returns 200 from /api/health", async () => {
    const app = express();
    app.use(requestIdMiddleware);
    registerHealthRoutes(app, { dbPing: async () => undefined });

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/health`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(typeof body.uptimeSec).toBe("number");
    });
  });

  it("returns 503 from /api/ready when the dependency check fails", async () => {
    const app = express();
    app.use(requestIdMiddleware);
    registerHealthRoutes(app, {
      dbPing: async () => {
        throw new Error("database unavailable");
      },
    });

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/ready`);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.ok).toBe(false);
      expect(body.reason).toContain("database unavailable");
    });
  });
});
