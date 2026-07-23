import { create } from "zustand";
import {
  folderFromPath,
  loadFolders,
  pickFolder,
  saveFolders,
  scanFolder,
} from "@/features/library/services/library-service";
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

  addFolder: async () => {
    const path = await pickFolder();
    if (!path) return;

    const existing = get().folders;
    if (existing.some((folder) => folder.path === path)) {
      await get().refresh();
      return;
    }

    const nextFolders = [...existing, folderFromPath(path)];
    saveFolders(nextFolders);
    set({ folders: nextFolders });
    await get().refresh();
  },

  refresh: async () => {
    clearDoneIdleTimer();

    const folders = loadFolders();
    set({ folders });

    if (folders.length === 0) {
      set({ books: [], activity: "idle", activityDetail: null });
      return;
    }

    get().setActivity(
      "scanning",
      folders.length === 1 ? folders[0].name : `${folders.length} folders`,
    );

    const scanned: Book[] = [];
    for (const folder of folders) {
      try {
        const books = await scanFolder(folder.path);
        scanned.push(...books);
      } catch (error) {
        console.error(`Failed to scan folder: ${folder.path}`, error);
      }
    }

    get().setActivity("indexing", `${scanned.length} files`);

    const byPath = new Map<string, Book>();
    for (const book of scanned) {
      byPath.set(book.path, book);
    }
    const books = Array.from(byPath.values()).sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
    );

    set({ books });
    get().setActivity("done", `${books.length} books`);

    doneIdleTimer = setTimeout(() => {
      if (get().activity === "done") {
        set({ activity: "idle", activityDetail: null });
      }
      doneIdleTimer = null;
    }, 2000);
  },
}));
