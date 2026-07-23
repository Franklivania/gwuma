import styles from "./modal.module.css";
import type { ModalProps } from "./modal.types";

export function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) return null;

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title ? (
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            {onClose ? (
              <button type="button" className={styles.close} onClick={onClose}>
                ×
              </button>
            ) : null}
          </div>
        ) : null}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
