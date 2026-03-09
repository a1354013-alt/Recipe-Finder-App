/**
 * Shopping List Component
 * 
 * Design Philosophy: Culinary Kitchen Aesthetic
 * - Ingredient checklist
 * - Add to shopping list functionality
 * - Export shopping list
 */

import { useState } from 'react';
import { ShoppingCart, Download, Trash2 } from 'lucide-react';
import { ShoppingListStorage, ShoppingListItem } from '@/lib/storage';
import { Button } from '@/components/ui/button';

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
  recipeId,
  recipeName,
  ingredients,
}: ShoppingListProps) {
  const [shoppingListId, setShoppingListId] = useState<string | null>(null);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToShoppingList = () => {
    const items: Omit<ShoppingListItem, 'id'>[] = ingredients.map((ing) => ({
      ingredient: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      recipeId,
      recipeName,
      checked: false,
    }));

    const list = ShoppingListStorage.create(items);
    setShoppingListId(list.id);
    setIsAdded(true);

    // Reset after 2 seconds
    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };

  const handleExportList = () => {
    if (!shoppingListId) return;

    const text = ShoppingListStorage.export(shoppingListId);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', `shopping-list-${recipeName}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDeleteList = () => {
    if (shoppingListId) {
      ShoppingListStorage.delete(shoppingListId);
      setShoppingListId(null);
      setIsAdded(false);
    }
  };

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
            className={`flex items-center gap-2 transition-all ${
              isAdded
                ? 'bg-green-600 text-white'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
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
              variant="outline"
              className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
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
