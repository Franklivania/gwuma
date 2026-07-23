import { useNavigationStore } from "@/stores/navigation.store";
import type { AppView } from "@/types";
import styles from "./sidebar.module.css";
import type { SidebarProps } from "./sidebar.types";

const NAV_ITEMS: { view: AppView; label: string }[] = [
  { view: "library", label: "Library" },
  { view: "reader", label: "Reader" },
  { view: "statistics", label: "Statistics" },
  { view: "settings", label: "Settings" },
];

export function Sidebar({ className }: SidebarProps) {
  const currentView = useNavigationStore((state) => state.currentView);
  const replace = useNavigationStore((state) => state.replace);
  const classes = [styles.sidebar, className].filter(Boolean).join(" ");

  return (
    <aside className={classes}>
      <div className={styles.brand}>Gwuma</div>
      <nav className={styles.nav} aria-label="Main">
        {NAV_ITEMS.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              type="button"
              className={[styles.item, isActive ? styles.active : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => replace(item.view)}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
