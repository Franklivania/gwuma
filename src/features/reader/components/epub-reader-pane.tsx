import { Button } from "@/components/button";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { readFileBytes } from "@/features/library/services/library-service";
import { EpubEngine, getBookBytes } from "@/features/reader/engines";
import type { ReaderBackground, ReadingMode } from "@/types";
import type { ReaderPaneHandle } from "./txt-reader-pane";
import styles from "./reader-view.module.css";

type EpubReaderPaneProps = {
  bookId: string;
  path: string;
  initialPosition: string | null;
  readingMode: ReadingMode;
  readerBackground: ReaderBackground;
  onProgress: (progress: number, position: string) => void;
  onScrolling: () => void;
};

function isCancelledError(err: unknown): boolean {
  return err instanceof Error && /cancelled/i.test(err.message);
}

export const EpubReaderPane = forwardRef<ReaderPaneHandle, EpubReaderPaneProps>(
  function EpubReaderPane(
    {
      bookId,
      path,
      initialPosition,
      readingMode,
      readerBackground,
      onProgress,
      onScrolling,
    },
    ref,
  ) {
    const hostRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<EpubEngine | null>(null);
    const readingModeRef = useRef(readingMode);
    readingModeRef.current = readingMode;
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const progressRef = useRef(0);
    const positionRef = useRef<string | null>(initialPosition);

    useImperativeHandle(ref, () => ({
      getProgress: () =>
        engineRef.current?.getProgress() ?? progressRef.current,
      getPosition: () =>
        engineRef.current?.getPosition() ?? positionRef.current,
    }));

    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;

      let cancelled = false;
      const engine = new EpubEngine();
      engineRef.current = engine;

      function pushState() {
        const nextProgress = engine.getProgress();
        const nextPosition = engine.getPosition();
        if (!nextPosition) return;
        progressRef.current = nextProgress;
        positionRef.current = nextPosition;
        onProgress(nextProgress, nextPosition);
        onScrolling();
      }

      engine.bind(host, pushState);
      setLoading(true);
      setError(null);

      void (async () => {
        try {
          const bytes = await getBookBytes(path, () => readFileBytes(path));
          if (cancelled) return;

          if (initialPosition) {
            await engine.jumpTo(initialPosition);
          }

          await engine.open({
            bytes,
            path,
            readingMode: readingModeRef.current,
            bookId,
          });
          if (cancelled) return;

          engine.applyTheme(readerBackground);
          pushState();
          setLoading(false);
        } catch (err) {
          if (cancelled || isCancelledError(err)) return;
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
        void engine.close();
        if (engineRef.current === engine) engineRef.current = null;
      };
    }, [bookId, path]);

    useEffect(() => {
      const engine = engineRef.current;
      if (!engine || loading || error) return;
      void engine.setReadingMode(readingMode);
    }, [readingMode, loading, error]);

    useEffect(() => {
      const engine = engineRef.current;
      if (!engine || loading || error) return;
      engine.applyTheme(readerBackground);
    }, [readerBackground, loading, error]);

    async function go(direction: "next" | "previous") {
      const engine = engineRef.current;
      if (!engine) return;
      onScrolling();
      if (direction === "next") await engine.next();
      else await engine.previous();
    }

    const hostClass = [styles.epubHost, loading ? styles.epubHostLoading : ""]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={styles.enginePane}>
        {loading ? <p className={styles.engineStatus}>Loading EPUB…</p> : null}
        {error ? (
          <p className={styles.engineStatus} role="alert">
            {error}
          </p>
        ) : null}
        <div ref={hostRef} className={hostClass} />
        {!loading && !error ? (
          <div className={styles.pageNav} role="group" aria-label="Page">
            <Button
              variant="default"
              size="icon"
              icon={<HugeiconsIcon icon={ArrowLeft01Icon} size={16} />}
              onClick={() => void go("previous")}
              aria-label="Previous page"
            />
            <Button
              variant="default"
              size="icon"
              icon={<HugeiconsIcon icon={ArrowRight01Icon} size={16} />}
              onClick={() => void go("next")}
              aria-label="Next page"
            />
          </div>
        ) : null}
      </div>
    );
  },
);
