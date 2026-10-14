import { create } from "zustand";
import {
  addBooks as addBooksCommand,
  addFolder as addFolderCommand,
  pickBooks,
  pickFolder,
  refreshLibrary,
  removeBook as removeBookCommand,
  removeFolder as removeFolderCommand,
} from "@/features/library/services/library-service";
import {
  cancelPdfCoverEnrichment,
  enrichPdfCovers,
} from "@/features/library/services/pdf-covers";
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
  upsertBooks: (books: Book[]) => void;
  addFolder: () => Promise<void>;
  addBooks: () => Promise<void>;
  removeFolder: (id: string) => Promise<void>;
  removeBook: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  startCoverEnrichment: () => void;
  pauseCoverEnrichment: () => void;
};

let doneIdleTimer: ReturnType<typeof setTimeout> | null = null;
let coversPaused = false;

function clearDoneIdleTimer() {
  if (doneIdleTimer !== null) {
    clearTimeout(doneIdleTimer);
    doneIdleTimer = null;
  }
}

function applySnapshot(
  set: (partial: Partial<LibraryState>) => void,
  snapshot: { folders: Folder[]; books: Book[] },
) {
  set({ folders: snapshot.folders, books: snapshot.books });
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

  upsertBooks: (incoming) => {
    if (incoming.length === 0) return;
    const byId = new Map(get().books.map((book) => [book.id, book]));
    for (const book of incoming) {
      byId.set(book.id, book);
    }
    set({ books: Array.from(byId.values()) });
  },

  addFolder: async () => {
    const path = await pickFolder();
    if (!path) return;

    await addFolderCommand(path);
    await get().refresh();
  },

  addBooks: async () => {
    const paths = await pickBooks();
    if (paths.length === 0) return;

    clearDoneIdleTimer();
    get().setActivity("indexing", "books");
    try {
      const snapshot = await addBooksCommand(paths);
      applySnapshot(set, snapshot);
      get().setActivity("done", `${snapshot.books.length} books`);
      doneIdleTimer = setTimeout(() => {
        if (get().activity === "done") {
          set({ activity: "idle", activityDetail: null });
        }
        doneIdleTimer = null;
      }, 2000);
      get().startCoverEnrichment();
    } catch (error) {
      console.error("Failed to add books", error);
      set({ activity: "idle", activityDetail: null });
    }
  },

  removeFolder: async (id) => {
    await removeFolderCommand(id);
    const { filters } = get();
    set({
      folders: get().folders.filter((folder) => folder.id !== id),
      books: get().books.filter((book) => book.folderId !== id),
      filters:
        filters.folderId === id ? { ...filters, folderId: null } : filters,
    });
  },

  removeBook: async (id) => {
    await removeBookCommand(id);
    set({ books: get().books.filter((book) => book.id !== id) });
  },

  refresh: async () => {
    clearDoneIdleTimer();
    cancelPdfCoverEnrichment();

    get().setActivity("scanning", "library");

    try {
      get().setActivity("indexing", "SQLite");
      const snapshot = await refreshLibrary();
      applySnapshot(set, snapshot);
      get().setActivity("done", `${snapshot.books.length} books`);

      doneIdleTimer = setTimeout(() => {
        if (get().activity === "done") {
          set({ activity: "idle", activityDetail: null });
        }
        doneIdleTimer = null;
      }, 2000);

      get().startCoverEnrichment();
    } catch (error) {
      console.error("Failed to refresh library", error);
      set({ activity: "idle", activityDetail: null });
    }
  },

  startCoverEnrichment: () => {
    if (coversPaused) return;
    void enrichPdfCovers({
      onBatch: (books) => get().upsertBooks(books),
      onStatus: (detail) => {
        if (get().activity === "idle" || get().activity === "done") {
          get().setActivity("indexing", detail);
        }
      },
      onDone: () => {
        if (get().activityDetail === "covers") {
          set({ activity: "idle", activityDetail: null });
        }
      },
    });
  },

  pauseCoverEnrichment: () => {
    coversPaused = true;
    cancelPdfCoverEnrichment();
  },
}));

/** Call when entering library view so cover work can resume. */
export function resumeLibraryCovers() {
  coversPaused = false;
  useLibraryStore.getState().startCoverEnrichment();
}

/** Call when leaving library (e.g. opening reader) to free CPU. */
export function pauseLibraryCovers() {
  coversPaused = true;
  cancelPdfCoverEnrichment();
}
