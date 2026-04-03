/**
 * Shopping List Detail Page
 * 
 * Display a specific shopping list with items
 * Allow adding/removing items and marking as completed
 */

import { useParams, useLocation } from 'wouter';
import { useState } from 'react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { ArrowLeft, Plus, Trash2, Check, Loader2 } from 'lucide-react';

export default function ShoppingListDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [newItemIngredient, setNewItemIngredient] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('pcs');

  const listId = parseInt(id || '0', 10);

  // Fetch shopping list items
  const itemsQuery = trpc.recipe.shoppingLists.items.useQuery(
    { shoppingListId: listId },
    { enabled: isAuthenticated && !authLoading && listId > 0 }
  );

  // Mutations
  const addItemMutation = trpc.recipe.shoppingLists.addItem.useMutation({
    onSuccess: () => {
      toast.success('Item added');
      setNewItemIngredient('');
      setNewItemQuantity('1');
      setNewItemUnit('pcs');
      itemsQuery.refetch();
    },
    onError: () => {
      toast.error('Failed to add item');
    },
  });

  const updateItemMutation = trpc.recipe.shoppingLists.updateItemStatus.useMutation({
    onSuccess: () => {
      itemsQuery.refetch();
    },
    onError: () => {
      toast.error('Failed to update item');
    },
  });

  const deleteItemMutation = trpc.recipe.shoppingLists.deleteItem?.useMutation?.({
    onSuccess: () => {
      toast.success('Item deleted');
      itemsQuery.refetch();
    },
    onError: () => {
      toast.error('Failed to delete item');
    },
  });

  const handleAddItem = async () => {
    if (!newItemIngredient.trim()) {
      toast.error('Please enter ingredient name');
      return;
    }
    await addItemMutation.mutateAsync({
      shoppingListId: listId,
      ingredient: newItemIngredient,
      quantity: String(newItemQuantity || '1'),
      unit: newItemUnit,
    });
  };

  const handleSearch = (query: string) => {
    setLocation(`/search?q=${encodeURIComponent(query)}`);
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

  const items = itemsQuery.data || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation onSearch={handleSearch} />

      <div className="container py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/favorites')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="font-merriweather font-bold text-3xl text-accent">
            Shopping List
          </h1>
        </div>

        {/* Add Item Form */}
        <div className="mb-8 p-4 bg-card border border-border rounded-lg">
          <h2 className="font-merriweather font-bold text-lg mb-4">Add Item</h2>
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Ingredient name..."
              value={newItemIngredient}
              onChange={(e) => setNewItemIngredient(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <Input
              type="number"
              placeholder="Qty"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(e.target.value)}
              className="w-20"
              min="1"
            />
            <Input
              placeholder="Unit"
              value={newItemUnit}
              onChange={(e) => setNewItemUnit(e.target.value)}
              className="w-24"
            />
            <Button
              onClick={handleAddItem}
              disabled={addItemMutation.isPending}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {addItemMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Items List */}
        {itemsQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : itemsQuery.isError ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-destructive font-lato text-lg">
              Failed to load items
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-muted-foreground font-lato text-lg">
              No items in this list
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item: any) => (
              <div
                key={item.id}
                className="p-4 bg-card border border-border rounded-lg flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Button
                    size="sm"
                    variant={item.checked ? 'default' : 'outline'}
                    onClick={() =>
                      updateItemMutation.mutate({
                        itemId: item.id,
                        checked: !item.checked,
                      })
                    }
                    disabled={updateItemMutation.isPending}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <div className={item.checked ? 'line-through text-muted-foreground' : ''}>
                    <p className="font-lato font-semibold">{item.ingredient}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} {item.unit}
                    </p>
                  </div>
                </div>
                {deleteItemMutation && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      deleteItemMutation.mutate({ itemId: item.id })
                    }
                    disabled={deleteItemMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
