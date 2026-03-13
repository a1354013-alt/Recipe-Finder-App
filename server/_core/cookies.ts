import type { CookieOptions, Request } from "express";

/**
 * 判斷請求是否為 HTTPS
 * 支援：
 * - req.protocol === "https"
 * - x-forwarded-proto header（Proxy / Load Balancer）
 * - x-forwarded-proto 可能為逗號分隔的多個值，取第一個
 */
function isSecureRequest(req: Request): boolean {
  // 直接 HTTPS 連接
  if (req.protocol === "https") return true;

  // 檢查 x-forwarded-proto header（Proxy / Load Balancer）
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  // 處理陣列或字串
  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  // 取第一個值，去除空白並轉小寫
  const firstProto = protoList[0]?.trim().toLowerCase();
  return firstProto === "https";
}

/**
 * 取得 Session Cookie 選項
 * 
 * 邏輯：
 * - 開發環境（非 HTTPS）：sameSite: "lax", secure: false
 * - 生產環境（HTTPS）：sameSite: "none", secure: true
 * - 禁止出現 sameSite=none 但 secure=false 的組合
 * 
 * @param req Express Request 物件
 * @returns Cookie 選項
 */
export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure"> {
  const isSecure = isSecureRequest(req);

  return {
    httpOnly: true,
    path: "/",
    // 開發環境使用 lax，生產環境使用 none
    sameSite: isSecure ? "none" : "lax",
    // 只有在 HTTPS 時才設定 secure: true
    secure: isSecure,
  };
}
