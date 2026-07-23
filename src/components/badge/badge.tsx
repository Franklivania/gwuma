import styles from "./badge.module.css";
import type { BadgeProps } from "./badge.types";

export function Badge({ children, variant = "default" }: BadgeProps) {
  const classes = [styles.badge, styles[variant]].join(" ");
  return <span className={classes}>{children}</span>;
}
