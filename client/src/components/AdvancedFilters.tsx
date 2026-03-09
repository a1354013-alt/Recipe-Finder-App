/**
 * Advanced Filters Component
 * 
 * Design Philosophy: Culinary Kitchen Aesthetic
 * - Clean, organized filter layout
 * - Multiple filter dimensions (time, calories, difficulty, diet)
 * - Real-time filtering capability
 * - Responsive design for all devices
 */

import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FilterState {
  cookingTime: string[];
  calories: string[];
  difficulty: string[];
  diets: string[];
}

interface AdvancedFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const COOKING_TIME_OPTIONS = [
  { id: 'quick', label: 'Quick (≤15 min)', min: 0, max: 15 },
  { id: 'medium', label: 'Medium (15-45 min)', min: 15, max: 45 },
  { id: 'long', label: 'Long (>45 min)', min: 45, max: 999 },
];

const CALORIE_OPTIONS = [
  { id: 'low', label: 'Low (<300 kcal)', min: 0, max: 300 },
  { id: 'medium', label: 'Medium (300-600 kcal)', min: 300, max: 600 },
  { id: 'high', label: 'High (>600 kcal)', min: 600, max: 9999 },
];

const DIFFICULTY_OPTIONS = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

const DIET_OPTIONS = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'glutenFree', label: 'Gluten Free' },
  { id: 'dairyFree', label: 'Dairy Free' },
  { id: 'keto', label: 'Keto' },
  { id: 'paleo', label: 'Paleo' },
];

export default function AdvancedFilters({
  onFilterChange,
  isOpen,
  onToggle,
}: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    cookingTime: [],
    calories: [],
    difficulty: [],
    diets: [],
  });

  const handleFilterToggle = (category: keyof FilterState, value: string) => {
    setFilters((prev) => {
      const updated = { ...prev };
      const currentValues = updated[category];
      const index = currentValues.indexOf(value);

      if (index > -1) {
        currentValues.splice(index, 1);
      } else {
        currentValues.push(value);
      }

      onFilterChange(updated);
      return updated;
    });
  };

  const handleClearAll = () => {
    const emptyFilters: FilterState = {
      cookingTime: [],
      calories: [],
      difficulty: [],
      diets: [],
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const activeFilterCount =
    filters.cookingTime.length +
    filters.calories.length +
    filters.difficulty.length +
    filters.diets.length;

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Filter Toggle Button */}
      <div className="container py-4">
        <button
          onClick={onToggle}
          className="flex items-center justify-between w-full md:w-auto gap-2 px-4 py-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 font-lato font-semibold hover:bg-orange-100 transition-colors"
        >
          <span>🔍 Advanced Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-2 px-2 py-1 bg-orange-600 text-white text-xs rounded-full font-bold">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Filter Panel */}
      {isOpen && (
        <div className="container pb-8 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-6">
            {/* Cooking Time Filter */}
            <div>
              <h3 className="font-merriweather font-bold text-lg text-gray-900 mb-4">
                ⏱️ Cooking Time
              </h3>
              <div className="space-y-3">
                {COOKING_TIME_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={filters.cookingTime.includes(option.id)}
                      onChange={() => handleFilterToggle('cookingTime', option.id)}
                      className="w-4 h-4 rounded border-gray-300 text-orange-600 cursor-pointer"
                    />
                    <span className="text-sm font-lato text-gray-700 group-hover:text-orange-600 transition-colors">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Calorie Filter */}
            <div>
              <h3 className="font-merriweather font-bold text-lg text-gray-900 mb-4">
                🔥 Calories
              </h3>
              <div className="space-y-3">
                {CALORIE_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={filters.calories.includes(option.id)}
                      onChange={() => handleFilterToggle('calories', option.id)}
                      className="w-4 h-4 rounded border-gray-300 text-orange-600 cursor-pointer"
                    />
                    <span className="text-sm font-lato text-gray-700 group-hover:text-orange-600 transition-colors">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Difficulty Filter */}
            <div>
              <h3 className="font-merriweather font-bold text-lg text-gray-900 mb-4">
                👨‍🍳 Difficulty
              </h3>
              <div className="space-y-3">
                {DIFFICULTY_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={filters.difficulty.includes(option.id)}
                      onChange={() => handleFilterToggle('difficulty', option.id)}
                      className="w-4 h-4 rounded border-gray-300 text-orange-600 cursor-pointer"
                    />
                    <span className="text-sm font-lato text-gray-700 group-hover:text-orange-600 transition-colors">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Diet Filter */}
            <div>
              <h3 className="font-merriweather font-bold text-lg text-gray-900 mb-4">
                🥗 Diet Type
              </h3>
              <div className="space-y-3">
                {DIET_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={filters.diets.includes(option.id)}
                      onChange={() => handleFilterToggle('diets', option.id)}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 cursor-pointer"
                    />
                    <span className="text-sm font-lato text-gray-700 group-hover:text-green-600 transition-colors">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-lato text-gray-600">Active filters:</span>
                {filters.cookingTime.map((id) => (
                  <FilterTag
                    key={`time-${id}`}
                    label={COOKING_TIME_OPTIONS.find((o) => o.id === id)?.label || ''}
                    onRemove={() => handleFilterToggle('cookingTime', id)}
                  />
                ))}
                {filters.calories.map((id) => (
                  <FilterTag
                    key={`cal-${id}`}
                    label={CALORIE_OPTIONS.find((o) => o.id === id)?.label || ''}
                    onRemove={() => handleFilterToggle('calories', id)}
                  />
                ))}
                {filters.difficulty.map((id) => (
                  <FilterTag
                    key={`diff-${id}`}
                    label={DIFFICULTY_OPTIONS.find((o) => o.id === id)?.label || ''}
                    onRemove={() => handleFilterToggle('difficulty', id)}
                  />
                ))}
                {filters.diets.map((id) => (
                  <FilterTag
                    key={`diet-${id}`}
                    label={DIET_OPTIONS.find((o) => o.id === id)?.label || ''}
                    onRemove={() => handleFilterToggle('diets', id)}
                    isDiet
                  />
                ))}
                <Button
                  onClick={handleClearAll}
                  variant="ghost"
                  className="text-xs text-gray-500 hover:text-red-600 ml-2"
                >
                  Clear All
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface FilterTagProps {
  label: string;
  onRemove: () => void;
  isDiet?: boolean;
}

function FilterTag({ label, onRemove, isDiet }: FilterTagProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-lato font-semibold ${
        isDiet
          ? 'bg-green-100 text-green-800'
          : 'bg-orange-100 text-orange-800'
      }`}
    >
      {label}
      <button
        onClick={onRemove}
        className="hover:opacity-70 transition-opacity"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
