import { ActionMenu } from "@/components/action-menu";
import { BookCover } from "@/components/book-cover";
import type { Book } from "@/types";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import styles from "./library-view.module.css";

const CELL_MIN = 120;
const GAP = 16;
const ROW_ESTIMATE = 220;
const OVERSCAN = 2;

type VirtualBookGridProps = {
  books: Book[];
  onOpen: (book: Book) => void;
  onRemove: (book: Book) => void;
  onToggleFavourite: (book: Book) => void;
};

export function VirtualBookGrid({
  books,
  onOpen,
  onRemove,
  onToggleFavourite,
}: VirtualBookGridProps) {
  const scrollerRef = useRef<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const scroller =
      (root.closest("[data-main-scroll]") as HTMLElement | null) ??
      (root.closest("main") as HTMLElement | null) ??
      (document.querySelector("[data-main-scroll]") as HTMLElement | null);

    scrollerRef.current = scroller;

    const onScroll = () => {
      if (!scroller) return;
      setScrollTop(scroller.scrollTop);
      setViewportHeight(scroller.clientHeight);
    };

    onScroll();
    scroller?.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
      if (scroller) setViewportHeight(scroller.clientHeight);
    });
    ro.observe(root);
    if (scroller) ro.observe(scroller);

    return () => {
      scroller?.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, []);

  const columns = Math.max(1, Math.floor((width + GAP) / (CELL_MIN + GAP)));
  const rowCount = Math.ceil(books.length / columns) || 0;

  const offsetTop = useMemo(() => {
    const root = rootRef.current;
    const scroller = scrollerRef.current;
    if (!root || !scroller) return 0;
    const rootRect = root.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    return rootRect.top - scrollerRect.top + scroller.scrollTop;
  }, [scrollTop, width, books.length]);

  const startRow = Math.max(
    0,
    Math.floor((scrollTop - offsetTop) / ROW_ESTIMATE) - OVERSCAN,
  );
  const endRow = Math.min(
    rowCount,
    Math.ceil((scrollTop - offsetTop + viewportHeight) / ROW_ESTIMATE) +
      OVERSCAN,
  );

  const startIndex = startRow * columns;
  const endIndex = Math.min(books.length, endRow * columns);
  const visible = books.slice(startIndex, endIndex);

  const paddingTop = startRow * ROW_ESTIMATE;
  const paddingBottom = Math.max(0, (rowCount - endRow) * ROW_ESTIMATE);

  const gridStyle = useMemo(
    () =>
      ({
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }) as CSSProperties,
    [columns],
  );

  const measureOffset = useCallback(() => {
    setScrollTop((value) => value);
  }, []);

  useEffect(() => {
    measureOffset();
  }, [books.length, measureOffset]);

  return (
    <div ref={rootRef} className={styles.virtualRoot}>
      <div style={{ height: paddingTop }} aria-hidden />
      <ul className={styles.grid} style={gridStyle}>
        {visible.map((book) => (
          <li key={book.id} className={styles.bookCell}>
            <ActionMenu
              className={styles.bookMenu}
              label={`Actions for ${book.title}`}
              items={[
                {
                  id: "favourite",
                  label: book.favourite
                    ? "Remove bookmark"
                    : "Add to bookmarks",
                  onSelect: () => onToggleFavourite(book),
                },
                {
                  id: "remove",
                  label: "Remove from library",
                  danger: true,
                  onSelect: () => onRemove(book),
                },
              ]}
            >
              <button
                type="button"
                className={styles.book}
                onClick={() => onOpen(book)}
              >
                <BookCover
                  title={book.title}
                  src={book.coverUrl ?? undefined}
                  size="lg"
                  lazy
                />
                <span className={styles.bookMeta}>
                  <span className={styles.bookTitle}>{book.title}</span>
                  <span className={styles.bookAuthor}>{book.author}</span>
                  <span className={styles.bookFormat}>
                    {book.format.toUpperCase()}
                    {book.progress > 0
                      ? ` · ${Math.round(book.progress)}%`
                      : null}
                  </span>
                </span>
              </button>
            </ActionMenu>
          </li>
        ))}
      </ul>
      <div style={{ height: paddingBottom }} aria-hidden />
    </div>
  );
}
