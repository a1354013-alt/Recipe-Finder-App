import { z } from "zod";
import {
  adminProcedure,
  protectedProcedure,
  router,
} from "../_core/trpc";
import {
  getAiConfig,
  getRecipeRecommendations,
  recognizeIngredients,
  setAiProvider,
  testOllamaConnection,
  updateOllamaConfig,
} from "../services/ai/aiService";
import { imageMimeTypeSchema } from "../services/ai/types";

export const aiRouter = router({
  recognizeIngredients: protectedProcedure
    .input(
      z.object({
        imageBase64: z
          .string()
          .max(8 * 1024 * 1024, "Image must be less than 8MB"),
        mimeType: imageMimeTypeSchema.default("image/jpeg"),
      })
    )
    .mutation(async ({ input, ctx }) =>
      recognizeIngredients({
        userId: ctx.user.id,
        imageBase64: input.imageBase64,
        mimeType: input.mimeType,
        requestId: ctx.requestId,
      })
    ),

  getRecipeRecommendations: protectedProcedure
    .input(
      z.object({
        ingredients: z
          .array(
            z
              .string()
              .min(1, "Ingredient cannot be empty")
              .max(50, "Ingredient must be at most 50 characters")
              .transform((value) => value.trim())
          )
          .min(1, "At least one ingredient required")
          .max(30, "Maximum 30 ingredients allowed"),
        maxRecipes: z
          .number()
          .int("maxRecipes must be an integer")
          .min(1, "maxRecipes must be at least 1")
          .max(10, "maxRecipes must be at most 10")
          .default(5),
      })
    )
    .mutation(async ({ input, ctx }) =>
      getRecipeRecommendations({
        userId: ctx.user.id,
        ingredients: input.ingredients,
        maxRecipes: input.maxRecipes,
        requestId: ctx.requestId,
      })
    ),

  getConfig: adminProcedure.query(() => getAiConfig()),

  setProvider: adminProcedure
    .input(z.object({ provider: z.enum(["manus", "ollama"]) }))
    .mutation(async ({ input, ctx }) =>
      setAiProvider(input.provider, ctx.user.id, ctx.requestId)
    ),

  setOllamaConfig: adminProcedure
    .input(
      z.object({
        url: z.string().url("Invalid URL format"),
        model: z.string().min(1, "Model name required"),
      })
    )
    .mutation(async ({ input, ctx }) =>
      updateOllamaConfig(input.url, input.model, ctx.user.id, ctx.requestId)
    ),

  testOllamaConnection: adminProcedure
    .input(z.object({ url: z.string().url("Invalid URL format") }))
    .mutation(async ({ input, ctx }) =>
      testOllamaConnection(input.url, ctx.user.id, ctx.requestId)
    ),
});
