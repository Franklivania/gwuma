import { create } from "zustand";
import type { Book, Folder, LibraryFilters, LibrarySort } from "@/types";

type LibraryState = {
  books: Book[];
  folders: Folder[];
  filters: LibraryFilters;
  sort: LibrarySort;
  setFilters: (filters: Partial<LibraryFilters>) => void;
  setSort: (sort: LibrarySort) => void;
  refresh: () => Promise<void>;
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  books: [],
  folders: [],
  filters: { query: "", folderId: null },
  sort: "title",

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  setSort: (sort) => {
    set({ sort });
  },

  refresh: async () => {
    // Placeholder — wired to Tauri library service later
  },
}));
