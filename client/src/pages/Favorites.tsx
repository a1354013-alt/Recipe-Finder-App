/**
 * Favorites Page
 * 
 * Display saved favorite recipes and shopping lists
 * All data is fetched from backend via tRPC
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import Navigation from '@/components/Navigation';
import RecipeCard from '@/components/RecipeCard';
import { Recipe } from '@/lib/recipes';
import { Heart, ShoppingCart, Trash2, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';

export default function Favorites() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [activeTab, setActiveTab] = useState<'favorites' | 'shopping'>('favorites');
  const [newListName, setNewListName] = useState('');
  const [showNewListForm, setShowNewListForm] = useState(false);

  // Fetch favorites from backend
  const favoritesQuery = trpc.recipe.favorites.list.useQuery(undefined, {
    enabled: isAuthenticated && !authLoading,
  });

  // Fetch shopping lists from backend
  const shoppingListsQuery = trpc.recipe.shoppingLists.list.useQuery(undefined, {
    enabled: isAuthenticated && !authLoading,
  });

  // Mutations
  const removeFavoriteMutation = trpc.recipe.favorites.remove.useMutation({
    onSuccess: () => {
      toast.success('Recipe removed from favorites');
      favoritesQuery.refetch();
    },
    onError: (error) => {
      toast.error('Failed to remove favorite');
    },
  });

  const createShoppingListMutation = trpc.recipe.shoppingLists.create.useMutation({
    onSuccess: () => {
      toast.success('Shopping list created');
      setNewListName('');
      setShowNewListForm(false);
      shoppingListsQuery.refetch();
    },
    onError: () => {
      toast.error('Failed to create shopping list');
    },
  });

  const deleteShoppingListMutation = trpc.recipe.shoppingLists.delete.useMutation({
    onSuccess: () => {
      toast.success('Shopping list deleted');
      shoppingListsQuery.refetch();
    },
    onError: () => {
      toast.error('Failed to delete shopping list');
    },
  });

  const handleSearch = (query: string) => {
    setLocation(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleCreateShoppingList = async () => {
    if (!newListName.trim()) {
      toast.error('Please enter a list name');
      return;
    }
    await createShoppingListMutation.mutateAsync({ name: newListName });
  };

  const handleDeleteShoppingList = async (listId: number) => {
    if (confirm('Are you sure you want to delete this shopping list?')) {
      await deleteShoppingListMutation.mutateAsync({ shoppingListId: listId });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const favorites = favoritesQuery.data || [];
  const shoppingLists = shoppingListsQuery.data || [];

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
            {favoritesQuery.isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : favorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Heart className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-lato text-lg mb-4">
                  No favorite recipes yet
                </p>
                <Button
                  onClick={() => setLocation('/')}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Explore Recipes
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((fav: any) => (
                  <div key={fav.id} className="relative">
                    <RecipeCard
                      id={fav.recipeId}
                      title={fav.recipeName}
                      image={fav.recipeImage || '/images/recipe-placeholder.jpg'}
                      readyInMinutes={0}
                      servings={0}
                      sourceUrl=""
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => removeFavoriteMutation.mutate({ recipeId: fav.recipeId })}
                      disabled={removeFavoriteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Shopping Lists Tab */}
        {activeTab === 'shopping' && (
          <div>
            {/* Create New List Form */}
            {showNewListForm && (
              <div className="mb-8 p-4 bg-secondary rounded-lg">
                <div className="flex gap-2">
                  <Input
                    placeholder="List name..."
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleCreateShoppingList}
                    disabled={createShoppingListMutation.isPending}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    {createShoppingListMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Create'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewListForm(false);
                      setNewListName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!showNewListForm && (
              <Button
                onClick={() => setShowNewListForm(true)}
                className="mb-8 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Shopping List
              </Button>
            )}

            {/* Shopping Lists */}
            {shoppingListsQuery.isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : shoppingLists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <ShoppingCart className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-lato text-lg">
                  No shopping lists yet
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {shoppingLists.map((list: any) => (
                  <div
                    key={list.id}
                    className="p-6 bg-card border border-border rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setLocation(`/shopping-list/${list.id}`)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-merriweather font-bold text-lg text-foreground">
                          {list.name}
                        </h3>
                        {list.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {list.description}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteShoppingList(list.id);
                        }}
                        disabled={deleteShoppingListMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {list.itemCount || 0} items
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
