export type ReadingMode = "scroll" | "paginated";

export type LibrarySort = "title" | "author" | "recent" | "progress";

export type LibraryActivity = "idle" | "scanning" | "indexing" | "done";

export type LibraryFilters = {
  query: string;
  folderId: string | null;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  path: string;
  format: "pdf" | "epub" | "txt";
  coverUrl?: string;
  progress: number;
};

export type Folder = {
  id: string;
  name: string;
  path: string;
};
