/**
 * Recipe Detail Page
 * 
 * Design Philosophy: Culinary Kitchen Aesthetic
 * - Full recipe image with gradient overlay
 * - Detailed ingredient list
 * - Step-by-step cooking instructions
 * - Nutrition information
 */

import { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import Navigation from '@/components/Navigation';
import RatingReview from '@/components/RatingReview';
import ShoppingListComponent from '@/components/ShoppingList';
import { RecipeDetails, getRecipeDetails } from '@/lib/recipes';
import { Loader2, ArrowLeft, Clock, Users, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RecipeDetail() {
  const [match, params] = useRoute('/recipe/:id');
  const [, setLocation] = useLocation();
  const recipeId = params?.id ? parseInt(params.id) : null;

  const [recipe, setRecipe] = useState<RecipeDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!recipeId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const details = await getRecipeDetails(recipeId);
        setRecipe(details);
      } catch (error) {
        console.error('Error fetching recipe details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [recipeId]);

  const handleSearch = (query: string) => {
    setLocation(`/search?q=${encodeURIComponent(query)}`);
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

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation onSearch={handleSearch} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground font-lato text-lg mb-4">Recipe not found</p>
            <Button onClick={() => setLocation('/')} variant="outline">
              Back to Home
            </Button>
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

      {/* Main Content */}
      <div className="container -mt-32 relative z-10 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Recipe Info Card */}
          <div className="md:col-span-1">
            <div className="recipe-card p-6 space-y-6">
              <div>
                <h1 className="font-merriweather font-bold text-3xl text-accent mb-2">
                  {recipe.title}
                </h1>
                <div className="flex flex-wrap gap-2">
                  {recipe.cuisines?.map((cuisine) => (
                    <span key={cuisine} className="ingredient-tag accent">
                      {cuisine}
                    </span>
                  ))}
                </div>
              </div>

              <div className="recipe-divider" />

              {/* Rating Section */}
              <div className="mt-6">
                <RatingReview recipeId={recipe.id} />
              </div>

              {/* Quick Stats */}
              <div className="space-y-3 mt-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-xs text-muted-foreground font-lato">Cooking Time</p>
                    <p className="font-merriweather font-bold text-foreground">
                      {recipe.readyInMinutes} minutes
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-xs text-muted-foreground font-lato">Servings</p>
                    <p className="font-merriweather font-bold text-foreground">
                      {recipe.servings} people
                    </p>
                  </div>
                </div>

                {recipe.diets && recipe.diets.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Flame className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground font-lato">Diet</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {recipe.diets.map((diet) => (
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
          </div>

          {/* Ingredients */}
          <div className="md:col-span-2">
            <div className="recipe-card p-6">
              <h2 className="font-merriweather font-bold text-2xl text-accent mb-4">
                Ingredients
              </h2>
              <ul className="space-y-3">
                {recipe.extendedIngredients.map((ingredient) => (
                  <li
                    key={ingredient.id}
                    className="flex items-start gap-3 pb-3 border-b border-border last:border-b-0"
                  >
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0" />
                    <span className="text-foreground font-lato">{ingredient.original}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Shopping List */}
        <section className="mb-12">
          <ShoppingListComponent
            recipeId={recipe.id}
            recipeName={recipe.title}
            ingredients={recipe.extendedIngredients}
          />
        </section>

        {/* Instructions */}
        <section className="mb-12">
          <h2 className="section-title">Cooking Instructions</h2>
          {recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0 ? (
            <div className="space-y-4">
              {recipe.analyzedInstructions[0].steps.map((step) => (
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
          ) : (
            <p className="text-muted-foreground font-lato">No instructions available</p>
          )}
        </section>

        {/* Nutrition Information */}
        {recipe.nutrition && recipe.nutrition.nutrients.length > 0 && (
          <section>
            <h2 className="section-title">Nutrition Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {recipe.nutrition.nutrients.slice(0, 5).map((nutrient, idx) => (
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
