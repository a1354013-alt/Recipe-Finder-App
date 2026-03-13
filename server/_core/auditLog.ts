/**
 * Audit Log 系統
 * 
 * 記錄敏感操作，便於安全審計和合規性檢查
 * 
 * 特性：
 * - 結構化日誌（action、userId、requestId、metadata、timestamp）
 * - 異步寫入（不阻塞主流程）
 * - 敏感資訊遮罩
 * - 支援多個事件類型
 */

import { logger } from './logger';

/**
 * Audit event 類型定義
 */
export type AuditAction =
  | 'oauth_login_success'
  | 'oauth_login_failure'
  | 'oauth_logout'
  | 'ai_provider_changed'
  | 'ai_ollama_config_changed'
  | 'ai_ollama_test'
  | 'ai_rate_limit_exceeded'
  | 'ai_image_recognized'
  | 'recipe_recommendation_requested'
  | 'admin_action';

export interface AuditEvent {
  action: AuditAction;
  userId?: string | number;
  requestId?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
  status: 'success' | 'failure';
  details?: string;
}

/**
 * Audit Log 管理器
 */
class AuditLogManager {
  private queue: AuditEvent[] = [];
  private processing = false;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 30 * 1000; // 30 秒

  constructor() {
    // 定期 flush 隊列
    const timer = setInterval(() => this.flush(), this.FLUSH_INTERVAL);
    timer.unref?.();
  }

  /**
   * 記錄 audit event
   */
  async log(event: Omit<AuditEvent, 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.queue.push(auditEvent);

    // 如果隊列達到批次大小，立即 flush
    if (this.queue.length >= this.BATCH_SIZE) {
      await this.flush();
    }
  }

  /**
   * 同步版本（用於緊急情況）
   */
  logSync(event: Omit<AuditEvent, 'timestamp'>): void {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.queue.push(auditEvent);

    if (this.queue.length >= this.BATCH_SIZE) {
      // 非同步 flush，不等待
      this.flush().catch((err: unknown) => {
        logger.error(
          "[AuditLog] Flush failed",
          err instanceof Error ? err.message : String(err)
        );
      });
    }
  }

  /**
   * Flush 隊列到日誌系統
   */
  private async flush(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      const events = this.queue.splice(0, this.BATCH_SIZE);

      for (const event of events) {
        this.writeEvent(event);
      }

      if (events.length > 0) {
        logger.debug(
          "[AuditLog] Flushed events",
          `Wrote ${events.length} events`,
          { count: events.length, remaining: this.queue.length }
        );
      }
    } catch (error) {
      logger.error(
        "[AuditLog] Flush error",
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      this.processing = false;
    }
  }

  /**
   * 寫入單個 event 到日誌系統
   */
  private writeEvent(event: AuditEvent): void {
    const {
      action,
      userId,
      requestId,
      metadata,
      timestamp,
      status,
      details,
    } = event;

    const tag = `[Audit] ${action}`;
    const message = `${status === 'success' ? '✓' : '✗'} ${action}`;

    const data: Record<string, unknown> = {
      action,
      status,
      timestamp,
    };

    if (userId) {
      data.userId = userId;
    }

    if (metadata) {
      data.metadata = metadata;
    }

    if (details) {
      data.details = details;
    }

    // 根據狀態選擇日誌級別
    const level = status === 'success' ? 'info' : 'warn';

    if (level === 'info') {
      logger.info(tag, message, data, requestId);
    } else {
      logger.warn(tag, message, data, requestId);
    }
  }

  /**
   * 強制 flush（用於優雅關閉）
   */
  async flushAll(): Promise<void> {
    while (this.queue.length > 0) {
      await this.flush();
    }
  }
}

// Singleton instance
export const auditLogManager = new AuditLogManager();
