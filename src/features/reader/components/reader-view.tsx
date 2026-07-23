import { BackButton } from "@/components/back-button";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { ReaderPreferences } from "@/features/reader/components/reader-preferences";
import {
  readTextFile,
  saveReadingState,
} from "@/features/library/services/library-service";
import { useLibraryStore } from "@/stores/library.store";
import { useReaderStore } from "@/stores/reader.store";
import { useReadingFuncStore } from "@/stores/reading-func.store";
import { useSettingsStore } from "@/stores/settings.store";
import { PreferenceHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import styles from "./reader-view.module.css";

function parseScrollPosition(position: string | null): number {
  if (!position?.startsWith("scroll:")) return 0;
  const value = Number(position.slice("scroll:".length));
  return Number.isFinite(value) ? value : 0;
}

export function ReaderView() {
  const currentBook = useReaderStore((state) => state.currentBook);
  const progress = useReaderStore((state) => state.progress);
  const position = useReaderStore((state) => state.position);
  const setBook = useReaderStore((state) => state.setBook);
  const setProgress = useReaderStore((state) => state.setProgress);
  const setPosition = useReaderStore((state) => state.setPosition);
  const upsertBook = useLibraryStore((state) => state.upsertBook);
  const chromeVisible = useReadingFuncStore((state) => state.chromeVisible);
  const preferencesOpen = useReadingFuncStore((state) => state.preferencesOpen);
  const showChrome = useReadingFuncStore((state) => state.showChrome);
  const hideChrome = useReadingFuncStore((state) => state.hideChrome);
  const resetChrome = useReadingFuncStore((state) => state.resetChrome);
  const togglePreferences = useReadingFuncStore(
    (state) => state.togglePreferences,
  );
  const closePreferences = useReadingFuncStore(
    (state) => state.closePreferences,
  );
  const readingMode = useSettingsStore((state) => state.readingMode);
  const scrollSpeed = useSettingsStore((state) => state.scrollSpeed);
  const readerBackground = useSettingsStore((state) => state.readerBackground);
  const nightLight = useSettingsStore((state) => state.nightLight);

  const bookId = currentBook?.id ?? null;
  const bookPath = currentBook?.path ?? null;
  const bookFormat = currentBook?.format ?? null;

  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);
  const initialScrollRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollingRef = useRef(false);
  const scrollGateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const progressRef = useRef(progress);
  const positionRef = useRef(position);

  progressRef.current = progress;
  positionRef.current = position;

  function markScrolling() {
    scrollingRef.current = true;
    hideChrome();
    if (scrollGateTimerRef.current) clearTimeout(scrollGateTimerRef.current);
    scrollGateTimerRef.current = setTimeout(() => {
      scrollingRef.current = false;
      scrollGateTimerRef.current = null;
    }, 300);
  }

  useEffect(() => {
    resetChrome();
    return () => {
      resetChrome();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (scrollGateTimerRef.current) clearTimeout(scrollGateTimerRef.current);
    };
  }, [resetChrome]);

  useEffect(() => {
    restoredRef.current = false;

    if (!bookId || bookFormat !== "txt" || !bookPath) {
      setText(null);
      setError(null);
      setLoading(false);
      initialScrollRef.current = 0;
      return;
    }

    initialScrollRef.current = parseScrollPosition(
      useReaderStore.getState().position,
    );

    let cancelled = false;
    setLoading(true);
    setError(null);
    setText(null);

    void readTextFile(bookPath)
      .then((content) => {
        if (!cancelled) {
          setText(content);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bookId, bookPath, bookFormat]);

  useEffect(() => {
    if (!text || !bodyRef.current || restoredRef.current) return;
    bodyRef.current.scrollTop = initialScrollRef.current;
    restoredRef.current = true;
  }, [text, bookId]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    function onWheelNative(event: globalThis.WheelEvent) {
      const target = bodyRef.current;
      if (!target || !currentBook || currentBook.format !== "txt") {
        markScrolling();
        return;
      }

      event.preventDefault();
      markScrolling();

      if (readingMode === "paginated") {
        const direction = event.deltaY === 0 ? 0 : event.deltaY > 0 ? 1 : -1;
        if (direction === 0) return;
        target.scrollBy({
          top: direction * target.clientHeight,
          behavior: "smooth",
        });
        return;
      }

      target.scrollBy({ top: event.deltaY * (scrollSpeed / 100) });
    }

    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, [currentBook, readingMode, scrollSpeed, text, loading]);

  async function persistState(
    nextProgress: number,
    nextPosition: string | null,
  ) {
    if (!currentBook) return;
    try {
      const updated = await saveReadingState(
        currentBook.id,
        nextProgress,
        nextPosition,
      );
      setProgress(updated.progress);
      setPosition(updated.lastPosition ?? nextPosition);
      upsertBook(updated);
    } catch (err) {
      console.error("Failed to save reading state", err);
    }
  }

  function handleScroll() {
    const el = bodyRef.current;
    if (!el || !currentBook || currentBook.format !== "txt") return;

    markScrolling();

    const max = el.scrollHeight - el.clientHeight;
    const nextProgress =
      max <= 0
        ? 100
        : Math.min(100, Math.round((el.scrollTop / max) * 1000) / 10);
    const nextPosition = `scroll:${Math.round(el.scrollTop)}`;

    setProgress(nextProgress);
    setPosition(nextPosition);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persistState(nextProgress, nextPosition);
    }, 400);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    if (scrollingRef.current) return;

    // Wheel/trackpad scroll often synthesizes pointermove with no cursor delta.
    if (event.movementX === 0 && event.movementY === 0) {
      const prev = lastPointerRef.current;
      if (prev && prev.x === event.clientX && prev.y === event.clientY) {
        return;
      }
    }

    const next = { x: event.clientX, y: event.clientY };
    const prev = lastPointerRef.current;
    lastPointerRef.current = next;
    if (prev && prev.x === next.x && prev.y === next.y) return;

    showChrome();
  }

  function handleHeaderPointerEnter() {
    if (scrollingRef.current) return;
    showChrome();
  }

  function handlePreferences() {
    showChrome();
    togglePreferences();
  }

  async function handleBack() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (currentBook) {
      await persistState(progressRef.current, positionRef.current);
    }
    closePreferences();
    resetChrome();
    setBook(null);
  }

  if (!currentBook) {
    return (
      <EmptyState
        title="No book open"
        description="Open a book from your library to start reading."
      />
    );
  }

  const headerClass = [
    styles.header,
    chromeVisible ? styles.headerVisible : styles.headerHidden,
  ].join(" ");

  const bodyClass = [
    styles.body,
    readingMode === "paginated" ? styles.bodyPaginated : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={styles.root}
      data-reader-bg={readerBackground}
      onPointerMove={handlePointerMove}
    >
      <header
        className={headerClass}
        onPointerEnter={handleHeaderPointerEnter}
        aria-hidden={!chromeVisible}
      >
        <aside className={styles.actions}>
          <BackButton
            variant="plain"
            onBack={handleBack}
            tabIndex={chromeVisible ? 0 : -1}
          />
          <div className={styles.heading}>
            <h2 className={styles.title}>{currentBook.title}</h2>
            <p className={styles.subtitle}>
              {currentBook.author} · {currentBook.format.toUpperCase()}
              {progress > 0 ? ` · ${Math.round(progress)}%` : null}
            </p>
          </div>
        </aside>

        <Button
          variant="default"
          size="icon"
          icon={<HugeiconsIcon icon={PreferenceHorizontalIcon} size={16} />}
          onClick={handlePreferences}
          aria-label="Preferences"
          aria-expanded={preferencesOpen}
          tabIndex={chromeVisible ? 0 : -1}
        />
      </header>

      <div className={bodyClass} ref={bodyRef} onScroll={handleScroll}>
        {currentBook.format === "txt" ? (
          loading ? (
            <p className={styles.status}>Loading…</p>
          ) : error ? (
            <p className={styles.status} role="alert">
              {error}
            </p>
          ) : (
            <div
              role="presentation"
              className={readingMode === "paginated" ? styles.page : undefined}
            >
              <pre className={styles.text}>{text}</pre>
            </div>
          )
        ) : (
          <EmptyState
            title={`${currentBook.format.toUpperCase()} reader coming soon`}
            description="This format is indexed in your library. Full PDF and EPUB reading will land in a later release."
          />
        )}
      </div>

      {nightLight ? <div className={styles.nightLight} aria-hidden /> : null}

      <ReaderPreferences open={preferencesOpen} onClose={closePreferences} />
    </div>
  );
}
