/**
 * AI Recognition History Page
 * 
 * Displays user's AI ingredient recognition history
 * - Images uploaded
 * - Recognized ingredients
 * - Recommended recipes
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import Navigation from '@/components/Navigation';
import { trpc } from '@/lib/trpc';
import { Loader2, Trash2, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface HistoryItem {
  id: number;
  imageUrl: string;
  recognizedIngredients: string[];
  recommendedRecipes?: string[];
  createdAt: Date;
}

export default function AIHistory() {
  const [, setLocation] = useLocation();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const historyQuery = trpc.recipe.aiHistory.list.useQuery({ limit: 50 });

  useEffect(() => {
    if (historyQuery.data) {
      const parsed = historyQuery.data.map((item: any) => ({
        ...item,
        recognizedIngredients: JSON.parse(item.recognizedIngredients),
        recommendedRecipes: item.recommendedRecipes ? JSON.parse(item.recommendedRecipes) : [],
      }));
      setHistory(parsed);
      setLoading(false);
    }
  }, [historyQuery.data]);

  const handleSearch = (query: string) => {
    setLocation(`/search?q=${encodeURIComponent(query)}`);
  };

  if (loading || historyQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation onSearch={handleSearch} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-accent animate-spin" />
            <p className="text-muted-foreground font-lato">Loading history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation onSearch={handleSearch} />

      <div className="container py-12">
        <div className="mb-12">
          <h1 className="font-merriweather font-bold text-4xl text-accent mb-2">
            AI Recognition History
          </h1>
          <p className="text-muted-foreground font-lato">
            Your AI ingredient recognition and recipe recommendation history
          </p>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ChefHat className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground font-lato text-lg mb-4">
              No recognition history yet
            </p>
            <Button onClick={() => setLocation('/ai-recognition')} variant="outline">
              Start AI Recognition
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {history.map((item) => (
              <Card key={item.id} className="recipe-card p-6 space-y-4">
                {/* Image */}
                <div className="relative h-48 overflow-hidden rounded-lg bg-muted">
                  <img
                    src={item.imageUrl}
                    alt="Recognition"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Recognized Ingredients */}
                <div>
                  <h3 className="font-merriweather font-bold text-accent mb-2">
                    Recognized Ingredients
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {item.recognizedIngredients.map((ingredient, idx) => (
                      <span key={idx} className="ingredient-tag accent text-sm">
                        {ingredient}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recommended Recipes */}
                {item.recommendedRecipes && item.recommendedRecipes.length > 0 && (
                  <div>
                    <h3 className="font-merriweather font-bold text-accent mb-2">
                      Recommended Recipes
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {item.recommendedRecipes.slice(0, 3).map((recipe, idx) => (
                        <span key={idx} className="ingredient-tag text-sm">
                          {recipe}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date */}
                <div className="text-xs text-muted-foreground font-lato">
                  {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const ingredients = item.recognizedIngredients.join(', ');
                      setLocation(`/search?q=${encodeURIComponent(ingredients)}`);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Search Recipes
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
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
