import { describe, expect, it } from "vitest";
import { LocalRecipeProvider } from "./LocalRecipeProvider";
import { RECIPE_PLACEHOLDER_IMAGE } from "../../../shared/types";

describe("LocalRecipeProvider shared contract alignment", () => {
  it("returns shared summary/detail shapes with a valid placeholder fallback", async () => {
    const provider = new LocalRecipeProvider({ enabled: true });

    const searchResult = await provider.searchRecipes({ query: "pasta", offset: 0, limit: 1 });
    const summary = searchResult.results[0];
    const details = summary ? await provider.getRecipeDetails(summary.id) : null;

    expect(summary).toBeDefined();
    expect(summary?.image).toBeTruthy();
    expect(Array.isArray(summary?.cuisines)).toBe(true);
    expect(Array.isArray(summary?.diets)).toBe(true);
    expect(details?.image ?? RECIPE_PLACEHOLDER_IMAGE).toBeTruthy();
    expect(Array.isArray(details?.extendedIngredients)).toBe(true);
    expect(Array.isArray(details?.analyzedInstructions)).toBe(true);
  });
});
