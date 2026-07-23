import styles from "./button.module.css";
import type { ButtonProps, ButtonSize, ButtonVariant } from "./button.types";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  default: styles.primary,
  primary: styles.primary,
  secondary: styles.secondary,
  tertiary: styles.tertiary,
  accent: styles.accent,
  plain: styles.plain,
  outline: styles.outline,
  danger: styles.danger,
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  default: styles.md,
  md: styles.md,
  lg: styles.lg,
  sm: styles.sm,
  icon: styles.icon,
};

export function Button({
  variant = "primary",
  size = "default",
  icon,
  iconPosition = "end",
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    styles.button,
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const showBoxedIcon = Boolean(icon && children && size !== "icon");
  const iconNode = icon ? (
    <span
      className={[styles.iconSlot, showBoxedIcon ? styles.iconSlotBoxed : null]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={children ? true : undefined}
    >
      {icon}
    </span>
  ) : null;

  return (
    <button type={type} className={classes} {...rest}>
      {iconNode && iconPosition === "start" ? iconNode : null}
      {children}
      {iconNode && iconPosition === "end" ? iconNode : null}
    </button>
  );
}
