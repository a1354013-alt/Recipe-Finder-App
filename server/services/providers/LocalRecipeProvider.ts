import recipeCatalog from "../../data/localRecipes.json";
import {
  RECIPE_PLACEHOLDER_IMAGE,
  RecipeDetails,
  RecipeSearchParams,
  RecipeSearchResult,
  RecipeSummary,
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
    const { query, offset = 0, limit = 12 } = params;
    const keyword = query.trim().toLowerCase();

    const filtered = keyword
      ? recipes.filter(recipe => {
          const haystack = [
            recipe.title,
            recipe.summary,
            recipe.instructions,
            recipe.cuisines.join(" "),
            recipe.diets.join(" "),
            recipe.extendedIngredients.map(ingredient => ingredient.name).join(" "),
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(keyword);
        })
      : recipes;

    return {
      results: filtered.slice(offset, offset + limit).map(toRecipeSummary),
      totalResults: filtered.length,
      offset,
      limit,
    };
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
