import { create } from "zustand";

interface PurchaseWorkshopState {
  active: boolean;
  step: number;
  start: () => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
}

export const usePurchaseWorkshopStore = create<PurchaseWorkshopState>((set) => ({
  active: false,
  step: 0,
  start: () => set({ active: true, step: 0 }),
  next: () => set((s) => ({ step: s.step + 1 })),
  prev: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
  stop: () => set({ active: false, step: 0 }),
}));
