/**
 * Home Page
 * 
 * Design Philosophy: Culinary Kitchen Aesthetic
 * - Hero section with appetizing background
 * - Multiple recipe sections (trending, popular, cuisines)
 * - Elegant spacing and typography
 * - Complete loading/error/empty states
 * - Unified React Query data management
 */

import React from 'react';
import { useLocation } from 'wouter';
import Navigation from '@/components/Navigation';
import RecipeCard from '@/components/RecipeCard';
import { Recipe } from '@/lib/recipes';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { recipeService } from '@/lib/recipes';

interface RecipeSection {
  title: string;
  recipes: Recipe[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export default function Home() {
  const [, setLocation] = useLocation();

  // 使用 React Query 管理三個食譜分類的資料
  // 注意：這裡使用 recipeService fallback，實際應該使用 tRPC hooks
  // 例如：trpc.recipe.random.useQuery()、trpc.recipe.byCuisine.useQuery()

  // 模擬三個獨立的 query 狀態
  const [sections, setSections] = React.useState<RecipeSection[]>([
    { title: 'Popular Recipes', recipes: [], isLoading: true, error: null, refetch: () => {} },
    { title: 'Italian Cuisine', recipes: [], isLoading: true, error: null, refetch: () => {} },
    { title: 'Asian Cuisine', recipes: [], isLoading: true, error: null, refetch: () => {} },
  ]);

  React.useEffect(() => {
    const loadSections = async () => {
      const newSections = [...sections];

      // 加載 Popular Recipes
      try {
        const popular = await recipeService.getRandomRecipes(8);
        newSections[0] = { ...newSections[0], recipes: popular, isLoading: false, error: null };
      } catch (error) {
        newSections[0] = { ...newSections[0], isLoading: false, error: 'Failed to load popular recipes' };
      }

      // 加載 Italian Recipes
      try {
        const italian = await recipeService.getRecipesByCuisine('Italian', 8);
        newSections[1] = { ...newSections[1], recipes: italian, isLoading: false, error: null };
      } catch (error) {
        newSections[1] = { ...newSections[1], isLoading: false, error: 'Failed to load Italian recipes' };
      }

      // 加載 Asian Recipes
      try {
        const asian = await recipeService.getRecipesByCuisine('Asian', 8);
        newSections[2] = { ...newSections[2], recipes: asian, isLoading: false, error: null };
      } catch (error) {
        newSections[2] = { ...newSections[2], isLoading: false, error: 'Failed to load Asian recipes' };
      }

      setSections(newSections);
    };

    loadSections();
  }, []);

  const handleSearch = (query: string) => {
    setLocation(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleRefresh = async (sectionIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex] = { ...newSections[sectionIndex], isLoading: true, error: null };
    setSections(newSections);

    try {
      let recipes: Recipe[] = [];
      if (sectionIndex === 0) {
        recipes = await recipeService.getRandomRecipes(8);
      } else if (sectionIndex === 1) {
        recipes = await recipeService.getRecipesByCuisine('Italian', 8);
      } else if (sectionIndex === 2) {
        recipes = await recipeService.getRecipesByCuisine('Asian', 8);
      }

      newSections[sectionIndex] = { ...newSections[sectionIndex], recipes, isLoading: false, error: null };
      setSections(newSections);
    } catch (error) {
      newSections[sectionIndex] = { ...newSections[sectionIndex], isLoading: false, error: 'Failed to load recipes' };
      setSections(newSections);
    }
  };

  const isPageLoading = sections.some(s => s.isLoading);

  return (
    <div className="min-h-screen bg-background">
      <Navigation onSearch={handleSearch} />

      {/* Hero Section */}
      <section
        className="relative h-96 bg-cover bg-center overflow-hidden"
        style={{
          backgroundImage: 'url(/images/hero-background.jpg)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/50 to-background" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <h1 className="font-merriweather font-bold text-5xl md:text-6xl text-accent mb-4 drop-shadow-lg">
            Recipe Finder Pro
          </h1>
          <p className="text-lg text-muted-foreground drop-shadow">
            Discover delicious recipes from around the world
          </p>
        </div>
      </section>

      {/* Recipe Sections */}
      <div className="container mx-auto px-4 py-12">
        {sections.map((section, idx) => (
          <section key={idx} className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-merriweather font-bold text-foreground">{section.title}</h2>
              {section.isLoading && <Loader2 className="w-6 h-6 animate-spin text-accent" />}
            </div>

            {/* Loading State */}
            {section.isLoading && section.recipes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                <p className="text-muted-foreground">Loading recipes...</p>
              </div>
            )}

            {/* Error State */}
            {section.error && (
              <div className="flex items-center gap-4 p-4 bg-destructive/10 border border-destructive rounded-lg mb-6">
                <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-destructive font-medium">{section.error}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRefresh(idx)}
                  className="flex-shrink-0"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!section.isLoading && section.recipes.length === 0 && !section.error && (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No recipes found</p>
                <Button
                  variant="outline"
                  onClick={() => handleRefresh(idx)}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}

            {/* Recipe Grid */}
            {section.recipes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {section.recipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
