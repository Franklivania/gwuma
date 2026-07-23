import styles from "./book-cover.module.css";
import type { BookCoverProps } from "./book-cover.types";

export function BookCover({ title, src, size = "md" }: BookCoverProps) {
  const classes = [styles.cover, styles[size]].join(" ");

  if (src) {
    return (
      <div className={classes}>
        <img className={styles.image} src={src} alt={title} />
      </div>
    );
  }

  return <div className={classes}>{title}</div>;
}
