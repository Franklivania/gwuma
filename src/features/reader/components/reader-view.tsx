import { BackButton } from "@/components/back-button";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EpubReaderPane } from "@/features/reader/components/epub-reader-pane";
import { PdfReaderPane } from "@/features/reader/components/pdf-reader-pane";
import { ReaderPreferences } from "@/features/reader/components/reader-preferences";
import {
  TxtReaderPane,
  type ReaderPaneHandle,
} from "@/features/reader/components/txt-reader-pane";
import { saveReadingState } from "@/features/library/services/library-service";
import { useLibraryStore } from "@/stores/library.store";
import { useReaderStore } from "@/stores/reader.store";
import { useReadingFuncStore } from "@/stores/reading-func.store";
import { useSettingsStore } from "@/stores/settings.store";
import { PreferenceHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useRef, type PointerEvent } from "react";
import styles from "./reader-view.module.css";

export function ReaderView() {
  const currentBook = useReaderStore((state) => state.currentBook);
  const progress = useReaderStore((state) => state.progress);
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

  const paneRef = useRef<ReaderPaneHandle>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollingRef = useRef(false);
  const scrollGateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const progressRef = useRef(progress);
  const positionRef = useRef<string | null>(useReaderStore.getState().position);

  progressRef.current = progress;

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
    positionRef.current = useReaderStore.getState().position;
  }, [currentBook?.id]);

  const persistState = useCallback(
    async (nextProgress: number, nextPosition: string | null) => {
      const book = useReaderStore.getState().currentBook;
      if (!book) return;
      try {
        const updated = await saveReadingState(
          book.id,
          nextProgress,
          nextPosition,
        );
        setProgress(updated.progress);
        setPosition(updated.lastPosition ?? nextPosition);
        upsertBook(updated);
      } catch (err) {
        console.error("Failed to save reading state", err);
      }
    },
    [setProgress, setPosition, upsertBook],
  );

  const handlePaneProgress = useCallback(
    (nextProgress: number, nextPosition: string) => {
      progressRef.current = nextProgress;
      positionRef.current = nextPosition;
      setProgress(nextProgress);
      setPosition(nextPosition);

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void persistState(nextProgress, nextPosition);
      }, 400);
    },
    [persistState, setProgress, setPosition],
  );

  const handleScrolling = useCallback(() => {
    markScrolling();
  }, [hideChrome]);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    if (scrollingRef.current) return;

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
      const paneProgress =
        paneRef.current?.getProgress() ?? progressRef.current;
      const panePosition =
        paneRef.current?.getPosition() ?? positionRef.current;
      await persistState(paneProgress, panePosition);
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

  const initialPosition = useReaderStore.getState().position;

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

      {currentBook.format === "txt" ? (
        <TxtReaderPane
          key={currentBook.id}
          ref={paneRef}
          bookId={currentBook.id}
          path={currentBook.path}
          initialPosition={initialPosition}
          readingMode={readingMode}
          scrollSpeed={scrollSpeed}
          onProgress={handlePaneProgress}
          onScrolling={handleScrolling}
        />
      ) : currentBook.format === "pdf" ? (
        <PdfReaderPane
          key={currentBook.id}
          ref={paneRef}
          bookId={currentBook.id}
          path={currentBook.path}
          initialPosition={initialPosition}
          readingMode={readingMode}
          onProgress={handlePaneProgress}
          onScrolling={handleScrolling}
        />
      ) : currentBook.format === "epub" ? (
        <EpubReaderPane
          key={currentBook.id}
          ref={paneRef}
          bookId={currentBook.id}
          path={currentBook.path}
          initialPosition={initialPosition}
          readingMode={readingMode}
          readerBackground={readerBackground}
          onProgress={handlePaneProgress}
          onScrolling={handleScrolling}
        />
      ) : (
        <div className={styles.body}>
          <EmptyState
            title="Unsupported format"
            description="This file type is not supported by the reader yet."
          />
        </div>
      )}

      {nightLight ? <div className={styles.nightLight} aria-hidden /> : null}

      <ReaderPreferences open={preferencesOpen} onClose={closePreferences} />
    </div>
  );
}
