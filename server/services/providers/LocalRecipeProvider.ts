import recipeCatalog from "../../data/localRecipes.json";
import {
  RECIPE_PLACEHOLDER_IMAGE,
  RecipeDetails,
  RecipeSearchFilters,
  RecipeSearchParams,
  RecipeSearchResult,
  RecipeSummary,
  RecipeDifficultyFilter,
} from "../../../shared/types";
import { BaseRecipeProvider } from "./RecipeProvider";

function normalizeRecipe<T extends RecipeSummary | RecipeDetails>(recipe: T): T {
  return {
    ...recipe,
    image: recipe.image || RECIPE_PLACEHOLDER_IMAGE,
  };
}

const recipes = (recipeCatalog.recipes as RecipeDetails[]).map(normalizeRecipe);

export class LocalRecipeProvider extends BaseRecipeProvider {
  getName(): string {
    return "local";
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async searchRecipes(params: RecipeSearchParams): Promise<RecipeSearchResult> {
    const { query, offset = 0, limit = 12, filters } = params;
    const keyword = query.trim().toLowerCase();

    const filteredRecipes = (keyword
      ? recipes.filter((recipe) => {
          const haystack = [
            recipe.title,
            recipe.summary,
            recipe.instructions,
            recipe.cuisines.join(" "),
            recipe.diets.join(" "),
            recipe.extendedIngredients.map((ingredient) => ingredient.name).join(" "),
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(keyword);
        })
      : recipes
    ).filter((recipe) => this.applyFilters(recipe, filters));

    return {
      results: filteredRecipes.slice(offset, offset + limit).map(toRecipeSummary),
      totalResults: filteredRecipes.length,
      offset,
      limit,
    };
  }

  private applyFilters(recipe: RecipeDetails, filters?: RecipeSearchFilters): boolean {
    if (!filters) {
      return true;
    }

    if (filters.difficulty?.length) {
      if (!recipe.difficulty) {
        return false;
      }
      if (!filters.difficulty.includes(recipe.difficulty.toLowerCase() as RecipeDifficultyFilter)) {
        return false;
      }
    }

    if (filters.diets?.length) {
      const lowerDiets = recipe.diets.map((diet) => diet.toLowerCase());
      if (!filters.diets.some((diet) => lowerDiets.includes(diet.toLowerCase()))) {
        return false;
      }
    }

    if (filters.cookingTime?.length) {
      const time = recipe.readyInMinutes ?? 0;
      const matchesTime = filters.cookingTime.some((window) => {
        switch (window) {
          case "quick":
            return time <= 15;
          case "medium":
            return time > 15 && time <= 45;
          case "long":
            return time > 45;
          default:
            return true;
        }
      });
      if (!matchesTime) {
        return false;
      }
    }

    if (filters.calories?.length) {
      const calories = recipe.calories ?? 0;
      const matchesCalories = filters.calories.some((category) => {
        switch (category) {
          case "low":
            return calories > 0 && calories <= 300;
          case "medium":
            return calories > 300 && calories <= 600;
          case "high":
            return calories > 600;
          default:
            return true;
        }
      });
      if (!matchesCalories) {
        return false;
      }
    }

    return true;
  }

  async getRecipeDetails(recipeId: number): Promise<RecipeDetails | null> {
    return recipes.find(recipe => recipe.id === recipeId) ?? null;
  }

  async getRandomRecipes(count: number): Promise<RecipeSummary[]> {
    return recipes.slice(0, count).map(toRecipeSummary);
  }

  async getRecipesByCuisine(cuisine: string, count: number): Promise<RecipeSummary[]> {
    return recipes
      .filter(recipe =>
        recipe.cuisines.some(item => item.toLowerCase() === cuisine.trim().toLowerCase())
      )
      .slice(0, count)
      .map(toRecipeSummary);
  }

  async getRecipesByDiet(diet: string, count: number): Promise<RecipeSummary[]> {
    return recipes
      .filter(recipe =>
        recipe.diets.some(item => item.toLowerCase() === diet.trim().toLowerCase())
      )
      .slice(0, count)
      .map(toRecipeSummary);
  }
}

function toRecipeSummary(recipe: RecipeDetails): RecipeSummary {
  const { summary, instructions, extendedIngredients, analyzedInstructions, nutrition, ...summaryFields } = recipe;
  return summaryFields;
}
