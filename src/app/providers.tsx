import { useLibraryStore } from "@/stores/library.store";
import { useSettingsStore } from "@/stores/settings.store";
import { useEffect, type ReactNode } from "react";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    void useLibraryStore.getState().refresh();
  }, []);

  return <>{children}</>;
}
