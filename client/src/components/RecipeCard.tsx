/**
 * RecipeCard Component
 * 
 * Design Philosophy: Culinary Kitchen Aesthetic
 * - Soft shadows and warm colors
 * - Elegant hover animation (upward lift)
 * - Clear typography hierarchy
 * - Appetizing image display
 * - Enhanced with calorie and difficulty info
 */

import { Link } from 'wouter';
import { Recipe } from '@/lib/recipes';
import { Clock, Users, Flame } from 'lucide-react';
import FavoriteButton from './FavoriteButton';

interface RecipeCardProps {
  recipe: Recipe;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-red-100 text-red-800',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '👶 Easy',
  medium: '👨‍🍳 Medium',
  hard: '🔥 Hard',
};

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const difficultyKey = (recipe.difficulty || 'easy') as keyof typeof DIFFICULTY_COLORS;

  return (
    <Link href={`/recipe/${recipe.id}`}>
      <a className="recipe-card group block h-full">
        {/* Recipe Image Container */}
        <div className="relative overflow-hidden bg-gray-200 aspect-video">
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />

          {/* Overlay with Info on Hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
            <div className="flex flex-wrap gap-1">
              {recipe.cuisines?.slice(0, 2).map((cuisine) => (
                <span
                  key={cuisine}
                  className="ingredient-tag accent text-xs"
                >
                  {cuisine}
                </span>
              ))}
            </div>
          </div>

          {/* Difficulty Badge */}
          {recipe.difficulty && (
            <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-lato font-semibold ${DIFFICULTY_COLORS[difficultyKey]}`}>
              {DIFFICULTY_LABELS[difficultyKey]}
            </div>
          )}

          {/* Favorite Button */}
          <div className="absolute top-3 left-3">
            <FavoriteButton
              recipeId={recipe.id}
              title={recipe.title}
              image={recipe.image}
            />
          </div>
        </div>

        {/* Recipe Info */}
        <div className="p-4 flex flex-col gap-3">
          <h3 className="font-merriweather font-bold text-orange-600 text-lg line-clamp-2 leading-tight">
            {recipe.title}
          </h3>

          {/* Quick Stats */}
          <div className="flex items-center gap-3 text-sm text-gray-600 font-lato flex-wrap">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-orange-600" />
              <span>{recipe.readyInMinutes} min</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-orange-600" />
              <span>{recipe.servings} servings</span>
            </div>
            {recipe.calories && (
              <div className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-red-500" />
                <span>{recipe.calories} kcal</span>
              </div>
            )}
          </div>

          {/* Diet Tags */}
          {recipe.diets && recipe.diets.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recipe.diets.slice(0, 2).map((diet) => (
                <span key={diet} className="ingredient-tag text-xs">
                  {diet}
                </span>
              ))}
            </div>
          )}
        </div>
      </a>
    </Link>
  );
}
