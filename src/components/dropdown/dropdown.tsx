import styles from "./dropdown.module.css";
import type { DropdownProps } from "./dropdown.types";

export function Dropdown({ label, value, options, onChange }: DropdownProps) {
  return (
    <label className={styles.field}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <select
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
