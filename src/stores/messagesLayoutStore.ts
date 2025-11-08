import { create } from "zustand";

interface MessagesLayoutState {
  isFullScreen: boolean;
  setFullScreen: (isFullScreen: boolean) => void;
  toggleFullScreen: () => void;
}

export const useMessagesLayoutStore = create<MessagesLayoutState>((set) => ({
  isFullScreen: false,
  setFullScreen: (isFullScreen) => set({ isFullScreen }),
  toggleFullScreen: () => set((state) => ({ isFullScreen: !state.isFullScreen })),
}));
