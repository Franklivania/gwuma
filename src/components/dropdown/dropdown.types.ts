import type { ReactNode } from "react";

export type DropdownOption = {
  value: string;
  label: string;
};

export type DropdownProps = {
  label?: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  children?: ReactNode;
};
