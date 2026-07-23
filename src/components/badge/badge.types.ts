import type { ReactNode } from "react";

export type BadgeVariant =
  "default" | "accent" | "success" | "warning" | "danger";

export type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
};
