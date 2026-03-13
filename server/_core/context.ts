import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { logger } from "./logger";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  requestId: string;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const requestId = (opts.req as any).id || "unknown";
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    // Log authentication failures for debugging (debug level to avoid noise in production)
    logger.debug(
      "[Context] Authentication failed",
      "Auth check skipped for public procedure",
      { error: error instanceof Error ? error.message : String(error) },
      requestId
    );
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    requestId,
  };
}
