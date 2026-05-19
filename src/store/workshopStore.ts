import { create } from "zustand";

interface WorkshopState {
  active: boolean;
  step: number;
  /** If set, after this workshop ends, automatically start the next one. */
  chainNext: "fleet" | null;
  start: (opts?: { chainNext?: "fleet" | null }) => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
  goTo: (i: number) => void;
}

export const useWorkshopStore = create<WorkshopState>((set) => ({
  active: false,
  step: 0,
  chainNext: null,
  start: (opts) => set({ active: true, step: 0, chainNext: opts?.chainNext ?? null }),
  next: () => set((s) => ({ step: s.step + 1 })),
  prev: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
  stop: () => set({ active: false, step: 0 }),
  goTo: (i) => set({ step: i }),
}));
