import type { RingMetric } from "@/types";
import { useState } from "react";
import styles from "./activity-rings.module.css";

type ActivityRingsProps = {
  rings: RingMetric[];
  colors: [string, string, string];
};

const RADII = [54, 40, 26] as const;
const STROKE = 10;

function ringPath(percent: number, radius: number) {
  const clamped = Math.max(0, Math.min(100, percent)) / 100;
  const circumference = 2 * Math.PI * radius;
  return {
    dasharray: circumference,
    dashoffset: circumference * (1 - clamped),
  };
}

export function ActivityRings({ rings, colors }: ActivityRingsProps) {
  const [active, setActive] = useState<number | null>(null);
  const size = 140;
  const center = size / 2;

  return (
    <div className={styles.root}>
      <svg
        className={styles.svg}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Activity rings"
      >
        {rings.slice(0, 3).map((ring, index) => {
          const radius = RADII[index] ?? 26;
          const { dasharray, dashoffset } = ringPath(ring.percent, radius);
          return (
            <g key={ring.id}>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="var(--border-subtle)"
                strokeWidth={STROKE}
              />
              <circle
                className={styles.progress}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={colors[index]}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
                transform={`rotate(-90 ${center} ${center})`}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
              />
            </g>
          );
        })}
      </svg>

      {active !== null && rings[active] ? (
        <div className={styles.tooltip} role="tooltip">
          <span
            className={styles.swatch}
            style={{ background: colors[active] }}
          />
          <div>
            <div className={styles.tooltipLabel}>{rings[active].label}</div>
            <div className={styles.tooltipValue}>
              {rings[active].hidePercent
                ? rings[active].display
                : `${rings[active].display} · ${Math.round(rings[active].percent)}%`}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
