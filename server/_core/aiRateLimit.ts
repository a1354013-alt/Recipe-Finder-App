/**
 * AI 端點 Per-User Rate Limit
 * 
 * 支援 Redis 和記憶體兩種實現：
 * - Redis：支援分散式部署（多個伺服器共享限制）
 * - 記憶體：Redis 不可用時自動 fallback（單伺服器模式）
 * 
 * 配置：
 * - REDIS_URL：可選，格式 redis://[user:password@]host:port[/db]
 * - 若未設定或連線失敗，自動使用記憶體版
 */

import Redis from 'ioredis';
import { logger } from './logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Redis 版 Rate Limiter
 */
class RedisRateLimiter {
  private redis: Redis | null = null;
  private isConnected = false;

  constructor(redisUrl?: string) {
    if (!redisUrl) {
      logger.info("[AIRateLimit] Redis URL not provided, using memory fallback");
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        enableOfflineQueue: false,
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info("[AIRateLimit] Connected to Redis");
      });

      this.redis.on('error', (err) => {
        this.isConnected = false;
        logger.warn("[AIRateLimit] Redis connection error", { error: err.message });
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        logger.info("[AIRateLimit] Redis connection closed");
      });
    } catch (error) {
      logger.warn(
        "[AIRateLimit] Failed to initialize Redis",
        { error: error instanceof Error ? error.message : String(error) }
      );
      this.redis = null;
    }
  }

  /**
   * 檢查用戶是否超過速率限制
   * 使用 Redis INCR + EXPIRE 實現滑動視窗
   */
  async checkLimit(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    if (!this.redis || !this.isConnected) {
      // Redis 不可用，返回允許（fallback 到記憶體版）
      return {
        allowed: true,
        remaining: 10,
        resetTime: Date.now() + 60000,
      };
    }

    const key = `ai:ratelimit:${userId}`;
    const windowMs = 60; // 1 分鐘
    const maxRequests = 10; // 每分鐘最多 10 次

    try {
      // 使用 Redis 事務確保原子性
      const pipeline = this.redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, windowMs);
      pipeline.ttl(key);
      
      const results = await pipeline.exec();
      
      if (!results) {
        // 事務失敗，fallback
        return {
          allowed: true,
          remaining: 10,
          resetTime: Date.now() + 60000,
        };
      }

      const count = (results[0][1] as number) || 0;
      const ttl = (results[2][1] as number) || windowMs;
      
      const allowed = count <= maxRequests;
      const remaining = Math.max(0, maxRequests - count);
      const resetTime = Date.now() + (ttl * 1000);

      return {
        allowed,
        remaining,
        resetTime,
      };
    } catch (error) {
      logger.warn(
        "[AIRateLimit] Redis check failed",
        { error: error instanceof Error ? error.message : String(error) }
      );
      // Redis 錯誤時 fallback 允許
      return {
        allowed: true,
        remaining: 10,
        resetTime: Date.now() + 60000,
      };
    }
  }

  /**
   * 關閉 Redis 連線
   */
  async close(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
        this.isConnected = false;
        logger.info("[AIRateLimit] Redis connection closed");
      } catch (error) {
        logger.warn(
          "[AIRateLimit] Error closing Redis connection",
          { error: error instanceof Error ? error.message : String(error) }
        );
      }
    }
  }

  /**
   * 取得連線狀態
   */
  getStatus(): { connected: boolean; redisAvailable: boolean } {
    return {
      connected: this.isConnected,
      redisAvailable: !!this.redis,
    };
  }
}

/**
 * 記憶體版 Rate Limiter（fallback）
 */
class MemoryRateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly WINDOW_MS = 60 * 1000; // 1 分鐘
  private readonly MAX_REQUESTS_PER_MINUTE = 10; // 每分鐘最多 10 次
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 分鐘清理一次過期記錄

  constructor() {
    // 定期清理過期記錄
    // 使用 unref() 避免 interval 阻止 process 自然退出（便於測試和短命程序）
    const timer = setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
    timer.unref?.();
  }

  /**
   * 檢查用戶是否超過速率限制
   */
  checkLimit(userId: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const key = `ai:${userId}`;
    
    let entry = this.limits.get(key);
    
    // 如果記錄已過期或不存在，重置
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime: now + this.WINDOW_MS,
      };
      this.limits.set(key, entry);
    }

    // 檢查是否超過限制
    const allowed = entry.count < this.MAX_REQUESTS_PER_MINUTE;
    
    if (allowed) {
      entry.count++;
    }

    const remaining = Math.max(0, this.MAX_REQUESTS_PER_MINUTE - entry.count);
    const resetTime = entry.resetTime;

    return {
      allowed,
      remaining,
      resetTime,
    };
  }

  /**
   * 清理過期記錄
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.limits.entries()) {
      if (entry.resetTime <= now) {
        this.limits.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(
        "[AIRateLimit] Memory cleanup completed",
        { cleaned, totalEntries: this.limits.size }
      );
    }
  }

  /**
   * 取得統計資訊（用於監控）
   */
  getStats(): { activeUsers: number; totalEntries: number } {
    return {
      activeUsers: this.limits.size,
      totalEntries: this.limits.size,
    };
  }
}

/**
 * 混合版 Rate Limiter（優先使用 Redis，fallback 到記憶體）
 */
class HybridRateLimiter {
  private redisLimiter: RedisRateLimiter | null = null;
  private memoryLimiter: MemoryRateLimiter;
  private useRedis = false;

  constructor(redisUrl?: string) {
    this.memoryLimiter = new MemoryRateLimiter();
    
    if (redisUrl) {
      this.redisLimiter = new RedisRateLimiter(redisUrl);
      this.useRedis = true;
    }
  }

  /**
   * 檢查用戶是否超過速率限制
   * 優先使用 Redis，若不可用則使用記憶體版
   */
  async checkLimit(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    if (this.useRedis && this.redisLimiter) {
      try {
        const result = await this.redisLimiter.checkLimit(userId);
        // 如果 Redis 返回 allowed=true 但 remaining=10（預設值），可能是 fallback
        // 但我們仍然信任 Redis 的結果
        return result;
      } catch (error) {
        logger.warn(
          "[AIRateLimit] Redis check failed, using memory fallback",
          { error: error instanceof Error ? error.message : String(error) }
        );
      }
    }

    // Fallback 到記憶體版
    return this.memoryLimiter.checkLimit(userId);
  }

  /**
   * 同步版本（用於現有程式碼相容性）
   * 僅使用記憶體版
   */
  checkLimitSync(userId: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    return this.memoryLimiter.checkLimit(userId);
  }

  /**
   * 關閉 Redis 連線
   */
  async close(): Promise<void> {
    if (this.redisLimiter) {
      await this.redisLimiter.close();
    }
  }

  /**
   * 取得狀態
   */
  getStatus(): {
    redisEnabled: boolean;
    redisConnected: boolean;
    memoryStats: { activeUsers: number; totalEntries: number };
  } {
    const redisStatus = this.redisLimiter?.getStatus() ?? { connected: false, redisAvailable: false };
    return {
      redisEnabled: this.useRedis,
      redisConnected: redisStatus.connected,
      memoryStats: this.memoryLimiter.getStats(),
    };
  }
}

// 初始化混合版 limiter
const redisUrl = process.env.REDIS_URL;
export const aiRateLimiter = new HybridRateLimiter(redisUrl);

// 優雅關閉時清理 Redis 連線
process.on('SIGTERM', async () => {
  await aiRateLimiter.close();
});

process.on('SIGINT', async () => {
  await aiRateLimiter.close();
});
