/**
 * Theme Toggle Component
 * 
 * Design Philosophy: Culinary Kitchen Aesthetic
 * - Sun/Moon icon toggle
 * - Smooth transition
 * - Clear visual feedback
 */

import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '@/contexts/DarkModeContext';

export default function ThemeToggle() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-lg transition-all duration-300 hover:bg-orange-100 dark:hover:bg-gray-700"
      aria-label="Toggle dark mode"
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? (
        <Sun className="w-5 h-5 text-yellow-400" />
      ) : (
        <Moon className="w-5 h-5 text-gray-600" />
      )}
    </button>
  );
}
