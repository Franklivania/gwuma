import { create } from "zustand";
import {
  getSetting,
  setSetting,
} from "@/features/library/services/library-service";
import {
  SCROLL_SPEED_NOTCHES,
  THEME_IDS,
  type ReaderBackground,
  type ReadingMode,
  type ScrollSpeedPreset,
  type ThemeId,
} from "@/types";

type SettingsState = {
  theme: ThemeId;
  font: string;
  readerWidth: number;
  readingMode: ReadingMode;
  scrollSpeed: number;
  scrollSpeedPreset: ScrollSpeedPreset;
  readerBackground: ReaderBackground;
  nightLight: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setTheme: (theme: ThemeId) => void;
  setFont: (font: string) => void;
  setReaderWidth: (readerWidth: number) => void;
  setReadingMode: (readingMode: ReadingMode) => void;
  setScrollSpeedPreset: (preset: ScrollSpeedPreset) => void;
  setScrollSpeedCustom: (scrollSpeed: number) => void;
  setReaderBackground: (readerBackground: ReaderBackground) => void;
  setNightLight: (nightLight: boolean) => void;
};

function parseTheme(value: string | null): ThemeId | null {
  if (value && THEME_IDS.includes(value as ThemeId)) {
    return value as ThemeId;
  }
  return null;
}

function parseReadingMode(value: string | null): ReadingMode {
  return value === "paginated" ? "paginated" : "scroll";
}

function parseScrollSpeed(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(200, Math.max(1, Math.round(n)));
}

function parseScrollSpeedPreset(value: string | null): ScrollSpeedPreset {
  if (value === "custom") return "custom";
  const n = Number(value);
  if (
    SCROLL_SPEED_NOTCHES.includes(n as Exclude<ScrollSpeedPreset, "custom">)
  ) {
    return n as Exclude<ScrollSpeedPreset, "custom">;
  }
  return 80;
}

function parseReaderBackground(value: string | null): ReaderBackground {
  if (value === "black" || value === "white" || value === "theme") return value;
  return "theme";
}

function parseNightLight(value: string | null): boolean {
  return value === "true" || value === "1";
}

function persist(key: string, value: string) {
  void setSetting(key, value).catch((error) => {
    console.error(`Failed to save setting ${key}`, error);
  });
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: "dreamy",
  font: "Figtree",
  readerWidth: 720,
  readingMode: "scroll",
  scrollSpeed: 80,
  scrollSpeedPreset: 80,
  readerBackground: "theme",
  nightLight: false,
  hydrated: false,

  hydrate: async () => {
    try {
      const [themeRaw, modeRaw, speedRaw, presetRaw, bgRaw, nightRaw] =
        await Promise.all([
          getSetting("theme"),
          getSetting("readingMode"),
          getSetting("scrollSpeed"),
          getSetting("scrollSpeedPreset"),
          getSetting("readerBackground"),
          getSetting("nightLight"),
        ]);

      const scrollSpeedPreset = parseScrollSpeedPreset(presetRaw);
      const scrollSpeed =
        scrollSpeedPreset === "custom"
          ? parseScrollSpeed(speedRaw, 80)
          : scrollSpeedPreset;

      set({
        theme: parseTheme(themeRaw) ?? "dreamy",
        readingMode: parseReadingMode(modeRaw),
        scrollSpeed,
        scrollSpeedPreset,
        readerBackground: parseReaderBackground(bgRaw),
        nightLight: parseNightLight(nightRaw),
        hydrated: true,
      });
    } catch (error) {
      console.error("Failed to load settings from SQLite", error);
      set({ hydrated: true });
    }
  },

  setTheme: (theme) => {
    set({ theme });
    persist("theme", theme);
  },

  setFont: (font) => set({ font }),

  setReaderWidth: (readerWidth) => set({ readerWidth }),

  setReadingMode: (readingMode) => {
    set({ readingMode });
    persist("readingMode", readingMode);
  },

  setScrollSpeedPreset: (preset) => {
    if (preset === "custom") {
      set({ scrollSpeedPreset: "custom" });
      persist("scrollSpeedPreset", "custom");
      persist("scrollSpeed", String(get().scrollSpeed));
      return;
    }
    set({ scrollSpeedPreset: preset, scrollSpeed: preset });
    persist("scrollSpeedPreset", String(preset));
    persist("scrollSpeed", String(preset));
  },

  setScrollSpeedCustom: (scrollSpeed) => {
    const clamped = Math.min(200, Math.max(1, Math.round(scrollSpeed)));
    set({ scrollSpeedPreset: "custom", scrollSpeed: clamped });
    persist("scrollSpeedPreset", "custom");
    persist("scrollSpeed", String(clamped));
  },

  setReaderBackground: (readerBackground) => {
    set({ readerBackground });
    persist("readerBackground", readerBackground);
  },

  setNightLight: (nightLight) => {
    set({ nightLight });
    persist("nightLight", nightLight ? "true" : "false");
  },
}));
