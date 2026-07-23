import { useLibraryStore } from "@/stores/library.store";
import { useNavigationStore } from "@/stores/navigation.store";
import styles from "./status-bar.module.css";
import type { StatusBarProps } from "./status-bar.types";

export function StatusBar({ className }: StatusBarProps) {
  const currentView = useNavigationStore((state) => state.currentView);
  const bookCount = useLibraryStore((state) => state.books.length);
  const classes = [styles.statusBar, className].filter(Boolean).join(" ");

  return (
    <footer className={classes}>
      <span>{currentView}</span>
      <span>{bookCount} books</span>
    </footer>
  );
}
