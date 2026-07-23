import styles from "./tooltip.module.css";
import type { TooltipProps } from "./tooltip.types";

export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: TooltipProps) {
  const classes = [styles.root, className].filter(Boolean).join(" ");

  return (
    <span className={classes}>
      {children}
      <span className={[styles.tip, styles[side]].join(" ")} role="tooltip">
        {content}
      </span>
    </span>
  );
}
