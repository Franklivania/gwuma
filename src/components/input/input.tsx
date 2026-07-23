import styles from "./input.module.css";
import type { InputProps } from "./input.types";

export function Input({ label, hint, id, className, ...rest }: InputProps) {
  const inputId =
    id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const classes = [styles.input, className].filter(Boolean).join(" ");

  return (
    <label className={styles.field} htmlFor={inputId}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <input id={inputId} className={classes} {...rest} />
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </label>
  );
}
