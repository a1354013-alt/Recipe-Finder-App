# MovieHub Pro

MovieHub Pro 是一個以 **Production 等級架構設計**為目標的全端 Web 應用範例專案。

此專案不僅展示電影資料管理與查詢功能，更重點放在 **後端服務穩定性、可觀測性與工程化設計**，例如：

- Request ID 追蹤
- 全域錯誤處理
- OAuth 認證流程
- 外部 API timeout / retry
- 健康檢查 (Health / Readiness)
- Graceful Shutdown
- 結構化 Logging

本專案旨在展示 **實際可部署的 Node.js 服務架構設計**，而不只是簡單 CRUD 應用。

---

# 專案特色

### 身份驗證
- OAuth 登入流程
- CSRF State 驗證
- 安全 Cookie Session

### 系統穩定性
- 全域錯誤處理 Middleware
- Request ID 追蹤系統
- Graceful Shutdown
- 外部 API timeout + retry 機制

### 可觀測性 (Observability)
- 結構化 Logger
- Request Trace ID
- 錯誤追蹤機制
- 統一錯誤回應格式

### 系統監控
- `/system/health` 存活檢查
- `/system/ready` 服務準備檢查
- DB readiness 檢測

### API 架構
- tRPC 型別安全 API
- Zod 輸入驗證
- Drizzle ORM

---

# 技術架構

## Backend

- Node.js
- TypeScript
- Express
- tRPC
- Drizzle ORM
- MySQL
- Zod
- OAuth

## Frontend

- React
- Vite
- TypeScript
- React Query

---

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


### 核心設計
Request
│
▼
Request ID Middleware
│
▼
Router (tRPC)
│
▼
Service Layer
│
▼
Database / External API


方便追蹤整條請求流程。

---

# 專案目錄

moviehub-pro

server/
_core/
context.ts
http.ts
index.ts
logger.ts
oauth.ts
systemRouter.ts
trpc.ts

routers/
auth.ts
movies.ts

client/
src/


---

# 安裝與啟動

## 1 Clone 專案


git clone https://github.com/yourname/moviehub-pro.git

cd moviehub-pro


---

## 2 安裝套件


npm install


---

## 3 設定環境變數

建立 `.env`


DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=moviehub

OAUTH_CLIENT_ID=your_client_id
OAUTH_CLIENT_SECRET=your_client_secret
OAUTH_PORTAL_URL=https://oauth.example.com


---

## 4 啟動開發環境


npm run dev


---

# API 健康檢查

### Health Check


GET /system/health


回傳：


{
"ok": true
}


---

### Readiness Check


GET /system/ready


檢查：

- DB 連線
- 系統服務是否可用

---

# Production Engineering 設計

本專案特別重視 **服務穩定性與工程品質**。

### Request Trace

每個 request 會生成：


requestId


並在所有 log 與錯誤回應中傳遞。

---

### Global Error Handling

所有錯誤會經過統一處理：


{
"error": {
"message": "...",
"requestId": "..."
}
}


---

### 外部 API 保護

所有外部請求透過：


httpFetch()


提供：

- timeout
- retry
- 統一錯誤處理

---

### Graceful Shutdown

當服務收到：


SIGINT
SIGTERM


會：

1. 停止接受新請求
2. 等待現有請求完成
3. 關閉 DB
4. 結束程序

---

# 為什麼要做這個專案

此專案的目標是展示：

- Production Ready Node.js 架構
- 高可維護性 API 設計
- 可觀測性 (Observability)
- 系統穩定性設計

而不只是簡單的 CRUD 範例。

---

# License

MIT License
