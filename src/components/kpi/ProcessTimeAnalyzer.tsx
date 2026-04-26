// Konfigurierbare Auswertung von Prozessdauern.
// User wählt Zeitraum + Von-Schritt + Bis-Schritt und fügt die Messung
// dauerhaft als Karte hinzu. Jede Karte enthält Statistik + Deutung.

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Calendar as CalendarIcon, Plus, Timer, Trash2, X, Info, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Process, PROCESS_STEPS, ProcessStepKey,
} from "@/data/process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RangePreset = "week" | "month" | "quarter" | "year" | "all" | "custom";

interface Measurement {
  id: string;
  fromStep: ProcessStepKey;
  toStep: ProcessStepKey;
  rangePreset: RangePreset;
  customFrom?: string; // ISO
  customTo?: string;   // ISO
}

interface Props {
  processes: Process[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RANGE_LABELS: Record<RangePreset, string> = {
  week: "Diese Woche",
  month: "Dieser Monat",
  quarter: "Dieses Quartal",
  year: "Dieses Jahr",
  all: "Gesamtzeitraum",
  custom: "Individuell",
};

const startOfWeekISO = () => {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const d = new Date(now);
  d.setDate(now.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfMonthISO = () =>
  new Date(new Date().getFullYear(), new Date().getMonth(), 1);

const startOfQuarterISO = () => {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) * 3;
  return new Date(now.getFullYear(), q, 1);
};

const startOfYearISO = () => new Date(new Date().getFullYear(), 0, 1);

const resolveRange = (m: Measurement): { from: Date; to: Date } => {
  const to = new Date();
  switch (m.rangePreset) {
    case "week":    return { from: startOfWeekISO(),    to };
    case "month":   return { from: startOfMonthISO(),   to };
    case "quarter": return { from: startOfQuarterISO(), to };
    case "year":    return { from: startOfYearISO(),    to };
    case "all":     return { from: new Date(0),         to };
    case "custom": {
      return {
        from: m.customFrom ? new Date(m.customFrom) : new Date(0),
        to:   m.customTo   ? new Date(m.customTo)   : to,
      };
    }
  }
};

const stepLabel = (k: ProcessStepKey) =>
  PROCESS_STEPS.find((s) => s.key === k)?.shortLabel ?? k;

const stepIndex = (k: ProcessStepKey) =>
  PROCESS_STEPS.findIndex((s) => s.key === k);

interface Stats {
  count: number;
  avg: number;
  median: number;
  min: number;
  max: number;
}

const computeStats = (
  processes: Process[],
  m: Measurement,
): Stats => {
  const { from, to } = resolveRange(m);
  const diffs: number[] = [];

  processes.forEach((p) => {
    const a = p.steps[m.fromStep]?.completedAt;
    const b = p.steps[m.toStep]?.completedAt;
    if (!a || !b) return;
    const aDate = new Date(a);
    const bDate = new Date(b);
    if (bDate < aDate) return;
    // Bezugszeitpunkt: Abschluss des Bis-Schritts liegt im gewählten Zeitraum.
    if (bDate < from || bDate > to) return;
    diffs.push((bDate.getTime() - aDate.getTime()) / 86400000);
  });

  if (diffs.length === 0) {
    return { count: 0, avg: 0, median: 0, min: 0, max: 0 };
  }
  const sorted = [...diffs].sort((x, y) => x - y);
  const sum = sorted.reduce((s, n) => s + n, 0);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
  return {
    count: sorted.length,
    avg: sum / sorted.length,
    median,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
};

// Deutung der Dauer in Klartext, abhängig von Schritt-Distanz und Wert.
const interpret = (m: Measurement, s: Stats): string => {
  if (s.count === 0) {
    return "Keine abgeschlossenen Übergänge in diesem Zeitraum. Sobald in beiden Schritten Belege archiviert wurden, erscheinen hier Werte.";
  }
  const distance = Math.max(1, stepIndex(m.toStep) - stepIndex(m.fromStep));
  // Heuristische Schwellen pro Schritt-Distanz (Tage)
  const goodMax = distance * 2;   // z. B. 1 Schritt: ≤ 2 Tage = sehr gut
  const okMax   = distance * 5;   //                  ≤ 5 Tage = okay
  const slowMax = distance * 10;  //                  ≤ 10 Tage = langsam

  let verdict: string;
  if (s.avg <= goodMax) {
    verdict = `Sehr zügig — der Übergang von „${stepLabel(m.fromStep)}“ nach „${stepLabel(m.toStep)}“ läuft schnell und gut organisiert.`;
  } else if (s.avg <= okMax) {
    verdict = `Im normalen Rahmen. Optimierungspotenzial besteht meist in der Vorbereitung des Folgeschritts (Dokumente, Termine, Kundenrückmeldungen).`;
  } else if (s.avg <= slowMax) {
    verdict = `Langsam. Häufige Ursachen: fehlende Kunden­rückmeldungen, lange interne Abstimmungen oder Engpässe in der Aufbereitung.`;
  } else {
    verdict = `Sehr langsam. Hier sollte man gezielt nach Engpässen suchen — typische Verdächtige sind Anzahlungseingänge, Werkstatt­termine oder Zulassungs­papiere.`;
  }

  const spread = s.max - s.min;
  let consistency = "";
  if (s.count >= 3 && spread > s.avg * 1.5) {
    consistency = " Die starke Streuung (Min/Max weit auseinander) deutet zudem auf uneinheitliche Abläufe hin — manche Vorgänge laufen flott, andere bleiben hängen.";
  }

  return verdict + consistency;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const newId = () => Math.random().toString(36).slice(2, 9);

export const ProcessTimeAnalyzer = ({ processes }: Props) => {
  // Vorbelegung: Ø Anzahlung → Auftragsbestätigung im laufenden Jahr
  const [measurements, setMeasurements] = useState<Measurement[]>([
    {
      id: newId(),
      fromStep: "offer",
      toStep: "order_confirmation",
      rangePreset: "year",
    },
    {
      id: newId(),
      fromStep: "order_confirmation",
      toStep: "delivery_confirmation",
      rangePreset: "year",
    },
  ]);

  // Builder-State (für „neue Messung hinzufügen“)
  const [draftFrom, setDraftFrom] = useState<ProcessStepKey>("offer");
  const [draftTo, setDraftTo] = useState<ProcessStepKey>("delivery_confirmation");
  const [draftRange, setDraftRange] = useState<RangePreset>("month");
  const [draftCustomFrom, setDraftCustomFrom] = useState<Date | undefined>();
  const [draftCustomTo, setDraftCustomTo] = useState<Date | undefined>();

  const validDraft = stepIndex(draftTo) > stepIndex(draftFrom)
    && (draftRange !== "custom" || (!!draftCustomFrom && !!draftCustomTo));

  const addMeasurement = () => {
    if (!validDraft) return;
    setMeasurements((prev) => [
      ...prev,
      {
        id: newId(),
        fromStep: draftFrom,
        toStep: draftTo,
        rangePreset: draftRange,
        customFrom: draftCustomFrom?.toISOString(),
        customTo: draftCustomTo?.toISOString(),
      },
    ]);
  };

  const removeMeasurement = (id: string) =>
    setMeasurements((prev) => prev.filter((m) => m.id !== id));

  return (
    <TooltipProvider>
      <Card className="p-6 bg-card border-border shadow-card space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-display font-semibold flex items-center gap-2">
              <Timer className="size-5 text-primary-glow" />
              Prozesszeiten
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle Zeitraum und Schritt-Bereich — die Auswertung wird live
              berechnet und mit einer Deutung versehen.
            </p>
          </div>
        </div>

        {/* Builder-Leiste */}
        <div className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Neue Auswertung
          </p>
          <div className="flex flex-wrap items-end gap-2">
            {/* Zeitraum */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Zeitraum</label>
              <Select value={draftRange} onValueChange={(v) => setDraftRange(v as RangePreset)}>
                <SelectTrigger className="h-9 w-[170px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RANGE_LABELS) as RangePreset[]).map((r) => (
                    <SelectItem key={r} value={r}>{RANGE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom range */}
            {draftRange === "custom" && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Von</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("h-9 w-[140px] justify-start text-xs", !draftCustomFrom && "text-muted-foreground")}>
                        <CalendarIcon className="size-3.5 mr-1" />
                        {draftCustomFrom ? format(draftCustomFrom, "dd.MM.yyyy") : "Datum"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={draftCustomFrom}
                        onSelect={setDraftCustomFrom}
                        locale={de}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Bis</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("h-9 w-[140px] justify-start text-xs", !draftCustomTo && "text-muted-foreground")}>
                        <CalendarIcon className="size-3.5 mr-1" />
                        {draftCustomTo ? format(draftCustomTo, "dd.MM.yyyy") : "Datum"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={draftCustomTo}
                        onSelect={setDraftCustomTo}
                        locale={de}
                        disabled={(d) => !!draftCustomFrom && d < draftCustomFrom}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            {/* Von-Schritt */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Von Schritt</label>
              <Select value={draftFrom} onValueChange={(v) => setDraftFrom(v as ProcessStepKey)}>
                <SelectTrigger className="h-9 w-[170px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROCESS_STEPS.slice(0, -1).map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ArrowRight className="size-4 text-muted-foreground mb-2" />

            {/* Bis-Schritt */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Bis Schritt</label>
              <Select value={draftTo} onValueChange={(v) => setDraftTo(v as ProcessStepKey)}>
                <SelectTrigger className="h-9 w-[200px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROCESS_STEPS
                    .filter((s) => stepIndex(s.key) > stepIndex(draftFrom))
                    .map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              size="sm"
              className="h-9 bg-gradient-brand gap-1.5"
              disabled={!validDraft}
              onClick={addMeasurement}
            >
              <Plus className="size-4" /> Hinzufügen
            </Button>
          </div>
          {!validDraft && draftRange === "custom" && (
            <p className="text-[10px] text-warning">Bitte ein Start- und End-Datum wählen.</p>
          )}
          {!validDraft && draftRange !== "custom" && (
            <p className="text-[10px] text-warning">„Bis Schritt“ muss nach „Von Schritt“ liegen.</p>
          )}
        </div>

        {/* Ergebnisse */}
        {measurements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl">
            Noch keine Auswertungen. Konfiguriere oben deine erste Messung.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {measurements.map((m) => (
              <MeasurementCard
                key={m.id}
                measurement={m}
                processes={processes}
                onRemove={() => removeMeasurement(m.id)}
              />
            ))}
          </div>
        )}
      </Card>
    </TooltipProvider>
  );
};

// ---------------------------------------------------------------------------
// Result card
// ---------------------------------------------------------------------------

const MeasurementCard = ({
  measurement, processes, onRemove,
}: {
  measurement: Measurement;
  processes: Process[];
  onRemove: () => void;
}) => {
  const stats = useMemo(() => computeStats(processes, measurement), [processes, measurement]);
  const interpretation = useMemo(() => interpret(measurement, stats), [measurement, stats]);
  const { from, to } = resolveRange(measurement);

  // Visualisierung: Avg vs. Max (falls > 0)
  const intensity = stats.max > 0 ? Math.min(100, (stats.avg / Math.max(stats.max, 1)) * 100) : 0;

  const rangeText = measurement.rangePreset === "all"
    ? "Gesamtzeitraum"
    : measurement.rangePreset === "custom"
      ? `${format(from, "dd.MM.yyyy")} – ${format(to, "dd.MM.yyyy")}`
      : RANGE_LABELS[measurement.rangePreset];

  return (
    <div className="rounded-xl border border-border bg-background/40 p-4 space-y-3 group relative">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-display font-semibold flex-wrap">
            <span>{stepLabel(measurement.fromStep)}</span>
            <ArrowRight className="size-3.5 text-muted-foreground" />
            <span>{stepLabel(measurement.toStep)}</span>
          </div>
          <Badge variant="outline" className="mt-1.5 text-[10px] gap-1 border-border">
            <CalendarIcon className="size-2.5" />
            {rangeText}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-smooth"
          onClick={onRemove}
          aria-label="Auswertung entfernen"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {/* Hauptzahl */}
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-display font-bold tracking-tight">
          {stats.avg.toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground">Ø Tage</span>
      </div>

      <Progress value={intensity} className="h-1.5" />

      {/* Sekundäre Werte */}
      <div className="grid grid-cols-4 gap-2 text-center pt-1">
        <Stat label="Median" value={stats.count > 0 ? stats.median.toFixed(1) : "–"} />
        <Stat label="Min" value={stats.count > 0 ? stats.min.toFixed(1) : "–"} />
        <Stat label="Max" value={stats.count > 0 ? stats.max.toFixed(1) : "–"} />
        <Stat label="Vorgänge" value={String(stats.count)} />
      </div>

      {/* Deutung */}
      <div className="border-t border-border pt-3 space-y-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] uppercase tracking-widest text-primary-glow font-semibold">
            Deutung
          </p>
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Methodik" className="text-muted-foreground/60 hover:text-primary-glow">
                <Info className="size-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
              Berücksichtigt werden Vorgänge, deren Bis-Schritt im gewählten
              Zeitraum abgeschlossen wurde. Differenz = Tage zwischen Abschluss
              des Von-Schritts und Abschluss des Bis-Schritts.
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{interpretation}</p>
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-secondary/40 px-2 py-1.5">
    <p className="text-[9px] uppercase tracking-wider text-muted-foreground leading-none">{label}</p>
    <p className="text-sm font-semibold leading-tight mt-0.5">{value}</p>
  </div>
);
