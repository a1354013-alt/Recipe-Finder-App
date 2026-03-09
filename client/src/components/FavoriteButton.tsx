/**
 * Favorite Button Component
 * 
 * Design Philosophy: Culinary Kitchen Aesthetic
 * - Heart icon toggle
 * - Smooth animation
 * - Clear visual feedback
 */

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { FavoritesStorage } from '@/lib/storage';

interface FavoriteButtonProps {
  recipeId: number;
  title: string;
  image: string;
  className?: string;
}

export default function FavoriteButton({
  recipeId,
  title,
  image,
  className = '',
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    setIsFavorite(FavoritesStorage.isFavorite(recipeId));
  }, [recipeId]);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newState = FavoritesStorage.toggle({
      id: recipeId,
      title,
      image,
    });
    setIsFavorite(newState);
  };

  return (
    <button
      onClick={handleToggleFavorite}
      className={`p-2 rounded-full transition-all duration-300 ${
        isFavorite
          ? 'bg-red-100 text-red-600 hover:bg-red-200'
          : 'bg-white/80 text-gray-400 hover:text-red-600 hover:bg-red-50'
      } ${className}`}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        className={`w-5 h-5 transition-all ${isFavorite ? 'fill-current' : ''}`}
      />
    </button>
  );
}
