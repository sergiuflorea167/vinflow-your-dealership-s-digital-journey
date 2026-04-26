// Konfigurierbare Auswertung von Prozess- und Lebenszyklus-Zeiten eines Fahrzeugs.
// Stationen umfassen Pre-Sales-Events (Einkaufsplanung, Bestandszugang, Inseriert)
// sowie alle Prozess-Schritte. User wählt Zeitraum, Von-/Bis-Station und optional
// einen Fahrzeugtyp-Filter — die Auswertung läuft live.

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Calendar as CalendarIcon, Plus, Timer, Trash2, Info, ArrowRight, Car,
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
  Process, PROCESS_STEPS, ProcessStepKey, Vehicle, PurchasePlan,
  VehicleType, VEHICLE_TYPE_LABELS,
} from "@/data/process";

// ---------------------------------------------------------------------------
// Stationen (Lebenszyklus-Punkte eines Fahrzeugs)
// ---------------------------------------------------------------------------

type StationKey =
  | "purchase_planned"   // Plan-Anlage (Einkaufsplanung)
  | "arrived"            // Bestandszugang im Hof
  | "listed"             // Online inseriert
  | ProcessStepKey;      // alle Vorgangs-Schritte

interface Station {
  key: StationKey;
  label: string;
  shortLabel: string;
  group: "lifecycle" | "process";
}

const LIFECYCLE_STATIONS: Station[] = [
  { key: "purchase_planned", label: "Einkaufsplanung",  shortLabel: "Einkauf",   group: "lifecycle" },
  { key: "arrived",          label: "Bestandszugang",   shortLabel: "Zugang",    group: "lifecycle" },
  { key: "listed",           label: "Inseriert",        shortLabel: "Inseriert", group: "lifecycle" },
];

const PROCESS_STATIONS: Station[] = PROCESS_STEPS.map((s) => ({
  key: s.key,
  label: s.label,
  shortLabel: s.shortLabel,
  group: "process" as const,
}));

const STATIONS: Station[] = [...LIFECYCLE_STATIONS, ...PROCESS_STATIONS];

const stationIndex = (k: StationKey) => STATIONS.findIndex((s) => s.key === k);
const stationLabel = (k: StationKey) =>
  STATIONS.find((s) => s.key === k)?.shortLabel ?? k;

// Findet das relevante Datum einer Station für ein Fahrzeug.
const stationDate = (
  station: StationKey,
  vehicle: Vehicle,
  process: Process | undefined,
  purchasePlan: PurchasePlan | undefined,
): Date | undefined => {
  switch (station) {
    case "purchase_planned":
      return purchasePlan?.createdAt ? new Date(purchasePlan.createdAt) : undefined;
    case "arrived":
      return vehicle.arrivedAt ? new Date(vehicle.arrivedAt) : undefined;
    case "listed":
      return vehicle.listed?.listedAt ? new Date(vehicle.listed.listedAt) : undefined;
    default: {
      const rec = process?.steps[station as ProcessStepKey];
      return rec?.completedAt ? new Date(rec.completedAt) : undefined;
    }
  }
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RangePreset = "week" | "month" | "quarter" | "year" | "all" | "custom";

interface Measurement {
  id: string;
  fromStation: StationKey;
  toStation: StationKey;
  rangePreset: RangePreset;
  customFrom?: string; // ISO
  customTo?: string;   // ISO
  vehicleType?: VehicleType | "all";
}

interface Props {
  processes: Process[];
  vehicles: Vehicle[];
  purchasePlans: PurchasePlan[];
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

const startOfWeek = () => {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const d = new Date(now);
  d.setDate(now.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const startOfQuarter = () => {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) * 3;
  return new Date(now.getFullYear(), q, 1);
};
const startOfYear = () => new Date(new Date().getFullYear(), 0, 1);

const resolveRange = (m: Measurement): { from: Date; to: Date } => {
  const to = new Date();
  switch (m.rangePreset) {
    case "week":    return { from: startOfWeek(),    to };
    case "month":   return { from: startOfMonth(),   to };
    case "quarter": return { from: startOfQuarter(), to };
    case "year":    return { from: startOfYear(),    to };
    case "all":     return { from: new Date(0),      to };
    case "custom":
      return {
        from: m.customFrom ? new Date(m.customFrom) : new Date(0),
        to:   m.customTo   ? new Date(m.customTo)   : to,
      };
  }
};

interface Stats {
  count: number;
  avg: number;
  median: number;
  min: number;
  max: number;
}

const computeStats = (
  vehicles: Vehicle[],
  processes: Process[],
  purchasePlans: PurchasePlan[],
  m: Measurement,
): Stats => {
  const { from, to } = resolveRange(m);
  const diffs: number[] = [];

  vehicles.forEach((v) => {
    if (m.vehicleType && m.vehicleType !== "all" && v.type !== m.vehicleType) return;
    const proc = processes.find((p) => p.vehicleId === v.id);
    const plan = purchasePlans.find((pp) => pp.vin && pp.vin === v.vin);
    const aDate = stationDate(m.fromStation, v, proc, plan);
    const bDate = stationDate(m.toStation, v, proc, plan);
    if (!aDate || !bDate) return;
    if (bDate < aDate) return;
    // Bezugszeitpunkt: Erreichen der Bis-Station liegt im gewählten Zeitraum.
    if (bDate < from || bDate > to) return;
    diffs.push((bDate.getTime() - aDate.getTime()) / 86400000);
  });

  if (diffs.length === 0) return { count: 0, avg: 0, median: 0, min: 0, max: 0 };
  const sorted = [...diffs].sort((x, y) => x - y);
  const sum = sorted.reduce((s, n) => s + n, 0);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return {
    count: sorted.length,
    avg: sum / sorted.length,
    median,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
};

const interpret = (m: Measurement, s: Stats): string => {
  if (s.count === 0) {
    return "Keine Übergänge in diesem Zeitraum gefunden. Sobald für die gewählten Stationen Daten vorliegen (Datum gesetzt) und die Bis-Station im Zeitraum erreicht wurde, erscheinen hier Werte.";
  }
  const distance = Math.max(1, stationIndex(m.toStation) - stationIndex(m.fromStation));
  const goodMax = distance * 3;
  const okMax   = distance * 8;
  const slowMax = distance * 18;

  let verdict: string;
  if (s.avg <= goodMax) {
    verdict = `Sehr zügig — der Übergang von „${stationLabel(m.fromStation)}" nach „${stationLabel(m.toStation)}" läuft schnell und gut organisiert.`;
  } else if (s.avg <= okMax) {
    verdict = `Im normalen Rahmen. Optimierungspotenzial besteht meist in der Vorbereitung der Folge-Station (Dokumente, Termine, Kundenrückmeldungen, Aufbereitung).`;
  } else if (s.avg <= slowMax) {
    verdict = `Langsam. Häufige Ursachen: fehlende Kunden­rückmeldungen, lange interne Abstimmungen, Engpässe in der Werkstatt oder verspätetes Inserieren.`;
  } else {
    verdict = `Sehr langsam. Hier sollte gezielt nach Engpässen gesucht werden — typische Verdächtige sind Lieferzeiten beim Einkauf, schleppende Aufbereitung oder verspätete Vermarktung.`;
  }

  const spread = s.max - s.min;
  const consistency =
    s.count >= 3 && spread > s.avg * 1.5
      ? " Die starke Streuung (Min/Max weit auseinander) deutet zudem auf uneinheitliche Abläufe hin — manche Fahrzeuge laufen flott, andere bleiben hängen."
      : "";

  return verdict + consistency;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const newId = () => Math.random().toString(36).slice(2, 9);

export const ProcessTimeAnalyzer = ({ processes, vehicles, purchasePlans }: Props) => {
  const [measurements, setMeasurements] = useState<Measurement[]>([
    {
      id: newId(),
      fromStation: "arrived",
      toStation: "listed",
      rangePreset: "year",
      vehicleType: "all",
    },
    {
      id: newId(),
      fromStation: "listed",
      toStation: "delivery_confirmation",
      rangePreset: "year",
      vehicleType: "all",
    },
  ]);

  // Builder-State
  const [draftFrom, setDraftFrom] = useState<StationKey>("arrived");
  const [draftTo, setDraftTo] = useState<StationKey>("listed");
  const [draftRange, setDraftRange] = useState<RangePreset>("year");
  const [draftCustomFrom, setDraftCustomFrom] = useState<Date | undefined>();
  const [draftCustomTo, setDraftCustomTo] = useState<Date | undefined>();
  const [draftType, setDraftType] = useState<VehicleType | "all">("all");

  const validDraft =
    stationIndex(draftTo) > stationIndex(draftFrom) &&
    (draftRange !== "custom" || (!!draftCustomFrom && !!draftCustomTo));

  const addMeasurement = () => {
    if (!validDraft) return;
    setMeasurements((prev) => [
      ...prev,
      {
        id: newId(),
        fromStation: draftFrom,
        toStation: draftTo,
        rangePreset: draftRange,
        customFrom: draftCustomFrom?.toISOString(),
        customTo: draftCustomTo?.toISOString(),
        vehicleType: draftType,
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
              Stationen umfassen Lebenszyklus-Ereignisse (Einkaufsplanung,
              Bestandszugang, Inseriert) und alle Prozess-Schritte. Optional
              nach Fahrzeugtyp filtern.
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
                <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue /></SelectTrigger>
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
                      <Calendar mode="single" selected={draftCustomFrom} onSelect={setDraftCustomFrom} locale={de} initialFocus className={cn("p-3 pointer-events-auto")} />
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
                      <Calendar mode="single" selected={draftCustomTo} onSelect={setDraftCustomTo} locale={de} disabled={(d) => !!draftCustomFrom && d < draftCustomFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            {/* Von-Station */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Von Station</label>
              <Select value={draftFrom} onValueChange={(v) => setDraftFrom(v as StationKey)}>
                <SelectTrigger className="h-9 w-[180px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Lebenszyklus</div>
                  {LIFECYCLE_STATIONS.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                  <div className="px-2 py-1 mt-1 text-[10px] uppercase tracking-wider text-muted-foreground border-t border-border">Vorgang</div>
                  {PROCESS_STATIONS.slice(0, -1).map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ArrowRight className="size-4 text-muted-foreground mb-2" />

            {/* Bis-Station */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Bis Station</label>
              <Select value={draftTo} onValueChange={(v) => setDraftTo(v as StationKey)}>
                <SelectTrigger className="h-9 w-[200px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATIONS
                    .filter((s) => stationIndex(s.key) > stationIndex(draftFrom))
                    .map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.group === "lifecycle" ? "● " : ""}{s.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fahrzeugtyp */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Fahrzeugtyp</label>
              <Select value={draftType} onValueChange={(v) => setDraftType(v as VehicleType | "all")}>
                <SelectTrigger className="h-9 w-[150px] text-xs">
                  <Car className="size-3.5 mr-1 inline" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Typen</SelectItem>
                  {(Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((t) => (
                    <SelectItem key={t} value={t}>{VEHICLE_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button size="sm" className="h-9 bg-gradient-brand gap-1.5" disabled={!validDraft} onClick={addMeasurement}>
              <Plus className="size-4" /> Hinzufügen
            </Button>
          </div>
          {!validDraft && draftRange === "custom" && (
            <p className="text-[10px] text-warning">Bitte ein Start- und End-Datum wählen.</p>
          )}
          {!validDraft && draftRange !== "custom" && (
            <p className="text-[10px] text-warning">„Bis Station" muss nach „Von Station" liegen.</p>
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
                vehicles={vehicles}
                purchasePlans={purchasePlans}
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
  measurement, processes, vehicles, purchasePlans, onRemove,
}: {
  measurement: Measurement;
  processes: Process[];
  vehicles: Vehicle[];
  purchasePlans: PurchasePlan[];
  onRemove: () => void;
}) => {
  const stats = useMemo(
    () => computeStats(vehicles, processes, purchasePlans, measurement),
    [vehicles, processes, purchasePlans, measurement],
  );
  const interpretation = useMemo(() => interpret(measurement, stats), [measurement, stats]);
  const { from, to } = resolveRange(measurement);

  const intensity = stats.max > 0 ? Math.min(100, (stats.avg / Math.max(stats.max, 1)) * 100) : 0;

  const rangeText = measurement.rangePreset === "all"
    ? "Gesamtzeitraum"
    : measurement.rangePreset === "custom"
      ? `${format(from, "dd.MM.yyyy")} – ${format(to, "dd.MM.yyyy")}`
      : RANGE_LABELS[measurement.rangePreset];

  const typeText = !measurement.vehicleType || measurement.vehicleType === "all"
    ? "Alle Typen"
    : VEHICLE_TYPE_LABELS[measurement.vehicleType];

  return (
    <div className="rounded-xl border border-border bg-background/40 p-4 space-y-3 group relative">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-display font-semibold flex-wrap">
            <span>{stationLabel(measurement.fromStation)}</span>
            <ArrowRight className="size-3.5 text-muted-foreground" />
            <span>{stationLabel(measurement.toStation)}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] gap-1 border-border">
              <CalendarIcon className="size-2.5" />
              {rangeText}
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1 border-border">
              <Car className="size-2.5" />
              {typeText}
            </Badge>
          </div>
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
        <Stat label="Fahrzeuge" value={String(stats.count)} />
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
              Berücksichtigt werden Fahrzeuge, deren Bis-Station im gewählten
              Zeitraum erreicht wurde. Differenz = Tage zwischen den beiden
              Stations-Zeitpunkten. Lebenszyklus-Stationen kommen vom Fahrzeug
              bzw. der Einkaufsplanung (per VIN), Vorgangs-Schritte aus dem Vorgang.
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
