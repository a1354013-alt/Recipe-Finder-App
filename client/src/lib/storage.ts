/**
 * Local Storage Service
 * 
 * Manages ONLY UI preferences and non-critical data:
 * - Theme preferences
 * - Ratings and reviews (local only)
 * 
 * Product Data Persistence:
 * - Favorites: Use tRPC recipe.favorites.*
 * - Shopping Lists: Use tRPC recipe.shoppingLists.*
 * - AI History: Use tRPC recipe.aiHistory.*
 * 
 * This ensures single source of truth and cross-device sync
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
 * Stores user's local ratings and comments
 * Note: Server-side ratings can be implemented separately if needed
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
 * 
 * Stores user's light/dark theme preference
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
