import { create } from "zustand";
import {
  MOCK_PROCESSES,
  PROCESS_STEPS,
  Process,
  ProcessStepKey,
  stepIndex,
} from "@/data/process";

interface ProcessState {
  processes: Process[];
  getProcess: (id: string) => Process | undefined;
  completeStep: (processId: string, stepKey: ProcessStepKey) => void;
  toggleChecklistItem: (processId: string, itemId: string) => void;
}

export const useProcessStore = create<ProcessState>((set, get) => ({
  processes: MOCK_PROCESSES,
  getProcess: (id) => get().processes.find((p) => p.id === id),
  completeStep: (processId, stepKey) =>
    set((state) => ({
      processes: state.processes.map((p) => {
        if (p.id !== processId) return p;
        const idx = stepIndex(stepKey);
        const nextStep = PROCESS_STEPS[idx + 1];
        return {
          ...p,
          currentStep: nextStep ? nextStep.key : p.currentStep,
          updatedAt: new Date().toISOString(),
          steps: {
            ...p.steps,
            [stepKey]: {
              status: "completed",
              completedAt: new Date().toISOString(),
              documentArchived: true,
            },
            ...(nextStep
              ? {
                  [nextStep.key]: { status: "active" as const },
                }
              : {}),
          },
        };
      }),
    })),
  toggleChecklistItem: (processId, itemId) =>
    set((state) => ({
      processes: state.processes.map((p) =>
        p.id !== processId
          ? p
          : {
              ...p,
              checklist: p.checklist.map((c) =>
                c.id === itemId ? { ...c, done: !c.done } : c
              ),
            }
      ),
    })),
}));
