import { create } from "zustand";

interface FleetWorkshopState {
  active: boolean;
  step: number;
  chainNext: "purchase" | null;
  start: (opts?: { chainNext?: "purchase" | null }) => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
}

export const useFleetWorkshopStore = create<FleetWorkshopState>((set) => ({
  active: false,
  step: 0,
  chainNext: null,
  start: (opts) => set({ active: true, step: 0, chainNext: opts?.chainNext ?? null }),
  next: () => set((s) => ({ step: s.step + 1 })),
  prev: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
  stop: () => set({ active: false, step: 0 }),
}));
