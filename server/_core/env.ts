/**
 * 環境變數配置
 * 
 * 特性：
 * - 統一管理所有環境變數
 * - Production 環境啟動時驗證必填項
 * - 提供 isProduction 標誌
 * - 環境變數優先級：優先讀 server runtime 變數，fallback Vite 注入變數
 */

import { logger } from './logger';

/**
 * 驗證 PUBLIC_BASE_URL 格式
 * 必須是有效的 HTTPS URL（production）或 HTTP URL（development）
 */
function validatePublicBaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const isHttp = parsed.protocol === "http:";
    
    // Production 必須 HTTPS，development 允許 HTTP
    if (process.env.NODE_ENV === "production" && !isHttps) {
      return false;
    }
    
    return isHttps || isHttp;
  } catch {
    return false;
  }
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  // 優先讀 OAUTH_PORTAL_URL（server runtime），fallback VITE_OAUTH_PORTAL_URL（Vite 注入）
  oAuthPortalUrl: process.env.OAUTH_PORTAL_URL ?? process.env.VITE_OAUTH_PORTAL_URL ?? "",
  postLoginRedirect: process.env.POST_LOGIN_REDIRECT ?? "/",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // PUBLIC_BASE_URL：OAuth redirectUri 固定來源，禁止 x-forwarded-host 注入
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "",
};

/**
 * 驗證必填環境變數
 * 
 * Production 環境啟動時必須檢查這些變數
 * 缺少任何一個都會直接 throw，fail fast
 */
export function validateRequiredEnv(): void {
  const requiredEnvs = [
    { key: "VITE_APP_ID", value: ENV.appId },
    { key: "JWT_SECRET", value: ENV.jwtSecret },
    { key: "DATABASE_URL", value: ENV.databaseUrl },
    { key: "OAUTH_SERVER_URL", value: ENV.oAuthServerUrl },
    { key: "OAUTH_PORTAL_URL (or VITE_OAUTH_PORTAL_URL)", value: ENV.oAuthPortalUrl },
    { key: "BUILT_IN_FORGE_API_URL", value: ENV.forgeApiUrl },
    { key: "BUILT_IN_FORGE_API_KEY", value: ENV.forgeApiKey },
    { key: "PUBLIC_BASE_URL", value: ENV.publicBaseUrl },
  ];

  const missing: string[] = [];
  const invalid: string[] = [];

  for (const { key, value } of requiredEnvs) {
    if (!value || value.trim() === "") {
      missing.push(key);
    }
  }

  // 驗證 PUBLIC_BASE_URL 格式
  if (ENV.publicBaseUrl && !validatePublicBaseUrl(ENV.publicBaseUrl)) {
    invalid.push(
      `PUBLIC_BASE_URL must be a valid URL (https:// for production, http:// for development). Got: ${ENV.publicBaseUrl}`
    );
  }

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(", ")}`;
    logger.error("[ENV] Validation failed", { missing, message });
    throw new Error(message);
  }

  if (invalid.length > 0) {
    const message = `Invalid environment variables: ${invalid.join("; ")}`;
    logger.error("[ENV] Validation failed", { invalid, message });
    throw new Error(message);
  }
}
