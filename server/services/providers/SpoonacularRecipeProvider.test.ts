import { afterEach, describe, expect, it, vi } from "vitest";
import { SpoonacularRecipeProvider } from "./SpoonacularRecipeProvider";
import { RECIPE_PLACEHOLDER_IMAGE } from "../../../shared/types";

describe("SpoonacularRecipeProvider mapping", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps complexSearch results into shared recipe summaries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 42,
              title: "Tomato Pasta",
              image: null,
              readyInMinutes: 18,
              servings: 3,
              sourceUrl: "https://example.com/tomato-pasta",
              cuisines: ["Italian"],
              diets: ["vegetarian"],
              nutrition: {
                nutrients: [{ name: "Calories", amount: 321.4, unit: "kcal" }],
              },
            },
          ],
          totalResults: 1,
        }),
      })
    );

    const provider = new SpoonacularRecipeProvider({ enabled: true, apiKey: "test-key" });
    const result = await provider.searchRecipes({ query: "pasta", offset: 0, limit: 12 });

    expect(result.totalResults).toBe(1);
    expect(result.results[0]).toMatchObject({
      id: 42,
      title: "Tomato Pasta",
      image: RECIPE_PLACEHOLDER_IMAGE,
      readyInMinutes: 18,
      servings: 3,
      calories: 321,
    });
  });

  it("maps recipe details into the shared details contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 7,
          title: "Veggie Soup",
          image: null,
          readyInMinutes: 45,
          servings: 4,
          sourceUrl: "https://example.com/veggie-soup",
          cuisines: ["American"],
          diets: ["vegan"],
          summary: "A hearty soup.",
          instructions: "Simmer everything.",
          extendedIngredients: [
            { id: 1, original: "2 carrots", name: "carrot", amount: 2, unit: "" },
          ],
          analyzedInstructions: [
            { name: "main", steps: [{ number: 1, step: "Add vegetables." }] },
          ],
          nutrition: {
            nutrients: [{ name: "Calories", amount: 200, unit: "kcal" }],
          },
        }),
      })
    );

    const provider = new SpoonacularRecipeProvider({ enabled: true, apiKey: "test-key" });
    const result = await provider.getRecipeDetails(7);

    expect(result).toMatchObject({
      id: 7,
      title: "Veggie Soup",
      image: RECIPE_PLACEHOLDER_IMAGE,
      summary: "A hearty soup.",
      instructions: "Simmer everything.",
    });
    expect(result?.extendedIngredients[0]).toMatchObject({
      name: "carrot",
      amount: 2,
    });
  });
});
