// Persistierter UI-State: gepinntes Kalender-Panel am rechten Bildschirmrand.
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CalendarPanelState {
  pinned: boolean;
  setPinned: (pinned: boolean) => void;
  togglePinned: () => void;
}

export const useCalendarPanelStore = create<CalendarPanelState>()(
  persist(
    (set) => ({
      pinned: false,
      setPinned: (pinned) => set({ pinned }),
      togglePinned: () => set((s) => ({ pinned: !s.pinned })),
    }),
    { name: "vinflow-calendar-panel-v1" },
  ),
);
