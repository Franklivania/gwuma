import styles from "./top-bar.module.css";
import type { TopBarProps } from "./top-bar.types";

export function TopBar({ title, className }: TopBarProps) {
  const classes = [styles.topBar, className].filter(Boolean).join(" ");

  return (
    <header className={classes}>
      {title ? <h1 className={styles.title}>{title}</h1> : null}
    </header>
  );
}
