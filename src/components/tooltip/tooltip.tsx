import styles from "./tooltip.module.css";
import type { TooltipProps } from "./tooltip.types";

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <span className={styles.root}>
      {children}
      <span className={styles.tip} role="tooltip">
        {content}
      </span>
    </span>
  );
}
