/**
 * Request ID 中間件
 * 
 * 功能：
 * - 為每個 request 分配唯一的 requestId
 * - 優先使用 client 帶來的 x-request-id（驗證格式）
 * - 將 requestId 存入 req.id（供後續中間件和路由使用）
 * - 將 requestId 存入 response header（方便前端追蹤）
 * 
 * 安全特性：
 * - x-request-id 只允許 [a-zA-Z0-9-_]{1,64}
 * - 格式不合法的 id 改用 UUID（避免注入攻擊）
 */

import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

/**
 * 驗證 x-request-id 格式
 * 只允許 [a-zA-Z0-9-_]{1,64}
 */
function isValidRequestId(id: string): boolean {
  return /^[a-zA-Z0-9\-_]{1,64}$/.test(id);
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let requestId: string;
  const clientRequestId = req.headers["x-request-id"] as string;

  // 若 client 帶來 x-request-id，驗證格式
  if (clientRequestId) {
    if (isValidRequestId(clientRequestId)) {
      requestId = clientRequestId;
    } else {
      // 格式不合法，改用 UUID（安全起見）
      requestId = randomUUID();
    }
  } else {
    // 無 x-request-id，生成新的 UUID
    requestId = randomUUID();
  }
  
  // 存入 req 物件供後續使用
  (req as any).id = requestId;
  
  // 設定 response header
  res.setHeader("x-request-id", requestId);
  
  next();
}

/**
 * 擴展 Express Request 型別
 */
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}
