import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';
interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);
const KEY = 'hubenov.theme.v3'; // fresh key: default light, persisted only on explicit toggle

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof localStorage === 'undefined') return 'light';
    const stored = localStorage.getItem(KEY) as Theme | null;
    // Default to light; only an explicit (persisted) toggle switches to dark.
    return stored === 'dark' || stored === 'light' ? stored : 'light';
  });

  // Apply the class only. We deliberately do NOT persist here — auto-persisting
  // on mount would re-save the default and override the user's intent.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const value = useMemo<ThemeCtx>(
    () => ({
      theme,
      toggle: () =>
        setTheme((t) => {
          const next = t === 'dark' ? 'light' : 'dark';
          try {
            localStorage.setItem(KEY, next); // persist only the explicit choice
          } catch {
            /* ignore */
          }
          return next;
        }),
    }),
    [theme],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
