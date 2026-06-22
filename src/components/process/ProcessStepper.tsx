import { Check, SkipForward } from "lucide-react";
import { ProcessStep, ProcessStepKey, getProcessStepsForDisplay, stepIndexIn } from "@/data/process";
import { cn } from "@/lib/utils";
import { useProcessStore } from "@/store/processStore";

interface Props {
  currentStep: ProcessStepKey;
  selectedStep?: ProcessStepKey;
  onSelect?: (key: ProcessStepKey) => void;
  steps?: Record<ProcessStepKey, { status: "pending" | "active" | "completed" | "skipped" }>;
  processSteps?: ProcessStep[];
  compact?: boolean;
}

export const ProcessStepper = ({ currentStep, selectedStep, onSelect, compact, steps, processSteps }: Props) => {
  const settings = useProcessStore((s) => s.settings);
  const visibleSteps = processSteps ?? getProcessStepsForDisplay(currentStep, settings);
  const currentIdx = Math.max(0, stepIndexIn(currentStep, visibleSteps));

  if (compact) {
    return (
      <ol className="flex items-center w-full gap-1">
        {visibleSteps.map((step, i) => {
          const status = steps?.[step.key]?.status;
          const isSkipped = status === "skipped";
          const isCompleted = status === "completed" || (i < currentIdx && status !== "skipped");
          const isActive = i === currentIdx && !isCompleted && !isSkipped;
          const isLast = i === visibleSteps.length - 1;
          return (
            <li key={step.key} className="flex items-center flex-1 min-w-0" title={step.shortLabel}>
              <div
                className={cn(
                  "size-5 shrink-0 rounded-full grid place-items-center border transition-smooth font-display text-[10px] font-semibold",
                  isCompleted && "bg-success border-success text-success-foreground",
                  isSkipped && "bg-muted border-muted-foreground/30 text-muted-foreground",
                  isActive && "bg-primary border-primary text-primary-foreground shadow-glow",
                  !isCompleted && !isActive && !isSkipped && "bg-card border-border text-muted-foreground",
                )}
              >
                {isCompleted ? <Check className="size-3" /> : isSkipped ? <SkipForward className="size-2.5" /> : i + 1}
              </div>
              {!isLast && (
                <div className={cn("h-[2px] flex-1 mx-0.5 transition-smooth", i < currentIdx ? "bg-success" : "bg-border")} />
              )}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <ol className="flex items-start min-w-max gap-0">
        {visibleSteps.map((step, i) => {
          const status = steps?.[step.key]?.status;
          const isSkipped = status === "skipped";
          const isCompleted = status === "completed" || (i < currentIdx && status !== "skipped");
          const isActive = i === currentIdx && !isCompleted && !isSkipped;
          const isLocked = i > currentIdx;
          const isSelected = selectedStep === step.key;
          const isLast = i === visibleSteps.length - 1;

          return (
            <li key={step.key} className="flex-1 min-w-[100px] flex items-start">
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
                    isSkipped && "bg-muted border-muted-foreground/30 text-muted-foreground",
                    isActive && "bg-primary border-primary text-primary-foreground shadow-glow animate-pulse-glow",
                    isLocked && "bg-muted/50 border-border text-muted-foreground",
                    !isCompleted && !isActive && !isLocked && !isSkipped && "bg-card border-border text-muted-foreground",
                    isSelected && !isActive && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background"
                  )}
                >
                  {isCompleted ? <Check className="size-4" /> : isSkipped ? <SkipForward className="size-3.5" /> : i + 1}
                </div>
                <div className="text-center px-1">
                  <p className={cn(
                    "text-[11px] font-semibold leading-tight",
                    isActive && "text-primary-glow",
                    isCompleted && "text-foreground",
                    isSkipped && "text-muted-foreground line-through",
                    isLocked && "text-muted-foreground"
                  )}>
                    {step.shortLabel}
                  </p>
                </div>
              </button>
              {!isLast && (
                <div className="flex-1 h-9 grid place-items-center">
                  <div className={cn("h-[2px] w-full transition-smooth", i < currentIdx ? "bg-success" : "bg-border")} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
