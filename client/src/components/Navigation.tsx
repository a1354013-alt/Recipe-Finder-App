/**
 * Navigation Component
 * 
 * Design Philosophy: Culinary Kitchen Aesthetic
 * - Clean, warm top navigation
 * - Centered search input
 * - Orange accent for branding
 * - Elegant spacing and typography
 */

import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Search, ChefHat } from 'lucide-react';
import { Input } from '@/components/ui/input';
import ThemeToggle from './ThemeToggle';

interface NavigationProps {
  onSearch?: (query: string) => void;
}

export default function Navigation({ onSearch }: NavigationProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [location] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
      <div className="container py-4 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/">
          <a className="flex items-center gap-2 flex-shrink-0 group">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center group-hover:shadow-lg group-hover:shadow-accent/30 transition-all duration-300">
              <ChefHat className="w-6 h-6 text-accent-foreground" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-merriweather font-bold text-accent text-sm leading-tight">
                Recipe Finder
              </span>
              <span className="text-xs text-muted-foreground">Pro</span>
            </div>
          </a>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-accent"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* Navigation Links & Theme Toggle */}
        <div className="flex items-center gap-2">
          <Link href="/">
            <a
              className={`px-4 py-2 rounded-lg font-lato font-medium transition-all duration-300 ${
                location === '/'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground hover:bg-secondary hover:text-accent'
              }`}
            >
              Home
            </a>
          </Link>
          <Link href="/favorites">
            <a
              className={`px-4 py-2 rounded-lg font-lato font-medium transition-all duration-300 ${
                location === '/favorites'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground hover:bg-secondary hover:text-accent'
              }`}
            >
              ❤️ Favorites
            </a>
          </Link>
          <Link href="/ai-recognition">
            <a
              className={`px-4 py-2 rounded-lg font-lato font-medium transition-all duration-300 ${
                location === '/ai-recognition'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground hover:bg-secondary hover:text-accent'
              }`}
            >
              ✨ AI 識別
            </a>
          </Link>
          <Link href="/ai-settings">
            <a
              className={`px-4 py-2 rounded-lg font-lato font-medium transition-all duration-300 ${
                location === '/ai-settings'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground hover:bg-secondary hover:text-accent'
              }`}
            >
              ⚙️ 設定
            </a>
          </Link>
          <Link href="/ai-history">
            <a
              className={`px-4 py-2 rounded-lg font-lato font-medium transition-all duration-300 ${
                location === '/ai-history'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground hover:bg-secondary hover:text-accent'
              }`}
            >
              📜 History
            </a>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
