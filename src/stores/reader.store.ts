import { create } from "zustand";
import type { Book, ReadingMode } from "@/types";

type TocItem = {
  id: string;
  title: string;
  href?: string;
};

type ReaderState = {
  currentBook: Book | null;
  progress: number;
  position: string | null;
  mode: ReadingMode;
  zoom: number;
  search: string;
  toc: TocItem[];
  setBook: (book: Book | null) => void;
  setProgress: (progress: number) => void;
  setPosition: (position: string | null) => void;
  setMode: (mode: ReadingMode) => void;
  setZoom: (zoom: number) => void;
  setSearch: (search: string) => void;
  setToc: (toc: TocItem[]) => void;
};

export const useReaderStore = create<ReaderState>((set) => ({
  currentBook: null,
  progress: 0,
  position: null,
  mode: "scroll",
  zoom: 1,
  search: "",
  toc: [],

  setBook: (currentBook) => set({ currentBook }),
  setProgress: (progress) => set({ progress }),
  setPosition: (position) => set({ position }),
  setMode: (mode) => set({ mode }),
  setZoom: (zoom) => set({ zoom }),
  setSearch: (search) => set({ search }),
  setToc: (toc) => set({ toc }),
}));
