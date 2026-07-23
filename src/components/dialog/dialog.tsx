import styles from "./dialog.module.css";
import type { DialogProps } from "./dialog.types";

export function Dialog({ title, children, onClose }: DialogProps) {
  return (
    <div className={styles.root}>
      {title ? <h2 className={styles.title}>{title}</h2> : null}
      <div className={styles.body}>{children}</div>
      {onClose ? (
        <div className={styles.actions}>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}
