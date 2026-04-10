import { z } from "zod";

export const supportedImageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const imageMimeTypeSchema = z.enum(supportedImageMimeTypes);
export type ImageMimeType = z.infer<typeof imageMimeTypeSchema>;

export const aiRecognizedIngredientSchema = z.object({
  name: z.string(),
  quantity: z.string(),
  unit: z.string(),
});

export const aiRecognizeIngredientsResultSchema = z.object({
  ingredients: z.array(aiRecognizedIngredientSchema),
  confidence: z.number(),
  notes: z.string().optional().default(""),
});

export type AIRecognizedIngredient = z.infer<typeof aiRecognizedIngredientSchema>;
export type AIRecognizeIngredientsResult = z.infer<
  typeof aiRecognizeIngredientsResultSchema
>;

export const aiRecipeRecommendationSchema = z.object({
  name: z.string(),
  description: z.string(),
  ingredients_used: z.array(z.string()),
  difficulty: z.enum(["easy", "medium", "hard"]),
  cookTime: z.number(),
  servings: z.number().optional().default(4),
});

export const aiRecipeRecommendationsResultSchema = z.object({
  recipes: z.array(aiRecipeRecommendationSchema),
});

export type AIRecipeRecommendation = z.infer<
  typeof aiRecipeRecommendationSchema
>;
export type AIRecipeRecommendationsResult = z.infer<
  typeof aiRecipeRecommendationsResultSchema
>;
