import { create } from "zustand";

/** Ein Workshop pro Menüpunkt der Sidebar (in Anzeige-Reihenfolge von oben nach unten). */
export type WorkshopKey =
  | "dashboard"
  | "fleet"
  | "processes"
  | "purchase"
  | "todos"
  | "calendar"
  | "kpis"
  | "insights"
  | "master"
  | "settings";

export const WORKSHOP_ORDER: WorkshopKey[] = [
  "dashboard", "fleet", "processes", "purchase", "todos",
  "calendar", "kpis", "insights", "master", "settings",
];

interface WorkshopState {
  activeKey: WorkshopKey | null;
  step: number;
  /** Wenn gesetzt: nach Abschluss automatisch zum nächsten Workshop in WORKSHOP_ORDER weiterspringen. */
  runAll: boolean;
  start: (key: WorkshopKey, opts?: { runAll?: boolean }) => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
}

export const useWorkshopStore = create<WorkshopState>((set) => ({
  activeKey: null,
  step: 0,
  runAll: false,
  start: (key, opts) => set({ activeKey: key, step: 0, runAll: opts?.runAll ?? false }),
  next: () => set((s) => ({ step: s.step + 1 })),
  prev: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
  stop: () => set({ activeKey: null, step: 0, runAll: false }),
}));
