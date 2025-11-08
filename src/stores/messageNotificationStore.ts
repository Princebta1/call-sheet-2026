import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface MessageNotificationStore {
  // Map of showId to last viewed timestamp
  lastViewedTimestamps: Record<number, Date>;
  
  // Update the last viewed timestamp for a specific show
  markMessagesViewed: (showId: number) => void;
  
  // Get the last viewed timestamp for a specific show
  getLastViewedTimestamp: (showId: number) => Date | null;
  
  // Clear all timestamps (useful for logout)
  clearTimestamps: () => void;
}

export const useMessageNotificationStore = create<MessageNotificationStore>()(
  persist(
    (set, get) => ({
      lastViewedTimestamps: {},
      
      markMessagesViewed: (showId: number) => {
        set((state) => ({
          lastViewedTimestamps: {
            ...state.lastViewedTimestamps,
            [showId]: new Date(),
          },
        }));
      },
      
      getLastViewedTimestamp: (showId: number) => {
        const timestamp = get().lastViewedTimestamps[showId];
        return timestamp ? new Date(timestamp) : null;
      },
      
      clearTimestamps: () => {
        set({ lastViewedTimestamps: {} });
      },
    }),
    {
      name: "message-notifications",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
