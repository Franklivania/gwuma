import { useEffect, useState } from "react";
import styles from "./book-cover.module.css";
import type { BookCoverProps } from "./book-cover.types";

export function BookCover({ title, src, size = "md" }: BookCoverProps) {
  const [failed, setFailed] = useState(false);
  const classes = [styles.cover, styles[size]].join(" ");

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      <div className={classes}>
        <img
          className={styles.image}
          src={src}
          alt={title}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return <div className={classes}>{title}</div>;
}
