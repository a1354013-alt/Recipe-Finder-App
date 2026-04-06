/**
 * Search Results Page
 * 
 * Uses React Query hooks for data fetching:
 * - useSearchRecipes: Primary data fetching
 * - Pagination with infinite query pattern
 * - Advanced filtering support
 * - Complete loading/error/empty state handling
 */

import { useState } from 'react';
import { useSearch, useLocation } from 'wouter';
import Navigation from '@/components/Navigation';
import AdvancedFilters, { FilterState } from '@/components/AdvancedFilters';
import RecipeCard from '@/components/RecipeCard';
import { Recipe, useSearchRecipes } from '@/lib/recipes';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SearchResults() {
  const query = useSearch();
  const [, setLocation] = useLocation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    cookingTime: [],
    calories: [],
    difficulty: [],
    diets: [],
  });
  const [currentPage, setCurrentPage] = useState(0);

  const searchQuery = new URLSearchParams(query).get('q') || '';

  // Use React Query hook for searching
  const {
    data: searchResults = [],
    isLoading,
    error,
    refetch,
  } = useSearchRecipes(searchQuery, {
    offset: 0,
    number: 12,
  });

  const handleSearch = (newQuery: string) => {
    setLocation(`/search?q=${encodeURIComponent(newQuery)}`);
    setCurrentPage(0);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(0);
  };

  const handleRetry = () => {
    refetch();
  };

  const loadMore = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const displayedResults = Array.isArray(searchResults) ? searchResults : [];
  const totalResults = displayedResults.length;

  return (
    <div className="min-h-screen bg-white">
      <Navigation onSearch={handleSearch} />

      {/* Advanced Filters */}
      <AdvancedFilters
        onFilterChange={handleFilterChange}
        isOpen={filtersOpen}
        onToggle={() => setFiltersOpen(!filtersOpen)}
      />

      <div className="container py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-merriweather font-bold text-4xl text-orange-600 mb-2">
            Search Results
          </h1>
          <p className="text-gray-700 font-lato">
            {searchQuery && !error && (
              <>
                Found <span className="text-orange-600 font-semibold">{totalResults}</span> recipes for{' '}
                <span className="text-orange-600 font-semibold">"{searchQuery}"</span>
              </>
            )}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && displayedResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-orange-600 animate-spin mb-4" />
            <p className="text-gray-500 font-lato">Searching recipes...</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
            <p className="text-red-600 font-lato text-lg mb-4">
              {error instanceof Error ? error.message : 'Failed to search recipes'}
            </p>
            <Button onClick={handleRetry} variant="outline" className="border-orange-600 text-orange-600">
              Retry
            </Button>
          </div>
        ) : displayedResults.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-gray-500 font-lato text-lg mb-4">
              {searchQuery ? `No recipes found for "${searchQuery}"` : 'Enter a search query to find recipes'}
            </p>
            <Button onClick={() => setLocation('/')} variant="outline">
              Back to Home
            </Button>
          </div>
        ) : (
          /* Content State */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {displayedResults.map((recipe: Recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>

            {/* Load More Button */}
            {displayedResults.length < totalResults && (
              <div className="flex justify-center">
                <Button
                  onClick={loadMore}
                  disabled={isLoading}
                  variant="outline"
                  className="border-orange-600 text-orange-600 hover:bg-orange-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More Recipes'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-8 mt-16">
        <div className="container text-center text-gray-500 text-sm font-lato">
          <p>Recipe Finder Pro - Your culinary companion</p>
        </div>
      </footer>
    </div>
  );
}
