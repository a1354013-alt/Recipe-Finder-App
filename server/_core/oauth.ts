import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { randomUUID } from "crypto";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { logger } from "./logger";
import { ENV } from "./env";
import { auditLogManager } from "./auditLog";

const STATE_COOKIE_NAME = "oauth_state";
const STATE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000; // 10 分鐘

/**
 * 從 query string 取出參數
 */
function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * 生成安全的 OAuth State
 * 
 * 使用 crypto.randomUUID() 生成高熵隨機值
 * UUID v4 格式：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
function generateSecureState(): string {
  return randomUUID();
}

/**
 * 驗證 State 格式（UUID v4）
 */
function isValidStateFormat(state: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(state);
}

/**
 * 註冊 OAuth 路由
 * 
 * 安全特性：
 * 1. redirectUri 使用 PUBLIC_BASE_URL（固定化，禁止 x-forwarded-host 注入）
 * 2. state cookie 使用 httpOnly + sameSite=lax
 * 3. state 驗證（格式 + cookie 比對）
 * 4. 缺參數統一 redirect（避免 JSON 洩漏）
 */
export function registerOAuthRoutes(app: Express) {
  /**
   * GET /api/oauth/login
   * 
   * 流程：
   * 1. 生成隨機 state
   * 2. 將 state 存入 httpOnly cookie（10 分鐘過期）
   * 3. 302 redirect 到 OAuth 登入 URL
   * 
   * 回應：302 redirect 到 OAuth server
   * 
   * 安全性：redirectUri 使用 PUBLIC_BASE_URL（固定化，不受 x-forwarded-host 影響）
   */
  app.get("/api/oauth/login", (req: Request, res: Response) => {
    try {
      // 驗證 PUBLIC_BASE_URL 已配置
      if (!ENV.publicBaseUrl) {
        logger.error(
          "[OAuth] PUBLIC_BASE_URL not configured",
          { message: "Cannot proceed with login" },
          (req as any).id
        );
        res.status(500).json({ error: "Server configuration error" });
        return;
      }

      // 生成隨機 state
      const state = generateSecureState();
      logger.info(
        "[OAuth] Generated state",
        { state: state.substring(0, 8) + "..." },
        (req as any).id
      );

      // 將 state 存入 httpOnly cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(STATE_COOKIE_NAME, state, {
        ...cookieOptions,
        maxAge: STATE_COOKIE_MAX_AGE_MS,
        sameSite: "lax", // 明確設定跨站策略，避免瀏覽器預設改變
      });
      logger.info("[OAuth] State stored in httpOnly cookie", {}, (req as any).id);

      // 構建 OAuth 登入 URL
      // 使用 PUBLIC_BASE_URL（固定化，禁止 x-forwarded-host 注入）
      const oauthPortalUrl = ENV.oAuthPortalUrl;
      const appId = ENV.appId;
      const redirectUri = `${ENV.publicBaseUrl}/api/oauth/callback`;

      const url = new URL(`${oauthPortalUrl}/app-auth`);
      url.searchParams.set("appId", appId);
      url.searchParams.set("redirectUri", redirectUri);
      url.searchParams.set("state", state);
      url.searchParams.set("type", "signIn");

      logger.info(
        "[OAuth] Login URL generated",
        { redirectUri, oAuthUrl: url.toString() },
        (req as any).id
      );
      res.redirect(url.toString());
    } catch (error) {
      logger.error(
        "[OAuth] Failed to generate login URL",
        error,
        (req as any).id
      );
      res.status(500).json({ error: "Failed to generate login URL" });
    }
  });

  /**
   * GET /api/oauth/callback
   * 
   * 流程：
   * 1. 驗證 code 和 state 存在
   * 2. 驗證 state 格式（UUID）
   * 3. 驗證 query.state 與 cookie.state 一致（CSRF 防護）
   * 4. 使用 code 交換 access token
   * 5. 使用 access token 取得用戶信息
   * 6. 儲存用戶到 DB
   * 7. 建立 session token
   * 8. 設定 session cookie
   * 9. 刪除 state cookie
   * 10. 重導向到首頁
   * 
   * 安全性：redirectUri 必須與 login 時的 PUBLIC_BASE_URL 完全一致
   */
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const queryState = getQueryParam(req, "state");
    const cookieState = req.cookies[STATE_COOKIE_NAME];
    const requestId = (req as any).id;

    // 驗證 code 存在
    if (!code) {
      logger.warn("[OAuth] Missing authorization code", "Authorization code not found", undefined, requestId);
      res.redirect(302, `/?error=MISSING_CODE&rid=${requestId}`);
      return;
    }

    // 驗證 state 存在
    if (!queryState) {
      logger.warn("[OAuth] Missing state parameter in query", "State parameter not found", undefined, requestId);
      res.redirect(302, `/?error=MISSING_STATE&rid=${requestId}`);
      return;
    }

    // 驗證 state 格式
    if (!isValidStateFormat(queryState)) {
      logger.warn(
        "[OAuth] Invalid state format",
        { state: queryState },
        requestId
      );
      res.redirect(302, `/?error=INVALID_STATE&rid=${requestId}`);
      return;
    }

    // 驗證 state cookie 存在
    if (!cookieState) {
      logger.warn(
        "[OAuth] State cookie missing",
        { cookies: Object.keys(req.cookies) },
        requestId
      );
      res.redirect(302, `/?error=MISSING_STATE_COOKIE&rid=${requestId}`);
      return;
    }

    // 驗證 query.state 與 cookie.state 一致（CSRF 防護）
    if (queryState !== cookieState) {
      logger.warn(
        "[OAuth] State mismatch - CSRF attack detected",
        {
          queryState: queryState.substring(0, 8) + "...",
          cookieState: cookieState.substring(0, 8) + "...",
        },
        requestId
      );
      res.redirect(302, `/?error=STATE_MISMATCH&rid=${requestId}`);
      return;
    }

    try {
      logger.info(
        "[OAuth] Processing callback",
        {
          code: code.substring(0, 10) + "...",
          state: queryState.substring(0, 8) + "...",
        },
        requestId
      );

      // 使用 code 交換 access token
      // redirectUri 必須與 login 時完全一致（使用 PUBLIC_BASE_URL）
      const redirectUri = `${ENV.publicBaseUrl}/api/oauth/callback`;

      let tokenResponse;
      try {
        tokenResponse = await sdk.exchangeCodeForToken(
          code,
          queryState,
          redirectUri
        );
        logger.info("[OAuth] Token exchange successful", "Token obtained", undefined, requestId);
      } catch (error) {
        logger.warn(
          "[OAuth] Token exchange failed",
          { error: error instanceof Error ? error.message : String(error) },
          requestId
        );
        res.redirect(302, `/?error=TOKEN_EXCHANGE_FAILED&rid=${requestId}`);
        return;
      }

      // 使用 access token 取得用戶信息
      let userInfo;
      try {
        userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
        logger.info(
          "[OAuth] User info retrieved",
          { openId: userInfo.openId },
          requestId
        );
      } catch (error) {
        logger.warn(
          "[OAuth] Failed to retrieve user info",
          { error: error instanceof Error ? error.message : String(error) },
          requestId
        );
        res.redirect(302, `/?error=USER_INFO_FAILED&rid=${requestId}`);
        return;
      }

      if (!userInfo.openId) {
        logger.warn("[OAuth] User info missing openId", "OpenId not in user info", undefined, requestId);
        res.redirect(302, `/?error=MISSING_OPENID&rid=${requestId}`);
        return;
      }

      // 儲存用戶到 DB
      try {
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: new Date(),
        });
        logger.info(
          "[OAuth] User upserted successfully",
          {
            openId: userInfo.openId,
            hasName: !!userInfo.name,
            hasEmail: !!userInfo.email,
          },
          requestId
        );
      } catch (error) {
        logger.warn(
          "[OAuth] Failed to upsert user",
          {
            openId: userInfo.openId,
            error: error instanceof Error ? error.message.substring(0, 100) : String(error),
          },
          requestId
        );
        res.redirect(302, `/?error=USER_SYNC_FAILED&rid=${requestId}`);
        return;
      }

      // 建立 session token
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });
      logger.info("[OAuth] Session token created", "Session established", undefined, requestId);

      // 設定 session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      // 刪除 state cookie（一次性使用）
      res.clearCookie(STATE_COOKIE_NAME, {
        ...cookieOptions,
      });

      logger.info(
        "[OAuth] Callback successful, redirecting to home",
        {},
        requestId
      );

      // 記錄 audit log（非同步，不阻塞重導向）
      auditOAuthLogin(userInfo.openId, requestId, true, {
        name: userInfo.name,
        email: userInfo.email,
        loginMethod: userInfo.loginMethod || userInfo.platform,
      }).catch(err => {
        logger.warn(
          "[OAuth] Failed to log audit event",
          { error: err instanceof Error ? err.message : String(err) },
          requestId
        );
      });

      res.redirect(302, ENV.postLoginRedirect);
    } catch (error) {
      logger.error(
        "[OAuth] Callback failed",
        error instanceof Error ? error.message : String(error),
        requestId
      );
      res.redirect(302, `/?error=CALLBACK_ERROR&rid=${requestId}`);
    }
  });
}
