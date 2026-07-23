export type DialogId =
  "settings" | "folder-picker" | "bookmark" | "confirm" | "about";

export type DialogEntry = {
  id: DialogId;
  title?: string;
  payload?: Record<string, unknown>;
};
