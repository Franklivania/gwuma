import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonSize = "default" | "lg" | "md" | "sm" | "icon";

export type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "tertiary"
  | "accent"
  | "plain"
  | "outline"
  | "danger";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: "start" | "end";
  children?: ReactNode;
};
