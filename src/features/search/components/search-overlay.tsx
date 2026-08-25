import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { BookCover } from "@/components/book-cover";
import { Input } from "@/components/input";
import { Modal } from "@/components/modal";
import { openBook as openBookCommand } from "@/features/library/services/library-service";
import { searchLibrary } from "@/features/statistics/services/statistics-service";
import { useLibraryStore } from "@/stores/library.store";
import { useNavigationStore } from "@/stores/navigation.store";
import { useReaderStore } from "@/stores/reader.store";
import { useReadingSessionStore } from "@/stores/reading-session.store";
import { useSearchOverlayStore } from "@/stores/search-overlay.store";
import type { AppView, SearchHit } from "@/types";
import {
  BookOpen01Icon,
  LibraryIcon,
  QuoteDownIcon,
  Search01Icon,
  Settings02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./search-overlay.module.css";

const KIND_LABEL: Record<SearchHit["kind"], string> = {
  title: "Titles",
  author: "Authors",
  phrase: "In book",
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function useModLabel(): string {
  const [mod, setMod] = useState("Ctrl");
  useEffect(() => {
    const platform =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).userAgentData?.platform ?? navigator.platform ?? "";
    setMod(/mac/i.test(String(platform)) ? "⌘" : "Ctrl");
  }, []);
  return mod;
}

type GuideRow = {
  id: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  shortcut?: string;
  action?: () => void;
};

export function SearchOverlay() {
  const open = useSearchOverlayStore((state) => state.open);
  const closeSearch = useSearchOverlayStore((state) => state.closeSearch);
  const openSearch = useSearchOverlayStore((state) => state.openSearch);
  const upsertBook = useLibraryStore((state) => state.upsertBook);
  const push = useNavigationStore((state) => state.push);
  const replace = useNavigationStore((state) => state.replace);
  const mod = useModLabel();

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function goTo(view: AppView) {
    closeSearch();
    replace(view);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod) return;
      const key = event.key.toLowerCase();

      if (key === "k") {
        event.preventDefault();
        openSearch();
        return;
      }

      if (isEditableTarget(event.target) && !open) return;

      if (key === "o") {
        event.preventDefault();
        closeSearch();
        replace("library");
        return;
      }

      if (key === "s") {
        event.preventDefault();
        closeSearch();
        replace("settings");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeSearch, open, openSearch, replace]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHits([]);
      setActiveIndex(0);
      return;
    }
    const timer = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      void searchLibrary(q)
        .then((results) => {
          if (cancelled) return;
          setHits(results);
          setActiveIndex(0);
        })
        .catch((error) => {
          console.error("Search failed", error);
          if (!cancelled) setHits([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  const groups = useMemo(() => {
    const order: SearchHit["kind"][] = ["title", "author", "phrase"];
    return order
      .map((kind) => ({
        kind,
        items: hits.filter((hit) => hit.kind === kind),
      }))
      .filter((group) => group.items.length > 0);
  }, [hits]);

  const flatHits = useMemo(
    () => groups.flatMap((group) => group.items),
    [groups],
  );

  const showEmptyGuide = query.trim().length < 2;

  const shortcutRows: GuideRow[] = [
    {
      id: "search",
      icon: <HugeiconsIcon icon={Search01Icon} size={18} />,
      title: "Search library",
      subtitle: "Find books by title, author, or text inside them.",
      shortcut: `${mod}K`,
      action: () => inputRef.current?.focus(),
    },
    {
      id: "library",
      icon: <HugeiconsIcon icon={LibraryIcon} size={18} />,
      title: "Open library",
      subtitle: "Browse folders and recently read books.",
      shortcut: `${mod}O`,
      action: () => goTo("library"),
    },
    {
      id: "settings",
      icon: <HugeiconsIcon icon={Settings02Icon} size={18} />,
      title: "Open settings",
      subtitle: "Themes, reading mode, and preferences.",
      shortcut: `${mod}S`,
      action: () => goTo("settings"),
    },
  ];

  const searchGuideRows: GuideRow[] = [
    {
      id: "titles",
      icon: <HugeiconsIcon icon={BookOpen01Icon} size={18} />,
      title: "Titles",
      subtitle: "Match book names in your library.",
    },
    {
      id: "authors",
      icon: <HugeiconsIcon icon={UserIcon} size={18} />,
      title: "Authors",
      subtitle: "Find books by writer.",
    },
    {
      id: "phrases",
      icon: <HugeiconsIcon icon={QuoteDownIcon} size={18} />,
      title: "Phrases",
      subtitle: "Search words inside indexed books.",
    },
  ];

  async function openHit(hit: SearchHit) {
    try {
      const { book, sessionId } = await openBookCommand(hit.bookId);
      useReaderStore.getState().applyBookState(book);
      useReadingSessionStore.getState().setSessionId(sessionId);
      upsertBook(book);
      closeSearch();
      push("reader");
    } catch (error) {
      console.error("Failed to open search result", error);
    }
  }

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (showEmptyGuide) {
      if (event.key === "Escape") {
        closeSearch();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        flatHits.length === 0 ? 0 : (index + 1) % flatHits.length,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        flatHits.length === 0
          ? 0
          : (index - 1 + flatHits.length) % flatHits.length,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const hit = flatHits[activeIndex];
      if (hit) void openHit(hit);
    } else if (event.key === "Escape") {
      closeSearch();
    }
  }

  return (
    <Modal open={open} title="Search library" onClose={closeSearch}>
      <div className={styles.root}>
        <div className={styles.searchRow}>
          <HugeiconsIcon
            icon={Search01Icon}
            size={18}
            className={styles.searchIcon}
          />
          <Input
            ref={inputRef}
            className={styles.searchInput}
            placeholder="Search titles, authors, or phrases…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            autoComplete="off"
          />
          <kbd className={styles.modHint}>{mod}K</kbd>
        </div>

        <p className={styles.hint}>
          {loading
            ? "Searching…"
            : showEmptyGuide
              ? "Type at least 2 characters to search"
              : flatHits.length === 0
                ? "No matches"
                : `${flatHits.length} results`}
        </p>

        {showEmptyGuide ? (
          <div className={styles.guide}>
            <section className={styles.guideSection}>
              <h3 className={styles.guideTitle}>Shortcuts</h3>
              <ul className={styles.guideList}>
                {shortcutRows.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={styles.guideRow}
                      onClick={() => row.action?.()}
                    >
                      <span className={styles.guideIcon}>{row.icon}</span>
                      <span className={styles.guideText}>
                        <span className={styles.guideRowTitle}>
                          {row.title}
                        </span>
                        <span className={styles.guideRowSub}>
                          {row.subtitle}
                        </span>
                      </span>
                      {row.shortcut ? (
                        <kbd className={styles.rowShortcut}>{row.shortcut}</kbd>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <div className={styles.divider} />

            <section className={styles.guideSection}>
              <h3 className={styles.guideTitle}>How to search</h3>
              <ul className={styles.guideList}>
                {searchGuideRows.map((row) => (
                  <li key={row.id} className={styles.guideRowStatic}>
                    <span className={styles.guideIcon}>{row.icon}</span>
                    <span className={styles.guideText}>
                      <span className={styles.guideRowTitle}>{row.title}</span>
                      <span className={styles.guideRowSub}>{row.subtitle}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <footer className={styles.footer}>
              <span>
                <kbd className={styles.footerKey}>↑</kbd>
                <kbd className={styles.footerKey}>↓</kbd>
                navigate
              </span>
              <span>
                <kbd className={styles.footerKey}>↵</kbd>
                open
              </span>
              <span>
                <kbd className={styles.footerKey}>esc</kbd>
                close
              </span>
            </footer>
          </div>
        ) : (
          <div className={styles.results}>
            {groups.map((group) => (
              <section key={group.kind} className={styles.group}>
                <h3 className={styles.groupTitle}>{KIND_LABEL[group.kind]}</h3>
                <ul className={styles.list}>
                  {group.items.map((hit) => {
                    const flatIndex = flatHits.findIndex(
                      (entry) =>
                        entry.bookId === hit.bookId && entry.kind === hit.kind,
                    );
                    const isActive = flatIndex === activeIndex;
                    return (
                      <li key={`${hit.kind}-${hit.bookId}`}>
                        <button
                          type="button"
                          className={[
                            styles.hit,
                            isActive ? styles.hitActive : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => void openHit(hit)}
                          onMouseEnter={() => setActiveIndex(flatIndex)}
                        >
                          <BookCover
                            title={hit.title}
                            src={hit.coverUrl ?? undefined}
                            size="sm"
                          />
                          <span className={styles.hitMeta}>
                            <span className={styles.hitTitle}>{hit.title}</span>
                            <span className={styles.hitAuthor}>
                              {hit.author}
                            </span>
                            {hit.snippet ? (
                              <span className={styles.hitSnippet}>
                                {hit.snippet}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
