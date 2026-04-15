import { beforeEach, describe, expect, it, vi } from "vitest";

const recipeServiceMocks = vi.hoisted(() => ({
  searchRecipes: vi.fn(),
  getRecipeDetails: vi.fn(),
  getRandomRecipes: vi.fn(),
  getRecipesByCuisine: vi.fn(),
  getRecipesByDiet: vi.fn(),
}));

vi.mock("./services/recipeService", () => recipeServiceMocks);

import { appRouter } from "./routers";
import { createAuthenticatedContext } from "./testUtils";

describe("recipe router contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards search input and returns service output", async () => {
    const expected = {
      results: [{ id: 1, title: "Pasta", image: "/img.jpg", readyInMinutes: 30, servings: 2, sourceUrl: "", cuisines: [], diets: [] }],
      totalResults: 1,
      offset: 4,
      limit: 8,
      serviceStatus: { status: "available", provider: "local" },
    };
    recipeServiceMocks.searchRecipes.mockResolvedValueOnce(expected);

    const caller = appRouter.createCaller(createAuthenticatedContext());
    const result = await caller.recipe.search({ query: "pasta", offset: 4, limit: 8 });

    expect(recipeServiceMocks.searchRecipes).toHaveBeenCalledWith({
      query: "pasta",
      offset: 4,
      limit: 8,
      requestId: "test-request-id",
    });
    expect(result).toEqual(expected);
  });

  it("returns recipe details from the service", async () => {
    const expected = {
      data: {
        id: 1,
        title: "Soup",
        image: "/img.jpg",
        readyInMinutes: 25,
        servings: 4,
        sourceUrl: "",
        cuisines: ["American"],
        diets: ["vegetarian"],
        summary: "summary",
        instructions: "instructions",
        extendedIngredients: [],
        analyzedInstructions: [],
      },
      serviceStatus: { status: "available", provider: "local" },
    };
    recipeServiceMocks.getRecipeDetails.mockResolvedValueOnce(expected);

    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.recipe.details({ recipeId: 1 })).resolves.toEqual(expected);
    expect(recipeServiceMocks.getRecipeDetails).toHaveBeenCalledWith(1, "test-request-id");
  });

  it("returns random recipes from the service", async () => {
    const expected = {
      data: [{ id: 1, title: "Random", image: "/img.jpg", readyInMinutes: 20, servings: 2, sourceUrl: "", cuisines: [], diets: [] }],
      serviceStatus: { status: "available", provider: "local" },
    };
    recipeServiceMocks.getRandomRecipes.mockResolvedValueOnce(expected);

    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.recipe.random({ number: 3 })).resolves.toEqual(expected);
    expect(recipeServiceMocks.getRandomRecipes).toHaveBeenCalledWith(3, "test-request-id");
  });

  it("returns cuisine-filtered recipes from the service", async () => {
    const expected = {
      data: [{ id: 2, title: "Ramen", image: "/img.jpg", readyInMinutes: 15, servings: 2, sourceUrl: "", cuisines: ["Japanese"], diets: [] }],
      serviceStatus: { status: "available", provider: "local" },
    };
    recipeServiceMocks.getRecipesByCuisine.mockResolvedValueOnce(expected);

    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(
      caller.recipe.byCuisine({ cuisine: "Japanese", number: 2 })
    ).resolves.toEqual(expected);
    expect(recipeServiceMocks.getRecipesByCuisine).toHaveBeenCalledWith(
      "Japanese",
      2,
      "test-request-id"
    );
  });

  it("returns diet-filtered recipes from the service", async () => {
    const expected = {
      data: [{ id: 3, title: "Salad", image: "/img.jpg", readyInMinutes: 10, servings: 1, sourceUrl: "", cuisines: [], diets: ["vegan"] }],
      serviceStatus: { status: "available", provider: "local" },
    };
    recipeServiceMocks.getRecipesByDiet.mockResolvedValueOnce(expected);

    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.recipe.byDiet({ diet: "vegan", number: 2 })).resolves.toEqual(expected);
    expect(recipeServiceMocks.getRecipesByDiet).toHaveBeenCalledWith(
      "vegan",
      2,
      "test-request-id"
    );
  });
});
