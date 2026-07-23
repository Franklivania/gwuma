import { DialogHost } from "@/layouts/dialog-host";
import { MainContent } from "@/layouts/main-content";
import { Sidebar } from "@/layouts/sidebar";
import { StatusBar } from "@/layouts/status-bar";
import { useNavigationStore } from "@/stores/navigation.store";
import type { AppView } from "@/types";
import type { ReactNode } from "react";
import styles from "./shell.module.css";

const VIEW_TITLES: Record<AppView, string> = {
  library: "Library",
  reader: "Reader",
  settings: "Settings",
  statistics: "Statistics",
};

type ShellProps = {
  children: ReactNode;
};

export function Shell({ children }: ShellProps) {
  const currentView = useNavigationStore((state) => state.currentView);

  return (
    <div className={styles.shell}>
      <div className={styles.body}>
        <Sidebar />
        <MainContent title={VIEW_TITLES[currentView]}>{children}</MainContent>
      </div>
      <StatusBar />
      <DialogHost />
    </div>
  );
}
