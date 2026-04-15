import { useEffect, useState } from 'react';
import { useSearch, useLocation } from 'wouter';
import Navigation from '@/components/Navigation';
import AdvancedFilters, { FilterState } from '@/components/AdvancedFilters';
import RecipeCard from '@/components/RecipeCard';
import { useSearchRecipes } from '@/lib/recipes';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RecipeSummary, RecipeSearchFilters } from '@shared/types';

const ITEMS_PER_PAGE = 12;

function parseFiltersFromQuery(searchParams: URLSearchParams): FilterState {
  return {
    cookingTime: searchParams.getAll('cookingTime'),
    calories: searchParams.getAll('calories'),
    difficulty: searchParams.getAll('difficulty'),
    diets: searchParams.getAll('diets'),
  };
}

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

  const searchParams = new URLSearchParams(query);
  const searchQuery = searchParams.get('q') || '';
  const parsedFilters = parseFiltersFromQuery(searchParams);

  useEffect(() => {
    setFilters(parsedFilters);
  }, [query]);

  const searchResultsQuery = useSearchRecipes(searchQuery, {
    offset: 0,
    limit: ITEMS_PER_PAGE,
    filters: parsedFilters as RecipeSearchFilters,
  });

  const allResults = searchResultsQuery.data?.results || [];
  const totalResults = searchResultsQuery.data?.totalResults ?? 0;

  const handleSearch = (newQuery: string) => {
    const newSearchParams = new URLSearchParams();
    newSearchParams.set('q', newQuery);
    filters.cookingTime.forEach((value) => newSearchParams.append('cookingTime', value));
    filters.calories.forEach((value) => newSearchParams.append('calories', value));
    filters.difficulty.forEach((value) => newSearchParams.append('difficulty', value));
    filters.diets.forEach((value) => newSearchParams.append('diets', value));
    setLocation(`/search?${newSearchParams.toString()}`);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    const newSearchParams = new URLSearchParams();
    if (searchQuery) {
      newSearchParams.set('q', searchQuery);
    }
    newFilters.cookingTime.forEach((value) => newSearchParams.append('cookingTime', value));
    newFilters.calories.forEach((value) => newSearchParams.append('calories', value));
    newFilters.difficulty.forEach((value) => newSearchParams.append('difficulty', value));
    newFilters.diets.forEach((value) => newSearchParams.append('diets', value));
    setLocation(`/search?${newSearchParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation onSearch={handleSearch} />

      <AdvancedFilters
        onFilterChange={handleFilterChange}
        isOpen={filtersOpen}
        onToggle={() => setFiltersOpen(!filtersOpen)}
      />

      <div className="container py-12">
        <div className="mb-12">
          <h1 className="font-merriweather font-bold text-4xl text-orange-600 mb-2">
            Search Results
          </h1>
          <p className="text-gray-700 font-lato">
            {searchQuery && !searchResultsQuery.error && (
              <>
                Found <span className="text-orange-600 font-semibold">{totalResults}</span> recipes for{' '}
                <span className="text-orange-600 font-semibold">"{searchQuery}"</span>
              </>
            )}
          </p>
          {filters.difficulty.length + filters.diets.length + filters.cookingTime.length + filters.calories.length > 0 && (
            <p className="text-sm text-gray-500 font-lato mt-2">
              Filters are applied to your search results.
            </p>
          )}
        </div>

        {searchResultsQuery.isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-orange-600 animate-spin mb-4" />
            <p className="text-gray-500 font-lato">Searching recipes...</p>
          </div>
        ) : searchResultsQuery.error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
            <p className="text-red-600 font-lato text-lg mb-4">
              {searchResultsQuery.error.message || 'Failed to search recipes'}
            </p>
            <Button onClick={() => searchResultsQuery.refetch()} variant="outline" className="border-orange-600 text-orange-600">
              Retry
            </Button>
          </div>
        ) : allResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-gray-500 font-lato text-lg mb-4">
              {searchQuery ? `No recipes found for "${searchQuery}"` : 'Enter a search query to find recipes'}
            </p>
            <Button onClick={() => setLocation('/')} variant="outline">
              Back to Home
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {allResults.map((recipe: RecipeSummary) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>

            <div className="text-center mb-8 text-gray-600 font-lato">
              <p>Showing {allResults.length} recipes</p>
            </div>
          </>
        )}
      </div>

      <footer className="border-t border-gray-200 bg-gray-50 py-8 mt-16">
        <div className="container text-center text-gray-500 text-sm font-lato">
          <p>Recipe Finder Pro - Your culinary companion</p>
        </div>
      </footer>
    </div>
  );
}
