import { LibraryView } from "@/features/library/components";
import { ReaderView } from "@/features/reader/components";
import { SettingsView } from "@/features/settings/components";
import { StatisticsView } from "@/features/statistics/components";
import { useNavigationStore } from "@/stores/navigation.store";
import { Shell } from "./shell";

function CurrentView() {
  const currentView = useNavigationStore((state) => state.currentView);

  switch (currentView) {
    case "library":
      return <LibraryView />;
    case "reader":
      return <ReaderView />;
    case "settings":
      return <SettingsView />;
    case "statistics":
      return <StatisticsView />;
    default:
      return <LibraryView />;
  }
}

export function App() {
  return (
    <Shell>
      <CurrentView />
    </Shell>
  );
}
