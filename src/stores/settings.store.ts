import { create } from "zustand";
import { THEME_IDS, type ReadingMode, type ThemeId } from "@/types";

const THEME_STORAGE_KEY = "gwuma.theme";

function readStoredTheme(): ThemeId {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value && THEME_IDS.includes(value as ThemeId)) {
      return value as ThemeId;
    }
  } catch {
    // localStorage unavailable
  }
  return "dreamy";
}

type SettingsState = {
  theme: ThemeId;
  font: string;
  readerWidth: number;
  scrollDistance: number;
  readingMode: ReadingMode;
  setTheme: (theme: ThemeId) => void;
  setFont: (font: string) => void;
  setReaderWidth: (readerWidth: number) => void;
  setScrollDistance: (scrollDistance: number) => void;
  setReadingMode: (readingMode: ReadingMode) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: readStoredTheme(),
  font: "Figtree",
  readerWidth: 720,
  scrollDistance: 80,
  readingMode: "scroll",

  setTheme: (theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
    set({ theme });
  },

  setFont: (font) => set({ font }),
  setReaderWidth: (readerWidth) => set({ readerWidth }),
  setScrollDistance: (scrollDistance) => set({ scrollDistance }),
  setReadingMode: (readingMode) => set({ readingMode }),
}));
