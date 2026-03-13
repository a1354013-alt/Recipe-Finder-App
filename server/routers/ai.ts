/**
 * AI Router - Image Recognition & Recipe Recommendation
 * Supports both Manus AI and local Ollama
 * 
 * 安全特性：
 * - recognizeIngredients / getRecipeRecommendations：protectedProcedure（已登入）
 * - setProvider / setOllamaConfig / testOllamaConnection：adminProcedure（管理員只）
 * - Ollama URL 驗證：SSRF 防護（allowlist + 禁止私有網段）
 * - 圖片上傳限制：8MB base64 上限 + mimeType 驗證
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { createOllamaClient } from "../_core/ollama";
import { aiConfigManager } from "../_core/aiConfig";
import { logger } from "../_core/logger";
import { aiRateLimiter } from "../_core/aiRateLimit";
import {
  auditAIProviderChanged,
  auditAIOllamaConfigChanged,
  auditAIOllamaTest,
  auditAIRateLimitExceeded,
  auditAIImageRecognized,
  auditRecipeRecommendationRequested,
} from "../_core/auditLog";

// Ollama 允許的 hosts（可從環境變數讀取）
const OLLAMA_ALLOWED_HOSTS = (process.env.OLLAMA_ALLOWED_HOSTS || "localhost,127.0.0.1")
  .split(",")
  .map(h => h.trim());

/**
 * MIME type 到副檔名映射
 */
function getMimeTypeExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return ".jpg";
  }
}

/**
 * 驗證圖片 magic number（檔案頭）跟 mimeType 是否一致
 * JPEG: FF D8 FF
 * PNG: 89 50 4E 47
 * WebP: 52 49 46 46 ... 57 45 42 50
 */
function validateImageMagicNumber(buffer: Buffer, mimeType: string, requestId?: string): void {
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
      isValid = magic[0] === 0xFF && magic[1] === 0xD8 && magic[2] === 0xFF;
      break;
    case "image/png":
      isValid = magic[0] === 0x89 && magic[1] === 0x50 && magic[2] === 0x4E && magic[3] === 0x47;
      break;
    case "image/webp":
      isValid = magic[0] === 0x52 && magic[1] === 0x49 && magic[2] === 0x46 && magic[3] === 0x46 &&
                magic[8] === 0x57 && magic[9] === 0x45 && magic[10] === 0x42 && magic[11] === 0x50;
      break;
  }

  if (!isValid) {
    logger.warn(
      "[AI] Image magic number mismatch",
      { mimeType, magic: magic.slice(0, 4).toString('hex') },
      undefined,
      requestId
    );
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Image format does not match declared mimeType: ${mimeType}`,
    });
  }
}

/**
 * 驗證 Ollama URL 安全性（SSRF 防護）
 * 
 * 檢查項：
 * 1. 必須是 http:// 或 https://
 * 2. 主機必須在 allowlist 中
 * 3. 禁止私有網段（169.254.x.x、0.0.0.0、10.x.x.x、172.16-31.x.x、192.168.x.x）
 */
function validateOllamaUrl(url: string, requestId?: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // 檢查協議
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        valid: false,
        error: "Only http:// and https:// protocols are allowed",
      };
    }

    const hostname = parsed.hostname || "";

    // 檢查 allowlist
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

    // 檢查私有網段和 metadata 服務
    const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipRegex);

    if (ipMatch) {
      const [, a, b, c, d] = ipMatch.map(Number);

      // 禁止 169.254.x.x（link-local 和 metadata）
      if (a === 169 && b === 254) {
        logger.warn(
          "[Ollama] Rejected link-local address",
          { hostname },
          undefined,
          requestId
        );
        return {
          valid: false,
          error: "Link-local addresses (169.254.x.x) are not allowed",
        };
      }

      // 禁止 0.0.0.0
      if (a === 0 && b === 0 && c === 0 && d === 0) {
        logger.warn(
          "[Ollama] Rejected 0.0.0.0",
          { hostname },
          undefined,
          requestId
        );
        return {
          valid: false,
          error: "0.0.0.0 is not allowed",
        };
      }

      // 禁止 10.x.x.x
      if (a === 10) {
        logger.warn(
          "[Ollama] Rejected private network 10.x.x.x",
          { hostname },
          undefined,
          requestId
        );
        return {
          valid: false,
          error: "Private network 10.x.x.x is not allowed",
        };
      }

      // 禁止 172.16-31.x.x
      if (a === 172 && b >= 16 && b <= 31) {
        logger.warn(
          "[Ollama] Rejected private network 172.16-31.x.x",
          { hostname },
          undefined,
          requestId
        );
        return {
          valid: false,
          error: "Private network 172.16-31.x.x is not allowed",
        };
      }

      // 禁止 192.168.x.x
      if (a === 192 && b === 168) {
        logger.warn(
          "[Ollama] Rejected private network 192.168.x.x",
          { hostname },
          undefined,
          requestId
        );
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

/**
 * Helper function to recognize ingredients using selected AI provider
 */
async function recognizeIngredientsWithProvider(
  imageUrl: string,
  imageBase64?: string
): Promise<any> {
  const config = aiConfigManager.getConfig();

  if (config.provider === 'ollama') {
    const ollamaConfig = aiConfigManager.getOllamaConfig();
    const ollamaClient = createOllamaClient(ollamaConfig.url, ollamaConfig.model);
    return await ollamaClient.recognizeIngredients(imageBase64 || '', imageUrl);
  } else {
    // Use Manus AI (default)
    // @ts-ignore
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an expert food and ingredient recognition AI. Analyze the provided image URL and identify all visible food ingredients. Return a JSON object with ingredients array.",
        },
        {
          role: "user",
          content: `Please identify all the ingredients visible in this image: ${imageUrl}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ingredient_recognition",
          strict: true,
          schema: {
            type: "object",
            properties: {
              ingredients: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    quantity: { type: "string" },
                    unit: { type: "string" },
                  },
                  required: ["name", "quantity", "unit"],
                  additionalProperties: false,
                },
              },
              confidence: { type: "number" },
              notes: { type: "string" },
            },
            required: ["ingredients", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    return JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
  }
}

/**
 * Helper function to get recipe recommendations using selected AI provider
 */
async function getRecipeRecommendationsWithProvider(
  ingredients: string[],
  maxRecipes: number
): Promise<any> {
  const config = aiConfigManager.getConfig();
  const ingredientsList = ingredients.join(", ");

  if (config.provider === 'ollama') {
    const ollamaConfig = aiConfigManager.getOllamaConfig();
    const ollamaClient = createOllamaClient(ollamaConfig.url, ollamaConfig.model);
    return await ollamaClient.getRecipeRecommendations(ingredients, maxRecipes);
  } else {
    // Use Manus AI (default)
    // @ts-ignore
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a creative culinary expert. Given a list of ingredients, suggest delicious recipes. Return a JSON object with recipes array.",
        },
        {
          role: "user",
          content: `I have these ingredients: ${ingredientsList}. Please suggest ${maxRecipes} recipes.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "recipe_recommendations",
          strict: true,
          schema: {
            type: "object",
            properties: {
              recipes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    ingredients_used: {
                      type: "array",
                      items: { type: "string" },
                    },
                    difficulty: {
                      type: "string",
                      enum: ["easy", "medium", "hard"],
                    },
                    cookTime: { type: "number" },
                    servings: { type: "number" },
                  },
                  required: ["name", "description", "ingredients_used", "difficulty", "cookTime"],
                  additionalProperties: false,
                },
              },
            },
            required: ["recipes"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    return JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
  }
}

export const aiRouter = router({
  /**
   * Recognize ingredients from an uploaded image
   * Requires authentication to prevent abuse
   * 
   * 安全限制：
   * - imageBase64 最多 8MB（上傳 DoS 防護）
   * - mimeType 只允許 image/jpeg, image/png, image/webp
   */
  recognizeIngredients: protectedProcedure
    .input(
      z.object({
        imageBase64: z.string().max(8 * 1024 * 1024, "Image must be less than 8MB"),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).default("image/jpeg"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Per-user rate limit 検查
        const { allowed, remaining, resetTime } = await aiRateLimiter.checkLimit(String(ctx.user.id));
        if (!allowed) {
        logger.warn(
          "[AI] Rate limit exceeded",
          { userId: ctx.user.id, remaining, resetTimeMs: resetTime },
          undefined,
          String(ctx.requestId)
        );
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Rate limit exceeded. Try again in ${Math.ceil((resetTime - Date.now()) / 1000)} seconds.`,
          });
        }

        // 驗證 base64 格式（只允許有效的 base64 字元）
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(input.imageBase64)) {
          logger.warn(
            "[AI] Invalid base64 format",
            { userId: ctx.user.id },
            undefined,
            String(ctx.requestId)
          );
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid base64 format",
          });
        }

        // 驗證 base64 大小
        let buffer: Buffer;
        try {
          buffer = Buffer.from(input.imageBase64, "base64");
        } catch (error) {
          logger.warn(
            "[AI] Failed to decode base64",
            { userId: ctx.user.id },
            undefined,
            String(ctx.requestId)
          );
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
            String(ctx.requestId)
          );
          throw new TRPCError({
            code: "PAYLOAD_TOO_LARGE",
            message: "Image size exceeds 5MB limit after decoding",
          });
        }

        // 驗證 mime magic number
        validateImageMagicNumber(buffer, input.mimeType, String(ctx.requestId));

        // 根據 mimeType 取得正確的副檔名
        const extension = getMimeTypeExtension(input.mimeType);
        const fileKey = `ai-images/${nanoid()}${extension}`;
        
        const { url: imageUrl } = await storagePut(
          fileKey,
          buffer,
          input.mimeType
        );

        const result = await recognizeIngredientsWithProvider(imageUrl, input.imageBase64);
        
        logger.info(
          "[AI] Ingredients recognized",
          { provider: aiConfigManager.getProvider(), userId: ctx.user?.id },
          undefined,
          ctx.requestId
        );

        return {
          success: true,
          ingredients: result.ingredients,
          confidence: result.confidence,
          notes: result.notes,
          imageUrl,
          provider: aiConfigManager.getProvider(),
        };
      } catch (error) {
        // 若已經是 TRPCError，直接拋出
        if (error instanceof TRPCError) {
          throw error;
        }

        logger.error(
          "[AI] Error recognizing ingredients",
          error instanceof Error ? error : new Error(String(error)),
          undefined,
          ctx.requestId
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to recognize ingredients",
        });
      }
    }),

  /**
   * Get recipe recommendations based on ingredients
   * Requires authentication to prevent abuse
   */
  getRecipeRecommendations: protectedProcedure
    .input(
      z.object({
        ingredients: z.array(
          z.string()
            .min(1, "Ingredient cannot be empty")
            .max(50, "Ingredient must be at most 50 characters")
            .transform(s => s.trim())
        )
          .min(1, "At least one ingredient required")
          .max(30, "Maximum 30 ingredients allowed"),
        maxRecipes: z.number()
          .int("maxRecipes must be an integer")
          .min(1, "maxRecipes must be at least 1")
          .max(10, "maxRecipes must be at most 10")
          .default(5),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Per-user rate limit 檢查
        const { allowed, remaining, resetTime } = await aiRateLimiter.checkLimit(String(ctx.user.id));
        if (!allowed) {
          logger.warn(
            "[AI] Rate limit exceeded",
            { userId: ctx.user.id, remaining, resetTimeMs: resetTime },
            undefined,
            String(ctx.requestId)
          );
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Rate limit exceeded. Try again in ${Math.ceil((resetTime - Date.now()) / 1000)} seconds.`,
          });
        }

        const result = await getRecipeRecommendationsWithProvider(
          input.ingredients,
          input.maxRecipes
        );
        
        logger.info(
          "[AI] Recipe recommendations generated",
          { provider: aiConfigManager.getProvider(), userId: ctx.user?.id },
          undefined,
          ctx.requestId
        );

        return {
          success: true,
          recipes: result.recipes,
          provider: aiConfigManager.getProvider(),
        };
      } catch (error) {
        // 保留 TRPCError，避免錯誤型別失真（例如 TOO_MANY_REQUESTS 變成 500）
        if (error instanceof TRPCError) {
          throw error;
        }
        
        // 記錄詳細錯誤到 log（內部用），但不回傳給前端
        const message = error instanceof Error ? error.message : String(error);
        logger.error(
          "[AI] Error getting recipe recommendations",
          { error: message },
          undefined,
          ctx.requestId
        );
        
        // Production 隱藏內部細節，只回傳通用訊息
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: process.env.NODE_ENV === "production" 
            ? "Failed to get recommendations" 
            : `Failed to get recommendations: ${message}`,
        });
      }
    }),

  /**
   * Get current AI provider configuration
   */
  getConfig: publicProcedure.query(() => {
    return aiConfigManager.getConfig();
  }),

  /**
   * Set AI provider (Manus or Ollama)
   * ⚠️ Admin only - prevents unauthorized provider switching
   */
  setProvider: adminProcedure
    .input(z.object({ provider: z.enum(['manus', 'ollama']) }))
    .mutation(async ({ input, ctx }) => {
      const oldProvider = aiConfigManager.getProvider();
      logger.info(
        "[AI] Provider changed",
        { provider: input.provider, admin: ctx.user?.id },
        undefined,
        ctx.requestId
      );
      aiConfigManager.setProvider(input.provider);

      // 記錄 audit log（非同步，不阻塞回應）
      auditAIProviderChanged(
        ctx.user.id,
        ctx.requestId,
        oldProvider,
        input.provider
      ).catch(err => {
        logger.warn(
          "[AI] Failed to log provider change",
          { error: err instanceof Error ? err.message : String(err) },
          String(ctx.requestId)
        );
      });

      return { success: true, provider: input.provider };
    }),

  /**
   * Update Ollama configuration
   * ⚠️ Admin only - SSRF 防護已啟用
   * 
   * URL 驗證：
   * - 只允許 http:// 和 https://
   * - 主機必須在 allowlist（OLLAMA_ALLOWED_HOSTS）
   * - 禁止私有網段和 metadata 服務
   */
  setOllamaConfig: adminProcedure
    .input(
      z.object({
        url: z.string().url("Invalid URL format"),
        model: z.string().min(1, "Model name required"),
      })
    )
    .mutation(({ input, ctx }) => {
      // SSRF 防護驗證
      const validation = validateOllamaUrl(input.url, ctx.requestId);
      if (!validation.valid) {
      logger.warn(
        "[AI] Ollama URL validation failed",
        { url: input.url, error: validation.error, admin: ctx.user?.id },
        String(ctx.requestId)
      );
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid Ollama URL: ${validation.error}`,
        });
      }

       const oldConfig = aiConfigManager.getOllamaConfig();
      logger.info(
        "[AI] Ollama config updated",
        { url: input.url, model: input.model, admin: ctx.user?.id },
        undefined,
        ctx.requestId
      );
      aiConfigManager.setOllamaConfig(input.url, input.model);

      // Record audit log (async, non-blocking)
      auditAIOllamaConfigChanged(
        ctx.user.id,
        ctx.requestId,
        oldConfig.url,
        input.url
      ).catch(err => {
      logger.warn(
        "[AI] Failed to log Ollama config change",
        { error: err instanceof Error ? err.message : String(err) },
        String(ctx.requestId)
      );
      });

      return { success: true, config: aiConfigManager.getOllamaConfig() };
    }),

  /**
   * Test Ollama connection
   * ⚠️ Admin only - SSRF 防護已啟用
   * 
   * URL 驗證同 setOllamaConfig
   */
  testOllamaConnection: adminProcedure
    .input(z.object({ url: z.string().url("Invalid URL format") }))
    .mutation(async ({ input, ctx }) => {
      // SSRF 防護驗證
      const validation = validateOllamaUrl(input.url, ctx.requestId);
      if (!validation.valid) {
        logger.warn(
          "[AI] Ollama connection test - URL validation failed",
          { url: input.url, error: validation.error, admin: ctx.user?.id },
          undefined,
          ctx.requestId
        );
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid Ollama URL: ${validation.error}`,
        });
      }

      try {
        logger.info(
          "[AI] Testing Ollama connection",
          { url: input.url, admin: ctx.user?.id },
          undefined,
          ctx.requestId
        );

        const client = createOllamaClient(input.url);
        const isConnected = await client.testConnection();
        const models = isConnected ? await client.getAvailableModels() : [];

        logger.info(
          "[AI] Ollama connection test completed",
          { url: input.url, connected: isConnected, models: models.length },
          undefined,
          ctx.requestId
        );

        // Record audit log (async, non-blocking)
        auditAIOllamaTest(
          ctx.user.id,
          ctx.requestId,
          isConnected
        ).catch(err => {
          logger.warn(
            "[AI] Failed to log Ollama test",
            { error: err instanceof Error ? err.message : String(err) },
            String(ctx.requestId)
          );
        });

        return { success: isConnected, models };
      } catch (error) {
        logger.error(
          "[AI] Ollama connection test failed",
          error instanceof Error ? error : new Error(String(error)),
          undefined,
          ctx.requestId
        );
        return {
          success: false,
          models: [],
          error: error instanceof Error ? error.message : "Connection failed",
        };
      }
    }),
});
