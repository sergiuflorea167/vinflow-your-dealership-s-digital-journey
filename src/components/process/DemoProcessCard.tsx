import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Sparkles } from "lucide-react";
import { PROCESS_STEPS, formatCurrency, stepIndex, ProcessStepKey } from "@/data/process";
import { ProcessStepper } from "./ProcessStepper";

interface Props {
  id: string;
  currentStep: ProcessStepKey;
  vehicleLabel: string;
  vin: string;
  customerName: string;
  price: number;
}

export const DemoProcessCard = ({ id, currentStep, vehicleLabel, vin, customerName, price }: Props) => {
  const idx = stepIndex(currentStep);
  const current = PROCESS_STEPS[idx];
  const progress = Math.round((idx / (PROCESS_STEPS.length - 1)) * 100);

  return (
    <Card className="group p-5 bg-card border-border shadow-card relative overflow-hidden">
      <div className="absolute top-2 right-2 inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">
        <Sparkles className="size-2.5" /> Demo
      </div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display text-sm font-semibold text-foreground">{id}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary-glow">
              {current.shortLabel}
            </Badge>
          </div>
          <p className="text-base font-display font-semibold text-foreground truncate">{vehicleLabel}</p>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">VIN {vin}</p>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5 pb-5 border-b border-border/50">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Kunde</p>
          <p className="text-sm text-foreground font-medium truncate mt-0.5">{customerName}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Preis</p>
          <p className="text-sm text-foreground font-semibold mt-0.5">{formatCurrency(price)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fortschritt</p>
          <p className="text-sm text-primary-glow font-semibold mt-0.5">{progress}%</p>
        </div>
      </div>

      <ProcessStepper currentStep={currentStep} compact />
    </Card>
  );
};
