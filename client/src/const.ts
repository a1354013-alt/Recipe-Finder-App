export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * OAuth 登入端點
 * 
 * 修正邏輯：
 * - 後端 /api/oauth/login 生成 state 並儲存到 httpOnly cookie
 * - 後端直接 302 redirect 到 OAuth portal
 * - 前端只需導向此 URL
 */
export const LOGIN_URL = "/api/oauth/login";
