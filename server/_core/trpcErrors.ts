/**
 * tRPC 錯誤映射工具
 * 
 * 用途：
 * - 統一外部服務錯誤映射到 tRPC 錯誤碼
 * - 提供可辨識的錯誤代碼供前端使用
 * - 避免洩露敏感資訊（如 API key、內部路徑）
 */

import { TRPCError } from "@trpc/server";
import { logger } from "./logger";

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_SERVER_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "TIMEOUT";

/**
 * 將外部服務錯誤映射到 tRPC 錯誤
 */
export function mapExternalError(
  error: unknown,
  context: string,
  requestId?: string,
  userId?: string
): TRPCError {
  let code: ErrorCode = "INTERNAL_SERVER_ERROR";
  let message = "An error occurred";
  let originalError = "";

  if (error instanceof Error) {
    originalError = error.message;
    message = error.message;

    // 根據錯誤訊息判斷錯誤類型
    if (error.message.includes("timeout") || error.message.includes("TIMEOUT")) {
      code = "TIMEOUT";
      message = "Request timeout";
    } else if (error.message.includes("unauthorized") || error.message.includes("UNAUTHORIZED")) {
      code = "UNAUTHORIZED";
      message = "Authentication failed";
    } else if (error.message.includes("forbidden") || error.message.includes("FORBIDDEN")) {
      code = "FORBIDDEN";
      message = "Access denied";
    } else if (error.message.includes("not found") || error.message.includes("NOT_FOUND")) {
      code = "NOT_FOUND";
      message = "Resource not found";
    } else if (error.message.includes("connection") || error.message.includes("ECONNREFUSED")) {
      code = "SERVICE_UNAVAILABLE";
      message = "Service unavailable";
    }
  } else if (typeof error === "string") {
    originalError = error;
    message = error;
  }

  // 記錄原始錯誤（debug 等級，不洩露敏感資訊）
  logger.debug(
    `[${context}] External service error`,
    { originalError: originalError.substring(0, 100) },
    requestId,
    userId
  );

  return new TRPCError({
    code,
    message,
  });
}

/**
 * 驗證外部服務回應
 */
export function validateServiceResponse(
  response: unknown,
  expectedFields: string[],
  context: string,
  requestId?: string,
  userId?: string
): boolean {
  if (!response || typeof response !== "object") {
    logger.warn(
      `[${context}] Invalid response type`,
      { type: typeof response },
      requestId,
      userId
    );
    return false;
  }

  const obj = response as Record<string, unknown>;
  const missing = expectedFields.filter(field => !(field in obj));

  if (missing.length > 0) {
    logger.warn(
      `[${context}] Missing response fields`,
      { missing },
      requestId,
      userId
    );
    return false;
  }

  return true;
}
