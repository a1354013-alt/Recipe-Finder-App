import { TRPCError } from "@trpc/server";
import { logger } from "../../_core/logger";
import { ImageMimeType } from "./types";

const OLLAMA_ALLOWED_HOSTS = (
  process.env.OLLAMA_ALLOWED_HOSTS || "localhost,127.0.0.1"
)
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

export function getMimeTypeExtension(mimeType: ImageMimeType): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
  }
}

export function decodeAndValidateImageBuffer(
  imageBase64: string,
  mimeType: ImageMimeType,
  requestId?: string
): Buffer {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(imageBase64)) {
    logger.warn("[AI] Invalid base64 format", { mimeType }, undefined, requestId);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid base64 format",
    });
  }

  let buffer: Buffer;

  try {
    buffer = Buffer.from(imageBase64, "base64");
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Failed to decode base64 image",
    });
  }

  if (buffer.length > 5 * 1024 * 1024) {
    logger.warn(
      "[AI] Image too large after decoding",
      { size: buffer.length, limit: 5 * 1024 * 1024 },
      undefined,
      requestId
    );
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message: "Image size exceeds 5MB limit after decoding",
    });
  }

  validateImageMagicNumber(buffer, mimeType, requestId);
  return buffer;
}

export function validateImageMagicNumber(
  buffer: Buffer,
  mimeType: ImageMimeType,
  requestId?: string
): void {
  if (buffer.length < 4) {
    logger.warn(
      "[AI] Image buffer too small",
      { size: buffer.length, mimeType },
      undefined,
      requestId
    );
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Image data is too small or corrupted",
    });
  }

  const magic = buffer.slice(0, 12);
  let isValid = false;

  switch (mimeType) {
    case "image/jpeg":
      isValid = magic[0] === 0xff && magic[1] === 0xd8 && magic[2] === 0xff;
      break;
    case "image/png":
      isValid =
        magic[0] === 0x89 &&
        magic[1] === 0x50 &&
        magic[2] === 0x4e &&
        magic[3] === 0x47;
      break;
    case "image/webp":
      isValid =
        magic[0] === 0x52 &&
        magic[1] === 0x49 &&
        magic[2] === 0x46 &&
        magic[3] === 0x46 &&
        magic[8] === 0x57 &&
        magic[9] === 0x45 &&
        magic[10] === 0x42 &&
        magic[11] === 0x50;
      break;
  }

  if (!isValid) {
    logger.warn(
      "[AI] Image magic number mismatch",
      { mimeType, magic: magic.slice(0, 4).toString("hex") },
      undefined,
      requestId
    );
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Image format does not match declared mimeType: ${mimeType}`,
    });
  }
}

export function validateOllamaUrl(
  url: string,
  requestId?: string
): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        valid: false,
        error: "Only http:// and https:// protocols are allowed",
      };
    }

    const hostname = parsed.hostname || "";

    if (!OLLAMA_ALLOWED_HOSTS.includes(hostname)) {
      logger.warn(
        "[Ollama] URL hostname not in allowlist",
        { hostname, allowlist: OLLAMA_ALLOWED_HOSTS },
        undefined,
        requestId
      );
      return {
        valid: false,
        error: `Hostname '${hostname}' is not in the allowed list`,
      };
    }

    const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipRegex);

    if (ipMatch) {
      const [, a, b, c, d] = ipMatch.map(Number);

      if (a === 169 && b === 254) {
        return {
          valid: false,
          error: "Link-local addresses (169.254.x.x) are not allowed",
        };
      }

      if (a === 0 && b === 0 && c === 0 && d === 0) {
        return { valid: false, error: "0.0.0.0 is not allowed" };
      }

      if (a === 10) {
        return { valid: false, error: "Private network 10.x.x.x is not allowed" };
      }

      if (a === 172 && b >= 16 && b <= 31) {
        return {
          valid: false,
          error: "Private network 172.16-31.x.x is not allowed",
        };
      }

      if (a === 192 && b === 168) {
        return {
          valid: false,
          error: "Private network 192.168.x.x is not allowed",
        };
      }
    }

    return { valid: true };
  } catch (error) {
    logger.warn(
      "[Ollama] Invalid URL format",
      { url, error: error instanceof Error ? error.message : String(error) },
      undefined,
      requestId
    );
    return {
      valid: false,
      error: "Invalid URL format",
    };
  }
}
