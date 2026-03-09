/**
 * Local Storage Service
 * 
 * Manages user preferences and data persistence:
 * - Favorite recipes
 * - Ratings and reviews
 * - Shopping lists
 * - Theme preferences
 */

export interface FavoriteRecipe {
  id: number;
  title: string;
  image: string;
  addedAt: number;
}

export interface RecipeRating {
  recipeId: number;
  rating: number; // 1-5
  comment: string;
  ratedAt: number;
}

export interface ShoppingListItem {
  id: string;
  ingredient: string;
  amount: number;
  unit: string;
  recipeId: number;
  recipeName: string;
  checked: boolean;
}

export interface ShoppingList {
  id: string;
  items: ShoppingListItem[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEYS = {
  FAVORITES: 'recipe_favorites',
  RATINGS: 'recipe_ratings',
  SHOPPING_LISTS: 'recipe_shopping_lists',
  THEME: 'recipe_theme',
};

/**
 * Favorite Recipes Management
 */
export const FavoritesStorage = {
  get(): FavoriteRecipe[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  add(recipe: Omit<FavoriteRecipe, 'addedAt'>): void {
    const favorites = this.get();
    const exists = favorites.some((f) => f.id === recipe.id);
    if (!exists) {
      favorites.push({
        ...recipe,
        addedAt: Date.now(),
      });
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    }
  },

  remove(recipeId: number): void {
    const favorites = this.get().filter((f) => f.id !== recipeId);
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  },

  isFavorite(recipeId: number): boolean {
    return this.get().some((f) => f.id === recipeId);
  },

  toggle(recipe: Omit<FavoriteRecipe, 'addedAt'>): boolean {
    if (this.isFavorite(recipe.id)) {
      this.remove(recipe.id);
      return false;
    } else {
      this.add(recipe);
      return true;
    }
  },
};

/**
 * Recipe Ratings and Reviews Management
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
 * Shopping List Management
 */
export const ShoppingListStorage = {
  getAll(): ShoppingList[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SHOPPING_LISTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  get(listId: string): ShoppingList | null {
    return this.getAll().find((l) => l.id === listId) || null;
  },

  create(items: Omit<ShoppingListItem, 'id'>[]): ShoppingList {
    const lists = this.getAll();
    const newList: ShoppingList = {
      id: `list_${Date.now()}`,
      items: items.map((item, index) => ({
        ...item,
        id: `item_${Date.now()}_${index}`,
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    lists.push(newList);
    localStorage.setItem(STORAGE_KEYS.SHOPPING_LISTS, JSON.stringify(lists));
    return newList;
  },

  update(listId: string, items: ShoppingListItem[]): void {
    const lists = this.getAll();
    const list = lists.find((l) => l.id === listId);
    if (list) {
      list.items = items;
      list.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEYS.SHOPPING_LISTS, JSON.stringify(lists));
    }
  },

  toggleItem(listId: string, itemId: string): void {
    const lists = this.getAll();
    const list = lists.find((l) => l.id === listId);
    if (list) {
      const item = list.items.find((i) => i.id === itemId);
      if (item) {
        item.checked = !item.checked;
        list.updatedAt = Date.now();
        localStorage.setItem(STORAGE_KEYS.SHOPPING_LISTS, JSON.stringify(lists));
      }
    }
  },

  delete(listId: string): void {
    const lists = this.getAll().filter((l) => l.id !== listId);
    localStorage.setItem(STORAGE_KEYS.SHOPPING_LISTS, JSON.stringify(lists));
  },

  deleteItem(listId: string, itemId: string): void {
    const lists = this.getAll();
    const list = lists.find((l) => l.id === listId);
    if (list) {
      list.items = list.items.filter((i) => i.id !== itemId);
      list.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEYS.SHOPPING_LISTS, JSON.stringify(lists));
    }
  },

  export(listId: string): string {
    const list = this.get(listId);
    if (!list) return '';

    let text = `Shopping List\n`;
    text += `Created: ${new Date(list.createdAt).toLocaleDateString()}\n`;
    text += `\n`;

    list.items.forEach((item) => {
      const checked = item.checked ? '✓' : '☐';
      text += `${checked} ${item.ingredient} - ${item.amount} ${item.unit}\n`;
    });

    return text;
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
