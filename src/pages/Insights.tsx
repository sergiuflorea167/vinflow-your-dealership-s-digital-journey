import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { useProcessStore } from "@/store/processStore";
import { InsightPlusBuilder } from "@/components/insights/InsightPlusBuilder";
import { Sparkles } from "lucide-react";

const Insights = () => {
  const vehicles = useProcessStore((s) => s.vehicles);
  const processes = useProcessStore((s) => s.processes);
  const purchasePlans = useProcessStore((s) => s.purchasePlans);

  return (
    <AppShell>
      <div className="space-y-8 animate-fade-in">
        <div>
          <Badge variant="outline" className="border-primary/30 text-primary-glow mb-3 gap-1.5">
            <Sparkles className="size-3" /> Insight+ · BI-Builder
          </Badge>
          <h1 className="text-3xl lg:text-4xl font-display font-bold tracking-tight">
            Insight+
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Baue dir eigene Auswertungen — frei kombinierbar aus Metrik, Stationen,
            Zeitraum und Filtern. Live berechnet aus deinen Bestands- und Vorgangsdaten.
          </p>
        </div>

        <InsightPlusBuilder
          processes={processes}
          vehicles={vehicles}
          purchasePlans={purchasePlans}
        />
      </div>
    </AppShell>
  );
};

export default Insights;
