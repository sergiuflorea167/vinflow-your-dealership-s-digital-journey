import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { Process, PROCESS_STEPS, formatCurrency, stepIndex } from "@/data/process";
import { ProcessStepper } from "./ProcessStepper";
import { useProcessStore } from "@/store/processStore";

export const ProcessCard = ({ process }: { process: Process }) => {
  const vehicle = useProcessStore((s) => s.getVehicle(process.vehicleId));
  const customer = useProcessStore((s) => s.getCustomer(process.customerId));
  const idx = stepIndex(process.currentStep);
  const currentStep = PROCESS_STEPS[idx];
  const progress = Math.round((idx / (PROCESS_STEPS.length - 1)) * 100);

  if (!vehicle || !customer) return null;

  return (
    <Link to={`/vorgaenge/${process.id}`}>
      <Card className="group p-5 bg-card hover:bg-surface-elevated border-border hover:border-primary/40 transition-smooth shadow-card hover:shadow-elegant">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-display text-sm font-semibold text-foreground">{process.id}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary-glow">
                {currentStep.shortLabel}
              </Badge>
            </div>
            <p className="text-base font-display font-semibold text-foreground truncate">
              {vehicle.make} {vehicle.model}
            </p>
            <p className="font-mono text-xs text-muted-foreground mt-0.5">VIN {vehicle.vin}</p>
          </div>
          <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-smooth" />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5 pb-5 border-b border-border/50">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Kunde</p>
            <p className="text-sm text-foreground font-medium truncate mt-0.5">{customer.name}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Preis</p>
            <p className="text-sm text-foreground font-semibold mt-0.5">
              {formatCurrency(process.fields.finalPrice ?? vehicle.listPrice)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fortschritt</p>
            <p className="text-sm text-primary-glow font-semibold mt-0.5">{progress}%</p>
          </div>
        </div>

        <ProcessStepper currentStep={process.currentStep} compact />
      </Card>
    </Link>
  );
};
