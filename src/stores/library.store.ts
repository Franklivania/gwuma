import { create } from "zustand";
import {
  addFolder as addFolderCommand,
  pickFolder,
  refreshLibrary,
} from "@/features/library/services/library-service";
import { enrichPdfCovers } from "@/features/library/services/pdf-covers";
import type {
  Book,
  Folder,
  LibraryActivity,
  LibraryFilters,
  LibrarySort,
} from "@/types";

type LibraryState = {
  books: Book[];
  folders: Folder[];
  filters: LibraryFilters;
  sort: LibrarySort;
  activity: LibraryActivity;
  activityDetail: string | null;
  setFilters: (filters: Partial<LibraryFilters>) => void;
  setSort: (sort: LibrarySort) => void;
  setActivity: (activity: LibraryActivity, detail?: string | null) => void;
  upsertBook: (book: Book) => void;
  addFolder: () => Promise<void>;
  refresh: () => Promise<void>;
};

let doneIdleTimer: ReturnType<typeof setTimeout> | null = null;

function clearDoneIdleTimer() {
  if (doneIdleTimer !== null) {
    clearTimeout(doneIdleTimer);
    doneIdleTimer = null;
  }
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  folders: [],
  filters: { query: "", folderId: null },
  sort: "title",
  activity: "idle",
  activityDetail: null,

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  setSort: (sort) => {
    set({ sort });
  },

  setActivity: (activity, detail = null) => {
    set({ activity, activityDetail: detail });
  },

  upsertBook: (book) => {
    const books = get().books;
    const index = books.findIndex((entry) => entry.id === book.id);
    if (index === -1) {
      set({ books: [...books, book] });
      return;
    }
    const next = books.slice();
    next[index] = book;
    set({ books: next });
  },

  addFolder: async () => {
    const path = await pickFolder();
    if (!path) return;

    await addFolderCommand(path);
    await get().refresh();
  },

  refresh: async () => {
    clearDoneIdleTimer();

    get().setActivity("scanning", "library");

    try {
      get().setActivity("indexing", "SQLite");
      const snapshot = await refreshLibrary();
      set({ folders: snapshot.folders, books: snapshot.books });
      get().setActivity("done", `${snapshot.books.length} books`);

      doneIdleTimer = setTimeout(() => {
        if (get().activity === "done") {
          set({ activity: "idle", activityDetail: null });
        }
        doneIdleTimer = null;
      }, 2000);

      void enrichPdfCovers((book) => {
        get().upsertBook(book);
      });
    } catch (error) {
      console.error("Failed to refresh library", error);
      set({ activity: "idle", activityDetail: null });
    }
  },
}));
