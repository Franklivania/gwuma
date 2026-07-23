import styles from "./card.module.css";
import type { CardProps } from "./card.types";

export function Card({ children, className }: CardProps) {
  const classes = [styles.card, className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
}
