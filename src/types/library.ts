export type ReadingMode = "scroll" | "paginated";

export type ScrollSpeedPreset = 20 | 40 | 60 | 80 | 100 | "custom";

export type ReaderBackground = "theme" | "black" | "white";

export const SCROLL_SPEED_NOTCHES: Exclude<ScrollSpeedPreset, "custom">[] = [
  20, 40, 60, 80, 100,
];

export type LibrarySort = "title" | "author" | "recent" | "progress";

export type LibraryActivity = "idle" | "scanning" | "indexing" | "done";

export type ReadingStatus = "unread" | "reading" | "completed";

export type LibraryFilters = {
  query: string;
  folderId: string | null;
};

export type Book = {
  id: string;
  folderId: string;
  title: string;
  author: string;
  path: string;
  format: "pdf" | "epub" | "txt";
  coverUrl?: string | null;
  status: ReadingStatus;
  progress: number;
  lastPosition?: string | null;
  lastOpened?: string | null;
  favourite: boolean;
  available: boolean;
};

export type Folder = {
  id: string;
  name: string;
  path: string;
};

export type LibrarySnapshot = {
  folders: Folder[];
  books: Book[];
};
