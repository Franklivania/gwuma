import { LibraryView } from "@/features/library/components";
import { ReaderView } from "@/features/reader/components";
import { SettingsView } from "@/features/settings/components";
import { StatisticsView } from "@/features/statistics/components";
import { DialogHost } from "@/layouts/dialog-host";
import { Footer } from "@/layouts/footer";
import { MainContent } from "@/layouts/main-content";
import { Sidebar } from "@/layouts/sidebar";
import { useNavigationStore } from "@/stores/navigation.store";
import { useSettingsStore } from "@/stores/settings.store";
import type { AppView } from "@/types";
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
      return <StatisticsView />;
    case "reader":
      return <ReaderView />;
    case "library":
    default:
      return <LibraryView />;
  }
}

export function App() {
  const sidebarExpanded = useSettingsStore((state) => state.sidebarExpanded);
  const toggleSidebarExpanded = useSettingsStore(
    (state) => state.toggleSidebarExpanded,
  );
  const currentView = useNavigationStore((state) => state.currentView);

  return (
    <div className={styles.root}>
      <div className={styles.body}>
        <Sidebar expanded={sidebarExpanded} onToggle={toggleSidebarExpanded} />
        <MainContent title={VIEW_TITLES[currentView]} className={styles.main}>
          <CurrentView />
        </MainContent>
      </div>
      <Footer />
      <DialogHost />
    </div>
  );
}
