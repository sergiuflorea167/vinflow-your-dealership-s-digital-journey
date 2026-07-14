import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GoalsPanel } from "@/components/dashboard/GoalsPanel";
import { KpiCard } from "@/components/kpi/KpiCard";
import { useProcessStore } from "@/store/processStore";
import { useDashboardStore } from "@/store/dashboardStore";
import {
  PROCESS_STEPS, VEHICLE_TYPE_LABELS, VehicleType, formatCurrency,
  vehicleTotalCostsGross, COST_CATEGORY_LABELS, CostCategory,
} from "@/data/process";
import { KPI_CATALOG, KpiCategory, KpiDef } from "@/lib/kpis";
import {
  Layers, Activity as ActivityIcon, Wallet, Pin, RotateCcw,
  TrendingUp, Target, Workflow, Car,
} from "lucide-react";
import { useTopbarSearch } from "@/context/TopbarSearchContext";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { KpiRangePicker } from "@/components/kpi/KpiRangePicker";
import { useWorkshopStore } from "@/store/workshopStore";
import { WORKSHOP_DEMO } from "@/data/workshopDemo";



// Reihenfolge nach Wichtigkeit (links = wichtigste)
const TAB_ORDER: { key: KpiCategory; icon: typeof TrendingUp; short: string }[] = [
  { key: "Umsatz",          icon: TrendingUp, short: "Umsatz" },
  { key: "Verkauf & Marge", icon: Target,     short: "Verkauf" },
  { key: "Pipeline",        icon: Workflow,   short: "Pipeline" },
  { key: "Kosten",          icon: Wallet,     short: "Kosten" },
  { key: "Bestand",         icon: Car,        short: "Bestand" },
];

const KPIs = () => {
  const workshopActive = useWorkshopStore((s) => s.activeKey === "kpis");
  const realVehicles = useProcessStore((s) => s.vehicles);
  const realProcesses = useProcessStore((s) => s.processes);
  const realCustomers = useProcessStore((s) => s.customers);
  const realActivities = useProcessStore((s) => s.activities);
  const vehicles = workshopActive ? WORKSHOP_DEMO.vehicles : realVehicles;
  const processes = workshopActive ? WORKSHOP_DEMO.processes : realProcesses;
  const customers = workshopActive ? WORKSHOP_DEMO.customers : realCustomers;
  const activities = workshopActive ? WORKSHOP_DEMO.activities : realActivities;


  const pinnedCount = useDashboardStore((s) => s.pinnedKpis.length);
  const resetToDefault = useDashboardStore((s) => s.resetToDefault);

  const [query, setQuery] = useState("");
  const [searchField, setSearchField] = useState<"all" | "label" | "description">("all");
  const [tab, setTab] = useState<KpiCategory>("Umsatz");

  const topbarSearch = useMemo(() => ({
    placeholder: "KPI suchen…",
    value: query,
    onChange: setQuery,
    field: searchField,
    onFieldChange: (f: string) => setSearchField(f as typeof searchField),
    fields: [
      { key: "all",         label: "Alle Felder" },
      { key: "label",       label: "Name" },
      { key: "description", label: "Beschreibung" },
    ],
  }), [query, searchField]);

  useTopbarSearch(topbarSearch);

  const kpisFor = (cat: KpiCategory): KpiDef[] =>
    KPI_CATALOG.filter((k) => {
      if (k.category !== cat) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      const fields: Record<typeof searchField, string> = {
        all: `${k.label} ${k.description}`,
        label: k.label,
        description: k.description,
      };
      return fields[searchField].toLowerCase().includes(q);
    });

  // ---- Sekundäre Visualisierungen ----
  const totalCostsAll = useMemo(() => vehicles.reduce((s, v) => s + vehicleTotalCostsGross(v), 0), [vehicles]);
  const costsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    vehicles.forEach((v) => {
      v.costs.forEach((c) => {
        const gross = c.netAmount * (1 + c.vatRate / 100);
        map[c.category] = (map[c.category] ?? 0) + gross;
      });
    });
    return map;
  }, [vehicles]);

  const pipeline = useMemo(
    () =>
      PROCESS_STEPS.map((step) => ({
        step,
        count: processes.filter((p) => p.currentStep === step.key && p.steps[step.key]?.status !== "completed").length,
      })),
    [processes]
  );



  const typeBreakdown = useMemo(() => {
    const map = new Map<VehicleType, { count: number; value: number }>();
    const stock = vehicles.filter((v) => v.status === "in_stock" || v.status === "reserved");
    stock.forEach((v) => {
      const cur = map.get(v.type) ?? { count: 0, value: 0 };
      cur.count += 1;
      cur.value += v.listPrice;
      map.set(v.type, cur);
    });
    const total = stock.length || 1;
    return Array.from(map.entries())
      .map(([type, x]) => ({ type, ...x, pct: (x.count / total) * 100 }))
      .sort((a, b) => b.count - a.count);
  }, [vehicles]);

  const topCustomers = useMemo(() => {
    return customers
      .map((c) => {
        const value = processes.filter((p) => p.customerId === c.id).reduce((s, p) => s + (p.fields.finalPrice ?? 0), 0);
        const count = processes.filter((p) => p.customerId === c.id).length;
        return { ...c, value, count };
      })
      .filter((c) => c.count > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [customers, processes]);

  const activityByUser = useMemo(() => {
    const map = new Map<string, number>();
    activities.forEach((a) => map.set(a.user, (map.get(a.user) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [activities]);

  const renderKpiGrid = (items: KpiDef[]) =>
    items.length === 0 ? (
      <Card className="p-8 text-center text-muted-foreground text-sm">Keine KPIs in dieser Kategorie gefunden.</Card>
    ) : (
      <div data-tour="kpi-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} />)}
      </div>
    );


  return (
    <AppShell>
      <div className="space-y-8 animate-fade-in">
        <div data-tour="kpi-header" className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <Badge variant="outline" className="border-primary/30 text-primary-glow mb-3">Analytics</Badge>
            <h1 className="text-3xl lg:text-4xl font-display font-bold tracking-tight">KPIs &amp; Statistiken</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Pin KPIs ans Dashboard, um sie täglich im Blick zu haben. Alle Werte werden live berechnet.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary-glow gap-1.5">
              <Pin className="size-3 fill-current" /> {pinnedCount} angepinnt
            </Badge>
            <Button variant="outline" size="sm" onClick={resetToDefault}>
              <RotateCcw className="size-3.5 mr-1.5" /> Standard
            </Button>
          </div>
        </div>

        {/* Globaler Zeitraum-Filter — gilt für alle zeitabhängigen KPIs */}
        <div data-tour="kpi-range"><KpiRangePicker /></div>

        <div data-tour="kpi-goals"><GoalsPanel /></div>



        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as KpiCategory)} className="space-y-6">
          <TabsList data-tour="kpi-tabs" className="w-full justify-start flex-wrap h-auto p-1 bg-card border border-border">
            {TAB_ORDER.map(({ key, icon: Icon, short }) => {
              const count = KPI_CATALOG.filter((k) => k.category === key).length;
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow"
                >
                  <Icon className="size-4" />
                  <span>{short}</span>
                  <span className="text-[10px] opacity-70 font-mono">{count}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>


          {/* Umsatz */}
          <TabsContent value="Umsatz" className="space-y-6 mt-0">
            {renderKpiGrid(kpisFor("Umsatz"))}
          </TabsContent>

          {/* Verkauf & Marge */}
          <TabsContent value="Verkauf & Marge" className="space-y-6 mt-0">
            {renderKpiGrid(kpisFor("Verkauf & Marge"))}

            <Card className="p-6 bg-card border-border shadow-card">
              <div className="mb-5">
                <h2 className="text-xl font-display font-semibold">Top-Kunden</h2>
                <p className="text-sm text-muted-foreground mt-1">Nach Auftragswert</p>
              </div>
              <div className="space-y-3">
                {topCustomers.length === 0 && (
                  <p className="text-sm text-muted-foreground">Noch keine Kundenumsätze.</p>
                )}
                {topCustomers.map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="size-7 rounded-md bg-secondary grid place-items-center text-xs font-mono">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.count} Vorgang{c.count !== 1 ? "e" : ""} · {c.city}</p>
                      </div>
                    </div>
                    <span className="text-sm font-display font-bold">{formatCurrency(c.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Pipeline */}
          <TabsContent value="Pipeline" className="space-y-6 mt-0">
            {renderKpiGrid(kpisFor("Pipeline"))}

            <Card className="p-6 bg-card border-border shadow-card">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-xl font-display font-semibold">Pipeline</h2>
                  <p className="text-sm text-muted-foreground mt-1">Vorgänge je Prozessschritt</p>
                </div>
                <Layers className="size-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-5 max-w-3xl leading-relaxed">
                Jede Karte zeigt, wie viele Vorgänge gerade in diesem Schritt „hängen" — also dort aktiv,
                aber noch nicht abgeschlossen sind. Hohe Zahlen weisen auf Engpässe hin, niedrige Zahlen
                in späten Schritten bedeuten weniger kurzfristig anstehende Übergaben. Halte die Maus
                auf eine Karte für Details. Tipp: Eine gesunde Pipeline füllt sich vorne und leert sich hinten.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {pipeline.map(({ step, count }, i) => (
                  <Tooltip key={step.key} delayDuration={150}>
                    <TooltipTrigger asChild>
                      <div className="rounded-xl border border-border bg-background/40 p-4 cursor-help hover:border-primary/40 transition-smooth">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                          <span className="text-2xl font-display font-bold">{count}</span>
                        </div>
                        <p className="text-xs font-semibold leading-tight">{step.shortLabel}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs p-3 text-xs leading-relaxed space-y-2 bg-popover border-border">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                          Schritt {i + 1}: {step.label}
                        </p>
                        <p className="text-foreground">{step.description}</p>
                      </div>
                      <div className="border-t border-border pt-2">
                        <p className="text-[10px] uppercase tracking-wider text-primary-glow font-semibold mb-1">
                          Bedeutung der Zahl
                        </p>
                        <p className="text-foreground">
                          {count === 0
                            ? `Aktuell kein Vorgang im Schritt „${step.shortLabel}". Frühe Schritte leer = wenig Neugeschäft, späte Schritte leer = keine kurzfristigen Übergaben.`
                            : `${count} Vorgang${count !== 1 ? "ä" : ""}${count !== 1 ? "nge" : ""} aktiv im Schritt „${step.shortLabel}", noch nicht abgeschlossen. ${
                                i <= 1
                                  ? "Frühe Phase — gut für die Forecast-Pipeline."
                                  : i >= 4
                                  ? "Spätphase — diese Vorgänge stehen kurz vor Abschluss / Übergabe."
                                  : "Mittlere Phase — wichtig für stetigen Durchsatz."
                              }`}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-primary/10 via-card to-card border-primary/30 shadow-card">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="size-11 rounded-xl bg-gradient-brand grid place-items-center shadow-glow shrink-0">
                  <Sparkles className="size-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-[240px]">
                  <p className="text-[10px] uppercase tracking-widest text-primary-glow font-semibold">Insight+ · BI-Builder</p>
                  <h3 className="text-base font-display font-semibold mt-0.5">Tiefenanalyse von Prozesszeiten, Umsatz, Marge &amp; mehr</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Konfiguriere eigene Auswertungen mit beliebigen Stationen, Zeiträumen und Filtern.
                  </p>
                </div>
                <Button asChild size="sm" className="bg-gradient-brand gap-1.5">
                  <Link to="/insights">
                    Öffnen <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Kosten */}
          <TabsContent value="Kosten" className="space-y-6 mt-0">
            {renderKpiGrid(kpisFor("Kosten"))}

            <Card className="p-6 bg-card border-border shadow-card">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-display font-semibold">Kosten nach Kategorie</h2>
                  <p className="text-sm text-muted-foreground mt-1">Brutto, alle Fahrzeuge</p>
                </div>
                <Wallet className="size-5 text-muted-foreground" />
              </div>
              <div className="space-y-3">
                {Object.entries(costsByCategory).length === 0 && (
                  <p className="text-sm text-muted-foreground">Noch keine Kosten erfasst.</p>
                )}
                {Object.entries(costsByCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, value]) => {
                    const pct = totalCostsAll > 0 ? (value / totalCostsAll) * 100 : 0;
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="font-medium">{COST_CATEGORY_LABELS[cat as CostCategory] ?? cat}</span>
                          <span className="text-muted-foreground text-xs">{formatCurrency(value)} · {pct.toFixed(1)}%</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  })}
              </div>
            </Card>
          </TabsContent>

          {/* Bestand */}
          <TabsContent value="Bestand" className="space-y-6 mt-0">
            {renderKpiGrid(kpisFor("Bestand"))}

            <Card className="p-6 bg-card border-border shadow-card">
              <div className="mb-5">
                <h2 className="text-xl font-display font-semibold">Bestand nach Fahrzeugtyp</h2>
                <p className="text-sm text-muted-foreground mt-1">Verteilung &amp; Wert</p>
              </div>
              <div className="space-y-3">
                {typeBreakdown.length === 0 && (
                  <p className="text-sm text-muted-foreground">Noch keine Fahrzeuge.</p>
                )}
                {typeBreakdown.map(({ type, count, value, pct }) => (
                  <div key={type}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium">{VEHICLE_TYPE_LABELS[type]}</span>
                      <span className="text-muted-foreground text-xs">{count} · {formatCurrency(value)}</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-card border-border shadow-card">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-display font-semibold">Aktivität</h2>
                  <p className="text-sm text-muted-foreground mt-1">Aktionen je Benutzer (Protokoll)</p>
                </div>
                <ActivityIcon className="size-5 text-muted-foreground" />
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                {activityByUser.map(([user, count]) => (
                  <div key={user} className="rounded-xl border border-border bg-background/40 p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{user}</p>
                    <p className="text-2xl font-display font-bold">{count}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Einträge insgesamt</p>
                  </div>
                ))}
                {activityByUser.length === 0 && (
                  <p className="text-sm text-muted-foreground">Noch keine Aktivitäten.</p>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};

export default KPIs;
