import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Target, Trash2, Sparkles } from "lucide-react";
import { useProcessStore } from "@/store/processStore";
import { Goal, GoalMetric, GoalPeriod, formatCurrency, formatDate } from "@/data/process";
import { toast } from "sonner";

const METRIC_LABEL: Record<GoalMetric, string> = {
  revenue: "Umsatz",
  vehicles_sold: "Verkaufte Fahrzeuge",
  profit: "Gewinn",
};

const PERIOD_LABEL: Record<GoalPeriod, string> = {
  week: "Woche",
  month: "Monat",
  quarter: "Quartal",
  year: "Jahr",
};

const periodRange = (period: GoalPeriod): { start: Date; end: Date } => {
  const now = new Date();
  if (period === "week") {
    const day = (now.getDay() + 6) % 7; // Mo=0
    const start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
    return { start, end };
  }
  if (period === "month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return {
      start: new Date(now.getFullYear(), q * 3, 1),
      end: new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999),
    };
  }
  return {
    start: new Date(now.getFullYear(), 0, 1),
    end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
  };
};

export const computeGoalProgress = (
  goal: Goal,
  ctx: { processes: ReturnType<typeof useProcessStore.getState>["processes"]; vehicles: ReturnType<typeof useProcessStore.getState>["vehicles"] }
) => {
  const start = new Date(goal.startDate);
  const end = new Date(goal.endDate);

  const handovers = ctx.processes.filter((p) => {
    const rec = p.steps.handover;
    if (!rec || rec.status !== "completed" || !rec.completedAt) return false;
    const t = new Date(rec.completedAt);
    return t >= start && t <= end;
  });

  if (goal.metric === "vehicles_sold") {
    return handovers.length;
  }

  if (goal.metric === "revenue") {
    return handovers.reduce((s, p) => s + (p.fields.finalPrice ?? 0), 0);
  }

  // profit = finalPrice - (purchasePrice + sum costs gross)
  return handovers.reduce((s, p) => {
    const v = ctx.vehicles.find((x) => x.id === p.vehicleId);
    if (!v) return s;
    const costsGross = v.costs.reduce((a, c) => a + c.netAmount * (1 + c.vatRate / 100), 0);
    const ek = v.purchasePrice + costsGross;
    const sale = p.fields.finalPrice ?? 0;
    return s + (sale - ek);
  }, 0);
};

const formatValue = (metric: GoalMetric, value: number) =>
  metric === "vehicles_sold" ? `${Math.round(value)}` : formatCurrency(value);

export const GoalsPanel = () => {
  const goals = useProcessStore((s) => s.goals);
  const processes = useProcessStore((s) => s.processes);
  const vehicles = useProcessStore((s) => s.vehicles);
  const addGoal = useProcessStore((s) => s.addGoal);
  const removeGoal = useProcessStore((s) => s.removeGoal);

  const [open, setOpen] = useState(false);
  const [metric, setMetric] = useState<GoalMetric>("revenue");
  const [period, setPeriod] = useState<GoalPeriod>("month");
  const [target, setTarget] = useState<string>("");
  const [label, setLabel] = useState<string>("");

  const enriched = useMemo(
    () =>
      goals.map((g) => {
        const value = computeGoalProgress(g, { processes, vehicles });
        const pct = g.target > 0 ? Math.min(100, (value / g.target) * 100) : 0;
        return { goal: g, value, pct };
      }),
    [goals, processes, vehicles]
  );

  const handleSave = () => {
    const t = parseFloat(target.replace(",", "."));
    if (!t || t <= 0) { toast.error("Bitte gültigen Zielwert eingeben."); return; }
    const { start, end } = periodRange(period);
    addGoal({
      metric,
      period,
      target: t,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      label: label.trim() || `${METRIC_LABEL[metric]} ${PERIOD_LABEL[period]}`,
    });
    toast.success("Ziel gesetzt.");
    setOpen(false);
    setTarget(""); setLabel("");
  };

  return (
    <Card className="p-6 bg-gradient-surface border-border shadow-card overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-glow pointer-events-none opacity-60" />
      <div className="relative">
        <div className="flex items-start justify-between mb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="size-4 text-primary-glow" />
              <h2 className="text-xl font-display font-semibold">Deine Ziele</h2>
            </div>
            <p className="text-sm text-muted-foreground">Fortschritt im aktuellen Zeitraum – live aus deinen Vorgängen.</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-brand hover:opacity-90 shadow-elegant">
                <Plus className="size-4 mr-1.5" /> Ziel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neues Ziel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Kennzahl</Label>
                    <Select value={metric} onValueChange={(v) => setMetric(v as GoalMetric)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Umsatz</SelectItem>
                        <SelectItem value="vehicles_sold">Verkaufte Fahrzeuge</SelectItem>
                        <SelectItem value="profit">Gewinn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Zeitraum</Label>
                    <Select value={period} onValueChange={(v) => setPeriod(v as GoalPeriod)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">Woche</SelectItem>
                        <SelectItem value="month">Monat</SelectItem>
                        <SelectItem value="quarter">Quartal</SelectItem>
                        <SelectItem value="year">Jahr</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Zielwert {metric === "vehicles_sold" ? "(Stück)" : "(€)"}</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder={metric === "vehicles_sold" ? "z. B. 8" : "z. B. 250000"}
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Bezeichnung (optional)</Label>
                  <Input placeholder="z. B. Umsatzziel März" value={label} onChange={(e) => setLabel(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
                <Button onClick={handleSave} className="bg-gradient-brand">Speichern</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {enriched.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Target className="size-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Noch keine Ziele gesetzt. Leg ein Umsatz-, Stückzahl- oder Gewinnziel an und sieh deinen Fortschritt live.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {enriched.map(({ goal, value, pct }) => (
              <div key={goal.id} className="rounded-xl border border-border bg-background/40 p-4 hover:border-primary/40 transition-smooth group">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="border-primary/30 text-primary-glow text-[10px]">
                        {PERIOD_LABEL[goal.period]}
                      </Badge>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{METRIC_LABEL[goal.metric]}</span>
                    </div>
                    <p className="text-sm font-semibold truncate">{goal.label}</p>
                  </div>
                  <button
                    onClick={() => { removeGoal(goal.id); toast.message("Ziel entfernt."); }}
                    className="opacity-0 group-hover:opacity-100 transition-smooth text-muted-foreground hover:text-destructive"
                    aria-label="Ziel löschen"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-display font-bold">{formatValue(goal.metric, value)}</span>
                  <span className="text-xs text-muted-foreground">von {formatValue(goal.metric, goal.target)}</span>
                </div>

                <Progress value={pct} className="h-2" />

                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(goal.startDate)} – {formatDate(goal.endDate)}
                  </span>
                  <span className={`text-xs font-semibold ${pct >= 100 ? "text-primary-glow" : "text-foreground"}`}>
                    {Math.round(pct)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
