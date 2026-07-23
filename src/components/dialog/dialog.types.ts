import type { ReactNode } from "react";

export type DialogProps = {
  title?: string;
  children: ReactNode;
  onClose?: () => void;
};
