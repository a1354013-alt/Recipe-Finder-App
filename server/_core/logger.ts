/**
 * 統一日誌系統
 * 
 * 特性：
 * - 四個等級：debug / info / warn / error
 * - 時間戳記（ISO 8601）
 * - 標籤前綴（便於搜尋）
 * - 支援 requestId 和 userId 追蹤
 * - Production 環境只輸出 warn 和 error
 * - 結構化日誌（便於解析）
 * - message 支援 string | object（自動轉換）
 * 
 * ============================================
 * 使用規範（統一格式）
 * ============================================
 * 
 * 推薦格式：logger.{level}(tag, message, data?, requestId?, userId?)
 * 
 * 範例 1：簡單訊息
 *   logger.info("[Server] Server started", "Server is ready")
 * 
 * 範例 2：訊息 + 結構化資料
 *   logger.warn("[OAuth] Token exchange failed", { 
 *     error: "invalid_code",
 *     requestId: opts.ctx.requestId 
 *   })
 * 
 * 範例 3：訊息 + 資料 + requestId
 *   logger.error("[DB] Query failed", { 
 *     query: "SELECT * FROM users",
 *     error: err.message 
 *   }, requestId)
 * 
 * 範例 4：只有資料（自動轉換）
 *   logger.info("[API] Request received", { 
 *     method: "POST",
 *     path: "/api/users"
 *   })
 * 
 * ============================================
 * 規範說明
 * ============================================
 * 
 * 1. Tag 格式：[模組名] 操作名
 *    - 例：[Server]、[OAuth]、[DB]、[API]、[READY]
 *    - 便於日誌搜尋和篩選
 * 
 * 2. Message 內容：簡潔的操作描述
 *    - 例："Server started"、"Token exchange failed"
 *    - 不要重複 tag 中的資訊
 * 
 * 3. Data 結構：結構化的上下文資訊
 *    - 例：{ error, requestId, userId, duration, statusCode }
 *    - 避免在 message 中拼接複雜資訊
 * 
 * 4. RequestId 和 UserId：用於追蹤
 *    - requestId：HTTP 請求追蹤 ID
 *    - userId：使用者 ID（可選）
 * 
 * ============================================
 * 禁止的做法
 * ============================================
 * 
 * ❌ 不要：logger.info("[Server]", "Server started")
 *    ✅ 改為：logger.info("[Server] Server started", "Ready")
 * 
 * ❌ 不要：logger.error("[DB] Error: " + error.message, { ... })
 *    ✅ 改為：logger.error("[DB] Query failed", { error: error.message })
 * 
 * ❌ 不要：logger.warn("something", "happened", { data })
 *    ✅ 改為：logger.warn("[TAG] Something happened", { data })
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
  requestId?: string;
  userId?: string;
  data?: Record<string, unknown>;
}

/**
 * 敏感資訊遮罩清單
 */
const SENSITIVE_KEYS = [
  "authorization",
  "cookie",
  "token",
  "apikey",
  "api_key",
  "password",
  "secret",
  "bearer",
  "email",
  "openid",
  "open_id",
  "forge_api_key",
];

class Logger {
  private isDevelopment = process.env.NODE_ENV !== "production";

  /**
   * 遮罩敏感資訊
   * 例："abc123def456" → "abc123...def456"
   */
  private redactSensitiveValue(value: any): any {
    if (typeof value !== "string") return value;
    if (value.length <= 10) return "***";
    return value.substring(0, 6) + "..." + value.substring(value.length - 4);
  }

  /**
   * 遞迴遮罩敏感資訊
   */
  private redactData(data: any): any {
    if (!data || typeof data !== "object") return data;
    
    if (Array.isArray(data)) {
      return data.map(item => this.redactData(item));
    }

    const redacted: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
        redacted[key] = this.redactSensitiveValue(value);
      } else if (typeof value === "object" && value !== null) {
        redacted[key] = this.redactData(value);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, tag, message, requestId, userId, data } = entry;
    const levelUpper = level.toUpperCase().padEnd(5);
    
    // 構建追蹤資訊
    let tracking = "";
    if (requestId) tracking += ` [rid:${requestId}]`;
    if (userId) tracking += ` [uid:${userId}]`;
    
    // 遮罩敏感資訊
    const redactedData = data ? this.redactData(data) : null;
    const dataStr = redactedData ? ` ${JSON.stringify(redactedData)}` : "";
    return `[${timestamp}] [${levelUpper}] ${tag} ${message}${tracking}${dataStr}`;
  }

  /**
   * 內部 log 方法
   */
  private log(
    level: LogLevel,
    tag: string,
    message: string,
    data?: Record<string, unknown>,
    requestId?: string,
    userId?: string
  ): void {
    // Production 環境只輸出 warn 和 error
    if (!this.isDevelopment && (level === "info" || level === "debug")) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      tag,
      message,
      data,
    };
    
    if (requestId) entry.requestId = requestId;
    if (userId) entry.userId = userId;

    const formatted = this.formatLog(entry);

    // 使用 console 的不同方法
    switch (level) {
      case "debug":
        console.log(formatted);
        break;
      case "info":
        console.log(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
        console.error(formatted);
        break;
    }
  }

  /**
   * 統一的日誌方法簽名
   * message 支援 string | object | Error
   * 如果 message 是 object/Error，自動移到 data 參數
   */
  private normalizeArgs(
    message: string | Record<string, unknown> | Error | undefined,
    data?: Record<string, unknown>,
    requestId?: string,
    userId?: string
  ): {
    message: string;
    data?: Record<string, unknown>;
    requestId?: string;
    userId?: string;
  } {
    let normalizedMessage = "";
    let normalizedData = data;

    if (typeof message === "string") {
      normalizedMessage = message;
    } else if (message instanceof Error) {
      // 特判 Error 物件：提取 message、stack、name
      normalizedMessage = message.message;
      normalizedData = {
        ...data,
        errorName: message.name,
        errorStack: message.stack,
      };
    } else if (typeof message === "object" && message !== null) {
      // 如果 message 是 object，轉成 data
      normalizedData = { ...message, ...data };
      normalizedMessage = "";
    }

    return {
      message: normalizedMessage,
      data: normalizedData,
      requestId,
      userId,
    };
  }

  debug(
    tag: string,
    message?: string | Record<string, unknown>,
    data?: Record<string, unknown>,
    requestId?: string,
    userId?: string
  ): void {
    const { message: msg, data: d, requestId: rid, userId: uid } = this.normalizeArgs(
      message,
      data,
      requestId,
      userId
    );
    this.log("debug", tag, msg, d, rid, uid);
  }

  info(
    tag: string,
    message?: string | Record<string, unknown>,
    data?: Record<string, unknown>,
    requestId?: string,
    userId?: string
  ): void {
    const { message: msg, data: d, requestId: rid, userId: uid } = this.normalizeArgs(
      message,
      data,
      requestId,
      userId
    );
    this.log("info", tag, msg, d, rid, uid);
  }

  warn(
    tag: string,
    message?: string | Record<string, unknown>,
    data?: Record<string, unknown>,
    requestId?: string,
    userId?: string
  ): void {
    const { message: msg, data: d, requestId: rid, userId: uid } = this.normalizeArgs(
      message,
      data,
      requestId,
      userId
    );
    this.log("warn", tag, msg, d, rid, uid);
  }

  error(
    tag: string,
    message?: string | Record<string, unknown> | Error,
    data?: Record<string, unknown>,
    requestId?: string,
    userId?: string
  ): void {
    let msg = "";
    let d = data;

    if (typeof message === "string") {
      msg = message;
    } else if (message instanceof Error) {
      msg = message.message;
      d = { ...d, stack: message.stack };
    } else if (typeof message === "object" && message !== null) {
      d = { ...message, ...data };
      msg = "";
    }

    this.log("error", tag, msg, d, requestId, userId);
  }
}

export const logger = new Logger();
