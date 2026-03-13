/**
 * Search Results Page
 * 
 * Design Philosophy: Culinary Kitchen Aesthetic
 * - Clean search results layout
 * - Advanced filtering support
 * - Pagination support
 * - Empty state handling
 */

import { useEffect, useState } from 'react';
import { useSearch, useLocation } from 'wouter';
import Navigation from '@/components/Navigation';
import AdvancedFilters, { FilterState } from '@/components/AdvancedFilters';
import RecipeCard from '@/components/RecipeCard';
import { Recipe, searchRecipes } from '@/lib/recipes';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SearchResults() {
  const query = useSearch();
  const [, setLocation] = useLocation();
  const [results, setResults] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    cookingTime: [],
    calories: [],
    difficulty: [],
    diets: [],
  });

  const searchQuery = new URLSearchParams(query).get('q') || '';

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setCurrentPage(1);
      try {
        const response = await searchRecipes(searchQuery, 0, 12, filters);
        setResults(response.results);
        setTotalResults(response.totalResults);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error searching recipes:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [searchQuery, filters]);

  const handleSearch = (newQuery: string) => {
    setLocation(`/search?q=${encodeURIComponent(newQuery)}`);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const loadMore = async () => {
    try {
      const response = await searchRecipes(searchQuery, currentPage * 12, 12, filters);
      setResults((prev) => [...prev, ...response.results]);
      setCurrentPage(currentPage + 1);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error loading more results:', error);
      }
    }
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
            {searchQuery && (
              <>
                Found <span className="text-orange-600 font-semibold">{totalResults}</span> recipes for{' '}
                <span className="text-orange-600 font-semibold">"{searchQuery}"</span>
              </>
            )}
          </p>
        </div>

        {/* Results */}
        {loading && results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-orange-600 animate-spin mb-4" />
            <p className="text-gray-500 font-lato">Searching recipes...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-gray-500 font-lato text-lg mb-4">
              No recipes found for "{searchQuery}"
            </p>
            <Button onClick={() => setLocation('/')} variant="outline">
              Back to Home
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {results.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>

            {/* Load More Button */}
            {results.length < totalResults && (
              <div className="flex justify-center">
                <Button
                  onClick={loadMore}
                  variant="outline"
                  className="border-orange-600 text-orange-600 hover:bg-orange-50"
                >
                  Load More Recipes
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
