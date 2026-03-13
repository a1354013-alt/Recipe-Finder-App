# 部署驗證清單與測試指南

**目的**：確保應用在實際部署環境（HTTP/HTTPS/Proxy/OAuth）下穩定可用

---

## 一、環境配置驗證

### 1.1 環境變數檢查
```bash
# 檢查必要的環境變數
echo "DATABASE_URL: $DATABASE_URL"
echo "OAUTH_SERVER_URL: $OAUTH_SERVER_URL"
echo "JWT_SECRET: ${JWT_SECRET:0:10}..."
echo "VITE_APP_ID: $VITE_APP_ID"
echo "VITE_OAUTH_PORTAL_URL: $VITE_OAUTH_PORTAL_URL"
```

**必要變數清單**：
- ✅ DATABASE_URL（MySQL 連接字串）
- ✅ OAUTH_SERVER_URL（OAuth 伺服器地址）
- ✅ JWT_SECRET（Session JWT 簽名密鑰）
- ✅ VITE_APP_ID（OAuth 應用 ID）
- ✅ VITE_OAUTH_PORTAL_URL（OAuth 登入頁面）
- ✅ OWNER_OPEN_ID（應用擁有者 ID）
- ✅ OWNER_NAME（應用擁有者名稱）

### 1.2 資料庫連接測試
```bash
# 執行遷移
pnpm db:push

# 檢查表是否建立
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SHOW TABLES;"

# 應該看到 users 表
```

---

## 二、開發環境測試

### 2.1 啟動開發伺服器
```bash
pnpm install
pnpm db:push
pnpm dev
```

### 2.2 基礎功能測試

#### 2.2.1 健康檢查
```bash
curl http://localhost:3000/api/health
# 應該返回 200 OK
```

#### 2.2.2 OAuth 登入流程
```bash
# 1. 取得登入 URL
curl http://localhost:3000/api/oauth/login

# 2. 應該看到重導向到 OAuth server
# 3. 完成 OAuth 登入後回調到 /api/oauth/callback
# 4. 檢查 cookie 中是否有 session token
curl -v http://localhost:3000/api/oauth/callback?code=xxx&state=yyy
```

#### 2.2.3 Session 驗證
```bash
# 取得 session cookie
SESSION_COOKIE=$(curl -s -c - http://localhost:3000/api/oauth/callback | grep session)

# 使用 session cookie 訪問受保護資源
curl -b "$SESSION_COOKIE" http://localhost:3000/api/trpc/auth.me
# 應該返回當前用戶信息
```

---

## 三、Cookie & Session 測試

### 3.1 開發環境（HTTP）
```bash
# 檢查 cookie 屬性
curl -v http://localhost:3000/api/oauth/callback?code=xxx&state=yyy 2>&1 | grep -i "set-cookie"

# 應該看到：
# Set-Cookie: session=...; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000
```

### 3.2 生產環境（HTTPS）
```bash
# 通過 Proxy 測試（模擬生產環境）
curl -v https://yourdomain.com/api/oauth/callback \
  -H "x-forwarded-proto: https" \
  -H "x-forwarded-for: 127.0.0.1"

# 應該看到：
# Set-Cookie: session=...; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=31536000
```

---

## 四、OAuth State 安全性測試

### 4.1 State 格式驗證
```bash
# 取得登入 URL
LOGIN_URL=$(curl -s http://localhost:3000/api/oauth/login | jq -r '.url')

# 提取 state 參數
STATE=$(echo $LOGIN_URL | grep -oP 'state=\K[^&]+')

# 驗證 state 是否為有效 UUID
echo $STATE | grep -E '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
# 應該匹配
```

### 4.2 CSRF 防護測試
```bash
# 嘗試使用無效的 state
curl http://localhost:3000/api/oauth/callback?code=valid_code&state=invalid_state

# 應該返回 400 或 403 錯誤
```

---

## 五、Token 流程測試

### 5.1 OAuth Token 交換
```bash
# 模擬 OAuth 回調
curl -X POST http://localhost:3000/api/oauth/callback \
  -H "Content-Type: application/json" \
  -d '{
    "code": "auth_code_from_oauth_server",
    "state": "valid_state_from_cookie"
  }'

# 應該返回 session cookie
```

### 5.2 Session Token 驗證
```bash
# 使用 session cookie 訪問受保護資源
curl -b "session=<your_session_token>" http://localhost:3000/api/trpc/auth.me

# 應該返回用戶信息
# 不應該嘗試用 session token 去呼叫 OAuth server
```

---

## 六、資料庫連接池測試

### 6.1 連接池狀態
```bash
# 檢查連接池日誌
tail -f logs/app.log | grep "\[DB\]"

# 應該看到：
# [DB] Connection pool created successfully
# [DB] User upserted
```

### 6.2 並發連接測試
```bash
# 模擬並發請求
for i in {1..20}; do
  curl -b "session=<token>" http://localhost:3000/api/trpc/auth.me &
done
wait

# 應該都成功（連接池限制 10 個，隊列等待）
```

---

## 七、Proxy 環境測試

### 7.1 X-Forwarded-Proto 支援
```bash
# 模擬 Proxy 環境
curl -H "x-forwarded-proto: https" \
     -H "x-forwarded-for: 203.0.113.1" \
     http://localhost:3000/api/health

# 應該正確識別為 HTTPS 環境
```

### 7.2 Cookie Secure 標誌
```bash
# 檢查 cookie 是否正確設定 Secure 標誌
curl -v -H "x-forwarded-proto: https" \
     http://localhost:3000/api/oauth/callback 2>&1 | grep "Secure"

# 應該看到 Secure 標誌
```

---

## 八、錯誤處理與日誌測試

### 8.1 日誌輸出驗證
```bash
# 監控日誌
tail -f logs/app.log

# 應該看到結構化日誌：
# [2026-02-06T10:30:45.123Z] [INFO] [OAuth] Token exchange successful
# [2026-02-06T10:30:46.456Z] [WARN] [Auth] Session verification failed
```

### 8.2 錯誤恢復測試
```bash
# 模擬資料庫連接失敗
# 應用應該自動重連

# 模擬 OAuth server 超時
# 應該返回 500 錯誤，而非掛起

# 檢查日誌中是否有正確的錯誤記錄
```

---

## 九、生產環境部署清單

### 9.1 構建驗證
```bash
# 清理舊構建
rm -rf dist

# 構建應用
pnpm build

# 檢查構建產物
ls -la dist/
# 應該包含 index.js（打包後的伺服器）
```

### 9.2 啟動驗證
```bash
# 設定環境變數
export NODE_ENV=production
export DATABASE_URL="mysql://..."
export OAUTH_SERVER_URL="https://..."
export JWT_SECRET="..."

# 啟動應用
node dist/index.js

# 檢查啟動日誌
# 應該看到：
# [DB] Connection pool created successfully
# [OAuth] Initialized with baseURL: https://...
```

### 9.3 健康檢查
```bash
# 等待應用啟動（通常 2-5 秒）
sleep 5

# 執行健康檢查
curl https://yourdomain.com/api/health

# 應該返回 200 OK
```

---

## 十、性能與穩定性測試

### 10.1 負載測試
```bash
# 使用 Apache Bench 進行負載測試
ab -n 1000 -c 10 http://localhost:3000/api/health

# 應該看到：
# Requests per second: > 100
# Failed requests: 0
```

### 10.2 長時間運行測試
```bash
# 在後台運行應用 24 小時
nohup node dist/index.js > app.log 2>&1 &

# 定期檢查：
# - 記憶體使用是否穩定
# - 日誌中是否有異常
# - 連接池是否正常
```

---

## 十一、安全性驗證

### 11.1 HTTPS 強制
```bash
# 應該重導向到 HTTPS
curl -i http://yourdomain.com/api/health
# 應該返回 301/302 重導向
```

### 11.2 HSTS 頭部
```bash
# 檢查 HSTS 頭部
curl -i https://yourdomain.com/api/health | grep -i "strict-transport-security"
# 應該包含 HSTS 頭部
```

### 11.3 CORS 配置
```bash
# 檢查 CORS 頭部
curl -i -H "Origin: https://example.com" https://yourdomain.com/api/health
# 應該正確設定 CORS 頭部
```

---

## 十二、回滾計畫

### 12.1 快速回滾
```bash
# 如果新版本出現問題
# 1. 停止當前應用
systemctl stop recipe-finder

# 2. 恢復上一個版本
git checkout previous-version
pnpm build

# 3. 重啟應用
systemctl start recipe-finder

# 4. 驗證
curl https://yourdomain.com/api/health
```

### 12.2 資料庫回滾
```bash
# 如果資料庫遷移出現問題
# 1. 檢查遷移日誌
cat drizzle/migrations/

# 2. 手動回滾（如果需要）
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < rollback.sql

# 3. 重新執行遷移
pnpm db:push
```

---

## 十三、監控與告警

### 13.1 關鍵指標
- ✅ 應用啟動時間 < 5 秒
- ✅ OAuth 登入成功率 > 99%
- ✅ 資料庫查詢平均時間 < 100ms
- ✅ 記憶體使用 < 500MB
- ✅ CPU 使用 < 50%

### 13.2 告警規則
- ❌ 應用崩潰
- ❌ 資料庫連接失敗
- ❌ OAuth 伺服器無法連接
- ❌ 記憶體洩漏（持續增長）
- ❌ 錯誤率 > 1%

---

## 十四、故障排查

### 14.1 常見問題

**問題 1：Cookie 無法設定**
```
原因：SameSite/Secure 組合不正確
解決：檢查 server/_core/cookies.ts 中的邏輯
```

**問題 2：OAuth 登入失敗**
```
原因：State 驗證失敗或 token 交換失敗
解決：檢查日誌中的 [OAuth] 標籤
```

**問題 3：Session 過期太快**
```
原因：JWT 過期時間設定不正確
解決：檢查 ONE_YEAR_MS 常數
```

**問題 4：資料庫連接超時**
```
原因：連接池耗盡或連接失敗
解決：增加 connectionLimit 或檢查資料庫狀態
```

---

## 十五、交付清單

部署前，確保以下項目都已完成：

- [ ] 所有環境變數已配置
- [ ] 資料庫遷移已執行
- [ ] 應用已構建（`pnpm build`）
- [ ] 開發環境測試通過
- [ ] Cookie 設定正確
- [ ] OAuth State 驗證正常
- [ ] Token 流程正確
- [ ] 日誌輸出正常
- [ ] 錯誤處理完善
- [ ] 性能測試通過
- [ ] 安全性檢查通過
- [ ] 監控告警已配置
- [ ] 回滾計畫已準備

---

**最後檢查日期**：2026-02-06  
**檢查人員**：資深全端工程師  
**狀態**：✅ 已驗證，可部署
