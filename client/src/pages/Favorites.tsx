/**
 * Favorites Page
 * 
 * Design Philosophy: Culinary Kitchen Aesthetic
 * - Display saved favorite recipes
 * - Manage shopping lists
 * - View ratings and reviews
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import Navigation from '@/components/Navigation';
import RecipeCard from '@/components/RecipeCard';
import { FavoritesStorage, ShoppingListStorage, ShoppingList } from '@/lib/storage';
import { Recipe } from '@/lib/recipes';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Favorites() {
  const [, setLocation] = useLocation();
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [activeTab, setActiveTab] = useState<'favorites' | 'shopping'>('favorites');

  useEffect(() => {
    const favRecipes = FavoritesStorage.get().map((fav) => ({
      id: fav.id,
      title: fav.title,
      image: fav.image,
      readyInMinutes: 0,
      servings: 0,
      sourceUrl: '',
    }));
    setFavorites(favRecipes);

    const lists = ShoppingListStorage.getAll();
    setShoppingLists(lists);
  }, []);

  const handleSearch = (query: string) => {
    setLocation(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleDeleteShoppingList = (listId: string) => {
    ShoppingListStorage.delete(listId);
    setShoppingLists(shoppingLists.filter((l) => l.id !== listId));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation onSearch={handleSearch} />

      <div className="container py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-merriweather font-bold text-4xl text-accent mb-2">
            My Recipes
          </h1>
          <p className="text-foreground font-lato">
            Manage your favorite recipes and shopping lists
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-border">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 font-lato font-semibold transition-colors ${
              activeTab === 'favorites'
                ? 'text-accent border-b-2 border-accent'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Heart className="w-4 h-4 inline mr-2" />
            Favorites ({favorites.length})
          </button>
          <button
            onClick={() => setActiveTab('shopping')}
            className={`px-4 py-2 font-lato font-semibold transition-colors ${
              activeTab === 'shopping'
                ? 'text-accent border-b-2 border-accent'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShoppingCart className="w-4 h-4 inline mr-2" />
            Shopping Lists ({shoppingLists.length})
          </button>
        </div>

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <div>
            {favorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Heart className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-lato text-lg mb-4">
                  No favorite recipes yet
                </p>
                <Button
                  onClick={() => setLocation('/')}
                  variant="outline"
                  className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                >
                  Explore Recipes
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {favorites.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Shopping Lists Tab */}
        {activeTab === 'shopping' && (
          <div>
            {shoppingLists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <ShoppingCart className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-lato text-lg mb-4">
                  No shopping lists yet
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Add ingredients from recipes to create a shopping list
                </p>
                <Button
                  onClick={() => setLocation('/')}
                  variant="outline"
                  className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                >
                  Browse Recipes
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {shoppingLists.map((list) => (
                  <div
                    key={list.id}
                    className="bg-card border border-border rounded-lg p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-merriweather font-bold text-lg text-accent">
                          Shopping List
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {list.items.length} items • Created{' '}
                          {new Date(list.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleDeleteShoppingList(list.id)}
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Items */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {list.items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 p-2 rounded ${
                            item.checked ? 'bg-green-50' : 'hover:bg-secondary'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => {
                              // Toggle item in storage
                              ShoppingListStorage.toggleItem(list.id, item.id);
                              setShoppingLists([...shoppingLists]);
                            }}
                            className="w-4 h-4 rounded border-border text-accent cursor-pointer"
                          />
                          <div className="flex-1">
                            <p
                              className={`font-lato text-sm ${
                                item.checked
                                  ? 'line-through text-muted-foreground'
                                  : 'text-foreground'
                              }`}
                            >
                              {item.amount} {item.unit} {item.ingredient}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
