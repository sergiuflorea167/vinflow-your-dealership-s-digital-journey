import { Check } from "lucide-react";
import { PROCESS_STEPS, ProcessStepKey, stepIndex } from "@/data/process";
import { cn } from "@/lib/utils";

interface Props {
  currentStep: ProcessStepKey;
  selectedStep?: ProcessStepKey;
  onSelect?: (key: ProcessStepKey) => void;
  compact?: boolean;
}

export const ProcessStepper = ({ currentStep, selectedStep, onSelect, compact }: Props) => {
  const currentIdx = stepIndex(currentStep);

  return (
    <div className="w-full overflow-x-auto">
      <ol className="flex items-start min-w-max gap-0">
        {PROCESS_STEPS.map((step, i) => {
          const isCompleted = i < currentIdx;
          const isActive = i === currentIdx;
          const isLocked = i > currentIdx;
          const isSelected = selectedStep === step.key;
          const isLast = i === PROCESS_STEPS.length - 1;

          return (
            <li key={step.key} className="flex-1 min-w-[120px] flex items-start">
              <button
                type="button"
                onClick={() => !isLocked && onSelect?.(step.key)}
                disabled={isLocked}
                className={cn(
                  "group flex flex-col items-center gap-2 flex-1 px-2 py-1 transition-smooth",
                  isLocked ? "cursor-not-allowed opacity-40" : "cursor-pointer"
                )}
              >
                <div
                  className={cn(
                    "size-9 rounded-full grid place-items-center border-2 transition-spring relative font-display font-semibold text-sm",
                    isCompleted && "bg-success border-success text-success-foreground",
                    isActive && "bg-primary border-primary text-primary-foreground shadow-glow animate-pulse-glow",
                    isLocked && "bg-muted/50 border-border text-muted-foreground",
                    !isCompleted && !isActive && !isLocked && "bg-card border-border text-muted-foreground",
                    isSelected && !isActive && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background"
                  )}
                >
                  {isCompleted ? <Check className="size-4" /> : i + 1}
                </div>
                {!compact && (
                  <div className="text-center px-1">
                    <p
                      className={cn(
                        "text-xs font-semibold leading-tight",
                        isActive && "text-primary-glow",
                        isCompleted && "text-foreground",
                        isLocked && "text-muted-foreground"
                      )}
                    >
                      {step.shortLabel}
                    </p>
                  </div>
                )}
              </button>
              {!isLast && (
                <div className="flex-1 h-9 grid place-items-center">
                  <div
                    className={cn(
                      "h-[2px] w-full transition-smooth",
                      i < currentIdx ? "bg-success" : "bg-border"
                    )}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
