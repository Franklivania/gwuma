import type { ButtonProps } from "@/components/button";

export type BackButtonPosition = "left" | "right";

export type BackButtonProps = Omit<
  ButtonProps,
  "icon" | "iconPosition" | "children"
> & {
  /** When true, shows the label next to the icon. Default: icon only. */
  addText?: boolean;
  /** Icon placement relative to the label when `addText` is true. */
  position?: BackButtonPosition;
  /** Label used when `addText` is true. */
  label?: string;
  /** Icon size in px for the default back arrow. */
  iconSize?: number;
  /**
   * Runs before navigating back. Use for cleanup (e.g. save progress).
   * Navigation still pops one history step afterward when possible.
   */
  onBack?: () => void | Promise<void>;
};
