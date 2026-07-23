import { LibraryView } from "@/features/library/components";
import { SettingsView } from "@/features/settings/components";
import { DialogHost } from "@/layouts/dialog-host";
import { Footer } from "@/layouts/footer";
import { MainContent } from "@/layouts/main-content";
import { Sidebar } from "@/layouts/sidebar";
import { useNavigationStore } from "@/stores/navigation.store";
import type { AppView } from "@/types";
import { useState } from "react";
import styles from "./app.module.css";

const VIEW_TITLES: Record<AppView, string> = {
  library: "Gwuma",
  reader: "Reader",
  settings: "Settings",
  statistics: "Statistics",
};

function CurrentView() {
  const currentView = useNavigationStore((state) => state.currentView);

  switch (currentView) {
    case "settings":
      return <SettingsView />;
    case "statistics":
      return <p>Statistics</p>;
    case "reader":
      return <p>Reader</p>;
    case "library":
    default:
      return <LibraryView />;
  }
}

export function App() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const currentView = useNavigationStore((state) => state.currentView);

  return (
    <div className={styles.root}>
      <div className={styles.body}>
        <Sidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded((value) => !value)}
        />
        <MainContent title={VIEW_TITLES[currentView]} className={styles.main}>
          <CurrentView />
        </MainContent>
      </div>
      <Footer />
      <DialogHost />
    </div>
  );
}
