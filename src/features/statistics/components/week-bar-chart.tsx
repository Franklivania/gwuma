import type { WeekDayStat } from "@/types";
import styles from "./week-bar-chart.module.css";

type WeekBarChartProps = {
  days: WeekDayStat[];
  /** Which value drives bar height */
  metric: "hours" | "books";
  barColor?: string;
};

function formatAxisHours(ms: number): string {
  if (ms <= 0) return "0";
  const hours = ms / 3_600_000;
  if (hours < 1) return `${Math.round(ms / 60_000)}m`;
  if (hours < 10) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours)}h`;
}

export function WeekBarChart({
  days,
  metric,
  barColor = "var(--accent)",
}: WeekBarChartProps) {
  const values = days.map((day) =>
    metric === "hours" ? day.hoursMs : day.booksOpened,
  );
  const maxValue = Math.max(0, ...values);

  const majorFractions = [0, 0.5, 1];
  const minorFractions = [0.25, 0.75];

  return (
    <div className={styles.root} role="img" aria-label="Weekly activity chart">
      <div className={styles.plot}>
        <div className={styles.grid} aria-hidden>
          {majorFractions.map((fraction) => (
            <div
              key={`major-${fraction}`}
              className={styles.majorLine}
              style={{ bottom: `${fraction * 100}%` }}
            />
          ))}
          {minorFractions.map((fraction) => (
            <div
              key={`minor-${fraction}`}
              className={styles.minorLine}
              style={{ bottom: `${fraction * 100}%` }}
            />
          ))}
        </div>

        <div className={styles.yLabels} aria-hidden>
          <span>
            {metric === "hours"
              ? formatAxisHours(maxValue)
              : String(maxValue || 0)}
          </span>
          <span>
            {metric === "hours"
              ? formatAxisHours(maxValue / 2)
              : String(Math.round(maxValue / 2) || 0)}
          </span>
          <span>0</span>
        </div>

        <div className={styles.bars}>
          {days.map((day, index) => {
            const value = values[index] ?? 0;
            const heightPct =
              maxValue > 0 ? Math.max(0, (value / maxValue) * 100) : 0;
            return (
              <div key={day.dayKey} className={styles.barCol}>
                <div className={styles.barTrack}>
                  <div
                    className={styles.bar}
                    style={{
                      height: `${heightPct}%`,
                      background: barColor,
                    }}
                    title={
                      metric === "hours"
                        ? `${day.weekday}: ${formatAxisHours(value)}`
                        : `${day.weekday}: ${value} books`
                    }
                  />
                </div>
                <span className={styles.dayLabel}>{day.weekday}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
