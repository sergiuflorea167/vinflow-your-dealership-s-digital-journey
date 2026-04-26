// Persistierter UI-State: gepinnte KPIs am Dashboard inkl. Reihenfolge.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_PINNED_KPIS } from "@/lib/kpis";

interface DashboardState {
  pinnedKpis: string[];                       // sortierte Reihenfolge
  togglePin: (id: string) => void;
  isPinned: (id: string) => boolean;
  reorder: (ids: string[]) => void;
  resetToDefault: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      pinnedKpis: DEFAULT_PINNED_KPIS,
      togglePin: (id) =>
        set((s) => ({
          pinnedKpis: s.pinnedKpis.includes(id)
            ? s.pinnedKpis.filter((x) => x !== id)
            : [...s.pinnedKpis, id],
        })),
      isPinned: (id) => get().pinnedKpis.includes(id),
      reorder: (ids) => set({ pinnedKpis: ids }),
      resetToDefault: () => set({ pinnedKpis: DEFAULT_PINNED_KPIS }),
    }),
    { name: "vinflow-dashboard-v1" }
  )
);
