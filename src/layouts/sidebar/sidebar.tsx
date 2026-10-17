import { ActionMenu } from "@/components/action-menu";
import { ConfirmModal } from "@/components/confirm-modal";
import { Tooltip } from "@/components/tooltip";
import { useLibraryStore } from "@/stores/library.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { useSearchOverlayStore } from "@/stores/search-overlay.store";
import { IMPORTED_FOLDER_PATH, type AppView, type Folder } from "@/types";
import {
  Analytics02Icon,
  BookPlusIcon,
  Bookmark03Icon,
  FolderAddIcon,
  LibraryIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState, type ReactNode } from "react";
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
  const addBooks = useLibraryStore((state) => state.addBooks);
  const removeFolder = useLibraryStore((state) => state.removeFolder);
  const openSearch = useSearchOverlayStore((state) => state.openSearch);

  const [pendingRemove, setPendingRemove] = useState<Folder | null>(null);

  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const book of books) {
      if (!book.available) continue;
      counts.set(book.folderId, (counts.get(book.folderId) ?? 0) + 1);
    }
    return counts;
  }, [books]);

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
              <div className={styles.folderActions}>
                <button
                  type="button"
                  className={styles.addFolder}
                  onClick={() => void addBooks()}
                >
                  Book
                </button>
                <button
                  type="button"
                  className={styles.addFolder}
                  onClick={() => void addFolder()}
                >
                  Folder
                </button>
              </div>
            </>
          ) : (
            <div className={styles.collapsedAddActions}>
              <Tooltip
                className={styles.tooltipRoot}
                content="Add book"
                side="right"
              >
                <button
                  type="button"
                  className={styles.collapsedAdd}
                  aria-label="Add book"
                  onClick={() => void addBooks()}
                >
                  <HugeiconsIcon icon={BookPlusIcon} size={20} />
                </button>
              </Tooltip>
              <Tooltip
                className={styles.tooltipRoot}
                content="Add folder"
                side="right"
              >
                <button
                  type="button"
                  className={styles.collapsedAdd}
                  aria-label="Add folder"
                  onClick={() => void addFolder()}
                >
                  <HugeiconsIcon icon={FolderAddIcon} size={20} />
                </button>
              </Tooltip>
            </div>
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
              const count = folderCounts.get(folder.id) ?? 0;
              const isImported = folder.path === IMPORTED_FOLDER_PATH;
              const pathLabel = isImported ? "Added individually" : folder.path;

              return (
                <li key={folder.id}>
                  <ActionMenu
                    className={styles.folderMenu}
                    label={`Actions for ${folder.name}`}
                    showTrigger={!isImported}
                    items={
                      isImported
                        ? []
                        : [
                            {
                              id: "remove",
                              label: "Remove folder",
                              danger: true,
                              onSelect: () => setPendingRemove(folder),
                            },
                          ]
                    }
                  >
                    <button
                      type="button"
                      className={[
                        styles.folderItem,
                        folderId === folder.id ? styles.folderActive : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => selectFolder(folder.id)}
                      title={pathLabel}
                    >
                      <span className={styles.folderText}>
                        <span className={styles.folderName}>{folder.name}</span>
                        <span className={styles.folderPath}>{pathLabel}</span>
                      </span>
                      <span className={styles.folderCount}>{count}</span>
                    </button>
                  </ActionMenu>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <ConfirmModal
        open={pendingRemove !== null}
        title="Remove folder"
        message={
          pendingRemove
            ? `Remove “${pendingRemove.name}” and its ${folderCounts.get(pendingRemove.id) ?? 0} books from Gwuma? Files on disk are not deleted.`
            : ""
        }
        confirmLabel="Remove"
        danger
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => {
          if (!pendingRemove) return;
          const id = pendingRemove.id;
          setPendingRemove(null);
          void removeFolder(id).catch((error) => {
            console.error("Failed to remove folder", error);
          });
        }}
      />
    </aside>
  );
}
