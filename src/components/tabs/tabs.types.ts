import type { ReactNode } from "react";

export type TabItem = {
  id: string;
  label: string;
  content: ReactNode;
};

export type TabsProps = {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
};
