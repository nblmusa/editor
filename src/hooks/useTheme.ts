import { useEffect } from 'react';
import type { ThemeName } from '@/types';
import { useMediaQuery } from './useMediaQuery';

export function useResolvedTheme(theme: ThemeName): 'dark' | 'light' {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'dark' ? '#0c0e13' : '#f6f7f9');
  }, [resolved]);

  return resolved;
}
