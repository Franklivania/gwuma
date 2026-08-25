import { create } from "zustand";

type SearchOverlayState = {
  open: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
};

export const useSearchOverlayStore = create<SearchOverlayState>((set, get) => ({
  open: false,
  openSearch: () => set({ open: true }),
  closeSearch: () => set({ open: false }),
  toggleSearch: () => set({ open: !get().open }),
}));
