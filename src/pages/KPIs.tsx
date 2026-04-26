import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GoalsPanel, computeGoalProgress } from "@/components/dashboard/GoalsPanel";
import { useProcessStore } from "@/store/processStore";
import {
  PROCESS_STEPS, VEHICLE_TYPE_LABELS, VehicleType, formatCurrency,
  vehicleTotalCostsGross, COST_CATEGORY_LABELS, CostCategory,
} from "@/data/process";
import {
  TrendingUp, Car, Workflow, Euro, Timer, Target, Wallet, Layers, Activity as ActivityIcon, FileCheck2,
  Receipt, Banknote,
} from "lucide-react";

const daysBetween = (a: string, b: string) =>
  Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 86400000);

const KPIs = () => {
  const vehicles = useProcessStore((s) => s.vehicles);
  const processes = useProcessStore((s) => s.processes);
  const offers = useProcessStore((s) => s.offers);
  const customers = useProcessStore((s) => s.customers);
  const activities = useProcessStore((s) => s.activities);
  const goals = useProcessStore((s) => s.goals);

  const stats = useMemo(() => {
    const sold = processes.filter((p) => p.steps.delivery_confirmation?.status === "completed");
    const revenue = sold.reduce((s, p) => s + (p.fields.finalPrice ?? 0), 0);
    const profit = sold.reduce((s, p) => {
      const v = vehicles.find((x) => x.id === p.vehicleId);
      if (!v) return s;
      const ek = v.purchasePrice + vehicleTotalCostsGross(v);
      return s + ((p.fields.finalPrice ?? 0) - ek);
    }, 0);

    const inStock = vehicles.filter((v) => v.status === "in_stock");
    const reserved = vehicles.filter((v) => v.status === "reserved");
    const stockValue = [...inStock, ...reserved].reduce((s, v) => s + v.listPrice, 0);
    const stockCost = [...inStock, ...reserved].reduce((s, v) => s + v.purchasePrice + vehicleTotalCostsGross(v), 0);

    const offersSent = offers.filter((o) => o.status === "sent" || o.status === "accepted" || o.status === "rejected");
    const offersAccepted = offers.filter((o) => o.status === "accepted").length;
    const conversionRate = offersSent.length ? (offersAccepted / offersSent.length) * 100 : 0;

    // Bestandsalter (Tage seit arrivedAt)
    const now = Date.now();
    const ages = [...inStock, ...reserved]
      .filter((v) => v.arrivedAt)
      .map((v) => (now - new Date(v.arrivedAt!).getTime()) / 86400000);
    const avgAge = ages.length ? ages.reduce((s, n) => s + n, 0) / ages.length : 0;

    // Durchlaufzeit (Vorgang erstellt → Übergabe abgeschlossen)
    const cycleTimes = sold
      .filter((p) => p.steps.delivery_confirmation?.completedAt)
      .map((p) => daysBetween(p.createdAt, p.steps.delivery_confirmation!.completedAt!));
    const avgCycle = cycleTimes.length ? cycleTimes.reduce((s, n) => s + n, 0) / cycleTimes.length : 0;

    // Marge in %
    const avgMarginPct = sold.length
      ? sold.reduce((acc, p) => {
          const v = vehicles.find((x) => x.id === p.vehicleId);
          if (!v) return acc;
          const ek = v.purchasePrice + vehicleTotalCostsGross(v);
          const sale = p.fields.finalPrice ?? 0;
          return acc + (sale > 0 ? ((sale - ek) / sale) * 100 : 0);
        }, 0) / sold.length
      : 0;

    return {
      sold, revenue, profit, inStock, reserved, stockValue, stockCost,
      offersSent: offersSent.length, offersAccepted, conversionRate,
      avgAge, avgCycle, avgMarginPct,
    };
  }, [vehicles, processes, offers]);

  // Pipeline by step
  const pipeline = useMemo(
    () =>
      PROCESS_STEPS.map((step) => ({
        step,
        count: processes.filter((p) => p.currentStep === step.key && p.steps[step.key]?.status !== "completed").length,
      })),
    [processes]
  );

  // Avg Step durations between consecutive completed steps
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

  // Vehicle type breakdown
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

  // Top customers by order value
  const topCustomers = useMemo(() => {
    return customers
      .map((c) => {
        const value = processes
          .filter((p) => p.customerId === c.id)
          .reduce((s, p) => s + (p.fields.finalPrice ?? 0), 0);
        const count = processes.filter((p) => p.customerId === c.id).length;
        return { ...c, value, count };
      })
      .filter((c) => c.count > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [customers, processes]);

  // User activity
  const activityByUser = useMemo(() => {
    const map = new Map<string, number>();
    activities.forEach((a) => map.set(a.user, (map.get(a.user) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [activities]);

  return (
    <AppShell>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <Badge variant="outline" className="border-primary/30 text-primary-glow mb-3">Analytics</Badge>
            <h1 className="text-3xl lg:text-4xl font-display font-bold tracking-tight">KPIs & Statistiken</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Alle wichtigen Kennzahlen auf einen Blick – Umsatz, Marge, Durchlaufzeiten und Bestand.
            </p>
          </div>
        </div>

        {/* Top KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={Euro} label="Umsatz (verkauft)" value={formatCurrency(stats.revenue)} sub={`${stats.sold.length} Übergaben`} accent />
          <Kpi icon={TrendingUp} label="Gewinn" value={formatCurrency(stats.profit)} sub={`Ø Marge ${stats.avgMarginPct.toFixed(1)}%`} />
          <Kpi icon={Wallet} label="Bestandswert" value={formatCurrency(stats.stockValue)} sub={`EK ${formatCurrency(stats.stockCost)}`} />
          <Kpi icon={Car} label="Bestand" value={`${stats.inStock.length + stats.reserved.length}`} sub={`${stats.reserved.length} reserviert`} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={Workflow} label="Aktive Vorgänge" value={`${processes.filter((p) => p.steps.delivery_confirmation?.status !== "completed").length}`} />
          <Kpi icon={FileCheck2} label="Conversion (Angebote)" value={`${stats.conversionRate.toFixed(0)}%`} sub={`${stats.offersAccepted}/${stats.offersSent} angenommen`} />
          <Kpi icon={Timer} label="Ø Durchlaufzeit" value={`${stats.avgCycle.toFixed(1)} Tage`} sub="Vorgang → Übergabe" />
          <Kpi icon={Target} label="Ø Standzeit" value={`${stats.avgAge.toFixed(0)} Tage`} sub="Bestand im Hof" />
        </div>

        {/* Goals */}
        <GoalsPanel />

        {/* Step timing */}
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

        {/* Pipeline */}
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

        {/* Type breakdown + Top customers */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-6 bg-card border-border shadow-card">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-display font-semibold">Bestand nach Fahrzeugtyp</h2>
                <p className="text-sm text-muted-foreground mt-1">Verteilung & Wert</p>
              </div>
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
                <h2 className="text-xl font-display font-semibold">Top-Kunden</h2>
                <p className="text-sm text-muted-foreground mt-1">Nach Auftragswert</p>
              </div>
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
        </div>

        {/* Activity */}
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
      </div>
    </AppShell>
  );
};

const Kpi = ({
  icon: Icon, label, value, sub, accent,
}: { icon: any; label: string; value: string; sub?: string; accent?: boolean }) => (
  <Card className={`p-5 bg-card border-border shadow-card ${accent ? "ring-1 ring-primary/30" : ""}`}>
    <div className="flex items-start justify-between mb-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      <div className={`size-8 rounded-lg grid place-items-center ${accent ? "bg-gradient-brand shadow-glow" : "bg-secondary"}`}>
        <Icon className="size-4 text-primary-foreground" />
      </div>
    </div>
    <p className="text-2xl font-display font-bold">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </Card>
);

export default KPIs;
