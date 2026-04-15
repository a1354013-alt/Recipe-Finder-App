export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

export type AuditLog = {
  id: number;
  action: string;
  userId: number | null;
  requestId: string | null;
  status: "success" | "failure";
  metadata: string | null;
  details: string | null;
  timestamp: Date;
  createdAt: Date;
};

export type Favorite = {
  id: number;
  userId: number;
  recipeId: number;
  recipeName: string;
  recipeImage: string | null;
  createdAt: Date;
};

export type ShoppingList = {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ShoppingListItem = {
  id: number;
  shoppingListId: number;
  ingredient: string;
  quantity: string | null;
  unit: string | null;
  checked: number;
  createdAt: Date;
};

export type AIRecognitionHistory = {
  id: number;
  userId: number;
  imageUrl: string;
  recognizedIngredients: string;
  recommendedRecipes: string | null;
  requestId: string | null;
  createdAt: Date;
};
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

export type RecipeCookingTimeFilter = "quick" | "medium" | "long";
export type RecipeCaloriesFilter = "low" | "medium" | "high";
export type RecipeDifficultyFilter = "easy" | "medium" | "hard";

export interface RecipeSearchFilters {
  cookingTime?: RecipeCookingTimeFilter[];
  calories?: RecipeCaloriesFilter[];
  difficulty?: RecipeDifficultyFilter[];
  diets?: string[];
}

export interface AIRecognizedIngredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface RecipeSearchParams {
  query: string;
  offset?: number;
  limit?: number;
  filters?: RecipeSearchFilters;
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
  recognizedIngredients: AIRecognizedIngredient[];
  recommendedRecipes: string[];
  requestId: AIRecognitionHistory["requestId"];
  createdAt: AIRecognitionHistory["createdAt"];
}
