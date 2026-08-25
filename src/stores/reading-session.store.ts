import { create } from "zustand";

type ReadingSessionState = {
  sessionId: string | null;
  setSessionId: (sessionId: string | null) => void;
};

export const useReadingSessionStore = create<ReadingSessionState>((set) => ({
  sessionId: null,
  setSessionId: (sessionId) => set({ sessionId }),
}));
