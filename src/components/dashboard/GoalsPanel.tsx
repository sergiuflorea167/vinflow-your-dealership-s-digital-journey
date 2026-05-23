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
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  // Zeitraum live aus goal.period berechnen (sonst friert das Fenster auf den
  // Anlege-Zeitpunkt ein).
  const { start, end } = periodRange(goal.period);

  // Umsatz/Marge/Stück zählen erst, wenn die Rechnung gestellt & gebucht
  // wurde (Step "Rechnungsstellung" = Pipeline Step 5). Vorher ist es noch
  // kein realisierter Umsatz.
  const invoiced = ctx.processes.filter((p) => {
    const rec = p.steps.invoicing;
    if (!rec || rec.status !== "completed" || !rec.completedAt) return false;
    const t = new Date(rec.completedAt);
    return t >= start && t <= end;
  });

  if (goal.metric === "vehicles_sold") return invoiced.length;
  if (goal.metric === "revenue") return invoiced.reduce((s, p) => s + (p.fields.finalPrice ?? 0), 0);

  return invoiced.reduce((s, p) => {
    const v = ctx.vehicles.find((x) => x.id === p.vehicleId);
    if (!v) return s;
    const ek = v.purchasePrice + vehicleTotalCostsGross(v);
    const sale = p.fields.finalPrice ?? 0;
    return s + (sale - ek);
  }, 0);
};


const formatValue = (metric: GoalMetric, value: number) =>
  metric === "vehicles_sold" ? `${Math.round(value)}` : formatCurrency(value);

type EnrichedGoal = { goal: Goal; value: number; pct: number };

const daysLeft = (endISO: string) => {
  const ms = new Date(endISO).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};

const periodNoun = (p: GoalPeriod) =>
  p === "week" ? "diese Woche" : p === "month" ? "diesen Monat" : p === "quarter" ? "dieses Quartal" : "dieses Jahr";

const pick = <T,>(arr: T[], seed: number) => arr[Math.abs(seed) % arr.length];

const personalizedMotivation = (enriched: EnrichedGoal[], firstName: string | undefined, seed: number) => {
  const name = firstName?.trim() ? `, ${firstName.trim()}` : "";

  if (enriched.length === 0) {
    return pick(
      [
        { headline: `Lass uns dein erstes Ziel setzen${name}.`, sub: "Definiere ein Umsatz-, Stück- oder Margen-Ziel – ich rechne den Fortschritt live aus deinen Vorgängen." },
        { headline: `Ohne Ziel kein Kurs${name}.`, sub: "Setz dir jetzt ein Monats- oder Jahresziel – ich tracke automatisch jede Übergabe." },
        { headline: `Was willst du diesen Monat reißen${name}?`, sub: "Ein klares Ziel verändert, wie du jeden Vorgang angehst. Leg los." },
        { headline: `Bereit für dein nächstes Level${name}?`, sub: "Ein konkretes Ziel ist der schnellste Weg zu mehr Fokus und Marge." },
      ],
      seed,
    );
  }

  const reached = enriched.filter((g) => g.pct >= 100);
  const open = enriched.filter((g) => g.pct < 100);

  if (open.length === 0) {
    return pick(
      [
        { headline: `Alle ${enriched.length} Ziele erreicht${name} – stark!`, sub: "Setz dir jetzt das nächste Level oder genieß den Moment. Du hast es verdient." },
        { headline: `Volltreffer${name}: ${enriched.length}/${enriched.length} Ziele im Sack.`, sub: "Zeit, die Latte ein Stück höher zu legen. Was traust du dir als Nächstes zu?" },
        { headline: `Mission erfüllt${name}.`, sub: "Selten zu sehen. Genieß den Moment – und plan schon den nächsten Push." },
        { headline: `Du läufst über Plan${name}.`, sub: "Alle Ziele grün. Heute darfst du dich kurz auf die Schulter klopfen." },
      ],
      seed,
    );
  }

  const focus = [...open].sort((a, b) => b.pct - a.pct)[0];
  const remainingNum = Math.max(0, focus.goal.target - focus.value);
  const remaining =
    focus.goal.metric === "vehicles_sold"
      ? `${Math.ceil(remainingNum)} Fahrzeug${Math.ceil(remainingNum) === 1 ? "" : "e"}`
      : formatCurrency(remainingNum);
  const days = daysLeft(focus.goal.endDate);
  const dayWord = `${days} Tag${days === 1 ? "" : "e"}`;
  const period = periodNoun(focus.goal.period);
  const pctR = Math.round(focus.pct);

  if (focus.pct >= 90) {
    return pick(
      [
        { headline: `Nur noch ${remaining}${name} – "${focus.goal.label}" ist greifbar.`, sub: `Bei ${pctR} %. Noch ${dayWord} ${period} – das holst du.` },
        { headline: `Endspurt${name}: ${remaining} bis zum Ziel.`, sub: `${pctR} % stehen. Eine gute Woche und "${focus.goal.label}" ist erledigt.` },
        { headline: `Riechst du das${name}? Das ist der Sieg.`, sub: `Nur ${remaining} fehlen auf "${focus.goal.label}". ${dayWord} Zeit – locker drin.` },
        { headline: `Letzter Schritt${name} – ${pctR} % geschafft.`, sub: `${remaining} bis "${focus.goal.label}". Jetzt nicht den Fuß vom Gas.` },
      ],
      seed,
    );
  }
  if (focus.pct >= 60) {
    const reachedNote = reached.length > 0 ? `${reached.length} andere Ziele schon im Sack. ` : "";
    return pick(
      [
        { headline: `${pctR} % von "${focus.goal.label}" – Endspurt${name}.`, sub: `Es fehlen ${remaining}. ${reachedNote}Halte das Tempo.` },
        { headline: `Du bist auf Kurs${name}: ${pctR} %.`, sub: `Noch ${remaining} bis "${focus.goal.label}", ${dayWord} ${period}. Sauber dranbleiben.` },
        { headline: `${remaining} trennen dich vom Ziel${name}.`, sub: `${pctR} % stehen schon. Plan deine Woche entlang dieses Ziels und du holst es.` },
        { headline: `Zwei Drittel sind drin${name}.`, sub: `${remaining} fehlen auf "${focus.goal.label}". Jetzt zählt jeder abgeschlossene Vorgang.` },
      ],
      seed,
    );
  }
  if (focus.pct >= 30) {
    return pick(
      [
        { headline: `Solide Halbzeit${name}: ${pctR} % auf "${focus.goal.label}".`, sub: `Noch ${remaining} bis zum Ziel, ${dayWord} Zeit. Push gezielt deinen Standzeit-Bestand.` },
        { headline: `Du bist mittendrin${name}.`, sub: `${pctR} % geschafft, ${remaining} fehlen. Welche 2 Fahrzeuge bringst du diese Woche raus?` },
        { headline: `${pctR} % – guter Rhythmus${name}.`, sub: `${remaining} bis "${focus.goal.label}". Mit ${dayWord} Restzeit absolut machbar.` },
        { headline: `Halbzeit-Check${name}: läuft.`, sub: `Noch ${remaining} bis zum Ziel. Heute eine Stunde Fokus auf die heißesten Leads – das zahlt ein.` },
      ],
      seed,
    );
  }
  if (focus.pct > 0) {
    return pick(
      [
        { headline: `Erste ${pctR} % stehen${name} – jetzt Drehzahl raus.`, sub: `${remaining} fehlen für "${focus.goal.label}". Plane heute 2–3 konkrete Aktionen, dann läuft's.` },
        { headline: `Du bist losgefahren${name}.`, sub: `${pctR} % von "${focus.goal.label}" – ${remaining} stehen noch aus. Tempo aufbauen.` },
        { headline: `Anfang gemacht${name}: ${pctR} %.`, sub: `Noch ${remaining} bis zum Ziel, ${dayWord} Zeit. Welcher Vorgang lässt sich heute schließen?` },
        { headline: `Kleiner Vorsprung${name}, große Chance.`, sub: `${remaining} bis "${focus.goal.label}". Wenn du jetzt fokussierst, drehst du die Woche.` },
      ],
      seed,
    );
  }
  return pick(
    [
      { headline: `Frischer Start${name}: 0 % auf "${focus.goal.label}".`, sub: `Du hast ${dayWord} ${period}. Eine fokussierte Woche reicht oft schon, um Fahrt aufzunehmen.` },
      { headline: `Weißes Blatt${name}.`, sub: `${remaining} bis "${focus.goal.label}". Der erste Abschluss ist der schwerste – pack ihn heute.` },
      { headline: `Noch alles offen${name}.`, sub: `${dayWord} ${period}, um "${focus.goal.label}" zu drehen. Was ist der nächste konkrete Schritt?` },
      { headline: `Startblock${name}.`, sub: `${remaining} fehlen. Klein anfangen, dranbleiben – das wird.` },
    ],
    seed,
  );
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
        const rawPct = g.target > 0 ? (value / g.target) * 100 : 0;
        const pct = Math.min(100, rawPct);
        return { goal: g, value, pct, rawPct };
      }),
    [goals, processes, vehicles]
  );

  const firstName = useProcessStore((s) => s.settings?.firstName);
  const avgPct = enriched.length ? enriched.reduce((s, g) => s + g.pct, 0) / enriched.length : 0;
  const reached = enriched.filter((g) => g.pct >= 100).length;
  const [moodSeed, setMoodSeed] = useState(() => Math.floor(Math.random() * 100000));
  const mood = useMemo(
    () => personalizedMotivation(enriched, firstName, moodSeed),
    [enriched, firstName, moodSeed],
  );

  const askVincentForGoal = (goalId?: string) => {
    let prompt: string;
    const target = goalId ? enriched.find((g) => g.goal.id === goalId) : undefined;
    if (!target) {
      prompt =
        "Ich habe noch kein Ziel gesetzt. Welche realistischen Monats- und Jahresziele empfiehlst du mir basierend auf meinen aktuellen Zahlen (Umsatz, verkaufte Fahrzeuge, Marge)? Gib mir konkrete Werte.";
    } else {
      const remaining = Math.max(0, target.goal.target - target.value);
      const remStr =
        target.goal.metric === "vehicles_sold"
          ? `${Math.ceil(remaining)} Fahrzeuge`
          : formatCurrency(remaining);
      prompt = `Hilf mir, mein Ziel "${target.goal.label}" zu erreichen. Aktuell ${Math.round(target.pct)} % – es fehlen noch ${remStr} bis ${formatDate(target.goal.endDate)}. Was sollte ich konkret in den nächsten Tagen tun? Schau auf meinen Bestand (Standzeit, Marge), offene Vorgänge und To-Dos und gib mir 3–5 priorisierte Aktionen.`;
    }
    window.dispatchEvent(new CustomEvent("vincent:open", { detail: { prompt } }));
  };

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
            <button
              type="button"
              onClick={() => setMoodSeed(Math.floor(Math.random() * 100000))}
              className="size-12 rounded-2xl bg-gradient-brand grid place-items-center shadow-glow shrink-0 hover:opacity-90 transition-smooth"
              aria-label="Andere Motivation anzeigen"
              title="Andere Motivation anzeigen"
            >
              {avgPct >= 100 ? (
                <Trophy className="size-6 text-primary-foreground" />
              ) : avgPct >= 50 ? (
                <Flame className="size-6 text-primary-foreground" />
              ) : (
                <Sparkles className="size-6 text-primary-foreground" />
              )}
            </button>
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
            {enriched.length === 0 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => askVincentForGoal()}
                className="border-primary/40 text-primary-glow hover:bg-primary/10"
              >
                <Sparkles className="size-4 mr-1.5" />
                Vincent helfen lassen
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-primary/40 text-primary-glow hover:bg-primary/10"
                  >
                    <Sparkles className="size-4 mr-1.5" />
                    Vincent helfen lassen
                    <ChevronDown className="size-3.5 ml-1.5 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel>Bei welchem Ziel soll Vincent helfen?</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {enriched.map(({ goal, pct }) => (
                    <DropdownMenuItem
                      key={goal.id}
                      onClick={() => askVincentForGoal(goal.id)}
                      className="flex items-start gap-2 py-2"
                    >
                      <Target className="size-3.5 mt-0.5 text-primary-glow shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{goal.label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {t(PERIOD_KEY[goal.period])} · {Math.round(pct)} %
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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
                {enriched.map(({ goal, value, pct, rawPct }) => {
                  const reached = rawPct >= 100;
                  const crushed = rawPct >= 110;
                  return (
                    <div
                      key={goal.id}
                      className={cn(
                        "group relative rounded-2xl p-[1.5px] transition-smooth",
                        crushed
                          ? "bg-[linear-gradient(120deg,#34d399,#22d3ee,#a855f7,#f472b6,#34d399)] bg-[length:300%_300%] animate-gradient-shift shadow-[0_0_60px_-10px_hsl(160_90%_55%/0.7)]"
                          : reached
                          ? "bg-gradient-to-br from-primary/60 to-primary-glow/60 shadow-glow animate-pulse-glow"
                          : "bg-border hover:bg-primary/40"
                      )}
                    >
                    <div
                      className={cn(
                        "relative rounded-[14px] bg-background/85 backdrop-blur-sm p-5 overflow-hidden",
                      )}
                    >
                      {crushed && (
                        <>
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-400/15 via-cyan-400/10 to-fuchsia-500/15" />
                          <div className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-emerald-400/30 blur-3xl" />
                          <div className="pointer-events-none absolute -bottom-10 -left-10 size-32 rounded-full bg-fuchsia-500/30 blur-3xl" />
                        </>
                      )}
                      <div className="relative">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className={cn(
                              "text-[10px]",
                              crushed ? "border-emerald-400/50 text-emerald-300" : "border-primary/30 text-primary-glow"
                            )}>
                              {t(PERIOD_KEY[goal.period])}
                            </Badge>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t(METRIC_KEY[goal.metric])}</span>
                            {crushed && (
                              <Badge className="text-[10px] border-0 bg-[linear-gradient(120deg,#34d399,#22d3ee,#a855f7,#f472b6)] bg-[length:200%_200%] animate-gradient-shift text-background font-bold uppercase tracking-wider shadow-[0_0_15px_hsl(160_80%_50%/0.6)]">
                                <Trophy className="size-3 mr-1 animate-trophy-bounce" /> übertroffen
                              </Badge>
                            )}
                            {reached && !crushed && (
                              <Badge className="text-[10px] border-0 bg-primary-glow text-background font-bold uppercase tracking-wider">
                                <Trophy className="size-3 mr-1" /> erreicht
                              </Badge>
                            )}
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

                      <div className="flex items-end justify-between mb-3 gap-3">
                        <span className="text-3xl font-display font-bold tracking-tight">{formatValue(goal.metric, value)}</span>
                        <span className={cn(
                          "font-display font-black tabular-nums leading-none",
                          crushed
                            ? "text-4xl bg-[linear-gradient(120deg,#6ee7b7,#67e8f9,#d8b4fe,#f9a8d4)] bg-[length:200%_200%] animate-gradient-shift bg-clip-text text-transparent drop-shadow-[0_0_12px_hsl(160_90%_60%/0.5)]"
                            : reached
                            ? "text-3xl text-primary-glow drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]"
                            : "text-2xl text-foreground"
                        )}>
                          {Math.round(rawPct)}%
                        </span>
                      </div>

                      <Progress
                        value={pct}
                        className={cn(
                          "h-2.5",
                          crushed && "[&>div]:bg-[linear-gradient(120deg,#34d399,#22d3ee,#a855f7,#f472b6)] [&>div]:bg-[length:200%_200%] [&>div]:animate-gradient-shift",
                          reached && !crushed && "[&>div]:bg-primary-glow"
                        )}
                      />

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(goal.startDate)} – {formatDate(goal.endDate)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {t("goals.of")} {formatValue(goal.metric, goal.target)}
                        </span>
                      </div>
                      </div>
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
