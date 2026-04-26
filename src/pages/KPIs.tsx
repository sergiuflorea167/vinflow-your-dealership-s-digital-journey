import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Timer, Layers, Activity as ActivityIcon, Wallet, Pin, RotateCcw,
  TrendingUp, Target, Workflow, Car,
} from "lucide-react";
import { useTopbarSearch } from "@/context/TopbarSearchContext";

const daysBetween = (a: string, b: string) =>
  Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 86400000);

// Reihenfolge nach Wichtigkeit (links = wichtigste)
const TAB_ORDER: { key: KpiCategory; icon: typeof TrendingUp; short: string }[] = [
  { key: "Umsatz",          icon: TrendingUp, short: "Umsatz" },
  { key: "Verkauf & Marge", icon: Target,     short: "Verkauf" },
  { key: "Pipeline",        icon: Workflow,   short: "Pipeline" },
  { key: "Kosten",          icon: Wallet,     short: "Kosten" },
  { key: "Bestand",         icon: Car,        short: "Bestand" },
];

const KPIs = () => {
  const vehicles = useProcessStore((s) => s.vehicles);
  const processes = useProcessStore((s) => s.processes);
  const customers = useProcessStore((s) => s.customers);
  const activities = useProcessStore((s) => s.activities);

  const pinnedCount = useDashboardStore((s) => s.pinnedKpis.length);
  const resetToDefault = useDashboardStore((s) => s.resetToDefault);

  const [query, setQuery] = useState("");
  const [searchField, setSearchField] = useState<"all" | "label" | "description">("all");
  const [tab, setTab] = useState<KpiCategory>("Umsatz");

  useTopbarSearch({
    placeholder: "KPI suchen…",
    value: query,
    onChange: setQuery,
    field: searchField,
    onFieldChange: (f) => setSearchField(f as typeof searchField),
    fields: [
      { key: "all",         label: "Alle Felder" },
      { key: "label",       label: "Name" },
      { key: "description", label: "Beschreibung" },
    ],
  });

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

  const stepDurations = useMemo(() => {
    return PROCESS_STEPS.slice(0, -1).map((step, i) => {
      const next = PROCESS_STEPS[i + 1];
      const diffs: number[] = [];
      processes.forEach((p) => {
        const a = p.steps[step.key]?.completedAt;
        const b = p.steps[next.key]?.completedAt;
        if (a && b) diffs.push(daysBetween(a, b));
      });
      const avg = diffs.length ? diffs.reduce((s, n) => s + n, 0) / diffs.length : 0;
      return { from: step, to: next, avg, samples: diffs.length };
    });
  }, [processes]);

  const typeBreakdown = useMemo(() => {
    const map = new Map<VehicleType, { count: number; value: number }>();
    vehicles.forEach((v) => {
      const cur = map.get(v.type) ?? { count: 0, value: 0 };
      cur.count += 1;
      cur.value += v.listPrice;
      map.set(v.type, cur);
    });
    const total = vehicles.length || 1;
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} />)}
      </div>
    );

  return (
    <AppShell>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-end justify-between gap-6 flex-wrap">
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

        <GoalsPanel />

        {/* Suche */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="KPI suchen…"
            className="pl-9 bg-background/40"
          />
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as KpiCategory)} className="space-y-6">
          <TabsList className="w-full justify-start flex-wrap h-auto p-1 bg-card border border-border">
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
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-display font-semibold">Pipeline</h2>
                  <p className="text-sm text-muted-foreground mt-1">Vorgänge je Prozessschritt</p>
                </div>
                <Layers className="size-5 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {pipeline.map(({ step, count }, i) => (
                  <div key={step.key} className="rounded-xl border border-border bg-background/40 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-2xl font-display font-bold">{count}</span>
                    </div>
                    <p className="text-xs font-semibold leading-tight">{step.shortLabel}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-card border-border shadow-card">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-display font-semibold">Prozesszeiten</h2>
                  <p className="text-sm text-muted-foreground mt-1">Ø Tage zwischen abgeschlossenen Schritten</p>
                </div>
                <Timer className="size-5 text-muted-foreground" />
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {stepDurations.map(({ from, to, avg, samples }) => {
                  const intensity = Math.min(1, avg / 7);
                  return (
                    <div key={from.key} className="rounded-xl border border-border bg-background/40 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-muted-foreground">{from.shortLabel} → {to.shortLabel}</span>
                        <span className="text-[10px] text-muted-foreground">{samples} Vorg.</span>
                      </div>
                      <p className="text-2xl font-display font-bold">{avg.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">Tage</span></p>
                      <Progress value={intensity * 100} className="h-1.5 mt-3" />
                    </div>
                  );
                })}
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
