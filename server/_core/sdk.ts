import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { logger } from "./logger";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  GetUserInfoResponse,
  GetUserInfoWithJwtRequest,
  GetUserInfoWithJwtResponse,
} from "./types/manusTypes";

// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name?: string; // 改為 optional，允許空值
};

const EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
const GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
const GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;

class OAuthService {
  constructor(private client: ReturnType<typeof axios.create>) {
    logger.info("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      logger.error("[OAuth] OAUTH_SERVER_URL is not configured!");
    }
  }

  /**
   * 使用 authorization code 交換 access token
   * 
   * 修正前：使用 btoa(state) 解碼取得 redirectUri
   * 修正後：state 現在是隨機 UUID，不再包含 redirectUri
   *        redirectUri 應該從環境變數或常數取得
   */
  async getTokenByCode(
    code: string,
    _state: string, // state 已由前端驗證，此處不再使用
    redirectUri: string
  ): Promise<ExchangeTokenResponse> {
    const payload: ExchangeTokenRequest = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri, // 從參數傳入，而非從 state 解碼
    };

    try {
      const { data } = await this.client.post<ExchangeTokenResponse>(
        EXCHANGE_TOKEN_PATH,
        payload
      );
      logger.info("[OAuth] Token exchange successful");
      return data;
    } catch (error) {
      logger.error("[OAuth] Token exchange failed", error);
      throw error;
    }
  }

  async getUserInfoByToken(
    token: ExchangeTokenResponse
  ): Promise<GetUserInfoResponse> {
    try {
      const { data } = await this.client.post<GetUserInfoResponse>(
        GET_USER_INFO_PATH,
        {
          accessToken: token.accessToken,
        }
      );
      logger.info("[OAuth] User info retrieved successfully");
      return data;
    } catch (error) {
      logger.error("[OAuth] Failed to get user info", error);
      throw error;
    }
  }
}

const createOAuthHttpClient = (): AxiosInstance =>
  axios.create({
    baseURL: ENV.oAuthServerUrl,
    timeout: AXIOS_TIMEOUT_MS,
  });

class SDKServer {
  private readonly client: AxiosInstance;
  private readonly oauthService: OAuthService;

  constructor(client: AxiosInstance = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }

  private deriveLoginMethod(
    platforms: unknown,
    fallback: string | null | undefined
  ): string | null {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set<string>(
      platforms.filter((p): p is string => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (
      set.has("REGISTERED_PLATFORM_MICROSOFT") ||
      set.has("REGISTERED_PLATFORM_AZURE")
    )
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }

  /**
   * 交換 OAuth authorization code 為 access token
   * 
   * 修正：redirectUri 現在作為參數傳入，而非從 state 解碼
   */
  async exchangeCodeForToken(
    code: string,
    state: string,
    redirectUri: string
  ): Promise<ExchangeTokenResponse> {
    return this.oauthService.getTokenByCode(code, state, redirectUri);
  }

  /**
   * 使用 OAuth access token 取得用戶信息
   */
  async getUserInfo(accessToken: string): Promise<GetUserInfoResponse> {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken,
    } as ExchangeTokenResponse);
    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoResponse;
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.jwtSecret;
    return new TextEncoder().encode(secret);
  }

  /**
   * 建立 session token（本系統的 JWT）
   * 
   * 修正前：name 必須非空字串
   * 修正後：name 可為空或 optional
   */
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name, // 允許 undefined
      },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name || "", // 允許空字串
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  /**
   * 驗證 session token
   * 
   * 修正前：強制要求 name 非空
   * 修正後：openId 和 appId 為必要，name 可為空
   */
  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name?: string } | null> {
    if (!cookieValue) {
      logger.warn("[Auth] Missing session cookie");
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;

      // 只驗證 openId 和 appId 必要，name 可為空
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId)) {
        logger.warn("[Auth] Session payload missing required fields");
        return null;
      }

      return {
        openId,
        appId,
        name: typeof name === "string" ? name : undefined,
      };
    } catch (error) {
      logger.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  /**
   * 使用 OAuth access token 從 OAuth server 取得用戶信息
   * 
   * 注意：此方法使用 OAuth server 的 access token，不是本系統的 session JWT
   * 不應該拿 session JWT 去呼叫此方法
   */
  async getUserInfoWithAccessToken(
    accessToken: string
  ): Promise<GetUserInfoWithJwtResponse> {
    const payload: GetUserInfoWithJwtRequest = {
      jwtToken: accessToken, // 這裡應該是 OAuth server 的 access token
      projectId: ENV.appId,
    };

    try {
      const { data } = await this.client.post<GetUserInfoWithJwtResponse>(
        GET_USER_INFO_WITH_JWT_PATH,
        payload
      );

      const loginMethod = this.deriveLoginMethod(
        (data as any)?.platforms,
        (data as any)?.platform ?? data.platform ?? null
      );
      logger.info("[Auth] User info retrieved from OAuth server");
      return {
        ...(data as any),
        platform: loginMethod,
        loginMethod,
      } as GetUserInfoWithJwtResponse;
    } catch (error) {
      logger.error("[Auth] Failed to get user info from OAuth server", error);
      throw error;
    }
  }

  /**
   * 驗證請求並取得用戶信息
   * 
   * 流程：
   * 1. 從 cookie 取出 session token
   * 2. 驗證 session token（本系統的 JWT）
   * 3. 從 DB 查詢用戶
   * 4. 如果用戶不存在，不再嘗試從 OAuth server 同步（因為 session token 不能用於 OAuth API）
   * 5. 更新 lastSignedIn
   */
  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    
    if (!sessionCookie) {
      logger.warn("[Auth] Session cookie missing", { cookies: Array.from(cookies.keys()) });
      throw ForbiddenError("Session cookie missing", "COOKIE_MISSING");
    }

    const session = await this.verifySession(sessionCookie);

    if (!session) {
      logger.warn("[Auth] Session verification failed");
      throw ForbiddenError("Invalid session cookie", "SESSION_VERIFICATION_FAILED");
    }

    const sessionUserId = session.openId;
    const signedInAt = new Date();
    
    logger.info("[Auth] Verifying user in DB", { openId: sessionUserId });
    let user = await db.getUserByOpenId(sessionUserId);

    if (!user) {
      logger.error(
        "[Auth] User not found in DB - possible callback failure or manual cookie injection",
        { 
          openId: sessionUserId,
          appId: session.appId,
          timestamp: new Date().toISOString(),
          code: "USER_NOT_FOUND_AFTER_LOGIN"
        }
      );
      throw ForbiddenError("User not found in database", "USER_NOT_FOUND_AFTER_LOGIN");
    }

    // 更新 lastSignedIn
    try {
      await db.upsertUser({
        openId: user.openId,
        lastSignedIn: signedInAt,
      });
      logger.info("[Auth] User authenticated successfully", { openId: sessionUserId });
    } catch (error) {
      logger.error("[Auth] Failed to update lastSignedIn", error);
    }

    return user;
  }
}

export const sdk = new SDKServer();
