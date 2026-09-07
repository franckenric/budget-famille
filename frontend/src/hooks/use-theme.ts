import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTheme } from '@/store';

export function useTheme() {
  const theme = useAppSelector((s) => s.settings.theme);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'auto' && systemDark);

    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    if (theme === 'auto') {
      const handler = (e: MediaQueryListEvent) => {
        root.classList.toggle('dark', e.matches);
        root.style.colorScheme = e.matches ? 'dark' : 'light';
      };
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
  }, [theme]);

  return {
    theme,
    isDark: theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches),
    toggleTheme: () => {
      const next: 'light' | 'dark' = theme === 'dark' ? 'light' : 'dark';
      dispatch(setTheme(next));
    },
    setTheme: (t: 'auto' | 'light' | 'dark') => dispatch(setTheme(t)),
  };
}
