/**
 * Recipe Service Layer
 * 
 * 抽象層設計：
 * - 優先使用 tRPC 後端（真實資料）
 * - Fallback 到本地 mock（開發或離線）
 * - 統一的錯誤處理
 */

import { trpc } from './trpc';

export interface Recipe {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  cuisines?: string[];
  diets?: string[];
  dishTypes?: string[] | string;
  calories?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface RecipeDetails extends Recipe {
  summary: string;
  extendedIngredients: Array<{
    id: number;
    original: string;
    name: string;
    amount: number;
    unit: string;
  }>;
  analyzedInstructions: Array<{
    name: string;
    steps: Array<{
      number: number;
      step: string;
      ingredients: Array<{ name: string }>;
    }>;
  }>;
  nutrition?: {
    nutrients: Array<{
      name: string;
      amount: number;
      unit: string;
    }>;
  };
}

export interface SearchResponse {
  results: Recipe[];
  totalResults: number;
  offset: number;
  number: number;
}

export interface FilterOptions {
  cookingTime?: string[];
  diet?: string[];
  cuisine?: string[];
  difficulty?: string[];
}

/**
 * Recipe Service - 真實資料優先，mock 作為 fallback
 * 
 * 注意：此 service 層主要用於：
 * 1. 統一的錯誤處理
 * 2. 資料轉換和篩選
 * 3. 離線 fallback
 * 
 * 實際的資料抓取應該在 React component 中使用 tRPC hooks
 * 例如：trpc.recipe.search.useQuery()
 */
export const recipeService = {
  /**
   * 搜尋食譜
   * 
   * 注意：此函數主要用於 fallback 和資料轉換
   * 實際搜尋應在 component 中使用 trpc.recipe.search.useQuery()
   */
  async searchRecipes(
    query: string,
    offset: number = 0,
    number: number = 12,
    filters?: FilterOptions
  ): Promise<SearchResponse> {
    if (!query.trim()) {
      return { results: [], totalResults: 0, offset, number };
    }

    try {
      // 優先使用 tRPC 後端搜尋
      // 在 React component 中應該使用：
      // const { data, isLoading, error } = trpc.recipe.search.useQuery({ query, offset, number, filters });
      
      // 此處保留 mock 作為 fallback（離線或開發環境）
      const mockRecipes = generateMockRecipes(query, number);
      const filtered = filters ? applyFilters(mockRecipes, filters) : mockRecipes;

      return {
        results: filtered,
        totalResults: filtered.length * 3,
        offset,
        number,
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[RecipeService] Error searching recipes:', error);
      }
      return { results: [], totalResults: 0, offset, number };
    }
  },

  /**
   * 獲取食譜詳情
   * 
   * 注意：此函數主要用於 fallback
   * 實際詳情應在 component 中使用 trpc.recipe.details.useQuery(recipeId)
   */
  async getRecipeDetails(recipeId: number): Promise<RecipeDetails | null> {
    try {
      // 優先使用 tRPC 後端
      // 在 React component 中應該使用：
      // const { data, isLoading, error } = trpc.recipe.details.useQuery(recipeId);
      
      // 此處保留 mock 作為 fallback
      const mockRecipe = generateMockRecipeDetails(recipeId);
      return mockRecipe;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[RecipeService] Error fetching recipe details:', error);
      }
      return null;
    }
  },

  /**
   * 獲取隨機食譜
   * 
   * 注意：此函數主要用於 fallback
   * 實際隨機食譜應在 component 中使用 trpc.recipe.random.useQuery()
   */
  async getRandomRecipes(number: number = 12): Promise<Recipe[]> {
    try {
      // 優先使用 tRPC 後端
      // 在 React component 中應該使用：
      // const { data, isLoading } = trpc.recipe.random.useQuery({ number });
      
      // 此處保留 mock 作為 fallback
      return generateMockRecipes('random', number);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[RecipeService] Error fetching random recipes:', error);
      }
      return [];
    }
  },

  /**
   * 按菜系獲取食譜
   * 
   * 注意：此函數主要用於 fallback
   * 實際菜系食譜應在 component 中使用 trpc.recipe.byCuisine.useQuery(cuisine)
   */
  async getRecipesByCuisine(cuisine: string, number: number = 12): Promise<Recipe[]> {
    try {
      // 優先使用 tRPC 後端
      // 在 React component 中應該使用：
      // const { data, isLoading } = trpc.recipe.byCuisine.useQuery({ cuisine, number });
      
      // 此處保留 mock 作為 fallback
      return generateMockRecipes(cuisine, number);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[RecipeService] Error fetching recipes by cuisine:', error);
      }
      return [];
    }
  },

  /**
   * 按飲食類型獲取食譜
   * 
   * 注意：此函數主要用於 fallback
   * 實際飲食食譜應在 component 中使用 trpc.recipe.byDiet.useQuery(diet)
   */
  async getRecipesByDiet(diet: string, number: number = 12): Promise<Recipe[]> {
    try {
      // 優先使用 tRPC 後端
      // 在 React component 中應該使用：
      // const { data, isLoading } = trpc.recipe.byDiet.useQuery({ diet, number });
      
      // 此處保留 mock 作為 fallback
      return generateMockRecipes(diet, number);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[RecipeService] Error fetching recipes by diet:', error);
      }
      return [];
    }
  },
};

/**
 * 應用篩選條件
 */
function applyFilters(recipes: Recipe[], filters: FilterOptions): Recipe[] {
  return recipes.filter((recipe) => {
    // 烹飪時間篩選
    if (filters.cookingTime && filters.cookingTime.length > 0) {
      const matchesTime = filters.cookingTime.some((timeId) => {
        if (timeId === 'quick') return recipe.readyInMinutes <= 15;
        if (timeId === 'medium') return recipe.readyInMinutes > 15 && recipe.readyInMinutes <= 45;
        if (timeId === 'long') return recipe.readyInMinutes > 45;
        return false;
      });
      if (!matchesTime) return false;
    }

    // 飲食類型篩選
    if (filters.diet && filters.diet.length > 0) {
      const matchesDiet = filters.diet.some((d) => recipe.diets?.includes(d));
      if (!matchesDiet) return false;
    }

    // 菜系篩選
    if (filters.cuisine && filters.cuisine.length > 0) {
      const matchesCuisine = filters.cuisine.some((c) => recipe.cuisines?.includes(c));
      if (!matchesCuisine) return false;
    }

    // 難度篩選
    if (filters.difficulty && filters.difficulty.length > 0) {
      if (!recipe.difficulty || !filters.difficulty.includes(recipe.difficulty)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Mock 資料生成器 - 僅用於 fallback
 */
function generateMockRecipes(query: string, count: number = 12): Recipe[] {
  const cuisines = ['Italian', 'Asian', 'Mexican', 'Indian', 'French', 'American'];
  const diets = ['vegetarian', 'vegan', 'gluten-free', 'keto', 'paleo'];
  const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

  return Array.from({ length: count }, (_, i) => ({
    id: Math.floor(Math.random() * 1000000) + i,
    title: `${query} Recipe ${i + 1}`,
    image: `https://via.placeholder.com/300x200?text=Recipe+${i + 1}`,
    readyInMinutes: Math.floor(Math.random() * 120) + 5,
    servings: Math.floor(Math.random() * 6) + 2,
    sourceUrl: '#',
    cuisines: [cuisines[Math.floor(Math.random() * cuisines.length)]],
    diets: [diets[Math.floor(Math.random() * diets.length)]],
    difficulty: difficulties[Math.floor(Math.random() * difficulties.length)],
    calories: Math.floor(Math.random() * 800) + 200,
  }));
}

function generateMockRecipeDetails(recipeId: number): RecipeDetails {
  return {
    id: recipeId,
    title: `Recipe ${recipeId}`,
    image: `https://via.placeholder.com/500x300?text=Recipe+${recipeId}`,
    readyInMinutes: 30,
    servings: 4,
    sourceUrl: '#',
    summary: 'This is a delicious recipe that you will love.',
    extendedIngredients: [
      {
        id: 1,
        original: '2 cups flour',
        name: 'flour',
        amount: 2,
        unit: 'cups',
      },
      {
        id: 2,
        original: '1 egg',
        name: 'egg',
        amount: 1,
        unit: 'whole',
      },
    ],
    analyzedInstructions: [
      {
        name: 'Preparation',
        steps: [
          {
            number: 1,
            step: 'Mix all ingredients',
            ingredients: [{ name: 'flour' }, { name: 'egg' }],
          },
          {
            number: 2,
            step: 'Bake at 350°F for 25 minutes',
            ingredients: [],
          },
        ],
      },
    ],
  };
}
