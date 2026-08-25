import type { ActivityCardSummary } from "@/types";
import { ActivityRings } from "./activity-rings";
import { WeekBarChart } from "./week-bar-chart";
import styles from "./activity-card.module.css";

type ActivityCardProps = {
  title: string;
  summary: ActivityCardSummary;
  colors: [string, string, string];
  /** For weekly books bars vs time bars */
  barMetric?: "hours" | "books";
};

export function ActivityCard({
  title,
  summary,
  colors,
  barMetric = "hours",
}: ActivityCardProps) {
  const useBars = summary.chart === "bars" && summary.weekDays?.length === 7;

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
      </header>

      <div className={styles.metrics}>
        <div>
          <div className={styles.metricValue}>{summary.headlinePrimary}</div>
          <div className={styles.metricLabel}>
            {summary.headlinePrimaryLabel}
          </div>
        </div>
        <div>
          <div className={styles.metricValue}>{summary.headlineSecondary}</div>
          <div className={styles.metricLabel}>
            {summary.headlineSecondaryLabel}
          </div>
        </div>
      </div>

      {useBars && summary.weekDays ? (
        <WeekBarChart
          days={summary.weekDays}
          metric={barMetric}
          barColor={colors[0]}
        />
      ) : (
        <ActivityRings rings={summary.rings} colors={colors} />
      )}

      <ul className={styles.list}>
        {summary.rings.map((ring, index) => (
          <li key={ring.id} className={styles.row}>
            <span
              className={styles.swatch}
              style={{ background: colors[index % colors.length] }}
              aria-hidden
            />
            <span className={styles.rowLabel}>{ring.label}</span>
            <span className={styles.rowValue}>{ring.display}</span>
            {ring.hidePercent ? (
              <span className={styles.rowPercent} />
            ) : (
              <span className={styles.rowPercent}>
                {Math.round(ring.percent)}%
              </span>
            )}
          </li>
        ))}
        {summary.peakDay && !summary.rings.some((r) => r.id === "peak_day") ? (
          <li className={styles.row}>
            <span
              className={styles.swatch}
              style={{ background: colors[2] }}
              aria-hidden
            />
            <span className={styles.rowLabel}>Peak day</span>
            <span className={styles.rowValue}>{summary.peakDay}</span>
            <span className={styles.rowPercent} />
          </li>
        ) : null}
      </ul>
    </article>
  );
}
