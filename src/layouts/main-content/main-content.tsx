import { TopBar } from "@/layouts/top-bar";
import styles from "./main-content.module.css";
import type { MainContentProps } from "./main-content.types";

export function MainContent({ children, title, className }: MainContentProps) {
  const classes = [styles.region, className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <TopBar title={title} />
      <div className={styles.body}>{children}</div>
    </div>
  );
}
