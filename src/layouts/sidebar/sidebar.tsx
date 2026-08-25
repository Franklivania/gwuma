import { Tooltip } from "@/components/tooltip";
import { useLibraryStore } from "@/stores/library.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { useSearchOverlayStore } from "@/stores/search-overlay.store";
import type { AppView } from "@/types";
import {
  Analytics02Icon,
  Bookmark03Icon,
  FolderLibraryIcon,
  LibraryIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  Search01Icon,
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
    view: "bookmarks",
    label: "Bookmarks",
    icon: <HugeiconsIcon icon={Bookmark03Icon} />,
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
  const folders = useLibraryStore((state) => state.folders);
  const books = useLibraryStore((state) => state.books);
  const folderId = useLibraryStore((state) => state.filters.folderId);
  const setFilters = useLibraryStore((state) => state.setFilters);
  const addFolder = useLibraryStore((state) => state.addFolder);
  const openSearch = useSearchOverlayStore((state) => state.openSearch);

  const classes = [
    styles.sidebar,
    expanded ? null : styles.collapsed,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  function selectFolder(id: string | null) {
    setFilters({ folderId: id });
    replace("library");
  }

  const searchButton = (
    <button
      type="button"
      className={styles.item}
      onClick={openSearch}
      aria-label="Search library"
    >
      <HugeiconsIcon icon={Search01Icon} />
      <span className={styles.label}>Search</span>
      {expanded ? <kbd className={styles.shortcut}>Ctrl/⌘K</kbd> : null}
    </button>
  );

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

      <div className={styles.itemWrap}>
        {expanded ? (
          searchButton
        ) : (
          <Tooltip
            className={styles.tooltipRoot}
            content="Search (Ctrl/⌘K)"
            side="right"
          >
            {searchButton}
          </Tooltip>
        )}
      </div>

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

      <div className={styles.folders}>
        <div className={styles.foldersHeader}>
          {expanded ? (
            <>
              <span className={styles.foldersTitle}>Folders</span>
              <button
                type="button"
                className={styles.addFolder}
                onClick={() => void addFolder()}
              >
                Add
              </button>
            </>
          ) : (
            <Tooltip content="Add folder" side="right">
              <button
                type="button"
                className={styles.item}
                aria-label="Add folder"
                onClick={() => void addFolder()}
              >
                <HugeiconsIcon icon={FolderLibraryIcon} />
              </button>
            </Tooltip>
          )}
        </div>

        {expanded ? (
          <ul className={styles.folderList}>
            <li>
              <button
                type="button"
                className={[
                  styles.folderItem,
                  folderId === null ? styles.folderActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => selectFolder(null)}
              >
                <span className={styles.folderName}>All books</span>
                <span className={styles.folderCount}>{books.length}</span>
              </button>
            </li>
            {folders.map((folder) => {
              const count = books.filter(
                (book) => book.folderId === folder.id && book.available,
              ).length;
              return (
                <li key={folder.id}>
                  <button
                    type="button"
                    className={[
                      styles.folderItem,
                      folderId === folder.id ? styles.folderActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => selectFolder(folder.id)}
                    title={folder.path}
                  >
                    <span className={styles.folderText}>
                      <span className={styles.folderName}>{folder.name}</span>
                      <span className={styles.folderPath}>{folder.path}</span>
                    </span>
                    <span className={styles.folderCount}>{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </aside>
  );
}
