import { create } from "zustand";

type StatisticsState = {
  booksRead: number;
  pagesRead: number;
  readingTimeMinutes: number;
  currentStreakDays: number;
  reset: () => void;
};

const initialStats = {
  booksRead: 0,
  pagesRead: 0,
  readingTimeMinutes: 0,
  currentStreakDays: 0,
};

export const useStatisticsStore = create<StatisticsState>((set) => ({
  ...initialStats,
  reset: () => set(initialStats),
}));
