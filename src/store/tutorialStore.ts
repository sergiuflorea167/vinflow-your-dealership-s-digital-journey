import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TutorialState {
  completed: boolean;
  active: boolean;
  step: number;
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  finish: () => void;
  reset: () => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      completed: false,
      active: false,
      step: 0,
      start: () => set({ active: true, step: 0 }),
      next: () => set((s) => ({ step: s.step + 1 })),
      prev: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
      skip: () => set({ active: false, completed: true, step: 0 }),
      finish: () => set({ active: false, completed: true, step: 0 }),
      reset: () => set({ active: true, completed: false, step: 0 }),
    }),
    { name: "vinflow.tutorial.v1", partialize: (s) => ({ completed: s.completed }) },
  ),
);
