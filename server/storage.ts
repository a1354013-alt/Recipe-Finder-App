// Preconfigured storage helpers for Manus WebDev templates
// Uses the Biz-provided storage proxy (Authorization: Bearer <token>)

import { ENV } from './_core/env';
import { httpFetch } from './_core/http';

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const result = await httpFetch<{ url: string }>(downloadApiUrl.toString(), {
    method: "GET",
    headers: buildAuthHeaders(apiKey) as Record<string, string>,
  });
  
  // 明確分類錯誤
  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      throw new Error(`Storage authentication failed: ${result.status}`);
    }
    if (result.status === 404) {
      throw new Error(`Storage file not found: ${result.status}`);
    }
    if (result.status >= 500) {
      throw new Error(`Storage service error: ${result.status}`);
    }
    throw new Error(`Storage download URL failed with status ${result.status}`);
  }
  
  if (!result.data?.url) {
    throw new Error("Storage download URL response missing 'url' field");
  }
  
  return result.data.url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  // 移除前導斜線
  let normalized = relKey.replace(/^\/+/, "");
  
  // 防止路徑穿越
  if (normalized.includes("..") || normalized.includes("\\") || normalized.includes("//")) {
    throw new Error(`Invalid file path: path traversal detected in "${relKey}"`);
  }
  
  return normalized;
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const result = await httpFetch<{ url: string }>(uploadUrl.toString(), {
    method: "POST",
    headers: buildAuthHeaders(apiKey) as Record<string, string>,
    body: formData as any,
    maxRetries: 1, // 上傳失敗可以重試一次
  });
  
  // 明確分類錯誤
  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      throw new Error(`Storage authentication failed: ${result.status}`);
    }
    if (result.status === 413) {
      throw new Error(`File too large: ${result.status}`);
    }
    if (result.status >= 500) {
      throw new Error(`Storage service error: ${result.status}`);
    }
    throw new Error(`Storage upload failed with status ${result.status}`);
  }
  
  if (!result.data?.url) {
    throw new Error("Storage upload response missing 'url' field");
  }
  
  const url = result.data.url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}
