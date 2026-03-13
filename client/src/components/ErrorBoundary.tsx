import React, { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorCode?: string;
  requestId?: string;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // 嘗試從 error 中提取 requestId 和 errorCode
    let errorCode = undefined;
    let requestId = undefined;

    // 檢查 error.message 中是否包含 requestId（格式：[rid: xxx]）
    const ridMatch = error.message?.match(/\[rid:\s*([^\]]+)\]/);
    if (ridMatch) {
      requestId = ridMatch[1];
    }

    // 檢查 error.cause 或其他屬性
    if ((error as any).data?.requestId) {
      requestId = (error as any).data.requestId;
    }
    if ((error as any).data?.code) {
      errorCode = (error as any).data.code;
    }

    return { 
      hasError: true, 
      error,
      errorCode,
      requestId,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
      
      // 記錄到外部服務（如果需要）
      if (this.state.requestId) {
        console.error(`Error with requestId: ${this.state.requestId}`);
      }
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorCode, requestId } = this.state;
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center px-4 max-w-md">
            <h1 className="text-3xl font-merriweather font-bold text-accent mb-4">
              Something went wrong
            </h1>
            
            <p className="text-muted-foreground font-lato mb-4">
              {error?.message || 'An unexpected error occurred'}
            </p>

            {/* 顯示錯誤代碼和 requestId */}
            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
              {errorCode && (
                <p className="text-sm font-mono text-muted-foreground mb-2">
                  <span className="font-semibold">Error Code:</span> {errorCode}
                </p>
              )}
              {requestId && (
                <p className="text-sm font-mono text-muted-foreground break-all">
                  <span className="font-semibold">Request ID:</span> {requestId}
                  <button
                    onClick={() => navigator.clipboard.writeText(requestId)}
                    className="ml-2 text-accent hover:text-accent/80 transition-colors"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </p>
              )}
              {!errorCode && !requestId && (
                <p className="text-sm text-muted-foreground">
                  Please note the error details above for support
                </p>
              )}
            </div>

            {/* 重新整理按鈕 */}
            <button
              onClick={this.handleReload}
              className="w-full px-6 py-2 bg-accent text-accent-foreground rounded-lg font-lato font-semibold hover:bg-accent/90 transition-colors"
            >
              Reload Page
            </button>

            {/* 支援提示 */}
            <p className="text-xs text-muted-foreground mt-4">
              {requestId 
                ? `If the problem persists, please contact support with Request ID: ${requestId}`
                : 'If the problem persists, please contact support'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
