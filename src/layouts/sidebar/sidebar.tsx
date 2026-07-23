import { Tooltip } from "@/components/tooltip";
import { useNavigationStore } from "@/stores/navigation.store";
import type { AppView } from "@/types";
import {
  Analytics02Icon,
  LibraryIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import styles from "./sidebar.module.css";
import type { SidebarProps } from "./sidebar.types";

const NAV_ITEMS: { view: AppView; label: string; icon: ReactNode }[] = [
  {
    view: "library",
    label: "Library",
    icon: <HugeiconsIcon icon={LibraryIcon} />,
  },
  {
    view: "statistics",
    label: "Statistics",
    icon: <HugeiconsIcon icon={Analytics02Icon} />,
  },
];

export function Sidebar({ className, expanded, onToggle }: SidebarProps) {
  const currentView = useNavigationStore((state) => state.currentView);
  const replace = useNavigationStore((state) => state.replace);
  const classes = [
    styles.sidebar,
    expanded ? null : styles.collapsed,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={classes}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        onClick={onToggle}
      >
        <HugeiconsIcon
          icon={expanded ? PanelLeftCloseIcon : PanelLeftOpenIcon}
        />
      </button>
      <nav className={styles.nav} aria-label="Main">
        {NAV_ITEMS.map((item) => {
          const isActive = currentView === item.view;
          const button = (
            <button
              type="button"
              className={[styles.item, isActive ? styles.active : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => replace(item.view)}
              aria-current={isActive ? "page" : undefined}
            >
              {item.icon}
              <span className={styles.label}>{item.label}</span>
            </button>
          );

          if (expanded) {
            return (
              <div key={item.view} className={styles.itemWrap}>
                {button}
              </div>
            );
          }

          return (
            <Tooltip
              key={item.view}
              className={styles.tooltipRoot}
              content={item.label}
              side="right"
            >
              {button}
            </Tooltip>
          );
        })}
      </nav>
    </aside>
  );
}
