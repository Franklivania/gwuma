import { useLibraryStore } from "@/stores/library.store";
import type { LibraryActivity } from "@/types";
import styles from "./footer.module.css";
import type { FooterProps } from "./footer.types";

function readinessLabel(activity: LibraryActivity): string {
  switch (activity) {
    case "scanning":
    case "indexing":
      return "Busy";
    case "done":
    case "idle":
    default:
      return "Ready";
  }
}

function processLabel(
  activity: LibraryActivity,
  detail: string | null,
): string | null {
  switch (activity) {
    case "scanning":
      return detail ? `Scanning folders… ${detail}` : "Scanning folders…";
    case "indexing":
      return detail ? `Indexing… ${detail}` : "Indexing…";
    case "done":
      return "Done";
    case "idle":
    default:
      return null;
  }
}

function bookCountLabel(count: number): string {
  return count === 1 ? "1 book" : `${count} books`;
}

export function Footer({ className }: FooterProps) {
  const activity = useLibraryStore((state) => state.activity);
  const activityDetail = useLibraryStore((state) => state.activityDetail);
  const bookCount = useLibraryStore((state) => state.books.length);
  const classes = [styles.footer, className].filter(Boolean).join(" ");
  const process = processLabel(activity, activityDetail);

  return (
    <footer className={classes}>
      <div className={styles.left}>
        <span className={styles.status}>{readinessLabel(activity)}</span>
      </div>
      <div className={styles.right}>
        {process ? (
          <>
            <span className={styles.meta}>{process}</span>
            <span className={styles.divider} aria-hidden>
              ·
            </span>
          </>
        ) : null}
        <span className={styles.meta}>{bookCountLabel(bookCount)}</span>
      </div>
    </footer>
  );
}
