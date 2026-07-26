import {
  addFolder,
  setSetting,
} from "@/features/library/services/library-service";
import { useLibraryStore } from "@/stores/library.store";
import { useSettingsStore } from "@/stores/settings.store";
import { THEME_IDS, type ThemeId } from "@/types";
import { useEffect, type ReactNode } from "react";

type ProvidersProps = {
  children: ReactNode;
};

const LEGACY_FOLDERS_KEY = "gwuma.watched-folders";
const LEGACY_THEME_KEY = "gwuma.theme";

async function migrateLegacyLocalStorage() {
  try {
    const themeRaw = localStorage.getItem(LEGACY_THEME_KEY);
    if (themeRaw && THEME_IDS.includes(themeRaw as ThemeId)) {
      await setSetting("theme", themeRaw);
      localStorage.removeItem(LEGACY_THEME_KEY);
    }

    const foldersRaw = localStorage.getItem(LEGACY_FOLDERS_KEY);
    if (foldersRaw) {
      const parsed = JSON.parse(foldersRaw) as Array<{ path?: string }>;
      if (Array.isArray(parsed)) {
        for (const folder of parsed) {
          if (typeof folder?.path === "string" && folder.path.length > 0) {
            await addFolder(folder.path);
          }
        }
      }
      localStorage.removeItem(LEGACY_FOLDERS_KEY);
    }
  } catch (error) {
    console.error("Legacy localStorage migration failed", error);
  }
}

export function Providers({ children }: ProvidersProps) {
  const theme = useSettingsStore((state) => state.theme);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    void (async () => {
      await migrateLegacyLocalStorage();
      await hydrateSettings();
      await useLibraryStore.getState().refresh();
    })();
  }, [hydrateSettings]);

  return <>{children}</>;
}
