import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { aiConfigManager, type AIProvider } from "../../_core/aiConfig";
import { aiRateLimiter } from "../../_core/aiRateLimit";
import { auditLogManager } from "../../_core/auditLog";
import { logger } from "../../_core/logger";
import { storagePut } from "../../storage";
import {
  decodeAndValidateImageBuffer,
  getMimeTypeExtension,
  validateOllamaUrl,
} from "./guards";
import { ManusAiProvider } from "./providers/ManusAiProvider";
import { OllamaAiProvider } from "./providers/OllamaAiProvider";
import { ImageMimeType } from "./types";

type AuthenticatedUserId = string | number;

type RecognizeIngredientsInput = {
  userId: AuthenticatedUserId;
  imageBase64: string;
  mimeType: ImageMimeType;
  requestId?: string;
};

type RecipeRecommendationsInput = {
  userId: AuthenticatedUserId;
  ingredients: string[];
  maxRecipes: number;
  requestId?: string;
};

function getCurrentProvider() {
  const config = aiConfigManager.getConfig();

  if (config.provider === "ollama") {
    const { url, model } = aiConfigManager.getOllamaConfig();
    return new OllamaAiProvider(url, model);
  }

  return new ManusAiProvider();
}

async function ensureAiRateLimit(userId: AuthenticatedUserId, requestId?: string) {
  const { allowed, remaining, resetTime } = await aiRateLimiter.checkLimit(
    String(userId)
  );

  if (!allowed) {
    logger.warn(
      "[AI] Rate limit exceeded",
      { userId, remaining, resetTimeMs: resetTime },
      undefined,
      requestId
    );
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Try again in ${Math.ceil(
        (resetTime - Date.now()) / 1000
      )} seconds.`,
    });
  }
}

export async function recognizeIngredients(input: RecognizeIngredientsInput) {
  await ensureAiRateLimit(input.userId, input.requestId);

  const buffer = decodeAndValidateImageBuffer(
    input.imageBase64,
    input.mimeType,
    input.requestId
  );
  const extension = getMimeTypeExtension(input.mimeType);
  const fileKey = `ai-images/${nanoid()}${extension}`;
  const { url: imageUrl } = await storagePut(fileKey, buffer, input.mimeType);
  const provider = getCurrentProvider();
  const providerName = aiConfigManager.getProvider();

  const result =
    provider instanceof OllamaAiProvider
      ? await provider.recognizeIngredients(
          input.imageBase64,
          imageUrl,
          input.requestId
        )
      : await provider.recognizeIngredients(imageUrl);

  logger.info(
    "[AI] Ingredients recognized",
    { provider: providerName, userId: input.userId },
    undefined,
    input.requestId
  );

  auditLogManager.log({
    action: "ai_image_recognized",
    userId: input.userId,
    requestId: input.requestId,
    status: "success",
    metadata: { provider: providerName },
  }).catch((error: unknown) => {
    logger.warn(
      "[AI] Failed to write recognition audit log",
      { error: error instanceof Error ? error.message : String(error) },
      undefined,
      input.requestId
    );
  });

  return {
    success: true,
    ingredients: result.ingredients,
    confidence: result.confidence,
    notes: result.notes,
    imageUrl,
    provider: providerName,
  };
}

export async function getRecipeRecommendations(input: RecipeRecommendationsInput) {
  await ensureAiRateLimit(input.userId, input.requestId);

  const provider = getCurrentProvider();
  const providerName = aiConfigManager.getProvider();
  const result =
    provider instanceof OllamaAiProvider
      ? await provider.getRecipeRecommendations(
          input.ingredients,
          input.maxRecipes,
          input.requestId
        )
      : await provider.getRecipeRecommendations(input.ingredients, input.maxRecipes);

  logger.info(
    "[AI] Recipe recommendations generated",
    { provider: providerName, userId: input.userId },
    undefined,
    input.requestId
  );

  auditLogManager.log({
    action: "recipe_recommendation_requested",
    userId: input.userId,
    requestId: input.requestId,
    status: "success",
    metadata: { provider: providerName, ingredients: input.ingredients.length },
  }).catch((error: unknown) => {
    logger.warn(
      "[AI] Failed to write recommendation audit log",
      { error: error instanceof Error ? error.message : String(error) },
      undefined,
      input.requestId
    );
  });

  return {
    success: true,
    recipes: result.recipes,
    provider: providerName,
  };
}

export function getAiConfig() {
  return aiConfigManager.getConfig();
}

export async function setAiProvider(
  provider: AIProvider,
  userId: AuthenticatedUserId,
  requestId?: string
) {
  const oldProvider = aiConfigManager.getProvider();
  aiConfigManager.setProvider(provider);

  logger.info(
    "[AI] Provider changed",
    { provider, admin: userId },
    undefined,
    requestId
  );

  auditLogManager.log({
    action: "ai_provider_changed",
    userId,
    requestId,
    status: "success",
    metadata: { oldProvider, newProvider: provider },
  }).catch((error: unknown) => {
    logger.warn(
      "[AI] Failed to log provider change",
      { error: error instanceof Error ? error.message : String(error) },
      undefined,
      requestId
    );
  });

  return { success: true, provider };
}

export async function updateOllamaConfig(
  url: string,
  model: string,
  userId: AuthenticatedUserId,
  requestId?: string
) {
  const validation = validateOllamaUrl(url, requestId);
  if (!validation.valid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid Ollama URL: ${validation.error}`,
    });
  }

  aiConfigManager.setOllamaConfig(url, model);

  logger.info(
    "[AI] Ollama config updated",
    { url, model, admin: userId },
    undefined,
    requestId
  );

  auditLogManager.log({
    action: "ai_ollama_config_changed",
    userId,
    requestId,
    status: "success",
    metadata: { url, model },
  }).catch((error: unknown) => {
    logger.warn(
      "[AI] Failed to log Ollama config change",
      { error: error instanceof Error ? error.message : String(error) },
      undefined,
      requestId
    );
  });

  return { success: true, config: aiConfigManager.getOllamaConfig() };
}

export async function testOllamaConnection(
  url: string,
  userId: AuthenticatedUserId,
  requestId?: string
) {
  const validation = validateOllamaUrl(url, requestId);
  if (!validation.valid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid Ollama URL: ${validation.error}`,
    });
  }

  const currentConfig = aiConfigManager.getOllamaConfig();
  const provider = new OllamaAiProvider(url, currentConfig.model);

  try {
    const success = await provider.testConnection(requestId);
    const models = success ? await provider.getAvailableModels(requestId) : [];

    auditLogManager.log({
      action: "ai_ollama_test",
      userId,
      requestId,
      status: "success",
      metadata: { url, connected: success, models: models.length },
    }).catch((error: unknown) => {
      logger.warn(
        "[AI] Failed to log Ollama test",
        { error: error instanceof Error ? error.message : String(error) },
        undefined,
        requestId
      );
    });

    return { success, models };
  } catch (error) {
    logger.error(
      "[AI] Ollama connection test failed",
      error instanceof Error ? error : new Error(String(error)),
      undefined,
      requestId
    );

    return {
      success: false,
      models: [],
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}
