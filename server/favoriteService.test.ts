import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  getUserFavorites: vi.fn(),
  isFavorited: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import {
  addRecipeToFavorites,
  checkRecipeFavorite,
  getUserFavoritesList,
  removeRecipeFromFavorites,
} from "./services/favoriteService";

describe("favoriteService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a favorite recipe for the current user", async () => {
    await addRecipeToFavorites(7, 11, "Pasta", "/images/pasta.jpg", "rid-1");

    expect(dbMocks.addFavorite).toHaveBeenCalledWith(7, 11, "Pasta", "/images/pasta.jpg");
  });

  it("removes a favorite recipe for the current user", async () => {
    await removeRecipeFromFavorites(7, 11, "rid-2");

    expect(dbMocks.removeFavorite).toHaveBeenCalledWith(7, 11);
  });

  it("checks whether a recipe is favorited", async () => {
    dbMocks.isFavorited.mockResolvedValueOnce(true);

    await expect(checkRecipeFavorite(7, 11, "rid-3")).resolves.toBe(true);
    expect(dbMocks.isFavorited).toHaveBeenCalledWith(7, 11);
  });

  it("lists the current user's favorites", async () => {
    const favorites = [
      { id: 1, userId: 7, recipeId: 11, recipeName: "Pasta", recipeImage: null, createdAt: new Date() },
    ];
    dbMocks.getUserFavorites.mockResolvedValueOnce(favorites);

    await expect(getUserFavoritesList(7, "rid-4")).resolves.toEqual(favorites);
    expect(dbMocks.getUserFavorites).toHaveBeenCalledWith(7);
  });
});
