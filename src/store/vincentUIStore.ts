import { create } from "zustand";

// Spiegelt den Open/Closed-Status von VincentWidget nach außen, damit der
// immer sichtbare runde Launcher-Button weiß, ob er sich ein-/ausblenden soll.
interface VincentUIState {
  open: boolean;
}

export const useVincentUIStore = create<VincentUIState>(() => ({
  open: false,
}));
