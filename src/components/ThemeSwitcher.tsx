'use client';

import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from './ThemeProvider';

const FOCUS_RING = 'focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent-ring)] focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-base)]';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // クライアント側でマウントされるまで待つ（SSR/Hydration mismatch回避）
  useEffect(() => {
    // This is intentional for SSR/Hydration mismatch prevention
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

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
      {/* マウント前はデフォルトアイコンを表示してHydration mismatchを防ぐ */}
      {!mounted ? <Moon size={20} /> : (isDark ? <Moon size={20} /> : <Sun size={20} />)}
    </button>
  );
}
