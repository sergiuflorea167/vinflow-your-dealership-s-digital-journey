// Insight+ BI-Builder — vereinheitlichte, konfigurierbare Auswertungen über
// Lebenszyklus-Stationen, Vorgangs-Schritte, Umsätze, Margen, Kosten und Bestände.
// Alle Messungen folgen demselben Schema: Metrik · Stationen (falls relevant) ·
// Zeitraum · Filter (Fahrzeugtyp, Marke, Status). Ergebnisse werden live berechnet
// und mit kontextueller Deutung angereichert.

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Calendar as CalendarIcon, Plus, Trash2, Info, ArrowRight, Car,
  Sparkles, Timer, Euro, TrendingUp, Wallet, Hash, Tag, Filter,
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
  VehicleType, VEHICLE_TYPE_LABELS, VehicleStatus,
  formatCurrency, vehicleTotalCostsGross,
} from "@/data/process";

// ---------------------------------------------------------------------------
// Stationen
// ---------------------------------------------------------------------------

type StationKey =
  | "purchase_planned"
  | "arrived"
  | "listed"
  | ProcessStepKey;

interface Station {
  key: StationKey;
  label: string;
  shortLabel: string;
  description: string;
  group: "lifecycle" | "process";
}

const LIFECYCLE_STATIONS: Station[] = [
  {
    key: "purchase_planned",
    label: "Einkaufsplanung angelegt",
    shortLabel: "Einkaufsplanung",
    description: "Zeitpunkt, an dem das Fahrzeug in die Einkaufsplanung aufgenommen wurde (per VIN verknüpft).",
    group: "lifecycle",
  },
  {
    key: "arrived",
    label: "Bestandszugang",
    shortLabel: "Bestandszugang",
    description: "Fahrzeug ist physisch im Bestand eingetroffen.",
    group: "lifecycle",
  },
  {
    key: "listed",
    label: "Online inseriert",
    shortLabel: "Inseriert",
    description: "Fahrzeug wurde aktiv vermarktet (mobile.de, AutoScout24, eigene Website …).",
    group: "lifecycle",
  },
];

const PROCESS_STATIONS: Station[] = PROCESS_STEPS.map((s) => ({
  key: s.key,
  label: s.label,
  shortLabel: s.shortLabel,
  description: s.description,
  group: "process" as const,
}));

const STATIONS: Station[] = [...LIFECYCLE_STATIONS, ...PROCESS_STATIONS];

const stationIndex = (k: StationKey) => STATIONS.findIndex((s) => s.key === k);
const stationLabel = (k: StationKey) =>
  STATIONS.find((s) => s.key === k)?.shortLabel ?? k;
const stationFull = (k: StationKey) =>
  STATIONS.find((s) => s.key === k)?.label ?? k;

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
// Metriken
// ---------------------------------------------------------------------------

type MetricKey =
  | "duration"        // Tage zwischen zwei Stationen
  | "count_reached"   // Anzahl Fahrzeuge, die Station X im Zeitraum erreicht haben
  | "revenue"         // Summe finalPrice der abgeschlossenen Vorgänge
  | "margin"          // finalPrice − Gesamtkosten
  | "costs"           // Brutto-Kosten der Fahrzeuge
  | "avg_list_price"; // Ø Listenpreis im Bestand

interface MetricDef {
  key: MetricKey;
  label: string;
  shortLabel: string;
  description: string;
  unit: "days" | "currency" | "count";
  needsTwoStations: boolean;
  needsOneStation: boolean;
  icon: typeof Timer;
  color: string;
}

const METRICS: MetricDef[] = [
  {
    key: "duration",
    label: "Durchlaufzeit",
    shortLabel: "Durchlaufzeit",
    description: "Tage zwischen zwei Stationen — z. B. von „Bestandszugang" bis „Inseriert".",
    unit: "days",
    needsTwoStations: true,
    needsOneStation: false,
    icon: Timer,
    color: "text-primary-glow",
  },
  {
    key: "count_reached",
    label: "Anzahl Fahrzeuge",
    shortLabel: "Anzahl",
    description: "Wie viele Fahrzeuge haben die gewählte Station im Zeitraum erreicht?",
    unit: "count",
    needsTwoStations: false,
    needsOneStation: true,
    icon: Hash,
    color: "text-foreground",
  },
  {
    key: "revenue",
    label: "Umsatz",
    shortLabel: "Umsatz",
    description: "Summe der Verkaufspreise (finalPrice) der Vorgänge, deren Abschluss-Station im Zeitraum liegt.",
    unit: "currency",
    needsTwoStations: false,
    needsOneStation: true,
    icon: TrendingUp,
    color: "text-success",
  },
  {
    key: "margin",
    label: "Marge",
    shortLabel: "Marge",
    description: "finalPrice abzüglich aller Brutto-Kosten des Fahrzeugs.",
    unit: "currency",
    needsTwoStations: false,
    needsOneStation: true,
    icon: Euro,
    color: "text-success",
  },
  {
    key: "costs",
    label: "Kosten",
    shortLabel: "Kosten",
    description: "Brutto-Kosten der Fahrzeuge, die die Station im Zeitraum erreicht haben.",
    unit: "currency",
    needsTwoStations: false,
    needsOneStation: true,
    icon: Wallet,
    color: "text-warning",
  },
  {
    key: "avg_list_price",
    label: "Ø Listenpreis",
    shortLabel: "Ø Preis",
    description: "Durchschnittlicher Brutto-Listenpreis der Fahrzeuge an der gewählten Station.",
    unit: "currency",
    needsTwoStations: false,
    needsOneStation: true,
    icon: Tag,
    color: "text-foreground",
  },
];

const metricDef = (k: MetricKey) => METRICS.find((m) => m.key === k)!;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RangePreset = "week" | "month" | "quarter" | "year" | "all" | "custom";

interface Measurement {
  id: string;
  metric: MetricKey;
  fromStation: StationKey;
  toStation: StationKey;
  rangePreset: RangePreset;
  customFrom?: string;
  customTo?: string;
  vehicleType?: VehicleType | "all";
  make?: string | "all";
  status?: VehicleStatus | "all";
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

const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  planned: "Geplant",
  in_stock: "Im Bestand",
  reserved: "Reserviert",
  sold: "Verkauft",
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

interface Result {
  primary: number;          // Hauptzahl (Tage, Euro, Anzahl)
  unit: "days" | "currency" | "count";
  count: number;            // berücksichtigte Fahrzeuge
  median?: number;
  min?: number;
  max?: number;
  total?: number;           // bei Aggregaten (Umsatz/Marge/Kosten)
}

const matchesFilters = (v: Vehicle, m: Measurement) => {
  if (m.vehicleType && m.vehicleType !== "all" && v.type !== m.vehicleType) return false;
  if (m.make && m.make !== "all" && v.make !== m.make) return false;
  if (m.status && m.status !== "all" && v.status !== m.status) return false;
  return true;
};

const compute = (
  vehicles: Vehicle[],
  processes: Process[],
  purchasePlans: PurchasePlan[],
  m: Measurement,
): Result => {
  const { from, to } = resolveRange(m);
  const def = metricDef(m.metric);

  if (def.key === "duration") {
    const diffs: number[] = [];
    vehicles.forEach((v) => {
      if (!matchesFilters(v, m)) return;
      const proc = processes.find((p) => p.vehicleId === v.id);
      const plan = purchasePlans.find((pp) => pp.vin && pp.vin === v.vin);
      const a = stationDate(m.fromStation, v, proc, plan);
      const b = stationDate(m.toStation, v, proc, plan);
      if (!a || !b || b < a) return;
      if (b < from || b > to) return;
      diffs.push((b.getTime() - a.getTime()) / 86400000);
    });
    if (!diffs.length) return { primary: 0, unit: "days", count: 0 };
    const sorted = [...diffs].sort((x, y) => x - y);
    const sum = sorted.reduce((s, n) => s + n, 0);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
    return {
      primary: sum / sorted.length,
      unit: "days",
      count: sorted.length,
      median,
      min: sorted[0],
      max: sorted[sorted.length - 1],
    };
  }

  // Single-Station-Metriken: Fahrzeug zählt, wenn `toStation` im Zeitraum erreicht.
  const matched: { v: Vehicle; proc?: Process; plan?: PurchasePlan }[] = [];
  vehicles.forEach((v) => {
    if (!matchesFilters(v, m)) return;
    const proc = processes.find((p) => p.vehicleId === v.id);
    const plan = purchasePlans.find((pp) => pp.vin && pp.vin === v.vin);
    const d = stationDate(m.toStation, v, proc, plan);
    if (!d) return;
    if (d < from || d > to) return;
    matched.push({ v, proc, plan });
  });

  switch (def.key) {
    case "count_reached":
      return { primary: matched.length, unit: "count", count: matched.length };
    case "revenue": {
      const vals = matched.map((x) => x.proc?.fields.finalPrice ?? 0);
      const total = vals.reduce((s, n) => s + n, 0);
      return { primary: total, unit: "currency", count: matched.length, total };
    }
    case "margin": {
      const vals = matched.map((x) => (x.proc?.fields.finalPrice ?? 0) - vehicleTotalCostsGross(x.v));
      const total = vals.reduce((s, n) => s + n, 0);
      return { primary: total, unit: "currency", count: matched.length, total };
    }
    case "costs": {
      const vals = matched.map((x) => vehicleTotalCostsGross(x.v));
      const total = vals.reduce((s, n) => s + n, 0);
      return { primary: total, unit: "currency", count: matched.length, total };
    }
    case "avg_list_price": {
      if (!matched.length) return { primary: 0, unit: "currency", count: 0 };
      const vals = matched.map((x) => x.v.listPrice);
      const sum = vals.reduce((s, n) => s + n, 0);
      return { primary: sum / vals.length, unit: "currency", count: matched.length, total: sum };
    }
    default:
      return { primary: 0, unit: "count", count: 0 };
  }
};

const formatPrimary = (r: Result): string => {
  if (r.unit === "currency") return formatCurrency(r.primary);
  if (r.unit === "days") return r.primary.toFixed(1);
  return String(r.primary);
};

const interpret = (m: Measurement, r: Result): string => {
  if (r.count === 0) {
    return "Keine passenden Datensätze in diesem Zeitraum. Sobald die Station erreicht wurde und alle Filter passen, erscheinen hier Werte.";
  }
  switch (m.metric) {
    case "duration": {
      const distance = Math.max(1, stationIndex(m.toStation) - stationIndex(m.fromStation));
      const goodMax = distance * 3;
      const okMax   = distance * 8;
      const slowMax = distance * 18;
      let verdict: string;
      if (r.primary <= goodMax) {
        verdict = `Sehr zügig — der Übergang läuft schnell und gut organisiert.`;
      } else if (r.primary <= okMax) {
        verdict = `Im normalen Rahmen. Optimierungspotenzial liegt meist in der Vorbereitung der Folge-Station.`;
      } else if (r.primary <= slowMax) {
        verdict = `Langsam. Häufige Ursachen: fehlende Kundenrückmeldungen, Engpässe in der Werkstatt oder verspätetes Inserieren.`;
      } else {
        verdict = `Sehr langsam. Hier sollte gezielt nach Engpässen gesucht werden.`;
      }
      const spread = (r.max ?? 0) - (r.min ?? 0);
      const consistency =
        r.count >= 3 && spread > r.primary * 1.5
          ? " Die starke Streuung deutet auf uneinheitliche Abläufe hin — manche Fahrzeuge laufen flott, andere bleiben hängen."
          : "";
      return verdict + consistency;
    }
    case "count_reached":
      return `${r.count} Fahrzeug${r.count !== 1 ? "e" : ""} haben „${stationFull(m.toStation)}" im gewählten Zeitraum erreicht.`;
    case "revenue":
      return `${formatCurrency(r.primary)} Gesamtumsatz aus ${r.count} Vorgang${r.count !== 1 ? "en" : ""}. Ø ${formatCurrency(r.primary / Math.max(1, r.count))} pro Verkauf.`;
    case "margin": {
      const avg = r.primary / Math.max(1, r.count);
      const sign = r.primary >= 0 ? "Gewinn" : "Verlust";
      return `${formatCurrency(Math.abs(r.primary))} ${sign} aus ${r.count} Fahrzeug${r.count !== 1 ? "en" : ""}. Ø ${formatCurrency(avg)} pro Fahrzeug.`;
    }
    case "costs":
      return `${formatCurrency(r.primary)} Brutto-Kosten verteilt auf ${r.count} Fahrzeug${r.count !== 1 ? "e" : ""}. Ø ${formatCurrency(r.primary / Math.max(1, r.count))} pro Fahrzeug.`;
    case "avg_list_price":
      return `Ø Listenpreis von ${formatCurrency(r.primary)} über ${r.count} Fahrzeug${r.count !== 1 ? "e" : ""}.`;
    default:
      return "";
  }
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const newId = () => Math.random().toString(36).slice(2, 9);

export const InsightPlusBuilder = ({ processes, vehicles, purchasePlans }: Props) => {
  const allMakes = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.make))).sort(),
    [vehicles],
  );

  const [measurements, setMeasurements] = useState<Measurement[]>([
    {
      id: newId(),
      metric: "duration",
      fromStation: "arrived",
      toStation: "listed",
      rangePreset: "year",
      vehicleType: "all",
      make: "all",
      status: "all",
    },
    {
      id: newId(),
      metric: "revenue",
      fromStation: "arrived",
      toStation: "delivery_confirmation",
      rangePreset: "year",
      vehicleType: "all",
      make: "all",
      status: "all",
    },
    {
      id: newId(),
      metric: "margin",
      fromStation: "arrived",
      toStation: "delivery_confirmation",
      rangePreset: "year",
      vehicleType: "all",
      make: "all",
      status: "all",
    },
  ]);

  // Builder-State
  const [draft, setDraft] = useState<Measurement>({
    id: "draft",
    metric: "duration",
    fromStation: "arrived",
    toStation: "listed",
    rangePreset: "year",
    vehicleType: "all",
    make: "all",
    status: "all",
  });

  const def = metricDef(draft.metric);
  const validDraft =
    (def.needsTwoStations ? stationIndex(draft.toStation) > stationIndex(draft.fromStation) : true) &&
    (draft.rangePreset !== "custom" || (!!draft.customFrom && !!draft.customTo));

  const addMeasurement = () => {
    if (!validDraft) return;
    setMeasurements((prev) => [...prev, { ...draft, id: newId() }]);
  };

  const removeMeasurement = (id: string) =>
    setMeasurements((prev) => prev.filter((m) => m.id !== id));

  return (
    <TooltipProvider>
      <Card className="p-6 bg-card border-border shadow-card space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-xl bg-gradient-brand grid place-items-center shadow-glow">
                <Sparkles className="size-4 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-display font-semibold flex items-center gap-2">
                  Insight+ <span className="text-xs font-normal text-muted-foreground">BI-Builder</span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Konfiguriere beliebige Auswertungen — Durchlaufzeiten, Umsatz, Marge, Kosten und Bestand. Filter nach Fahrzeugtyp, Marke, Status und Zeitraum.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Builder-Panel */}
        <div className="rounded-xl border border-border bg-background/40 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Neue Auswertung konfigurieren
            </p>
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground/60 hover:text-primary-glow">
                  <Info className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs text-xs leading-relaxed">
                Wähle eine Metrik und konfiguriere Stationen, Zeitraum und Filter.
                Lebenszyklus-Stationen kommen vom Fahrzeug bzw. der Einkaufsplanung,
                Vorgangs-Stationen aus den abgeschlossenen Schritten.
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Reihe 1: Metrik */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Metrik</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {METRICS.map((m) => {
                const Icon = m.icon;
                const active = draft.metric === m.key;
                return (
                  <Tooltip key={m.key} delayDuration={200}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, metric: m.key }))}
                        className={cn(
                          "rounded-lg border p-2.5 text-left transition-smooth",
                          active
                            ? "border-primary bg-primary/10 shadow-glow"
                            : "border-border bg-background/40 hover:border-primary/40",
                        )}
                      >
                        <Icon className={cn("size-4 mb-1.5", active ? "text-primary-glow" : m.color)} />
                        <p className="text-xs font-semibold leading-tight">{m.shortLabel}</p>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
                      {m.description}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          {/* Reihe 2: Stationen + Zeitraum */}
          <div className="flex flex-wrap items-end gap-2">
            {/* Zeitraum */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Zeitraum</label>
              <Select value={draft.rangePreset} onValueChange={(v) => setDraft((d) => ({ ...d, rangePreset: v as RangePreset }))}>
                <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(RANGE_LABELS) as RangePreset[]).map((r) => (
                    <SelectItem key={r} value={r}>{RANGE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {draft.rangePreset === "custom" && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Von</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("h-9 w-[140px] justify-start text-xs", !draft.customFrom && "text-muted-foreground")}>
                        <CalendarIcon className="size-3.5 mr-1" />
                        {draft.customFrom ? format(new Date(draft.customFrom), "dd.MM.yyyy") : "Datum"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={draft.customFrom ? new Date(draft.customFrom) : undefined} onSelect={(d) => setDraft((s) => ({ ...s, customFrom: d?.toISOString() }))} locale={de} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Bis</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("h-9 w-[140px] justify-start text-xs", !draft.customTo && "text-muted-foreground")}>
                        <CalendarIcon className="size-3.5 mr-1" />
                        {draft.customTo ? format(new Date(draft.customTo), "dd.MM.yyyy") : "Datum"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={draft.customTo ? new Date(draft.customTo) : undefined} onSelect={(d) => setDraft((s) => ({ ...s, customTo: d?.toISOString() }))} locale={de} disabled={(d) => !!draft.customFrom && d < new Date(draft.customFrom)} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            {/* Von-Station (nur bei Duration) */}
            {def.needsTwoStations && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Von Station</label>
                  <StationSelect
                    value={draft.fromStation}
                    onChange={(v) => setDraft((d) => ({ ...d, fromStation: v }))}
                    width={190}
                    excludeLast
                  />
                </div>
                <ArrowRight className="size-4 text-muted-foreground mb-2" />
              </>
            )}

            {/* Bis / Ziel-Station */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {def.needsTwoStations ? "Bis Station" : "Station"}
              </label>
              <StationSelect
                value={draft.toStation}
                onChange={(v) => setDraft((d) => ({ ...d, toStation: v }))}
                width={210}
                minIndex={def.needsTwoStations ? stationIndex(draft.fromStation) + 1 : 0}
              />
            </div>
          </div>

          {/* Reihe 3: Filter */}
          <div className="flex flex-wrap items-end gap-2 pt-1 border-t border-border">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mr-1 mt-3">
              <Filter className="size-3" /> Filter
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Fahrzeugtyp</label>
              <Select value={draft.vehicleType} onValueChange={(v) => setDraft((d) => ({ ...d, vehicleType: v as VehicleType | "all" }))}>
                <SelectTrigger className="h-9 w-[160px] text-xs">
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

            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Marke</label>
              <Select value={draft.make} onValueChange={(v) => setDraft((d) => ({ ...d, make: v }))}>
                <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Marken</SelectItem>
                  {allMakes.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</label>
              <Select value={draft.status} onValueChange={(v) => setDraft((d) => ({ ...d, status: v as VehicleStatus | "all" }))}>
                <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  {(Object.keys(VEHICLE_STATUS_LABELS) as VehicleStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{VEHICLE_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto">
              <Button size="sm" className="h-9 bg-gradient-brand gap-1.5" disabled={!validDraft} onClick={addMeasurement}>
                <Plus className="size-4" /> Auswertung hinzufügen
              </Button>
            </div>
          </div>
          {!validDraft && draft.rangePreset === "custom" && (
            <p className="text-[10px] text-warning">Bitte ein Start- und End-Datum wählen.</p>
          )}
          {!validDraft && draft.rangePreset !== "custom" && def.needsTwoStations && (
            <p className="text-[10px] text-warning">„Bis Station" muss nach „Von Station" liegen.</p>
          )}
        </div>

        {/* Ergebnisse */}
        {measurements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl">
            Noch keine Auswertungen. Konfiguriere oben deine erste Messung.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
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
// Station-Select (gruppiert)
// ---------------------------------------------------------------------------

const StationSelect = ({
  value, onChange, width, minIndex = 0, excludeLast = false,
}: {
  value: StationKey;
  onChange: (v: StationKey) => void;
  width: number;
  minIndex?: number;
  excludeLast?: boolean;
}) => {
  const filtered = STATIONS.filter((s, i) => i >= minIndex && (!excludeLast || i < STATIONS.length - 1));
  const lifecycle = filtered.filter((s) => s.group === "lifecycle");
  const process = filtered.filter((s) => s.group === "process");

  return (
    <Select value={value} onValueChange={(v) => onChange(v as StationKey)}>
      <SelectTrigger className="h-9 text-xs" style={{ width }}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {lifecycle.length > 0 && (
          <>
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Lebenszyklus
            </div>
            {lifecycle.map((s) => (
              <SelectItem key={s.key} value={s.key}>● {s.label}</SelectItem>
            ))}
          </>
        )}
        {process.length > 0 && (
          <>
            <div className="px-2 py-1 mt-1 text-[10px] uppercase tracking-wider text-muted-foreground border-t border-border">
              Vorgangs-Schritte
            </div>
            {process.map((s) => (
              <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
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
  const result = useMemo(
    () => compute(vehicles, processes, purchasePlans, measurement),
    [vehicles, processes, purchasePlans, measurement],
  );
  const interpretation = useMemo(() => interpret(measurement, result), [measurement, result]);
  const { from, to } = resolveRange(measurement);
  const def = metricDef(measurement.metric);
  const Icon = def.icon;

  const rangeText = measurement.rangePreset === "all"
    ? "Gesamt"
    : measurement.rangePreset === "custom"
      ? `${format(from, "dd.MM.yy")} – ${format(to, "dd.MM.yy")}`
      : RANGE_LABELS[measurement.rangePreset];

  const filterChips: string[] = [];
  if (measurement.vehicleType && measurement.vehicleType !== "all") {
    filterChips.push(VEHICLE_TYPE_LABELS[measurement.vehicleType]);
  }
  if (measurement.make && measurement.make !== "all") filterChips.push(measurement.make);
  if (measurement.status && measurement.status !== "all") {
    filterChips.push(VEHICLE_STATUS_LABELS[measurement.status]);
  }

  const intensity = result.max && result.max > 0
    ? Math.min(100, (result.primary / result.max) * 100)
    : Math.min(100, result.count * 10);

  return (
    <div className="rounded-xl border border-border bg-background/40 p-4 space-y-3 group relative">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon className={cn("size-3.5", def.color)} />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              {def.shortLabel}
            </span>
          </div>
          <div className="text-sm font-display font-semibold flex items-center gap-1.5 flex-wrap">
            {def.needsTwoStations ? (
              <>
                <span>{stationLabel(measurement.fromStation)}</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
                <span>{stationLabel(measurement.toStation)}</span>
              </>
            ) : (
              <span>{stationFull(measurement.toStation)}</span>
            )}
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

      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[10px] gap-1 border-border">
          <CalendarIcon className="size-2.5" />
          {rangeText}
        </Badge>
        {filterChips.map((c) => (
          <Badge key={c} variant="outline" className="text-[10px] border-border">{c}</Badge>
        ))}
      </div>

      {/* Hauptzahl */}
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-display font-bold tracking-tight">
          {formatPrimary(result)}
        </span>
        <span className="text-xs text-muted-foreground">
          {result.unit === "days" ? "Ø Tage" : result.unit === "count" ? "Fahrzeuge" : ""}
        </span>
      </div>

      <Progress value={intensity} className="h-1.5" />

      {/* Sekundäre Werte */}
      {def.key === "duration" ? (
        <div className="grid grid-cols-4 gap-2 text-center pt-1">
          <Stat label="Median" value={result.count > 0 ? result.median!.toFixed(1) : "–"} />
          <Stat label="Min" value={result.count > 0 ? result.min!.toFixed(1) : "–"} />
          <Stat label="Max" value={result.count > 0 ? result.max!.toFixed(1) : "–"} />
          <Stat label="Anzahl" value={String(result.count)} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 text-center pt-1">
          <Stat label="Fahrzeuge" value={String(result.count)} />
          <Stat
            label={def.key === "avg_list_price" ? "Summe" : "Ø pro Fahrzeug"}
            value={
              result.count === 0
                ? "–"
                : def.key === "avg_list_price"
                  ? formatCurrency(result.total ?? 0)
                  : formatCurrency(result.primary / Math.max(1, result.count))
            }
          />
        </div>
      )}

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
              {def.description} Einbezogen werden Fahrzeuge, deren Ziel-Station im
              gewählten Zeitraum erreicht wurde und die alle Filterkriterien erfüllen.
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
