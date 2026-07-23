import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { readTextFile } from "@/features/library/services/library-service";
import { useNavigationStore } from "@/stores/navigation.store";
import { useReaderStore } from "@/stores/reader.store";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import styles from "./reader-view.module.css";

export function ReaderView() {
  const currentBook = useReaderStore((state) => state.currentBook);
  const setBook = useReaderStore((state) => state.setBook);
  const pop = useNavigationStore((state) => state.pop);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentBook || currentBook.format !== "txt") {
      setText(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setText(null);

    void readTextFile(currentBook.path)
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
  }, [currentBook]);

  function handleBack() {
    setBook(null);
    pop();
  }

  if (!currentBook) {
    return (
      <EmptyState
        title="No book open"
        description="Open a book from your library to start reading."
      />
    );
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Button
          variant="plain"
          size="icon"
          icon={<HugeiconsIcon icon={ArrowLeft01Icon} size={16} />}
          onClick={handleBack}
          aria-label="Back"
        />
        <div className={styles.heading}>
          <h2 className={styles.title}>{currentBook.title}</h2>
          <p className={styles.subtitle}>
            {currentBook.author} · {currentBook.format.toUpperCase()}
          </p>
        </div>
      </header>

      <div className={styles.body}>
        {currentBook.format === "txt" ? (
          loading ? (
            <p className={styles.status}>Loading…</p>
          ) : error ? (
            <p className={styles.status} role="alert">
              {error}
            </p>
          ) : (
            <pre className={styles.text}>{text}</pre>
          )
        ) : (
          <EmptyState
            title={`${currentBook.format.toUpperCase()} reader coming soon`}
            description="This format is indexed in your library. Full PDF and EPUB reading will land in a later release."
          />
        )}
      </div>
    </div>
  );
}
