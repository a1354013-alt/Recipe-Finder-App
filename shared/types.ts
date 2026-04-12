import type {
  AIRecognitionHistory,
  Favorite,
  ShoppingList,
  ShoppingListItem,
} from "../drizzle/schema";

export type * from "../drizzle/schema";
export * from "./_core/errors";

export const RECIPE_PLACEHOLDER_IMAGE = "/images/recipe-placeholder.svg";

export interface RecipeIngredient {
  id: number;
  original: string;
  name: string;
  amount: number;
  unit: string;
}

export interface RecipeInstructionStep {
  number: number;
  step: string;
  ingredients?: Array<{ id: number; name: string }>;
  equipment?: Array<{ id: number; name: string }>;
}

export interface RecipeNutritionNutrient {
  name: string;
  amount: number;
  unit: string;
  percentOfDailyNeeds?: number;
}

export interface RecipeSummary {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  cuisines: string[];
  diets: string[];
  difficulty?: "easy" | "medium" | "hard";
  calories?: number;
}

export interface RecipeDetails extends RecipeSummary {
  summary: string;
  instructions: string;
  extendedIngredients: RecipeIngredient[];
  analyzedInstructions: Array<{
    name: string;
    steps: RecipeInstructionStep[];
  }>;
  nutrition?: {
    nutrients?: RecipeNutritionNutrient[];
  };
}

export interface RecipeSearchResult {
  results: RecipeSummary[];
  totalResults: number;
  offset: number;
  limit: number;
}

export interface RecipeSearchParams {
  query: string;
  offset?: number;
  number?: number;
  filters?: {
    cookingTime?: string[];
    calories?: string[][];
    difficulty?: string[];
    diets?: string[];
  };
  requestId?: string;
}

export type RecipeProviderType = "local" | "spoonacular";
export type RecipeServiceStatus = "available" | "missing_api_key" | "api_error" | "unavailable";

export interface RecipeServiceInfo {
  status: RecipeServiceStatus;
  provider: RecipeProviderType;
  message?: string;
  requestId?: string;
}

export interface RecipeSearchResultWithStatus extends RecipeSearchResult {
  serviceStatus: RecipeServiceInfo;
}

export interface RecipeCollectionWithStatus {
  data: RecipeSummary[];
  serviceStatus: RecipeServiceInfo;
}

export interface RecipeDetailsWithStatus {
  data: RecipeDetails | null;
  serviceStatus: RecipeServiceInfo;
}

export interface FavoriteListItem extends Favorite {}

export interface ShoppingListSummary {
  id: ShoppingList["id"];
  userId: ShoppingList["userId"];
  name: ShoppingList["name"];
  description: ShoppingList["description"];
  createdAt: ShoppingList["createdAt"];
  updatedAt: ShoppingList["updatedAt"];
  itemCount: number;
}

export type ShoppingListItemRecord = Omit<ShoppingListItem, "checked"> & {
  checked: boolean;
};

export interface AIHistoryRecord {
  id: AIRecognitionHistory["id"];
  userId: AIRecognitionHistory["userId"];
  imageUrl: AIRecognitionHistory["imageUrl"];
  recognizedIngredients: string[];
  recommendedRecipes: string[];
  requestId: AIRecognitionHistory["requestId"];
  createdAt: AIRecognitionHistory["createdAt"];
}
