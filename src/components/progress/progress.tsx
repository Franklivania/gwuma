import styles from "./progress.module.css";
import type { ProgressProps } from "./progress.types";

export function Progress({ value, max = 100, label }: ProgressProps) {
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = max === 0 ? 0 : (clamped / max) * 100;

  return (
    <div className={styles.root}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
