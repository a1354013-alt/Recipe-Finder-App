import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import superjson from "superjson";
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { trpc } from './lib/trpc'
import './index.css'

/**
 * 自訂 retry 邏輯：
 * - 401 (UNAUTHORIZED) 不重試（未登入）
 * - 403 (FORBIDDEN) 不重試（權限不足）
 * - 其他錯誤最多重試 2 次
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  // 檢查是否為 401 UNAUTHORIZED 或 403 FORBIDDEN
  if (error instanceof TRPCClientError) {
    if (error.data?.code === "UNAUTHORIZED" || error.data?.code === "FORBIDDEN") {
      return false;
    }
  }

  // 其他錯誤最多重試 2 次
  return failureCount < 2;
}

/**
 * 從 cookie 讀取 CSRF token
 */
function getCsrfToken(): string | null {
  const name = "csrf_token=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(";");
  
  for (let cookie of cookieArray) {
    cookie = cookie.trim();
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length);
    }
  }
  
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
    mutations: {
      retry: shouldRetry,
    },
  },
});

/**
 * 全域 API 錯誤處理
 * - 顯示 requestId 便於後端追蹤
 * - UNAUTHORIZED 不自動重試
 * - 其他錯誤輸出到 console
 */
function handleTRPCError(error: unknown, context: string) {
  if (!(error instanceof TRPCClientError)) return;

  // 提取 requestId：優先讀 error.data?.requestId，fallback 到 header
  const requestId = error.data?.requestId || (error.meta as any)?.response?.headers?.get?.("x-request-id");
  
  // 檢查是否為認證錯誤
  const isAuthError = error.data?.code === "UNAUTHORIZED" || error.data?.code === "FORBIDDEN";
  
  // 輸出錯誤
  if (requestId) {
    console.error(`[${context}] requestId: ${requestId}`, {
      code: error.data?.code,
      message: error.message,
      isAuthError,
    });
  } else {
    console.error(`[${context}]`, {
      code: error.data?.code,
      message: error.message,
      isAuthError,
    });
  }
}

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    handleTRPCError(error, "API Query Error");
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    handleTRPCError(error, "API Mutation Error");
  }
});

const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: "/api/trpc",
      fetch(input, init) {
        // 讀取 CSRF token 並添加到 headers
        const csrfToken = getCsrfToken();
        const headers = new Headers(init?.headers || {});
        
        // 所有請求都帶上 CSRF token（server 會自動略過 GET/HEAD/OPTIONS）
        if (csrfToken) {
          headers.set("x-csrf-token", csrfToken);
        }

        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
          headers,
        });
      },
    }),
  ],
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <App />
      </trpc.Provider>
    </QueryClientProvider>
  </React.StrictMode>,
)
