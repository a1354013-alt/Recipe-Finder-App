import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  delete process.env.SPOONACULAR_API_KEY;
});

describe("recipeService", () => {
  it("falls back to local catalog data when the API key is missing", async () => {
    delete process.env.SPOONACULAR_API_KEY;

    const { searchRecipes } = await import("./recipeService");
    const result = await searchRecipes({ query: "pasta", requestId: "rid-1" });

    expect(result.serviceStatus.status).toBe("missing_api_key");
    expect(result.serviceStatus.provider).toBe("local");
    expect(result.results.length).toBeGreaterThan(0);
  });

  it("returns local fallback data with api_error status when the remote provider fails", async () => {
    process.env.SPOONACULAR_API_KEY = "configured";

    vi.doMock("./providers/SpoonacularRecipeProvider", () => ({
      SpoonacularRecipeProvider: class {
        async isAvailable() {
          return true;
        }
        getName() {
          return "spoonacular";
        }
        async searchRecipes() {
          throw new Error("remote api failed");
        }
        async getRecipeDetails() {
          throw new Error("remote api failed");
        }
        async getRandomRecipes() {
          throw new Error("remote api failed");
        }
        async getRecipesByCuisine() {
          throw new Error("remote api failed");
        }
        async getRecipesByDiet() {
          throw new Error("remote api failed");
        }
      },
    }));

    const { searchRecipes } = await import("./recipeService");
    const result = await searchRecipes({ query: "pasta", requestId: "rid-2" });

    expect(result.serviceStatus.status).toBe("api_error");
    expect(result.serviceStatus.provider).toBe("local");
    expect(result.results.length).toBeGreaterThan(0);
  });
});
