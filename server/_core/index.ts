import express from "express";
import { createServer } from "http";
import net from "net";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ENV, validateRequiredEnv } from "./env";
import { logger } from "./logger";
import { closePool } from "../db";
import { requestIdMiddleware } from "./requestId";
import { csrfMiddleware } from "./csrf";

/**
 * 檢查 port 是否可用
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

/**
 * 尋找可用 port（僅用於開發環境）
 */
async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

/**
 * 啟動伺服器
 * 
 * 邏輯：
 * - Development：如果指定 port 被佔用，自動尋找可用 port
 * - Production：如果指定 port 被佔用，直接 fail（fail fast）
 */
async function startServer() {
  try {
    // Production 環境驗證必填環境變數
    if (ENV.isProduction) {
      logger.info("[Server] Validating required environment variables");
      validateRequiredEnv();
      logger.info("[Server] Environment variables validation passed");
    }

    const app = express();
    const server = createServer(app);

    // Trust proxy (for Nginx, Cloudflare, etc.)
    app.set("trust proxy", 1);

    // Request ID middleware (must be first to track all requests)
    app.use(requestIdMiddleware);

    // Helmet 安全標頭（基礎防護）
    // CSP 依環境分流：dev 允許 unsafe-inline，prod 禁用以防 XSS
    const isDev = !ENV.isProduction;
    const unsafeInline = isDev ? ["'unsafe-inline'"] : [];
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            ...unsafeInline,
            "https://maps.googleapis.com",
            "https://maps.gstatic.com",
          ],
          styleSrc: [
            "'self'",
            ...unsafeInline,
            "https://fonts.googleapis.com",
            "https://maps.googleapis.com",
          ],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: [
            "'self'",
            "https://maps.googleapis.com",
            "https://maps.gstatic.com",
          ],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
          ],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
        },
      },
      frameguard: { action: "deny" },
      noSniff: true,
    }));

    // Cookie parser middleware (must be before routes that use cookies)
    app.use(cookieParser());

    // Configure body parser with reasonable size limits
    // 一般 API 限制 10MB，避免 DoS 攻擊
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ limit: "10mb", extended: true }));

    // CSRF 防護中間件（雙重提交驗證）
    // 必須在 OAuth 路由之前，但在 cookie parser 之後
    app.use(csrfMiddleware);

    // Rate limit for OAuth（防止暴力攻擊）
    const oauthLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 分鐘
      max: 5, // 最多 5 次嘗試
      message: "Too many login attempts, please try again later",
      standardHeaders: true,
      legacyHeaders: false,
    });

    // OAuth callback under /api/oauth/callback
    app.use("/api/oauth", oauthLimiter);
    registerOAuthRoutes(app);

    // tRPC API
    app.use(
      "/api/trpc",
      createExpressMiddleware({
        router: appRouter,
        createContext,
      })
    );

    // development mode uses Vite, production mode uses static files
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Global error handler (MUST be after all routes and middleware)
    app.use((err: any, req: any, res: any, next: any) => {
      if (res.headersSent) {
        logger.debug(
          "[Error] Headers already sent",
          { message: err?.message },
          undefined,
          req.id
        );
        return next(err);
      }

      const requestId = req.id;
      const statusCode = err?.statusCode || err?.status || 500;
      const errorMessage = err?.message || "Internal server error";
      const errorStack = err?.stack || "";

      // Log full error with stack for debugging
      logger.error(
        "[Error] Unhandled error",
        { statusCode, message: errorMessage.substring(0, 200), stack: errorStack.substring(0, 500) },
        undefined,
        requestId
      );

      // Production: hide internal details
      if (ENV.isProduction) {
        res.status(statusCode).json({
          error: "Internal server error",
          requestId,
        });
      } else {
        // Development: return full error info
        res.status(statusCode).json({
          error: errorMessage,
          requestId,
          stack: errorStack,
        });
      }
    });

    const preferredPort = parseInt(process.env.PORT || "3000");

    // Development：尋找可用 port
    // Production：使用指定 port，不可用則 fail
    let port: number;
    if (ENV.isProduction) {
      // Production：檢查 port 是否可用，不可用則拒絕啟動
      const available = await isPortAvailable(preferredPort);
      if (!available) {
        const error = `Port ${preferredPort} is not available in production environment. Fail fast.`;
        logger.error("[Server] Port not available", error);
        throw new Error(error);
      }
      port = preferredPort;
    } else {
      // Development：自動尋找可用 port
      port = await findAvailablePort(preferredPort);
      if (port !== preferredPort) {
        logger.warn(
        "[Server] Port busy",
        { preferred: preferredPort, actual: port },
        undefined
      );
      }
    }

    // 優雅關閉處理
    const SHUTDOWN_TIMEOUT_MS = 15000; // 15 秒強制退出

    async function gracefulShutdown(reason: string) {
      logger.info(`[Server] ${reason}, shutting down gracefully`);
      
      // 設置強制退出 timer
      const shutdownTimer = setTimeout(() => {
        logger.error(
          "[Server] Graceful shutdown timeout",
          `Forced exit after ${SHUTDOWN_TIMEOUT_MS}ms`
        );
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS);

      try {
        // 關閉 HTTP 伺服器
        await new Promise<void>((resolve, reject) => {
          server.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        logger.info("[Server] HTTP server closed");

        // 關閉 DB 連接池
        await closePool();
        logger.info("[Server] Database connection pool closed");

        // 清除 timer
        clearTimeout(shutdownTimer);
        logger.info("[Server] Graceful shutdown completed");
        process.exit(0);
      } catch (error) {
        logger.error(
          "[Server] Error during graceful shutdown",
          error instanceof Error ? error.message : String(error)
        );
        clearTimeout(shutdownTimer);
        process.exit(1);
      }
    }

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM received"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT received"));

    server.listen(port, () => {
      const protocol = ENV.isProduction ? "https" : "http";
      logger.info("[Server] Server started", `Server running on ${protocol}://localhost:${port}/`);
    });
  } catch (error) {
    logger.error("[Server] Failed to start server", error);
    process.exit(1);
  }
}

startServer();

// Process 層級的錯誤處理
process.on("unhandledRejection", (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  logger.error(
    "[Process] Unhandled rejection",
    { message, stack: stack ?? undefined }
  );
  if (ENV.isProduction) {
    process.exit(1);
  }
});

process.on("uncaughtException", (error: Error) => {
  logger.error(
    "[Process] Uncaught exception",
    { message: error.message, stack: error.stack ?? undefined }
  );
  process.exit(1);
});
