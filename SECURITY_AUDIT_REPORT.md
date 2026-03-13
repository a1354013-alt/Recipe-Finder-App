# 食譜搜尋器應用 - 安全審計與修正報告

**審計日期：2026-02-06**  
**審計等級：資深全端工程師級別**  
**修正目標：實際部署環境（HTTP/HTTPS/Proxy/OAuth）穩定可用**

---

## 【修正一】Cookie & Session 安全性

### 問題描述
原始實作中 SameSite 和 Secure 組合存在邏輯錯誤，可能導致：
- 開發環境中 SameSite=none 但 secure=false（違反規範）
- 生產環境中 Proxy 後無法正確判斷 HTTPS

### 修正內容
**檔案：`server/_core/cookies.ts`**

```typescript
// 修正前：邏輯混亂
sameSite: "none",
secure: false, // ❌ 違反規範

// 修正後：根據環境正確配置
開發環境（非 HTTPS）：
  sameSite: "lax"
  secure: false

生產環境（HTTPS）：
  sameSite: "none"
  secure: true
```

### 核心修正
1. **正確判斷 HTTPS**：支援 `x-forwarded-proto` header（Proxy 環境）
2. **SameSite 邏輯**：開發環境 lax，生產環境 none
3. **Secure 邏輯**：非 HTTPS 環境必須 false，HTTPS 環境必須 true

### 驗證方式
```bash
# 開發環境測試
curl -v http://localhost:3000/api/oauth/callback

# 生產環境測試（通過 Proxy）
curl -v https://yourdomain.com/api/oauth/callback -H "x-forwarded-proto: https"
```

---

## 【修正二】OAuth State 安全性（CSRF 防護）

### 問題描述
原始實作使用 `btoa(redirectUri)` 作為 state，存在致命漏洞：
- State 完全可預測（base64 編碼的已知 redirectUri）
- 無法防護 CSRF 攻擊
- 攻擊者可以預先計算 state 值

### 修正內容
**檔案：`client/src/const.ts` 和 `server/_core/oauth.ts`**

#### 前端修正
```typescript
// 修正前：❌ 完全可預測
const state = btoa(redirectUri);

// 修正後：✅ 密碼學安全隨機值
const state = crypto.randomUUID();
// 或
const state = generateRandomState(); // 使用 crypto.getRandomValues()
```

#### 後端修正
```typescript
// 修正前：沒有驗證 state
// 修正後：嚴格驗證 state

1. 前端生成 state → 儲存在 httpOnly cookie
2. 前端導向 OAuth server，傳遞 state
3. OAuth server 回調時，傳回 state
4. 後端比對 cookie 中的 state 與回調的 state
5. 不一致 → 直接拒絕登入（CSRF 攻擊）
```

### 驗證方式
```bash
# 檢查 state 是否為有效 UUID
curl http://localhost:3000/api/oauth/login | grep state

# 應該看到類似：
# state=550e8400-e29b-41d4-a716-446655440000
```

---

## 【修正三】Session Token 與 OAuth Token 混用邏輯

### 問題描述
**致命邏輯錯誤**：專案用自己簽的 session JWT（HS256）去呼叫 OAuth Server 的 `GetUserInfoWithJwt`，這在正式環境 100% 會失敗。

#### 流程對比

**修正前（❌ 錯誤）：**
```
1. 用戶登入 → OAuth server 返回 accessToken
2. 後端簽發 session JWT（HS256，自己的密鑰）
3. 後端拿 session JWT 去呼叫 OAuth server 的 GetUserInfoWithJwt
4. ❌ OAuth server 無法驗證（密鑰不匹配）
```

**修正後（✅ 正確）：**
```
1. 用戶登入 → OAuth server 返回 accessToken
2. 後端使用 accessToken 呼叫 OAuth server 的 GetUserInfo
3. 後端簽發 session JWT（HS256，自己的密鑰）
4. 後端將 session JWT 存入 httpOnly cookie
5. 後續請求使用 session JWT（不再需要 OAuth accessToken）
```

### 修正內容
**檔案：`server/_core/sdk.ts`**

```typescript
// 修正前：❌ 混用 token
async getUserInfoWithAccessToken(accessToken: string) {
  // 錯誤：拿 session JWT 去呼叫 OAuth server
  const payload = {
    jwtToken: sessionJWT, // ❌ 這是自己簽的 JWT，OAuth server 無法驗證
  };
}

// 修正後：✅ 正確使用 OAuth accessToken
async getUserInfoWithAccessToken(accessToken: string) {
  const payload = {
    jwtToken: accessToken, // ✅ 這是 OAuth server 簽發的 token
  };
}

// 後續請求：使用 session JWT
async authenticateRequest(req: Request) {
  const sessionJWT = cookies.get(COOKIE_NAME);
  const session = await verifySession(sessionJWT); // ✅ 驗證自己簽的 JWT
  // 不再需要 OAuth accessToken
}
```

### 驗證方式
```bash
# 檢查 token 類型
curl -X POST http://localhost:3000/api/oauth/callback \
  -H "Cookie: session=<your-session-jwt>"

# 應該成功（使用 session JWT）
# 不應該嘗試用 session JWT 去呼叫 OAuth server
```

---

## 【修正四】Session Payload 驗證過嚴

### 問題描述
Session 驗證強制要求 `name` 為非空字串，但 `createSessionToken` 允許空字串，導致合法使用者被踢掉。

### 修正內容
**檔案：`server/_core/sdk.ts`**

```typescript
// 修正前：❌ 過嚴
export type SessionPayload = {
  openId: string;
  appId: string;
  name: string; // 必須非空
};

async verifySession(token: string) {
  if (!isNonEmptyString(name)) {
    return null; // ❌ 踢掉合法使用者
  }
}

// 修正後：✅ 合理
export type SessionPayload = {
  openId: string;
  appId: string;
  name?: string; // 可選，允許空值
};

async verifySession(token: string) {
  // openId 和 appId 必要
  if (!isNonEmptyString(openId) || !isNonEmptyString(appId)) {
    return null;
  }
  // name 可為空
  return { openId, appId, name };
}
```

### 驗證方式
```bash
# 測試空 name 的使用者
const token = await createSessionToken("user123", { name: "" });
const session = await verifySession(token);
// 應該成功（name 為空字串）
```

---

## 【修正五】DB 初始化安全性

### 問題描述
原始實作直接將 `DATABASE_URL` 字串傳給 drizzle，缺少連接池管理，導致：
- 無連接復用
- 無自動重連
- 無連接限制

### 修正內容
**檔案：`server/db.ts`**

```typescript
// 修正前：❌ 直接傳字串
const db = drizzle(process.env.DATABASE_URL);

// 修正後：✅ 建立連接池
async function createConnectionPool() {
  const pool = mysql.createPool({
    host: hostname,
    port: port,
    user: username,
    password: password,
    database: database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
  });
  
  // 測試連接
  const connection = await pool.getConnection();
  await connection.ping();
  connection.release();
  
  return pool;
}

const db = drizzle(pool);
```

### 優勢
1. **連接復用**：最多 10 個並發連接
2. **自動重連**：連接失敗自動重試
3. **Keep-Alive**：保持連接活躍
4. **優雅關閉**：`await closePool()`

### 驗證方式
```bash
# 檢查連接池狀態
curl http://localhost:3000/api/health

# 應該看到連接池信息
```

---

## 【修正六】清理混淆入口

### 問題描述
存在兩個 server 入口，導致混淆：
- `server/index.ts`（靜態檔案伺服器）
- `server/_core/index.ts`（完整 tRPC + OAuth 伺服器）

### 修正內容
**統一使用 `server/_core/index.ts`**

```typescript
// package.json
{
  "dev": "NODE_ENV=development tsx watch server/_core/index.ts",
  "build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js"
}
```

### 驗證方式
```bash
# 開發環境
pnpm dev

# 生產環境
pnpm build
pnpm start

# 應該都使用同一個入口
```

---

## 【修正七】品質改進

### 建立 Logger 服務
**檔案：`server/_core/logger.ts`**

統一日誌格式，便於後續集成 ELK / Sentry：

```typescript
logger.info("[OAuth] Token exchange successful");
logger.warn("[Auth] Session verification failed", error);
logger.error("[DB] Connection pool failed", error);
```

### 建立 HTTP 工具函式
**檔案：`server/_core/http.ts`**

統一 HTTP 請求處理，支援 timeout 和錯誤檢查：

```typescript
const response = await httpFetch<UserInfo>(
  "https://oauth.example.com/user",
  {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    timeoutMs: 30000,
  }
);

if (!response.ok) {
  logger.error("[HTTP] Request failed", { status: response.status });
}
```

---

## 部署檢查清單

### 前置條件
- [ ] 環境變數配置完整（DATABASE_URL, OAUTH_SERVER_URL, JWT_SECRET 等）
- [ ] SSL 憑證已配置（生產環境必須 HTTPS）
- [ ] MySQL 資料庫已初始化

### 開發環境
```bash
pnpm install
pnpm db:push
pnpm dev
```

### 生產環境
```bash
# 構建
pnpm build

# 啟動
NODE_ENV=production node dist/index.js

# 驗證
curl https://yourdomain.com/api/health
```

### 安全檢查
- [ ] Cookie 設定正確（SameSite/Secure）
- [ ] OAuth State 驗證正常
- [ ] Session Token 簽發與驗證正常
- [ ] DB 連接池正常
- [ ] 日誌輸出正常

---

## 總結

| 項目 | 修正前 | 修正後 | 風險等級 |
|------|--------|--------|---------|
| Cookie SameSite/Secure | 邏輯混亂 | 環境感知配置 | 🔴 高 |
| OAuth State | base64(redirectUri) | crypto.randomUUID() | 🔴 高 |
| Token 混用 | session JWT 去呼叫 OAuth API | 正確使用 accessToken | 🔴 高 |
| Session 驗證 | 過嚴（name 必須非空） | 合理（name 可選） | 🟡 中 |
| DB 初始化 | 直接傳字串 | 連接池管理 | 🟡 中 |
| Server 入口 | 兩個混淆入口 | 統一入口 | 🟡 中 |
| 日誌與錯誤處理 | 缺失 | 完整 logger | 🟢 低 |

所有修正已實作並可直接部署。
