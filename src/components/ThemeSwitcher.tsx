'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

const FOCUS_RING = 'focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent-ring)] focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-base)]';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`p-2.5 min-h-[44px] min-w-[44px] bg-[var(--theme-bg-card)]
                 rounded-xl hover:bg-[var(--theme-bg-elevated)]
                 flex items-center justify-center active:scale-95 transition-transform ${FOCUS_RING}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}
