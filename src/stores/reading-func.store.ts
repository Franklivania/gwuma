import { create } from "zustand";

const CHROME_IDLE_MS = 2000;

type ReadingFuncState = {
  chromeVisible: boolean;
  preferencesOpen: boolean;
  showChrome: () => void;
  hideChrome: () => void;
  resetChrome: () => void;
  openPreferences: () => void;
  closePreferences: () => void;
  togglePreferences: () => void;
};

let chromeIdleTimer: ReturnType<typeof setTimeout> | null = null;

function clearChromeIdleTimer() {
  if (chromeIdleTimer !== null) {
    clearTimeout(chromeIdleTimer);
    chromeIdleTimer = null;
  }
}

function scheduleChromeIdleHide(hide: () => void) {
  clearChromeIdleTimer();
  chromeIdleTimer = setTimeout(() => {
    chromeIdleTimer = null;
    hide();
  }, CHROME_IDLE_MS);
}

export const useReadingFuncStore = create<ReadingFuncState>((set, get) => ({
  chromeVisible: true,
  preferencesOpen: false,

  showChrome: () => {
    set({ chromeVisible: true });
    if (get().preferencesOpen) {
      clearChromeIdleTimer();
      return;
    }
    scheduleChromeIdleHide(() => {
      if (!get().preferencesOpen) get().hideChrome();
    });
  },

  hideChrome: () => {
    if (get().preferencesOpen) return;
    clearChromeIdleTimer();
    set({ chromeVisible: false });
  },

  resetChrome: () => {
    clearChromeIdleTimer();
    set({ chromeVisible: true, preferencesOpen: false });
  },

  openPreferences: () => {
    clearChromeIdleTimer();
    set({ preferencesOpen: true, chromeVisible: true });
  },

  closePreferences: () => {
    set({ preferencesOpen: false });
    scheduleChromeIdleHide(() => {
      if (!get().preferencesOpen) get().hideChrome();
    });
  },

  togglePreferences: () => {
    if (get().preferencesOpen) {
      get().closePreferences();
    } else {
      get().openPreferences();
    }
  },
}));
