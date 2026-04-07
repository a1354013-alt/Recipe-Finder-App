import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import superjson from "superjson";
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { trpc } from './lib/trpc'
import './index.css'
import { toast } from 'sonner';

/**
 * Custom retry logic:
 * - 401 (UNAUTHORIZED) - no retry (not logged in)
 * - 403 (FORBIDDEN) - no retry (insufficient permissions)
 * - Other errors - retry up to 2 times
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof TRPCClientError) {
    if (error.data?.code === "UNAUTHORIZED" || error.data?.code === "FORBIDDEN") {
      return false;
    }
  }
  return failureCount < 2;
}

/**
 * Read CSRF token from cookie
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
 * Global API Error Handler
 * 
 * Distinguishes between:
 * - UNAUTHORIZED (401): User not logged in
 * - FORBIDDEN (403): User lacks permissions
 * - Network errors: Connection issues
 * - Server errors: 5xx errors
 * - Other errors: Generic errors
 * 
 * Each error type shows appropriate user message
 */
function handleTRPCError(error: unknown, context: string) {
  if (!(error instanceof TRPCClientError)) return;

  // Extract requestId for error tracking
  const requestId = error.data?.requestId || (error.meta as any)?.response?.headers?.get?.("x-request-id");
  const errorCode = error.data?.code;
  
  // Build error message based on error type
  let errorMessage = '';
  
  if (errorCode === "UNAUTHORIZED") {
    errorMessage = 'Please sign in to continue';
  } else if (errorCode === "FORBIDDEN") {
    errorMessage = 'You do not have permission to perform this action';
  } else if (errorCode === "NOT_FOUND") {
    errorMessage = 'The requested resource was not found';
  } else if (errorCode === "BAD_REQUEST") {
    errorMessage = 'Invalid request. Please check your input';
  } else if (errorCode === "INTERNAL_SERVER_ERROR") {
    errorMessage = 'Server error. Please try again later';
  } else {
    errorMessage = error.message || 'An error occurred. Please try again';
  }

  // Add requestId to message if available (for error tracking)
  if (requestId) {
    errorMessage = `${errorMessage} (Code: ${requestId.substring(0, 8)})`;
  }

  // Show toast notification
  toast.error(errorMessage);

  // Log detailed error info in development
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, {
      code: errorCode,
      message: error.message,
      requestId,
      fullError: error,
    });
  }
}

/**
 * Global Query Error Handler
 * Subscribes to all query errors and shows appropriate user feedback
 */
queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    handleTRPCError(error, "Query Error");
  }
});

/**
 * Global Mutation Error Handler
 * Subscribes to all mutation errors and shows appropriate user feedback
 */
queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    handleTRPCError(error, "Mutation Error");
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        // Add CSRF token to request headers
        const csrfToken = getCsrfToken();
        const headers = new Headers(init?.headers || {});
        
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
