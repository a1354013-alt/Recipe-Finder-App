/**
 * Local Storage Service
 * 
 * Manages ONLY UI preferences and non-critical data:
 * - Theme preferences
 * - Ratings and reviews (local only)
 * 
 * IMPORTANT: Favorites and Shopping Lists are now backend-persisted via tRPC
 * Do NOT use localStorage for product data - use tRPC instead:
 * - Favorites: trpc.recipe.favorites.*
 * - Shopping Lists: trpc.recipe.shoppingLists.*
 */

export interface RecipeRating {
  recipeId: number;
  rating: number; // 1-5
  comment: string;
  ratedAt: number;
}

const STORAGE_KEYS = {
  RATINGS: 'recipe_ratings',
  THEME: 'recipe_theme',
};

/**
 * Recipe Ratings and Reviews Management (Local Only)
 * 
 * Note: This is for local user ratings/comments
 * Server-side ratings should be implemented separately if needed
 */
export const RatingsStorage = {
  get(recipeId: number): RecipeRating | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RATINGS);
      const ratings = data ? JSON.parse(data) : [];
      return ratings.find((r: RecipeRating) => r.recipeId === recipeId) || null;
    } catch {
      return null;
    }
  },

  getAll(): RecipeRating[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RATINGS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  save(rating: RecipeRating): void {
    const ratings = this.getAll();
    const index = ratings.findIndex((r) => r.recipeId === rating.recipeId);
    if (index > -1) {
      ratings[index] = rating;
    } else {
      ratings.push(rating);
    }
    localStorage.setItem(STORAGE_KEYS.RATINGS, JSON.stringify(ratings));
  },

  delete(recipeId: number): void {
    const ratings = this.getAll().filter((r) => r.recipeId !== recipeId);
    localStorage.setItem(STORAGE_KEYS.RATINGS, JSON.stringify(ratings));
  },
};

/**
 * Theme Preference Management
 */
export const ThemeStorage = {
  get(): 'light' | 'dark' {
    try {
      const theme = localStorage.getItem(STORAGE_KEYS.THEME);
      return (theme as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  },

  set(theme: 'light' | 'dark'): void {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  toggle(): 'light' | 'dark' {
    const current = this.get();
    const next = current === 'light' ? 'dark' : 'light';
    this.set(next);
    return next;
  },
};

/**
 * DEPRECATED: FavoritesStorage
 * 
 * This has been moved to backend persistence via tRPC
 * Use: trpc.recipe.favorites.list / add / remove / check
 * 
 * @deprecated Use tRPC recipe.favorites.* instead
 */
export const FavoritesStorage = {
  get(): never[] {
    console.warn('[DEPRECATED] FavoritesStorage.get() - Use tRPC recipe.favorites.list instead');
    return [];
  },

  add(): void {
    console.warn('[DEPRECATED] FavoritesStorage.add() - Use tRPC recipe.favorites.add instead');
  },

  remove(): void {
    console.warn('[DEPRECATED] FavoritesStorage.remove() - Use tRPC recipe.favorites.remove instead');
  },

  isFavorite(): boolean {
    console.warn('[DEPRECATED] FavoritesStorage.isFavorite() - Use tRPC recipe.favorites.check instead');
    return false;
  },

  toggle(): boolean {
    console.warn('[DEPRECATED] FavoritesStorage.toggle() - Use tRPC recipe.favorites.add/remove instead');
    return false;
  },
};

/**
 * DEPRECATED: ShoppingListStorage
 * 
 * This has been moved to backend persistence via tRPC
 * Use: trpc.recipe.shoppingLists.list / create / items / addItem / updateItemStatus / delete
 * 
 * @deprecated Use tRPC recipe.shoppingLists.* instead
 */
export const ShoppingListStorage = {
  getAll(): never[] {
    console.warn('[DEPRECATED] ShoppingListStorage.getAll() - Use tRPC recipe.shoppingLists.list instead');
    return [];
  },

  get(): null {
    console.warn('[DEPRECATED] ShoppingListStorage.get() - Use tRPC recipe.shoppingLists.items instead');
    return null;
  },

  create(): never {
    console.warn('[DEPRECATED] ShoppingListStorage.create() - Use tRPC recipe.shoppingLists.create instead');
    throw new Error('Use tRPC recipe.shoppingLists.create instead');
  },

  update(): void {
    console.warn('[DEPRECATED] ShoppingListStorage.update() - Use tRPC recipe.shoppingLists.updateItemStatus instead');
  },

  toggleItem(): void {
    console.warn('[DEPRECATED] ShoppingListStorage.toggleItem() - Use tRPC recipe.shoppingLists.updateItemStatus instead');
  },

  delete(): void {
    console.warn('[DEPRECATED] ShoppingListStorage.delete() - Use tRPC recipe.shoppingLists.delete instead');
  },

  deleteItem(): void {
    console.warn('[DEPRECATED] ShoppingListStorage.deleteItem() - Use tRPC recipe.shoppingLists.deleteItem instead');
  },

  export(): string {
    console.warn('[DEPRECATED] ShoppingListStorage.export() - Implement export via tRPC instead');
    return '';
  },
};
