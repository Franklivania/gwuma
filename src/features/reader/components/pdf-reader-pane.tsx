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
import { getBookBytes, PdfEngine } from "@/features/reader/engines";
import type { ReadingMode } from "@/types";
import type { ReaderPaneHandle } from "./txt-reader-pane";
import styles from "./reader-view.module.css";

type PdfReaderPaneProps = {
  bookId: string;
  path: string;
  initialPosition: string | null;
  readingMode: ReadingMode;
  onProgress: (progress: number, position: string) => void;
  onScrolling: () => void;
};

function isCancelledError(err: unknown): boolean {
  return err instanceof Error && /cancelled/i.test(err.message);
}

export const PdfReaderPane = forwardRef<ReaderPaneHandle, PdfReaderPaneProps>(
  function PdfReaderPane(
    { bookId, path, initialPosition, readingMode, onProgress, onScrolling },
    ref,
  ) {
    const hostRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<PdfEngine | null>(null);
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
      let restoring = true;
      const engine = new PdfEngine();
      engineRef.current = engine;

      function pushState() {
        if (restoring || cancelled) return;
        const nextProgress = engine.getProgress();
        const nextPosition = engine.getPosition();
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
          await engine.open({
            bytes,
            path,
            readingMode: readingModeRef.current,
            bookId,
            initialPosition,
          });
          if (cancelled) return;
          restoring = false;
          pushState();
          setLoading(false);
        } catch (err) {
          if (cancelled || isCancelledError(err)) return;
          restoring = false;
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
      void engine.setReadingMode(readingMode).then(() => {
        const nextProgress = engine.getProgress();
        const nextPosition = engine.getPosition();
        progressRef.current = nextProgress;
        positionRef.current = nextPosition;
        onProgress(nextProgress, nextPosition);
      });
    }, [readingMode, loading, error, onProgress]);

    async function go(direction: "next" | "previous") {
      const engine = engineRef.current;
      if (!engine) return;
      onScrolling();
      if (direction === "next") await engine.next();
      else await engine.previous();
    }

    const hostClass = [
      styles.engineHost,
      loading ? styles.engineHostLoading : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={styles.enginePane}>
        {loading ? <p className={styles.engineStatus}>Loading PDF…</p> : null}
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
