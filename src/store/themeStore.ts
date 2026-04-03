import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ColorMode = 'light' | 'dark';

interface ThemeState {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      colorMode: 'light',
      setColorMode: (colorMode) => set({ colorMode }),
      toggleColorMode: () =>
        set({ colorMode: get().colorMode === 'dark' ? 'light' : 'dark' }),
    }),
    { name: 'veltroqis-theme', partialize: (s) => ({ colorMode: s.colorMode }) }
  )
);

/** Apply `dark` class on <html> — call from useLayoutEffect when colorMode changes. */
export function syncDocumentTheme(mode: ColorMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark');
}
