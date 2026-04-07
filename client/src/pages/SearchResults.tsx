/**
 * Search Results Page
 * 
 * Uses React Query infinite query for true "Load More" pattern:
 * - Accumulates results across pages
 * - Appends new data instead of replacing
 * - Proper pagination with hasNextPage
 * - Complete loading/error/empty state handling
 */

import { useState, useMemo } from 'react';
import { useSearch, useLocation } from 'wouter';
import { useInfiniteQuery } from '@tanstack/react-query';
import Navigation from '@/components/Navigation';
import AdvancedFilters, { FilterState } from '@/components/AdvancedFilters';
import RecipeCard from '@/components/RecipeCard';
import { Recipe } from '@/lib/recipes';
import { trpc } from '@/lib/trpc';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ITEMS_PER_PAGE = 12;

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

  const searchQuery = new URLSearchParams(query).get('q') || '';

  // Use infinite query for true "Load More" pattern
  const {
    data,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['searchRecipes', searchQuery, filters],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await trpc.recipe.search.query({
        query: searchQuery,
        offset: pageParam,
        limit: ITEMS_PER_PAGE,
        filters,
      });
      return result;
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, page) => sum + page.results.length, 0);
      return totalFetched < lastPage.totalResults ? totalFetched : undefined;
    },
    enabled: !!searchQuery,
  });

  // Accumulate all results from all pages
  const allResults = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.results);
  }, [data?.pages]);

  const totalResults = data?.pages[0]?.totalResults ?? 0;

  const handleSearch = (newQuery: string) => {
    setLocation(`/search?q=${encodeURIComponent(newQuery)}`);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleRetry = () => {
    refetch();
  };

  const handleLoadMore = () => {
    fetchNextPage();
  };

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

        {/* Loading State - Initial Load */}
        {isLoading && allResults.length === 0 ? (
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
        ) : allResults.length === 0 ? (
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
              {allResults.map((recipe: Recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>

            {/* Results Info */}
            <div className="text-center mb-8 text-gray-600 font-lato">
              <p>
                Showing {allResults.length} of {totalResults} recipes
              </p>
            </div>

            {/* Load More Button - Only show if there are more results */}
            {hasNextPage && (
              <div className="flex justify-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={isFetchingNextPage}
                  variant="outline"
                  className="border-orange-600 text-orange-600 hover:bg-orange-50"
                >
                  {isFetchingNextPage ? (
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

            {/* All Results Loaded Message */}
            {!hasNextPage && allResults.length > 0 && (
              <div className="text-center py-8 text-gray-500 font-lato">
                <p>You've reached the end of the results</p>
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
