/**
 * Recipe Detail Page
 * 
 * Uses React Query hooks for data fetching:
 * - useRecipeDetails: Fetches recipe by ID
 * - Loading/error/success state handling
 * - Displays full recipe information including ingredients, instructions, nutrition
 */

import { useRoute, useLocation } from 'wouter';
import Navigation from '@/components/Navigation';
import RatingReview from '@/components/RatingReview';
import ShoppingListComponent from '@/components/ShoppingList';
import { Recipe, useRecipeDetails } from '@/lib/recipes';
import { Loader2, ArrowLeft, Clock, Users, Flame, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RecipeDetail() {
  const [match, params] = useRoute('/recipe/:id');
  const [, setLocation] = useLocation();
  const recipeId = params?.id ? parseInt(params.id) : null;

  // Use React Query hook for fetching recipe details
  const {
    data: recipe,
    isLoading: loading,
    error,
    refetch,
  } = useRecipeDetails(recipeId || 0);

  const handleSearch = (query: string) => {
    setLocation(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleRetry = () => {
    refetch();
  };

  if (!match) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation onSearch={handleSearch} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-accent animate-spin" />
            <p className="text-muted-foreground font-lato">Loading recipe...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation onSearch={handleSearch} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-lato text-lg mb-4">
              {error instanceof Error ? error.message : 'Recipe not found'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleRetry} variant="outline">
                Retry
              </Button>
              <Button onClick={() => setLocation('/')} variant="outline">
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation onSearch={handleSearch} />

      {/* Hero Section with Image */}
      <div className="relative h-96 overflow-hidden">
        <img
          src={recipe.image}
          alt={recipe.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />

        {/* Back Button */}
        <button
          onClick={() => setLocation('/')}
          className="absolute top-4 left-4 z-10 p-2 bg-accent/80 hover:bg-accent rounded-lg transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-accent-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="container py-12">
        {/* Title and Meta */}
        <div className="mb-8">
          <h1 className="font-merriweather font-bold text-4xl text-accent mb-4">
            {recipe.title}
          </h1>
          <div className="flex flex-wrap gap-6 text-muted-foreground font-lato">
            {recipe.readyInMinutes && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{recipe.readyInMinutes} minutes</span>
              </div>
            )}
            {recipe.servings && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{recipe.servings} servings</span>
              </div>
            )}
            {recipe.calories && (
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4" />
                <span>{recipe.calories} calories</span>
              </div>
            )}
          </div>
          {recipe.summary && (
            <p className="text-foreground font-lato mt-4 leading-relaxed">
              {recipe.summary}
            </p>
          )}
        </div>

        {/* Rating and Reviews */}
        <section className="mb-12">
          <RatingReview recipeId={recipe.id} />
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Meta Information */}
          <div className="recipe-card p-6">
            <h2 className="font-merriweather font-bold text-xl text-accent mb-4">
              Recipe Info
            </h2>
            <div className="space-y-4">
              {recipe.cuisines && recipe.cuisines.length > 0 && (
                <div className="flex items-start gap-3">
                  <Flame className="w-5 h-5 text-accent mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-lato">Cuisines</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {recipe.cuisines.map((cuisine: string) => (
                        <span key={cuisine} className="ingredient-tag text-xs">
                          {cuisine}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {recipe.difficulty && (
                <div className="flex items-start gap-3">
                  <Flame className="w-5 h-5 text-accent mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-lato">Difficulty</p>
                    <p className="font-lato mt-1">{recipe.difficulty}</p>
                  </div>
                </div>
              )}
              {recipe.diets && recipe.diets.length > 0 && (
                <div className="flex items-start gap-3">
                  <Flame className="w-5 h-5 text-accent mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-lato">Diet</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {recipe.diets.map((diet: string) => (
                        <span key={diet} className="ingredient-tag text-xs">
                          {diet}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ingredients */}
          <div className="md:col-span-2">
            <div className="recipe-card p-6">
              <h2 className="font-merriweather font-bold text-2xl text-accent mb-4">
                Ingredients
              </h2>
              <ul className="space-y-3">
                {recipe.extendedIngredients && recipe.extendedIngredients.length > 0 ? (
                  recipe.extendedIngredients.map((ingredient: any) => (
                    <li
                      key={ingredient.id}
                      className="flex items-start gap-3 pb-3 border-b border-border last:border-b-0"
                    >
                      <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0" />
                      <span className="text-foreground font-lato">{ingredient.original}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-muted-foreground font-lato">No ingredients available</p>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Shopping List */}
        {recipe.extendedIngredients && recipe.extendedIngredients.length > 0 && (
          <section className="mb-12">
            <ShoppingListComponent
              recipeId={recipe.id}
              recipeName={recipe.title}
              ingredients={recipe.extendedIngredients}
            />
          </section>
        )}

        {/* Instructions */}
        {recipe.instructions || (recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0) ? (
          <section className="mb-12">
            <h2 className="section-title">Cooking Instructions</h2>
            {recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0 ? (
              <div className="space-y-4">
                {recipe.analyzedInstructions[0].steps.map((step: any) => (
                  <div key={step.number} className="recipe-card p-6 flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground font-merriweather font-bold">
                        {step.number}
                      </div>
                    </div>
                    <p className="text-foreground font-lato leading-relaxed">{step.step}</p>
                  </div>
                ))}
              </div>
            ) : recipe.instructions ? (
              <div className="recipe-card p-6">
                <p className="text-foreground font-lato leading-relaxed whitespace-pre-wrap">
                  {recipe.instructions}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Nutrition Information */}
        {recipe.nutrition && recipe.nutrition.nutrients && recipe.nutrition.nutrients.length > 0 && (
          <section>
            <h2 className="section-title">Nutrition Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {recipe.nutrition.nutrients.slice(0, 5).map((nutrient: any, idx: number) => (
                <div key={idx} className="recipe-card p-4 text-center">
                  <p className="text-xs text-muted-foreground font-lato mb-2">
                    {nutrient.name}
                  </p>
                  <p className="font-merriweather font-bold text-accent text-lg">
                    {nutrient.amount.toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground font-lato">{nutrient.unit}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/50 py-8 mt-16">
        <div className="container text-center text-muted-foreground text-sm font-lato">
          <p>Recipe Finder Pro - Your culinary companion</p>
        </div>
      </footer>
    </div>
  );
}
