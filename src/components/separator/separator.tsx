import styles from "./separator.module.css";
import type { SeparatorProps } from "./separator.types";

export function Separator({
  orientation = "horizontal",
  className,
  decorative = true,
}: SeparatorProps) {
  const classes = [styles.separator, styles[orientation], className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
    />
  );
}
