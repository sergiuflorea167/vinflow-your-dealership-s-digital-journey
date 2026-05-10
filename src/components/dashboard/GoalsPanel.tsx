import { useEffect, useMemo, useState } from "react";
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
import { Plus, Target, Trash2, Sparkles, ChevronDown, ChevronUp, Trophy, Flame } from "lucide-react";
import { useProcessStore } from "@/store/processStore";
import { Goal, GoalMetric, GoalPeriod, formatCurrency, formatDate, vehicleTotalCostsGross } from "@/data/process";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const METRIC_KEY: Record<GoalMetric, string> = {
  revenue: "goals.metric.revenue",
  vehicles_sold: "goals.metric.vehicles_sold",
  profit: "goals.metric.profit",
};

const PERIOD_KEY: Record<GoalPeriod, string> = {
  week: "goals.period.week",
  month: "goals.period.month",
  quarter: "goals.period.quarter",
  year: "goals.period.year",
};

const periodRange = (period: GoalPeriod): { start: Date; end: Date } => {
  const now = new Date();
  if (period === "week") {
    const day = (now.getDay() + 6) % 7;
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

const computeGoalProgress = (
  goal: Goal,
  ctx: { processes: ReturnType<typeof useProcessStore.getState>["processes"]; vehicles: ReturnType<typeof useProcessStore.getState>["vehicles"] }
) => {
  const start = new Date(goal.startDate);
  const end = new Date(goal.endDate);

  const handovers = ctx.processes.filter((p) => {
    const rec = p.steps.delivery_confirmation;
    if (!rec || rec.status !== "completed" || !rec.completedAt) return false;
    const t = new Date(rec.completedAt);
    return t >= start && t <= end;
  });

  if (goal.metric === "vehicles_sold") return handovers.length;
  if (goal.metric === "revenue") return handovers.reduce((s, p) => s + (p.fields.finalPrice ?? 0), 0);

  return handovers.reduce((s, p) => {
    const v = ctx.vehicles.find((x) => x.id === p.vehicleId);
    if (!v) return s;
    const ek = v.purchasePrice + vehicleTotalCostsGross(v);
    const sale = p.fields.finalPrice ?? 0;
    return s + (sale - ek);
  }, 0);
};

const formatValue = (metric: GoalMetric, value: number) =>
  metric === "vehicles_sold" ? `${Math.round(value)}` : formatCurrency(value);

const motivation = (avgPct: number, count: number, t: (k: string) => string) => {
  if (count === 0) return { headline: t("goals.mood.start.headline"), sub: t("goals.mood.start.sub") };
  if (avgPct >= 100) return { headline: t("goals.mood.done.headline"), sub: t("goals.mood.done.sub") };
  if (avgPct >= 75) return { headline: t("goals.mood.sprint.headline"), sub: t("goals.mood.sprint.sub") };
  if (avgPct >= 50) return { headline: t("goals.mood.half.headline"), sub: t("goals.mood.half.sub") };
  if (avgPct >= 25) return { headline: t("goals.mood.early.headline"), sub: t("goals.mood.early.sub") };
  return { headline: t("goals.mood.zero.headline"), sub: t("goals.mood.zero.sub") };
};

export const GoalsPanel = () => {
  const t = useT();
  const goals = useProcessStore((s) => s.goals);
  const processes = useProcessStore((s) => s.processes);
  const vehicles = useProcessStore((s) => s.vehicles);
  const addGoal = useProcessStore((s) => s.addGoal);
  const removeGoal = useProcessStore((s) => s.removeGoal);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("vinflow.goals.collapsed") === "1";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("vinflow.goals.collapsed", collapsed ? "1" : "0");
    }
  }, [collapsed]);

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

  const avgPct = enriched.length ? enriched.reduce((s, g) => s + g.pct, 0) / enriched.length : 0;
  const reached = enriched.filter((g) => g.pct >= 100).length;
  const mood = motivation(avgPct, enriched.length, t);

  const handleSave = () => {
    const tv = parseFloat(target.replace(",", "."));
    if (!tv || tv <= 0) { toast.error(t("goals.invalid")); return; }
    const { start, end } = periodRange(period);
    addGoal({
      metric, period, target: tv,
      startDate: start.toISOString(), endDate: end.toISOString(),
      label: label.trim() || `${t(METRIC_KEY[metric])} ${t(PERIOD_KEY[period])}`,
    });
    toast.success(t("goals.saved"));
    setOpen(false); setTarget(""); setLabel("");
  };

  return (
    <Card className="relative overflow-hidden bg-gradient-surface border-primary/20 shadow-elegant ring-1 ring-primary/10">
      {/* Background flair */}
      <div className="absolute inset-0 bg-gradient-glow pointer-events-none opacity-80" />
      <div className="absolute -top-20 -right-20 size-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-16 size-72 rounded-full bg-primary-glow/10 blur-3xl pointer-events-none" />

      <div className="relative p-6 lg:p-8">
        {/* Hero header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4 min-w-0">
            <div className="size-12 rounded-2xl bg-gradient-brand grid place-items-center shadow-glow shrink-0">
              {avgPct >= 100 ? (
                <Trophy className="size-6 text-primary-foreground" />
              ) : avgPct >= 50 ? (
                <Flame className="size-6 text-primary-foreground" />
              ) : (
                <Sparkles className="size-6 text-primary-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <Badge variant="outline" className="border-primary/30 text-primary-glow text-[10px] mb-2">
                {t("goals.badge")}
              </Badge>
              <h2 className="text-2xl lg:text-3xl font-display font-bold tracking-tight leading-tight">
                {mood.headline}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{mood.sub}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {enriched.length > 0 && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background/60">
                <span className="text-xs font-mono text-muted-foreground">{reached}/{enriched.length}</span>
                <span className="text-xs text-muted-foreground">{t("goals.reached")}</span>
                <span className="text-xs font-display font-bold text-primary-glow ml-1">Ø {Math.round(avgPct)}%</span>
              </div>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-brand hover:opacity-90 shadow-elegant">
                  <Plus className="size-4 mr-1.5" /> {t("goals.new")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("goals.dialog.title")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{t("goals.metric")}</Label>
                      <Select value={metric} onValueChange={(v) => setMetric(v as GoalMetric)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="revenue">{t("goals.metric.revenue")}</SelectItem>
                          <SelectItem value="vehicles_sold">{t("goals.metric.vehicles_sold")}</SelectItem>
                          <SelectItem value="profit">{t("goals.metric.profit")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">{t("goals.period")}</Label>
                      <Select value={period} onValueChange={(v) => setPeriod(v as GoalPeriod)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="week">{t("goals.period.week")}</SelectItem>
                          <SelectItem value="month">{t("goals.period.month")}</SelectItem>
                          <SelectItem value="quarter">{t("goals.period.quarter")}</SelectItem>
                          <SelectItem value="year">{t("goals.period.year")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">{t("goals.target")} {metric === "vehicles_sold" ? "(#)" : "(€)"}</Label>
                    <Input
                      type="number" inputMode="decimal"
                      placeholder={metric === "vehicles_sold" ? "8" : "250000"}
                      value={target} onChange={(e) => setTarget(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("goals.label")}</Label>
                    <Input placeholder={t("goals.label.placeholder")} value={label} onChange={(e) => setLabel(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
                  <Button onClick={handleSave} className="bg-gradient-brand">{t("common.save")}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? t("goals.show") : t("goals.collapse")}
            >
              {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
            </Button>
          </div>
        </div>

        {/* Collapsed mini-bar */}
        {collapsed && enriched.length > 0 && (
          <div className="relative mt-5 flex items-center gap-3">
            <Progress value={avgPct} className="h-2 flex-1" />
            <span className="text-xs font-display font-bold">{Math.round(avgPct)}%</span>
          </div>
        )}

        {/* Expanded goals */}
        {!collapsed && (
          <div className="relative mt-6">
            {enriched.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center bg-background/40">
                <Target className="size-10 mx-auto text-primary-glow mb-3" />
                <h3 className="text-lg font-display font-semibold mb-1">{t("goals.empty.title")}</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {t("goals.empty.sub")}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enriched.map(({ goal, value, pct }) => {
                  const reached = pct >= 100;
                  return (
                    <div
                      key={goal.id}
                      className={cn(
                        "group relative rounded-2xl border bg-background/60 backdrop-blur-sm p-5 transition-smooth",
                        reached ? "border-primary/50 shadow-glow" : "border-border hover:border-primary/40"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="border-primary/30 text-primary-glow text-[10px]">
                              {t(PERIOD_KEY[goal.period])}
                            </Badge>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t(METRIC_KEY[goal.metric])}</span>
                          </div>
                          <p className="text-sm font-semibold truncate">{goal.label}</p>
                        </div>
                        <button
                          onClick={() => { removeGoal(goal.id); toast.message(t("goals.removed")); }}
                          className="opacity-0 group-hover:opacity-100 transition-smooth text-muted-foreground hover:text-destructive"
                          aria-label={t("goals.delete")}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      <div className="flex items-end justify-between mb-3">
                        <span className="text-3xl font-display font-bold tracking-tight">{formatValue(goal.metric, value)}</span>
                        <span className="text-xs text-muted-foreground">{t("goals.of")} {formatValue(goal.metric, goal.target)}</span>
                      </div>

                      <Progress value={pct} className={cn("h-2.5", reached && "[&>div]:bg-primary-glow")} />

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(goal.startDate)} – {formatDate(goal.endDate)}
                        </span>
                        <span className={cn("text-sm font-display font-bold", reached ? "text-primary-glow" : "text-foreground")}>
                          {Math.round(pct)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
