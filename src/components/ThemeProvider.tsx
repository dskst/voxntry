'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Safe localStorage helpers — fail silently in private browsing / restricted environments
function setStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem('voxntry-theme', theme);
  } catch {
    // Silently ignore — theme still works for current session via React state
  }
}

export function clearStoredTheme(): void {
  try {
    localStorage.removeItem('voxntry-theme');
  } catch {
    // Silently ignore
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize from DOM state set by the inline <head> script,
  // NOT from a hardcoded default. This prevents a reverse FOUC:
  // The inline script has already set .dark class correctly before React hydrates.
  // Reading classList here makes React's initial state match the page,
  // so the first classList.toggle effect is a no-op.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'dark'; // SSR fallback — inline script will correct before paint
  });

  // Apply theme to DOM (no-op on first mount when synced with inline script)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    setStoredTheme(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
