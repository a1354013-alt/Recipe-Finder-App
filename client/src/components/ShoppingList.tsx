/**
 * Shopping List Component
 * 
 * Connected to tRPC backend for persistent shopping lists
 * - Add ingredients to shopping list
 * - Manage items with backend persistence
 * - Export shopping list
 */

import { useState } from 'react';
import { ShoppingCart, Download, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';

interface ShoppingListProps {
  recipeId: number;
  recipeName: string;
  ingredients: Array<{
    id: number;
    original: string;
    name: string;
    amount: number;
    unit: string;
  }>;
}

export default function ShoppingListComponent({
  recipeName,
  ingredients,
}: ShoppingListProps) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [shoppingListId, setShoppingListId] = useState<number | null>(null);
  const [isAdded, setIsAdded] = useState(false);

  // Create shopping list mutation
  const createListMutation = trpc.recipe.shoppingLists.create.useMutation({
    onSuccess: async (response) => {
      // Use the returned list.id directly instead of refetching
      if (response.list && response.list.id) {
        const newListId = response.list.id;
        setShoppingListId(newListId);
        // Add all ingredients to the new list
        for (const ing of ingredients) {
          await addItemMutation.mutateAsync({
            shoppingListId: newListId,
            ingredient: ing.name,
            quantity: ing.amount,
            unit: ing.unit,
          });
        }
        setIsAdded(true);
        toast.success('Added to shopping list');
        setTimeout(() => setIsAdded(false), 2000);
        // Invalidate lists query to refresh the list
        utils.recipe.shoppingLists.list.invalidate();
      } else {
        toast.error('Failed to get shopping list ID');
      }
    },
    onError: (error) => {
      console.error('Create shopping list error:', error);
      toast.error('Failed to create shopping list');
    },
  });

  // Add item to shopping list mutation
  const addItemMutation = trpc.recipe.shoppingLists.addItem.useMutation({
    onError: () => {
      toast.error('Failed to add item');
    },
  });

  // Delete shopping list mutation
  const deleteListMutation = trpc.recipe.shoppingLists.delete.useMutation({
    onSuccess: () => {
      setShoppingListId(null);
      setIsAdded(false);
      utils.recipe.shoppingLists.list.invalidate();
      toast.success('Shopping list deleted');
    },
    onError: () => {
      toast.error('Failed to delete shopping list');
    },
  });

  const handleAddToShoppingList = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to use shopping lists');
      return;
    }

    // Create a new shopping list for this recipe
    await createListMutation.mutateAsync({
      name: `${recipeName} - ${new Date().toLocaleDateString()}`,
      description: `Shopping list for ${recipeName}`,
    });
  };

  const handleExportList = () => {
    if (!shoppingListId) return;

    const lines = [
      `Shopping List: ${recipeName}`,
      `Created: ${new Date().toLocaleDateString()}`,
      '',
      'Ingredients:',
      ...ingredients.map((ing) => `- ${ing.amount} ${ing.unit} ${ing.name}`),
    ];

    const text = lines.join('\n');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', `shopping-list-${recipeName}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('List exported');
  };

  const handleDeleteList = () => {
    if (shoppingListId && confirm('Delete this shopping list?')) {
      deleteListMutation.mutate({ shoppingListId });
    }
  };

  const isLoading = createListMutation.isPending || addItemMutation.isPending;

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
      <h3 className="font-merriweather font-bold text-lg text-green-900 mb-4">
        🛒 Shopping List
      </h3>

      {/* Ingredients List */}
      <div className="mb-6">
        <h4 className="font-lato font-semibold text-gray-700 mb-3">Ingredients:</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {ingredients.map((ing) => (
            <div
              key={ing.id}
              className="flex items-start gap-3 p-2 rounded hover:bg-green-100 transition-colors"
            >
              <input
                type="checkbox"
                className="w-4 h-4 mt-1 rounded border-green-300 text-green-600 cursor-pointer"
                defaultChecked={false}
              />
              <div className="flex-1">
                <p className="font-lato text-sm text-gray-700">
                  <span className="font-semibold">{ing.amount}</span> {ing.unit} {ing.name}
                </p>
                <p className="text-xs text-gray-500">{ing.original}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {!shoppingListId ? (
          <Button
            onClick={handleAddToShoppingList}
            disabled={isLoading || !isAuthenticated}
            className={`flex items-center gap-2 transition-all ${
              isAdded
                ? 'bg-green-600 text-white'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
            {isAdded ? 'Added to List!' : 'Add to Shopping List'}
          </Button>
        ) : (
          <>
            <Button
              onClick={handleExportList}
              variant="outline"
              className="flex items-center gap-2 text-green-700 border-green-300 hover:bg-green-50"
            >
              <Download className="w-4 h-4" />
              Export List
            </Button>
            <Button
              onClick={handleDeleteList}
              disabled={deleteListMutation.isPending}
              variant="outline"
              className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
            >
              {deleteListMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete List
            </Button>
          </>
        )}
      </div>

      {/* Info Text */}
      <p className="text-xs text-gray-600 mt-4">
        💡 Tip: You can manage your shopping lists in the Favorites section
      </p>
    </div>
  );
}
