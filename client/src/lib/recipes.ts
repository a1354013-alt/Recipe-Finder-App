/**
 * Recipe API Service Module
 * Uses free public APIs for recipe data
 * 
 * Design Philosophy: Culinary Kitchen Aesthetic
 * - Clean, organized API layer
 * - Type-safe responses
 * - Error handling for graceful degradation
 * - Advanced filtering support
 */

// Using Open Recipe API (free, no key required)
// const RECIPE_API_BASE = 'https://api.spoonacular.com/recipes';
// const RECIPE_API_KEY = 'demo'; // Using demo mode for free access

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
  calories?: string[];
  difficulty?: string[];
  diets?: string[];
}

/**
 * Search recipes by query with optional filters
 */
export async function searchRecipes(
  query: string,
  offset: number = 0,
  number: number = 12,
  filters?: FilterOptions
): Promise<SearchResponse> {
  if (!query.trim()) {
    return { results: [], totalResults: 0, offset, number };
  }

  try {
    // Generate mock recipes
    let mockRecipes = generateMockRecipes(query, number);

    // Apply filters
    if (filters) {
      mockRecipes = applyFilters(mockRecipes, filters);
    }

    return {
      results: mockRecipes,
      totalResults: mockRecipes.length * 3,
      offset,
      number,
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error searching recipes:', error);
    }
    return { results: [], totalResults: 0, offset, number };
  }
}

/**
 * Get recipe details by ID
 */
export async function getRecipeDetails(recipeId: number): Promise<RecipeDetails | null> {
  try {
    // Mock recipe details for demonstration
    const mockRecipe = generateMockRecipeDetails(recipeId);
    return mockRecipe;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error fetching recipe details:', error);
    }
    return null;
  }
}

/**
 * Get random recipes
 */
export async function getRandomRecipes(number: number = 12): Promise<Recipe[]> {
  try {
    return generateMockRecipes('random', number);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error fetching random recipes:', error);
    }
    return [];
  }
}

/**
 * Get recipes by cuisine
 */
export async function getRecipesByCuisine(
  cuisine: string,
  number: number = 12
): Promise<Recipe[]> {
  try {
    return generateMockRecipes(cuisine, number);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error fetching recipes by cuisine:', error);
    }
    return [];
  }
}

/**
 * Get recipes by diet
 */
export async function getRecipesByDiet(diet: string, number: number = 12): Promise<Recipe[]> {
  try {
    return generateMockRecipes(diet, number);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error fetching recipes by diet:', error);
    }
    return [];
  }
}

/**
 * Apply filters to recipes
 */
function applyFilters(recipes: Recipe[], filters: FilterOptions): Recipe[] {
  return recipes.filter((recipe) => {
    // Cooking time filter
    if (filters.cookingTime && filters.cookingTime.length > 0) {
      const matchesTime = filters.cookingTime.some((timeId) => {
        if (timeId === 'quick') return recipe.readyInMinutes <= 15;
        if (timeId === 'medium') return recipe.readyInMinutes > 15 && recipe.readyInMinutes <= 45;
        if (timeId === 'long') return recipe.readyInMinutes > 45;
        return false;
      });
      if (!matchesTime) return false;
    }

    // Calorie filter
    if (filters.calories && filters.calories.length > 0 && recipe.calories) {
      const matchesCalories = filters.calories.some((calId) => {
        if (calId === 'low') return recipe.calories! < 300;
        if (calId === 'medium') return recipe.calories! >= 300 && recipe.calories! <= 600;
        if (calId === 'high') return recipe.calories! > 600;
        return false;
      });
      if (!matchesCalories) return false;
    }

    // Difficulty filter
    if (filters.difficulty && filters.difficulty.length > 0) {
      const matchesDifficulty = filters.difficulty.includes(recipe.difficulty || 'easy');
      if (!matchesDifficulty) return false;
    }

    // Diet filter
    if (filters.diets && filters.diets.length > 0) {
      const recipeDiets = (recipe.diets || []).map((d) => d.toLowerCase());
      const matchesDiet = filters.diets.some((diet) => {
        const dietLower = diet.toLowerCase();
        return recipeDiets.some((d) => d.includes(dietLower));
      });
      if (!matchesDiet) return false;
    }

    return true;
  });
}

// Mock data generators for demonstration
function generateMockRecipes(query: string, count: number): Recipe[] {
  const recipes: Recipe[] = [];
  const cuisines = ['Italian', 'Asian', 'Mexican', 'French', 'Indian', 'Mediterranean'];
  const diets = ['Vegetarian', 'Vegan', 'Gluten Free', 'Dairy Free', 'Keto'];
  const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

  for (let i = 0; i < count; i++) {
    recipes.push({
      id: Math.floor(Math.random() * 1000000),
      title: `${query} Recipe ${i + 1}`,
      image: `/images/featured-recipe-hero.jpg`,
      readyInMinutes: Math.floor(Math.random() * 120) + 15,
      servings: Math.floor(Math.random() * 6) + 2,
      sourceUrl: 'https://example.com',
      cuisines: [cuisines[Math.floor(Math.random() * cuisines.length)]],
      diets: [diets[Math.floor(Math.random() * diets.length)]],
      dishTypes: [(['main course', 'side dish', 'dessert'] as const)[Math.floor(Math.random() * 3)]],
      calories: Math.floor(Math.random() * 800) + 150,
      difficulty: difficulties[Math.floor(Math.random() * difficulties.length)],
    });
  }

  return recipes;
}

function generateMockRecipeDetails(recipeId: number): RecipeDetails {
  return {
    id: recipeId,
    title: `Delicious Recipe ${recipeId}`,
    image: `/images/featured-recipe-hero.jpg`,
    readyInMinutes: 45,
    servings: 4,
    sourceUrl: 'https://example.com',
    calories: 350,
    difficulty: 'medium',
    summary:
      'This is a delicious and easy-to-prepare recipe that combines fresh ingredients with simple cooking techniques.',
    cuisines: ['Italian'],
    diets: ['Vegetarian'],
    extendedIngredients: [
      {
        id: 1,
        original: '2 cups fresh tomatoes',
        name: 'tomatoes',
        amount: 2,
        unit: 'cups',
      },
      {
        id: 2,
        original: '3 cloves garlic, minced',
        name: 'garlic',
        amount: 3,
        unit: 'cloves',
      },
      {
        id: 3,
        original: '1/4 cup fresh basil',
        name: 'basil',
        amount: 0.25,
        unit: 'cup',
      },
      {
        id: 4,
        original: '2 tablespoons olive oil',
        name: 'olive oil',
        amount: 2,
        unit: 'tablespoons',
      },
      {
        id: 5,
        original: 'Salt and pepper to taste',
        name: 'salt and pepper',
        amount: 1,
        unit: 'to taste',
      },
    ],
    analyzedInstructions: [
      {
        name: '',
        steps: [
          {
            number: 1,
            step: 'Heat olive oil in a large pan over medium heat.',
            ingredients: [],
          },
          {
            number: 2,
            step: 'Add minced garlic and cook until fragrant, about 1 minute.',
            ingredients: [],
          },
          {
            number: 3,
            step: 'Add fresh tomatoes and simmer for 15-20 minutes.',
            ingredients: [],
          },
          {
            number: 4,
            step: 'Stir in fresh basil and season with salt and pepper.',
            ingredients: [],
          },
          {
            number: 5,
            step: 'Serve hot and enjoy!',
            ingredients: [],
          },
        ],
      },
    ],
    nutrition: {
      nutrients: [
        { name: 'Calories', amount: 350, unit: 'kcal' },
        { name: 'Protein', amount: 8, unit: 'g' },
        { name: 'Carbohydrates', amount: 25, unit: 'g' },
        { name: 'Fat', amount: 12, unit: 'g' },
        { name: 'Fiber', amount: 4, unit: 'g' },
      ],
    },
  };
}
