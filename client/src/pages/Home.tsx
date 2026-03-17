/**
 * Home Page
 * 
 * Design Philosophy: Culinary Kitchen Aesthetic
 * - Hero section with appetizing background
 * - Multiple recipe sections (trending, popular, cuisines)
 * - Elegant spacing and typography
 * - Complete loading/error/empty states
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import Navigation from '@/components/Navigation';
import RecipeCard from '@/components/RecipeCard';
import { Recipe, getRandomRecipes, getRecipesByCuisine } from '@/lib/recipes';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecipeSection {
  title: string;
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [sections, setSections] = useState<RecipeSection[]>([
    { title: 'Popular Recipes', recipes: [], loading: true, error: null },
    { title: 'Italian Cuisine', recipes: [], loading: true, error: null },
    { title: 'Asian Cuisine', recipes: [], loading: true, error: null },
  ]);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setPageLoading(true);
      const newSections = [...sections];

      // Fetch Popular Recipes
      try {
        const popular = await getRandomRecipes(8);
        newSections[0] = { ...newSections[0], recipes: popular, loading: false, error: null };
      } catch (error) {
        newSections[0] = { ...newSections[0], loading: false, error: 'Failed to load popular recipes' };
      }

      // Fetch Italian Recipes
      try {
        const italian = await getRecipesByCuisine('Italian', 8);
        newSections[1] = { ...newSections[1], recipes: italian, loading: false, error: null };
      } catch (error) {
        newSections[1] = { ...newSections[1], loading: false, error: 'Failed to load Italian recipes' };
      }

      // Fetch Asian Recipes
      try {
        const asian = await getRecipesByCuisine('Asian', 8);
        newSections[2] = { ...newSections[2], recipes: asian, loading: false, error: null };
      } catch (error) {
        newSections[2] = { ...newSections[2], loading: false, error: 'Failed to load Asian recipes' };
      }

      setSections(newSections);
      setPageLoading(false);
    };

    fetchData();
  }, []);

  const handleSearch = (query: string) => {
    setLocation(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleRetry = () => {
    setPageLoading(true);
    setSections(sections.map(s => ({ ...s, loading: true, error: null })));
    // Trigger refetch
    const fetchData = async () => {
      const newSections = [...sections];

      try {
        const popular = await getRandomRecipes(8);
        newSections[0] = { ...newSections[0], recipes: popular, loading: false, error: null };
      } catch (error) {
        newSections[0] = { ...newSections[0], loading: false, error: 'Failed to load popular recipes' };
      }

      try {
        const italian = await getRecipesByCuisine('Italian', 8);
        newSections[1] = { ...newSections[1], recipes: italian, loading: false, error: null };
      } catch (error) {
        newSections[1] = { ...newSections[1], loading: false, error: 'Failed to load Italian recipes' };
      }

      try {
        const asian = await getRecipesByCuisine('Asian', 8);
        newSections[2] = { ...newSections[2], recipes: asian, loading: false, error: null };
      } catch (error) {
        newSections[2] = { ...newSections[2], loading: false, error: 'Failed to load Asian recipes' };
      }

      setSections(newSections);
      setPageLoading(false);
    };
    fetchData();
  };

  if (pageLoading && sections.every(s => s.loading)) {
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
        {sections.map((section, idx) => (
          <section key={idx}>
            <div className="flex items-center gap-4 mb-8">
              <h2 className="section-title m-0">{section.title}</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-accent to-transparent" />
            </div>

            {/* Loading State */}
            {section.loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                  <p className="text-muted-foreground font-lato">Loading {section.title.toLowerCase()}...</p>
                </div>
              </div>
            ) : section.error ? (
              /* Error State */
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4 text-center">
                  <AlertCircle className="w-12 h-12 text-destructive" />
                  <p className="text-destructive font-lato">{section.error}</p>
                  <Button onClick={handleRetry} variant="outline" size="sm">
                    Retry
                  </Button>
                </div>
              </div>
            ) : section.recipes.length === 0 ? (
              /* Empty State */
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4 text-center">
                  <p className="text-muted-foreground font-lato text-lg">No recipes available</p>
                  <Button onClick={handleRetry} variant="outline" size="sm">
                    Refresh
                  </Button>
                </div>
              </div>
            ) : (
              /* Content State */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {section.recipes.slice(0, 8).map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            )}

            {/* Divider */}
            {idx < sections.length - 1 && <div className="recipe-divider mt-16" />}
          </section>
        ))}
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
