import type { ReactNode } from "react";

export type TooltipSide = "top" | "right" | "bottom" | "left";

export type TooltipProps = {
  content: string;
  children: ReactNode;
  side?: TooltipSide;
  className?: string;
};
