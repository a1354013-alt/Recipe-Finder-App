/**
 * Favorite Button Component
 * 
 * Connected to tRPC backend for persistent favorites
 * - Heart icon toggle
 * - Smooth animation
 * - Real-time sync with backend
 */

import { Heart, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';

interface FavoriteButtonProps {
  recipeId: number;
  recipeName: string;
  recipeImage?: string;
  className?: string;
}

export default function FavoriteButton({
  recipeId,
  recipeName,
  recipeImage,
  className = '',
}: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  // Check if recipe is favorited
  const checkQuery = trpc.recipe.favorites.check.useQuery(
    { recipeId },
    { enabled: isAuthenticated }
  );

  // Add favorite mutation
  const addMutation = trpc.recipe.favorites.add.useMutation({
    onSuccess: () => {
      utils.recipe.favorites.check.invalidate({ recipeId });
      utils.recipe.favorites.list.invalidate();
      toast.success('Added to favorites');
    },
    onError: () => {
      toast.error('Failed to add favorite');
    },
  });

  // Remove favorite mutation
  const removeMutation = trpc.recipe.favorites.remove.useMutation({
    onSuccess: () => {
      utils.recipe.favorites.check.invalidate({ recipeId });
      utils.recipe.favorites.list.invalidate();
      toast.success('Removed from favorites');
    },
    onError: () => {
      toast.error('Failed to remove favorite');
    },
  });

  const isFavorite = checkQuery.data?.favorited ?? false;
  const isLoading = checkQuery.isLoading || addMutation.isPending || removeMutation.isPending;

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please sign in to save favorites');
      return;
    }

    if (isFavorite) {
      removeMutation.mutate({ recipeId });
    } else {
      addMutation.mutate({ recipeId, recipeName, recipeImage });
    }
  };

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className={`p-2 rounded-full transition-all duration-300 disabled:opacity-50 ${
        isFavorite
          ? 'bg-red-100 text-red-600 hover:bg-red-200'
          : 'bg-white/80 text-gray-400 hover:text-red-600 hover:bg-red-50'
      } ${className}`}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Heart
          className={`w-5 h-5 transition-all ${isFavorite ? 'fill-current' : ''}`}
        />
      )}
    </button>
  );
}
