import { create } from "zustand";
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
  refresh: () => Promise<void>;
};

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

  refresh: async () => {
    // Placeholder — wired to Tauri library service later
  },
}));
