import styles from "./empty-state.module.css";
import type { EmptyStateProps } from "./empty-state.types";

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.root}>
      <h2 className={styles.title}>{title}</h2>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
