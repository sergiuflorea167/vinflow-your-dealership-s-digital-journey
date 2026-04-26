import { Link } from "react-router-dom";
import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProcessCard } from "@/components/process/ProcessCard";
import { GoalsPanel } from "@/components/dashboard/GoalsPanel";
import { useProcessStore } from "@/store/processStore";
import { PROCESS_STEPS, formatCurrency, vehicleTotalCostsGross } from "@/data/process";
import { ArrowUpRight, TrendingUp, Workflow, FileCheck2, Car, Euro, Wallet, Receipt } from "lucide-react";

const Dashboard = () => {
  const processes = useProcessStore((s) => s.processes);
  const vehicles = useProcessStore((s) => s.vehicles);
  const offers = useProcessStore((s) => s.offers);

  const active = processes.filter((p) => stepIndex(p.currentStep) < PROCESS_STEPS.length - 1
    || p.steps[p.currentStep].status !== "completed");
  const inOutbound = processes.filter((p) => p.currentStep === "outbound_check").length;
  const fleetValue = vehicles.filter((v) => v.status === "in_stock" || v.status === "reserved")
    .reduce((s, v) => s + v.listPrice, 0);
  const docsArchived = processes.reduce(
    (s, p) => s + Object.values(p.steps).filter((x) => x.status === "completed").length,
    0
  );
  const openOffers = offers.filter((o) => o.status === "sent").length;

  const byStep = PROCESS_STEPS.map((step) => ({
    step,
    count: processes.filter((p) => p.currentStep === step.key && p.steps[step.key].status !== "completed").length,
  }));

  return (
    <AppShell>
      <div className="space-y-8 animate-fade-in">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-surface p-8">
          <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <Badge variant="outline" className="border-primary/30 text-primary-glow mb-4">
                VIN-basierte Vorgangskette
              </Badge>
              <h1 className="text-4xl lg:text-5xl font-display font-bold tracking-tight text-foreground">
                Willkommen zurück.
              </h1>
              <p className="text-muted-foreground mt-3 max-w-2xl">
                Von der Einkaufsplanung bis zur Übergabe – jeder Schritt erzeugt einen archivierten Kunden-Beleg.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="border-border/60" asChild>
                <Link to="/einkaufsplanung">
                  Einkauf <ArrowUpRight className="size-4 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" className="border-border/60" asChild>
                <Link to="/flotte">
                  Flotte <ArrowUpRight className="size-4 ml-2" />
                </Link>
              </Button>
              <Button className="bg-gradient-brand hover:opacity-90 shadow-elegant" asChild>
                <Link to="/vorgaenge">Alle Vorgänge</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Workflow} label="Aktive Vorgänge" value={active.length.toString()} accent />
          <KpiCard icon={Car} label="Bestand (Wert)" value={formatCurrency(fleetValue)} sub={`${vehicles.length} Fahrzeuge`} />
          <KpiCard icon={FileCheck2} label="Belege archiviert" value={docsArchived.toString()} />
          <KpiCard icon={TrendingUp} label="Offene Angebote" value={openOffers.toString()} sub={`${inOutbound} in Kontrolle`} />
        </div>

        <GoalsPanel />

        <Card className="p-6 bg-card border-border shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-display font-semibold">Pipeline-Übersicht</h2>
              <p className="text-sm text-muted-foreground mt-1">Vorgänge je Prozessschritt</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {byStep.map(({ step, count }, i) => (
              <div
                key={step.key}
                className="rounded-xl border border-border bg-background/40 p-4 hover:border-primary/40 transition-smooth"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-2xl font-display font-bold text-foreground">{count}</span>
                </div>
                <p className="text-xs font-semibold text-foreground leading-tight">{step.shortLabel}</p>
                <p className="text-[10px] text-muted-foreground mt-1 truncate">{step.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-display font-semibold">Aktive Vorgänge</h2>
              <p className="text-sm text-muted-foreground mt-1">Klick auf einen Vorgang für die volle Prozesskette</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/vorgaenge">Alle anzeigen</Link>
            </Button>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {processes.slice(0, 6).map((p) => (
              <ProcessCard key={p.id} process={p} />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

const KpiCard = ({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) => (
  <Card className={`p-5 bg-card border-border shadow-card ${accent ? "ring-1 ring-primary/30" : ""}`}>
    <div className="flex items-start justify-between mb-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      <div className={`size-8 rounded-lg grid place-items-center ${accent ? "bg-gradient-brand shadow-glow" : "bg-secondary"}`}>
        <Icon className="size-4 text-primary-foreground" />
      </div>
    </div>
    <p className="text-2xl font-display font-bold text-foreground">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </Card>
);

export default Dashboard;
