/**
 * HTTP 請求工具函式
 * 
 * 用途：
 * - 統一處理 fetch 請求
 * - 支援 timeout（AbortController）
 * - 支援 retry（只對 idempotent 方法）
 * - 檢查 response.ok
 * - 統一錯誤處理
 * - 支援 FormData
 */

import { logger } from './logger';

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  maxRetries?: number;
  requestId?: string;
  userId?: string;
}

export interface FetchResponse<T> {
  ok: boolean;
  status: number;
  data: T;
}

/**
 * 判斷是否為 idempotent 方法（可安全重試）
 * 
 * 注意：DELETE 雖然在理論上是冪等的，但某些外部服務可能不安全
 * 因此保守起見，只允許 GET/HEAD/PUT 重試
 * DELETE 由呼叫端自己決定要不要 retry
 */
function isIdempotentMethod(method: string): boolean {
  return ['GET', 'HEAD', 'PUT'].includes(method.toUpperCase());
}

/**
 * 延遲函式（用於 retry backoff）
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 安全的 fetch 包裝函式
 * 
 * 特性：
 * - 自動 JSON 序列化/反序列化
 * - 支援 FormData（不進行 JSON 序列化）
 * - 支援 AbortController timeout
 * - 支援 retry（只對 idempotent 方法，exponential backoff）
 * - 檢查 response.ok
 * - 統一錯誤日誌（含 requestId）
 */
export async function httpFetch<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResponse<T>> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = 30000,
    maxRetries = 0,
    requestId,
    userId,
  } = options;

  // 只有 idempotent 方法才允許 retry
  const retries = isIdempotentMethod(method) ? maxRetries : 0;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const isFormData = body instanceof FormData;
        
        // 檢查 headers 中是否已有 content-type（不區分大小寫）
        const headerKeys = Object.keys(headers);
        const hasContentType = headerKeys.some(
          key => key.toLowerCase() === 'content-type'
        );
        
        const fetchOptions: RequestInit = {
          method,
          headers: {
            ...headers,
          },
          signal: controller.signal,
        };

        // 只有非 FormData 且沒有 content-type 時才自動補上
        if (!isFormData && !hasContentType) {
          fetchOptions.headers = {
            'Content-Type': 'application/json',
            ...headers,
          };
        }

        if (body) {
          if (isFormData) {
            // FormData 直接傳送，不進行 JSON 序列化
            fetchOptions.body = body as FormData;
          } else {
            fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
          }
        }

        logger.info(
          '[HTTP] Request',
          'Sending request',
          {
            method,
            url: url.substring(0, 100),
            attempt: attempt + 1,
            maxAttempts: retries + 1,
          },
          requestId,
          userId
        );

        const response = await fetch(url, fetchOptions);
        
        // 根據 Content-Type 決定如何解析回應
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        let data: T;
        
        // 處理空回應（204、205 或 content-length = 0）
        if (response.status === 204 || response.status === 205 || contentLength === '0') {
          data = '' as T;
        } else if (contentType?.includes('application/json')) {
          data = await response.json() as T;
        } else {
          data = await response.text() as T;
        }

        if (!response.ok) {
          logger.warn(
            '[HTTP] Request failed',
            'Non-OK response status',
            {
              status: response.status,
              url: url.substring(0, 100),
              attempt: attempt + 1,
            },
            requestId,
            userId
          );

          // 5xx 錯誤可以重試，4xx 錯誤不重試
          if (response.status >= 500 && attempt < retries) {
            const backoffMs = Math.pow(2, attempt) * 1000; // exponential backoff
            logger.debug(
              '[HTTP] Retrying after backoff',
              'Exponential backoff retry',
              { backoffMs, attempt: attempt + 1 },
              requestId,
              userId
            );
            await delay(backoffMs);
            continue;
          }
        } else {
          logger.info(
            '[HTTP] Request successful',
            'Response OK',
            { status: response.status, attempt: attempt + 1 },
            requestId,
            userId
          );
        }

        return {
          ok: response.ok,
          status: response.status,
          data,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      lastError = error as Error;

      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn(
          '[HTTP] Request timeout',
          'Request exceeded timeout',
          { url: url.substring(0, 100), timeoutMs, attempt: attempt + 1 },
          requestId,
          userId
        );

        // timeout 也可以重試（可能是暫時的網路問題）
        if (attempt < retries) {
          const backoffMs = Math.pow(2, attempt) * 1000;
          logger.debug(
            '[HTTP] Retrying after timeout',
            'Exponential backoff retry',
            { backoffMs, attempt: attempt + 1 },
            requestId,
            userId
          );
          await delay(backoffMs);
          continue;
        }

        throw new Error(`HTTP request timeout after ${timeoutMs}ms`);
      }

      logger.warn(
        '[HTTP] Request error',
        'Request failed with error',
        {
          error: error instanceof Error ? error.message.substring(0, 100) : String(error),
          attempt: attempt + 1,
        },
        requestId,
        userId
      );

      // 其他錯誤如果還有重試次數，繼續重試
      if (attempt < retries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        logger.debug(
          '[HTTP] Retrying after error',
          'Exponential backoff retry',
          { backoffMs, attempt: attempt + 1 },
          requestId,
          userId
        );
        await delay(backoffMs);
        continue;
      }

      throw error;
    }
  }

  // 所有重試都失敗
  throw lastError || new Error('HTTP request failed');
}

/**
 * 安全的 fetch 包裝函式（自動 throw）
 * 
 * 特性：
 * - 包裝 httpFetch，自動檢查 response.ok
 * - 如果 !ok 則 throw 包含詳細資訊的 Error
 * - 適合重要流程（OAuth / Storage / Ollama）
 * 
 * 用法：
 * const data = await httpFetchOrThrow<MyType>(url, options);
 */
export async function httpFetchOrThrow<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await httpFetch<T>(url, options);
  
  if (!response.ok) {
    const errorMsg = typeof response.data === 'string' 
      ? response.data.substring(0, 200) 
      : JSON.stringify(response.data).substring(0, 200);
    
    throw new Error(
      `HTTP ${response.status} from ${url.substring(0, 100)}: ${errorMsg}` +
      (options.requestId ? ` [rid: ${options.requestId}]` : '')
    );
  }
  
  return response.data;
}
