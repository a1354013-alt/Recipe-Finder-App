/**
 * CSRF 防護 - 雙重提交驗證
 * 
 * 原理：
 * 1. Server 生成隨機 csrf_token，存入非 httpOnly cookie（client 可讀）
 * 2. Client 每次 mutation / 狀態改變的 request，在 header 帶 x-csrf-token
 * 3. Server 比對 cookie 值與 header 值，不一致就拒絕（403）
 * 
 * 優勢：
 * - 無需 session 存儲（stateless）
 * - 對 SPA 友善（cookie + header）
 * - 防止跨站偽造請求
 */

import { randomBytes, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { logger } from "./logger";
import { getSessionCookieOptions } from "./cookies";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_LENGTH = 32; // 32 bytes = 256 bits

/**
 * 生成 CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

/**
 * CSRF 中間件
 * 
 * 流程：
 * 1. 若 cookie 不存在，生成新 token 並設定 cookie
 * 2. 對於 GET/HEAD/OPTIONS，直接通過（不需驗證）
 * 3. 對於其他方法（POST/PUT/DELETE/PATCH），驗證 header 與 cookie 一致
 * 4. 驗證失敗回傳 403
 */
export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req as any).id;

  // 若 cookie 不存在，生成新 token
  if (!req.cookies[CSRF_COOKIE_NAME]) {
    const token = generateCsrfToken();
    // CSRF cookie 跟 session cookie 用同一套 sameSite/secure 規則
    const sessionOptions = getSessionCookieOptions(req);
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // 必須非 httpOnly，讓 client 讀取
      secure: sessionOptions.secure,
      sameSite: sessionOptions.sameSite,
      maxAge: 24 * 60 * 60 * 1000, // 24 小時
      path: "/",
    });
    logger.debug(
      "[CSRF] Token generated and set in cookie",
      { token: token.substring(0, 8) + "...", sameSite: sessionOptions.sameSite },
      undefined,
      requestId
    );
  }

  // GET/HEAD/OPTIONS 免檢查
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // OAuth callback 允許略過（外部 OAuth server 無法帶 CSRF token）
  if (req.path === "/api/oauth/callback") {
    logger.debug(
      "[CSRF] OAuth callback exempted",
      {},
      undefined,
      requestId
    );
    return next();
  }

  // 驗證 CSRF token
  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!cookieToken) {
    logger.warn(
      "[CSRF] Cookie token missing",
      { path: req.path, method: req.method },
      undefined,
      requestId
    );
    res.status(403).json({ error: "CSRF token missing" });
    return;
  }

  if (!headerToken) {
    logger.warn(
      "[CSRF] Header token missing",
      { path: req.path, method: req.method },
      undefined,
      requestId
    );
    res.status(403).json({ error: "CSRF token missing in header" });
    return;
  }

  // 比對 token
  const headerTokenStr = Array.isArray(headerToken) ? headerToken[0] : headerToken;
  
  // 使用 timingSafeEqual 做 constant-time 比對，避免 timing attack
  let tokenMatch = false;
  try {
    tokenMatch = timingSafeEqual(
      Buffer.from(cookieToken, 'hex'),
      Buffer.from(headerTokenStr, 'hex')
    );
  } catch {
    // 如果不是有效的 hex 字串，程序會拋出例外，視為不符
    tokenMatch = false;
  }
  
  if (!tokenMatch) {
    logger.warn(
      "[CSRF] Token mismatch - possible CSRF attack",
      {
        path: req.path,
        method: req.method,
        cookieToken: cookieToken.substring(0, 8) + "...",
        headerToken: headerTokenStr.substring(0, 8) + "...",
      },
      undefined,
      requestId
    );
    res.status(403).json({ error: "CSRF token validation failed" });
    return;
  }

  logger.debug(
    "[CSRF] Token validation passed",
    { path: req.path, method: req.method },
    undefined,
    requestId
  );
  next();
}

/**
 * 從 request 取得 CSRF token（供 client 使用）
 */
export function getCsrfToken(req: Request): string | undefined {
  return req.cookies[CSRF_COOKIE_NAME];
}
