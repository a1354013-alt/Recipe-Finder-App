# RecipeHub Pro

**RecipeHub Pro** 是一個以 **Production-Ready 架構設計為核心的全端 Web
應用專案**。\
它結合 **AI
食材辨識、食譜搜尋、收藏管理與購物清單功能**，並同時展示可實際部署的
Node.js 服務工程設計。

本專案的重點不只是產品功能，而是
**如何打造穩定、可觀測、可維護的後端服務架構**。

------------------------------------------------------------------------

# Demo 功能

## AI 食材辨識

使用者可以上傳食材圖片：

-   AI 自動辨識食材
-   根據食材推薦可製作的料理
-   保存辨識歷史紀錄

------------------------------------------------------------------------

## 食譜搜尋

支援多種搜尋方式：

-   關鍵字搜尋
-   食材推薦
-   料理類型 (Cuisine)
-   隨機食譜推薦

------------------------------------------------------------------------

## 食譜詳情

每道食譜包含：

-   食材清單
-   製作步驟
-   烹飪時間
-   難度
-   料理圖片

------------------------------------------------------------------------

## 收藏功能

登入後可以：

-   收藏喜愛的食譜
-   查看收藏列表
-   快速重新查看料理

------------------------------------------------------------------------

## 購物清單

可將食材加入購物清單：

-   新增食材
-   勾選已購買項目
-   管理多個購物清單

------------------------------------------------------------------------

## AI 辨識歷史

系統會保存：

-   食材辨識紀錄
-   推薦料理結果
-   上傳圖片

方便使用者日後重新查看。

------------------------------------------------------------------------

# 專案特色

## Production Engineering

本專案設計重點在 **Production 等級服務架構**。

包含：

-   Request ID Trace
-   Global Error Handling
-   OAuth Authentication
-   External API Timeout / Retry
-   Health / Readiness Check
-   Graceful Shutdown
-   Structured Logging

------------------------------------------------------------------------

## Authentication

安全登入流程：

-   OAuth Login
-   CSRF State 驗證
-   Secure Cookie Session

------------------------------------------------------------------------

## Observability

完整可觀測性設計：

-   Structured Logger
-   Request Trace ID
-   Error Tracking
-   統一錯誤回應格式

------------------------------------------------------------------------

## System Monitoring

提供健康檢查 API：

    /system/health
    /system/ready

檢查內容包含：

-   DB readiness
-   系統服務可用性

------------------------------------------------------------------------

# 技術架構

## Backend

-   Node.js
-   TypeScript
-   Express
-   tRPC
-   Drizzle ORM
-   MySQL
-   Zod
-   OAuth

------------------------------------------------------------------------

## Frontend

-   React
-   Vite
-   TypeScript
-   React Query

------------------------------------------------------------------------

# 系統架構

    Client (React)
          │
          ▼
       tRPC API Layer
          │
          ▼
    Application Services
          │
          ▼
    Database (MySQL)

------------------------------------------------------------------------

# Request Flow

    Request
       │
       ▼
    Request ID Middleware
       │
       ▼
    tRPC Router
       │
       ▼
    Service Layer
       │
       ▼
    Database / External API

每個 Request 都會生成：

    requestId

並在 log、error response 與 tracing 中傳遞。

------------------------------------------------------------------------

# 專案結構

    recipehub-pro

    server/
      _core/
        context.ts
        http.ts
        logger.ts
        oauth.ts
        systemRouter.ts
        trpc.ts

      routers/
        auth.ts
        recipes.ts
        ai.ts

    client/
      src/

------------------------------------------------------------------------

# 安裝與啟動

## 1 Clone Repository

    git clone https://github.com/yourname/recipehub-pro.git
    cd recipehub-pro

------------------------------------------------------------------------

## 2 安裝套件

    npm install

------------------------------------------------------------------------

## 3 設定環境變數

建立 `.env`

    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=password
    DB_NAME=recipehub

    OAUTH_CLIENT_ID=your_client_id
    OAUTH_CLIENT_SECRET=your_client_secret
    OAUTH_PORTAL_URL=https://oauth.example.com

------------------------------------------------------------------------

## 4 啟動開發環境

    npm run dev

------------------------------------------------------------------------

# API Health Check

## Health

    GET /system/health

回傳：

    {
      "ok": true
    }

------------------------------------------------------------------------

## Readiness

    GET /system/ready

檢查：

-   DB 連線
-   系統服務可用性

------------------------------------------------------------------------

# Production Engineering 設計

## Request Trace

每個 request 會生成：

    requestId

並在 log、error、response 中傳遞。

------------------------------------------------------------------------

## Global Error Handling

所有錯誤經過統一處理：

    {
      "error": {
        "message": "...",
        "requestId": "..."
      }
    }

------------------------------------------------------------------------

## External API Protection

所有外部 API 請求透過：

    httpFetch()

提供：

-   timeout
-   retry
-   error normalization

------------------------------------------------------------------------

## Graceful Shutdown

當服務收到：

    SIGINT
    SIGTERM

會：

1.  停止接受新請求
2.  等待現有請求完成
3.  關閉 DB
4.  安全結束程序

------------------------------------------------------------------------

# 為什麼做這個專案

本專案的目標是展示：

-   Production Ready Node.js 架構
-   高可維護性 API 設計
-   可觀測性 (Observability)
-   系統穩定性設計
-   完整 Web App 產品流程

而不只是簡單 CRUD 範例。

------------------------------------------------------------------------

# License

MIT License
