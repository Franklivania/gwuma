import { create } from "zustand";
import type { DialogEntry, DialogId } from "@/types";

type DialogState = {
  dialogStack: DialogEntry[];
  open: (id: DialogId, options?: Omit<DialogEntry, "id">) => void;
  close: () => void;
  closeAll: () => void;
};

export const useDialogStore = create<DialogState>((set, get) => ({
  dialogStack: [],

  open: (id, options) => {
    const entry: DialogEntry = { id, ...options };
    set({ dialogStack: [...get().dialogStack, entry] });
  },

  close: () => {
    const { dialogStack } = get();
    if (dialogStack.length === 0) return;
    set({ dialogStack: dialogStack.slice(0, -1) });
  },

  closeAll: () => {
    set({ dialogStack: [] });
  },
}));
