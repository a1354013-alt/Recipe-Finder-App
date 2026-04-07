/**
 * Home Page - Recipe Showcase
 * 
 * Architecture:
 * - Three independent React Query hooks for recipe sections
 * - Unified loading, error, and empty states
 * - No manual useState/useEffect data management
 * - Each section can be refreshed independently
 */

import { useLocation } from 'wouter';
import Navigation from '@/components/Navigation';
import RecipeCard from '@/components/RecipeCard';
import { useRandomRecipes, useRecipesByCuisine } from '@/lib/recipes';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecipeSectionProps {
  title: string;
  data?: any[];
  isLoading: boolean;
  error?: Error | null;
  refetch: () => void;
}

function RecipeSection({ title, data = [], isLoading, error, refetch }: RecipeSectionProps) {
  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-merriweather font-bold text-foreground">{title}</h2>
        {isLoading && <Loader2 className="w-6 h-6 animate-spin text-accent" />}
      </div>

      {/* Loading State */}
      {isLoading && data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
          <p className="text-muted-foreground">Loading recipes...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-4 p-4 bg-destructive/10 border border-destructive rounded-lg mb-6">
          <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-destructive font-medium">
              Failed to load recipes. Please try again.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={refetch}
            className="flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">No recipes found</p>
          <Button
            variant="outline"
            onClick={refetch}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}

      {/* Recipe Grid */}
      {data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();

  // Three independent React Query hooks for recipe sections
  const popularQuery = useRandomRecipes(8);
  const italianQuery = useRecipesByCuisine('Italian', 8);
  const asianQuery = useRecipesByCuisine('Asian', 8);

  const handleSearch = (query: string) => {
    setLocation(`/search?q=${encodeURIComponent(query)}`);
  };

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
        <RecipeSection
          title="Popular Recipes"
          data={popularQuery.data}
          isLoading={popularQuery.isLoading}
          error={popularQuery.error}
          refetch={popularQuery.refetch}
        />

        <RecipeSection
          title="Italian Cuisine"
          data={italianQuery.data}
          isLoading={italianQuery.isLoading}
          error={italianQuery.error}
          refetch={italianQuery.refetch}
        />

        <RecipeSection
          title="Asian Cuisine"
          data={asianQuery.data}
          isLoading={asianQuery.isLoading}
          error={asianQuery.error}
          refetch={asianQuery.refetch}
        />
      </div>
    </div>
  );
}
