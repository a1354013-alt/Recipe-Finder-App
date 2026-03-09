/**
 * Home Page
 * 
 * Design Philosophy: Culinary Kitchen Aesthetic
 * - Hero section with appetizing background
 * - Multiple recipe sections (trending, popular, cuisines)
 * - Elegant spacing and typography
 * - Smooth loading states
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import Navigation from '@/components/Navigation';
import RecipeCard from '@/components/RecipeCard';
import { Recipe, getRandomRecipes, getRecipesByCuisine } from '@/lib/recipes';
import { Loader2 } from 'lucide-react';

export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading: authLoading, error, isAuthenticated, logout } = useAuth();

  const [, setLocation] = useLocation();
  const [popularRecipes, setPopularRecipes] = useState<Recipe[]>([]);
  const [italianRecipes, setItalianRecipes] = useState<Recipe[]>([]);
  const [asianRecipes, setAsianRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [popular, italian, asian] = await Promise.all([
          getRandomRecipes(8),
          getRecipesByCuisine('Italian', 8),
          getRecipesByCuisine('Asian', 8),
        ]);
        setPopularRecipes(popular);
        setItalianRecipes(italian);
        setAsianRecipes(asian);
      } catch (error) {
        console.error('Error fetching recipes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = (query: string) => {
    setLocation(`/search?q=${encodeURIComponent(query)}`);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation onSearch={handleSearch} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-accent animate-spin" />
            <p className="text-muted-foreground font-lato">Loading recipes...</p>
          </div>
        </div>
      </div>
    );
  }

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
          <p className="text-lg text-foreground font-lato max-w-md drop-shadow-md">
            Discover delicious recipes from around the world
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="container py-12 space-y-16">
        {/* Popular Section */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="section-title m-0">Popular Recipes</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-accent to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularRecipes.slice(0, 8).map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="recipe-divider" />

        {/* Italian Cuisine Section */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="section-title m-0">Italian Cuisine</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-accent to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {italianRecipes.slice(0, 8).map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="recipe-divider" />

        {/* Asian Cuisine Section */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="section-title m-0">Asian Cuisine</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-accent to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {asianRecipes.slice(0, 8).map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/50 py-8 mt-16">
        <div className="container text-center text-muted-foreground text-sm font-lato">
          <p>
            Recipe Finder Pro - Your culinary companion for discovering amazing recipes
          </p>
          <p className="mt-2">© 2024 Recipe Finder Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
