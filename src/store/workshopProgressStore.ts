import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { WorkshopKey } from "./workshopStore";

export interface ChapterProgress {
  stepsCompleted: number;
  stepsTotal: number;
  completed: boolean;
  firstOpenedAt: string | null;
  completedAt: string | null;
}

const emptyProgress = (): ChapterProgress => ({
  stepsCompleted: 0,
  stepsTotal: 0,
  completed: false,
  firstOpenedAt: null,
  completedAt: null,
});

interface WorkshopProgressState {
  loaded: boolean;
  loadedForUserId: string | null;
  progress: Partial<Record<WorkshopKey, ChapterProgress>>;
  loadFromServer: (userId: string) => Promise<void>;
  reset: () => void;
  recordStep: (chapterKey: WorkshopKey, stepIndex: number, stepsTotal: number) => void;
  markCompleted: (chapterKey: WorkshopKey, stepsTotal: number) => void;
}

/** Feuert die Server-Persistenz ab, ohne die UI je zu blockieren — Fortschritt ist nice-to-have, kein kritischer Pfad. */
const persistProgress = (chapterKey: string, stepsCompleted: number, stepsTotal: number, completed: boolean) => {
  supabase
    .rpc("record_workshop_progress", {
      _chapter_key: chapterKey,
      _steps_completed: stepsCompleted,
      _steps_total: stepsTotal,
      _completed: completed,
    })
    .then(({ error }) => {
      if (error) console.error("[workshop-progress] persist failed", error.message);
    })
    .catch((error) => console.error("[workshop-progress] persist failed", error));
};

export const useWorkshopProgressStore = create<WorkshopProgressState>((set, get) => ({
  loaded: false,
  loadedForUserId: null,
  progress: {},

  loadFromServer: async (userId) => {
    if (get().loadedForUserId === userId && get().loaded) return;
    const { data, error } = await supabase
      .from("workshop_progress")
      .select("chapter_key, steps_completed, steps_total, completed, first_opened_at, completed_at")
      .eq("user_id", userId);
    if (error) {
      console.error("[workshop-progress] load failed", error.message);
      set({ loaded: true, loadedForUserId: userId });
      return;
    }
    // Merge statt Überschreiben: falls der Nutzer schon vor Abschluss dieses Ladevorgangs einen
    // Schritt gemacht hat (optimistisches Update), darf die ältere Server-Momentaufnahme diesen
    // frischeren lokalen Stand nicht wieder zurückdrehen.
    set((s) => {
      const merged: Partial<Record<WorkshopKey, ChapterProgress>> = { ...s.progress };
      (data ?? []).forEach((row) => {
        const key = row.chapter_key as WorkshopKey;
        const fromServer: ChapterProgress = {
          stepsCompleted: row.steps_completed,
          stepsTotal: row.steps_total,
          completed: row.completed,
          firstOpenedAt: row.first_opened_at,
          completedAt: row.completed_at,
        };
        const existing = merged[key];
        merged[key] = existing
          ? {
              stepsCompleted: Math.max(existing.stepsCompleted, fromServer.stepsCompleted),
              stepsTotal: fromServer.stepsTotal || existing.stepsTotal,
              completed: existing.completed || fromServer.completed,
              firstOpenedAt: existing.firstOpenedAt ?? fromServer.firstOpenedAt,
              completedAt: existing.completedAt ?? fromServer.completedAt,
            }
          : fromServer;
      });
      return { progress: merged, loaded: true, loadedForUserId: userId };
    });
  },

  reset: () => set({ progress: {}, loaded: false, loadedForUserId: null }),

  recordStep: (chapterKey, stepIndex, stepsTotal) => {
    const current = get().progress[chapterKey] ?? emptyProgress();
    const stepsCompleted = Math.max(current.stepsCompleted, stepIndex + 1, 0);
    if (stepsCompleted === current.stepsCompleted && current.stepsTotal === stepsTotal && current.firstOpenedAt) return;
    const next: ChapterProgress = {
      ...current,
      stepsCompleted,
      stepsTotal,
      firstOpenedAt: current.firstOpenedAt ?? new Date().toISOString(),
    };
    set((s) => ({ progress: { ...s.progress, [chapterKey]: next } }));
    persistProgress(chapterKey, stepsCompleted, stepsTotal, next.completed);
  },

  markCompleted: (chapterKey, stepsTotal) => {
    const current = get().progress[chapterKey] ?? emptyProgress();
    if (current.completed) return;
    const next: ChapterProgress = {
      ...current,
      stepsCompleted: stepsTotal,
      stepsTotal,
      completed: true,
      firstOpenedAt: current.firstOpenedAt ?? new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    set((s) => ({ progress: { ...s.progress, [chapterKey]: next } }));
    persistProgress(chapterKey, stepsTotal, stepsTotal, true);
  },
}));
