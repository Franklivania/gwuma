import { create } from "zustand";
import type { AppView } from "@/types";

type NavigationState = {
  currentView: AppView;
  viewHistory: AppView[];
  push: (view: AppView) => void;
  pop: () => void;
  replace: (view: AppView) => void;
};

export const useNavigationStore = create<NavigationState>((set, get) => ({
  currentView: "library",
  viewHistory: [],

  push: (view) => {
    const { currentView, viewHistory } = get();
    if (currentView === view) return;
    set({
      currentView: view,
      viewHistory: [...viewHistory, currentView],
    });
  },

  pop: () => {
    const { viewHistory } = get();
    if (viewHistory.length === 0) return;
    const previous = viewHistory[viewHistory.length - 1];
    set({
      currentView: previous,
      viewHistory: viewHistory.slice(0, -1),
    });
  },

  replace: (view) => {
    set({ currentView: view });
  },
}));
