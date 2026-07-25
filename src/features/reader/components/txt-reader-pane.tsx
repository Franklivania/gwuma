import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { readTextFile } from "@/features/library/services/library-service";
import type { ReadingMode } from "@/types";
import styles from "./reader-view.module.css";

export type ReaderPaneHandle = {
  getProgress: () => number;
  getPosition: () => string | null;
};

type TxtReaderPaneProps = {
  bookId: string;
  path: string;
  initialPosition: string | null;
  readingMode: ReadingMode;
  scrollSpeed: number;
  onProgress: (progress: number, position: string) => void;
  onScrolling: () => void;
};

function parseScrollPosition(position: string | null): number {
  if (!position?.startsWith("scroll:")) return 0;
  const value = Number(position.slice("scroll:".length));
  return Number.isFinite(value) ? value : 0;
}

export const TxtReaderPane = forwardRef<ReaderPaneHandle, TxtReaderPaneProps>(
  function TxtReaderPane(
    {
      bookId,
      path,
      initialPosition,
      readingMode,
      scrollSpeed,
      onProgress,
      onScrolling,
    },
    ref,
  ) {
    const [text, setText] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const bodyRef = useRef<HTMLDivElement>(null);
    const restoredRef = useRef(false);
    const initialScrollRef = useRef(0);
    const progressRef = useRef(0);
    const positionRef = useRef<string | null>(initialPosition);

    useImperativeHandle(ref, () => ({
      getProgress: () => progressRef.current,
      getPosition: () => positionRef.current,
    }));

    useEffect(() => {
      restoredRef.current = false;
      initialScrollRef.current = parseScrollPosition(initialPosition);
      positionRef.current = initialPosition;

      let cancelled = false;
      setLoading(true);
      setError(null);
      setText(null);

      void readTextFile(path)
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
    }, [bookId, path]);

    useEffect(() => {
      if (!text || !bodyRef.current || restoredRef.current) return;
      bodyRef.current.scrollTop = initialScrollRef.current;
      restoredRef.current = true;
    }, [text, bookId]);

    useEffect(() => {
      const el = bodyRef.current;
      if (!el) return;

      function onWheelNative(event: WheelEvent) {
        const target = bodyRef.current;
        if (!target) return;

        event.preventDefault();
        onScrolling();

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
    }, [readingMode, scrollSpeed, text, loading, onScrolling]);

    function handleScroll() {
      const el = bodyRef.current;
      if (!el) return;

      onScrolling();

      const max = el.scrollHeight - el.clientHeight;
      const nextProgress =
        max <= 0
          ? 100
          : Math.min(100, Math.round((el.scrollTop / max) * 1000) / 10);
      const nextPosition = `scroll:${Math.round(el.scrollTop)}`;

      progressRef.current = nextProgress;
      positionRef.current = nextPosition;
      onProgress(nextProgress, nextPosition);
    }

    const bodyClass = [
      styles.body,
      readingMode === "paginated" ? styles.bodyPaginated : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={bodyClass} ref={bodyRef} onScroll={handleScroll}>
        {loading ? (
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
        )}
      </div>
    );
  },
);
