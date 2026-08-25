import { Dropdown } from "@/components/dropdown";
import { EmptyState } from "@/components/empty-state";
import { ActivityCard } from "@/features/statistics/components/activity-card";
import { useStatisticsStore } from "@/stores/statistics.store";
import type { StatsPeriod } from "@/types";
import { useEffect } from "react";
import styles from "./statistics-view.module.css";

const PERIOD_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const TIME_COLORS: [string, string, string] = [
  "var(--accent)",
  "var(--warning)",
  "var(--danger)",
];

const BOOKS_COLORS: [string, string, string] = [
  "var(--accent)",
  "var(--success)",
  "var(--warning)",
];

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function StatisticsView() {
  const period = useStatisticsStore((state) => state.period);
  const summary = useStatisticsStore((state) => state.summary);
  const bookStats = useStatisticsStore((state) => state.bookStats);
  const loading = useStatisticsStore((state) => state.loading);
  const error = useStatisticsStore((state) => state.error);
  const setPeriod = useStatisticsStore((state) => state.setPeriod);
  const load = useStatisticsStore((state) => state.load);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Reading activity</h2>
          <p className={styles.subtitle}>
            Keep track of you reading habits over time. Know what's got you
            moving, and how you spend your time.
          </p>
        </div>
        <Dropdown
          value={period}
          options={PERIOD_OPTIONS}
          onChange={(value) => setPeriod(value as StatsPeriod)}
        />
      </header>

      {error ? (
        <EmptyState title="Could not load statistics" description={error} />
      ) : null}

      {summary ? (
        <div className={styles.cards}>
          <ActivityCard
            title="Time"
            summary={summary.time}
            colors={TIME_COLORS}
            barMetric="hours"
          />
          <ActivityCard
            title="Books"
            summary={summary.books}
            colors={BOOKS_COLORS}
            barMetric="books"
          />
        </div>
      ) : loading ? (
        <EmptyState
          title="Loading statistics"
          description="Gathering your reading activity…"
        />
      ) : null}

      <section className={styles.listSection}>
        <h3 className={styles.listTitle}>Books read</h3>
        {bookStats.length === 0 ? (
          <EmptyState
            title="No book stats yet"
            description="Open and read books to build your history."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Started</th>
                  <th>Finished</th>
                  <th>Duration</th>
                  <th>Opens</th>
                </tr>
              </thead>
              <tbody>
                {bookStats.map((entry) => (
                  <tr key={entry.bookId}>
                    <td>
                      <div className={styles.bookTitle}>{entry.title}</div>
                      <div className={styles.bookAuthor}>{entry.author}</div>
                    </td>
                    <td>{formatDate(entry.startedAt)}</td>
                    <td>{formatDate(entry.finishedAt)}</td>
                    <td>{formatDuration(entry.totalReadMs)}</td>
                    <td>{entry.openCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
