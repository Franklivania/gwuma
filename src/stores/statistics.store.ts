import { create } from "zustand";
import {
  getStatisticsSummary,
  listBookStats,
} from "@/features/statistics/services/statistics-service";
import type { BookStats, StatisticsSummary, StatsPeriod } from "@/types";

type StatisticsState = {
  period: StatsPeriod;
  summary: StatisticsSummary | null;
  bookStats: BookStats[];
  loading: boolean;
  error: string | null;
  setPeriod: (period: StatsPeriod) => void;
  load: () => Promise<void>;
};

export const useStatisticsStore = create<StatisticsState>((set, get) => ({
  period: "weekly",
  summary: null,
  bookStats: [],
  loading: false,
  error: null,

  setPeriod: (period) => {
    set({ period });
    void get().load();
  },

  load: async () => {
    const { period } = get();
    set({ loading: true, error: null });
    try {
      const [summary, bookStats] = await Promise.all([
        getStatisticsSummary(period),
        listBookStats(period),
      ]);
      set({ summary, bookStats, loading: false });
    } catch (error) {
      console.error("Failed to load statistics", error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load stats",
      });
    }
  },
}));
