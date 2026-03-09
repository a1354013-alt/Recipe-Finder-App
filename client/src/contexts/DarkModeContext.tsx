/**
 * Dark Mode Context
 * 
 * Manages dark mode state and theme persistence
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeStorage } from '@/lib/storage';

interface DarkModeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load theme preference on mount
  useEffect(() => {
    const savedTheme = ThemeStorage.get();
    setIsDarkMode(savedTheme === 'dark');
    setIsLoaded(true);
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!isLoaded) return;

    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    ThemeStorage.set(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode, isLoaded]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error('useDarkMode must be used within DarkModeProvider');
  }
  return context;
}
