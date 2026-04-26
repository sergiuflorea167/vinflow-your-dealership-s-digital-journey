// Wiederverwendbare KPI-Karte mit Pin-Toggle.
// Variante "dashboard" wird draggable; Variante "catalog" zeigt vollständige Beschreibung.

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pin, PinOff, GripVertical, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";
import { useProcessStore } from "@/store/processStore";
import { KpiDef } from "@/lib/kpis";
import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface KpiCardProps {
  kpi: KpiDef;
  variant?: "dashboard" | "catalog";
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export const KpiCard = ({ kpi, variant = "catalog", dragHandleProps }: KpiCardProps) => {
  const vehicles = useProcessStore((s) => s.vehicles);
  const processes = useProcessStore((s) => s.processes);
  const offers = useProcessStore((s) => s.offers);
  const customers = useProcessStore((s) => s.customers);

  const togglePin = useDashboardStore((s) => s.togglePin);
  const pinned = useDashboardStore((s) => s.pinnedKpis.includes(kpi.id));

  const result = useMemo(
    () => kpi.compute({ vehicles, processes, offers, customers }),
    [kpi, vehicles, processes, offers, customers]
  );

  return (
    <Card
      className={cn(
        "relative p-5 bg-card border-border shadow-card group transition-smooth",
        variant === "dashboard" && "hover:border-primary/40"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex items-center gap-1.5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium truncate">
            {kpi.label}
          </p>
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Bedeutung von ${kpi.label}`}
                className="text-muted-foreground/60 hover:text-primary-glow transition-smooth shrink-0"
              >
                <Info className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="start"
              className="max-w-xs p-3 text-xs leading-relaxed space-y-2 bg-popover border-border"
            >
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Was misst dieser Wert?
                </p>
                <p className="text-foreground">{kpi.description}</p>
              </div>
              <div className="border-t border-border pt-2">
                <p className="text-[10px] uppercase tracking-wider text-primary-glow font-semibold mb-1">
                  Deutung
                </p>
                <p className="text-foreground">{kpi.interpretation}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-1 -mt-1 -mr-1">
          {variant === "dashboard" && dragHandleProps && (
            <button
              {...dragHandleProps}
              className="opacity-0 group-hover:opacity-100 transition-smooth text-muted-foreground hover:text-foreground p-1 cursor-grab active:cursor-grabbing"
              aria-label="Verschieben"
            >
              <GripVertical className="size-3.5" />
            </button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "size-7 transition-smooth",
              pinned ? "text-primary-glow" : "text-muted-foreground opacity-0 group-hover:opacity-100"
            )}
            onClick={() => togglePin(kpi.id)}
            title={pinned ? "Vom Dashboard entfernen" : "An Dashboard anpinnen"}
          >
            {pinned ? <Pin className="size-3.5 fill-current" /> : <PinOff className="size-3.5" />}
          </Button>
        </div>
      </div>
      <p className="text-2xl font-display font-bold text-foreground tracking-tight">
        {result.display}
      </p>
      {result.sub && (
        <p className="text-xs text-muted-foreground mt-1">{result.sub}</p>
      )}
      {variant === "catalog" && (
        <p className="text-[11px] text-muted-foreground/80 mt-3 leading-relaxed border-t border-border/50 pt-3">
          {kpi.description}
        </p>
      )}
    </Card>
  );
};
