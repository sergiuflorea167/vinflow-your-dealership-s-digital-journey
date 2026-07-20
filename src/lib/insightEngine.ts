// Insight+ Berechnungs-Engine — reine Fachlogik, kein React.
// Wird sowohl vom Insight+ BI-Builder (UI) als auch von VINcents Text-Befehlen
// (src/lib/vincentInsightCommands.ts) verwendet, damit beide immer dieselbe Zahl liefern.

import { format, differenceInDays, subDays } from "date-fns";
import { de } from "date-fns/locale";
import {
  Timer, Euro, TrendingUp, TrendingDown, Wallet, Hash, Tag,
  Percent, Target, Flame, Gauge, Calendar as CalIcon2, Zap, BarChart3, Award,
} from "lucide-react";
import {
  Process, PROCESS_STEPS, ProcessStepKey, Vehicle, PurchasePlan,
  VehicleType, VEHICLE_TYPE_LABELS, VehicleStatus, FuelType,
  formatCurrency, vehicleTotalCostsGross,
} from "@/data/process";

// ---------------------------------------------------------------------------
// Stationen
// ---------------------------------------------------------------------------

export type StationKey =
  | "purchase_planned"
  | "arrived"
  | "listed"
  | ProcessStepKey;

export interface Station {
  key: StationKey;
  label: string;
  shortLabel: string;
  description: string;
  group: "lifecycle" | "process";
}

export const LIFECYCLE_STATIONS: Station[] = [
  { key: "purchase_planned", label: "Einkaufsplanung", shortLabel: "Einkaufsplanung", description: "Aufnahme in Einkaufsplanung (per VIN).", group: "lifecycle" },
  { key: "arrived", label: "Bestand", shortLabel: "Bestand", description: "Fahrzeug ist physisch im Bestand.", group: "lifecycle" },
  { key: "listed", label: "Bestand (inseriert)", shortLabel: "Inseriert", description: "Fahrzeug aktiv vermarktet.", group: "lifecycle" },
];

export const PROCESS_STATIONS: Station[] = PROCESS_STEPS.map((s) => ({
  key: s.key, label: s.label, shortLabel: s.shortLabel, description: s.description, group: "process" as const,
}));

export const STATIONS: Station[] = [...LIFECYCLE_STATIONS, ...PROCESS_STATIONS];

export const stationIndex = (k: StationKey) => STATIONS.findIndex((s) => s.key === k);
export const stationLabel = (k: StationKey) => STATIONS.find((s) => s.key === k)?.shortLabel ?? k;
export const stationFull  = (k: StationKey) => STATIONS.find((s) => s.key === k)?.label ?? k;

export const stationDate = (
  station: StationKey, vehicle: Vehicle, process: Process | undefined, purchasePlan: PurchasePlan | undefined,
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

export type MetricKey =
  | "duration"          // Tage zwischen Stationen
  | "count_reached"     // Anzahl Fahrzeuge an Station
  | "revenue"           // Summe Verkaufspreis
  | "margin"            // Marge absolut
  | "margin_percent"    // Marge in % vom Verkaufspreis (GP%)
  | "costs"             // Brutto-Kosten
  | "purchase_volume"   // Einkaufsvolumen
  | "discount"          // Differenz Listenpreis - Verkaufspreis
  | "discount_percent"  // Rabatt in %
  | "avg_list_price"    // Ø Listenpreis
  | "avg_purchase"      // Ø Einkaufspreis
  | "avg_mileage"       // Ø Kilometerstand
  | "avg_age"           // Ø Fahrzeugalter (Jahre)
  | "aging_days"        // Ø Tage im Bestand (in_stock)
  | "conversion";       // Conversion Quote: Anteil, der Ziel-Station erreicht hat (von Basis)

export type MetricGroup = "time" | "money" | "volume" | "quality";

export interface MetricDef {
  key: MetricKey;
  label: string;
  shortLabel: string;
  description: string;
  unit: "days" | "currency" | "count" | "percent" | "km" | "years";
  needsTwoStations: boolean;   // Duration/Conversion → 2 Stationen
  needsOneStation: boolean;
  icon: typeof Timer;
  color: string;
  group: MetricGroup;
}

export const METRICS: MetricDef[] = [
  // TIME
  { key: "duration",        label: "Durchlaufzeit",       shortLabel: "Durchlauf",   description: "Tage zwischen zwei Stationen.", unit: "days",     needsTwoStations: true,  needsOneStation: false, icon: Timer,        color: "text-primary-glow", group: "time" },
  { key: "aging_days",      label: "Standzeit (Aging)",   shortLabel: "Standzeit",   description: "Ø Tage seit Bestandszugang für Fahrzeuge im aktuellen Bestand.", unit: "days", needsTwoStations: false, needsOneStation: false, icon: Flame, color: "text-warning", group: "time" },
  { key: "conversion",      label: "Conversion-Quote",    shortLabel: "Conversion",  description: "Anteil der Fahrzeuge, die Ziel-Station erreicht haben (Basis: Von-Station).", unit: "percent", needsTwoStations: true, needsOneStation: false, icon: Target, color: "text-info", group: "time" },
  // MONEY
  { key: "revenue",         label: "Umsatz",              shortLabel: "Umsatz",      description: "Summe der Verkaufspreise (finalPrice).", unit: "currency", needsTwoStations: false, needsOneStation: true,  icon: TrendingUp, color: "text-success", group: "money" },
  { key: "margin",          label: "Marge (absolut)",     shortLabel: "Marge",       description: "finalPrice − Brutto-Kosten.", unit: "currency", needsTwoStations: false, needsOneStation: true, icon: Euro, color: "text-success", group: "money" },
  { key: "margin_percent",  label: "Marge in % (GP)",     shortLabel: "GP %",        description: "Gross-Profit-Marge: Marge / finalPrice.", unit: "percent", needsTwoStations: false, needsOneStation: true, icon: Percent, color: "text-success", group: "money" },
  { key: "costs",           label: "Aufbereitungs-Kosten", shortLabel: "Kosten",     description: "Brutto-Kosten der Fahrzeuge.", unit: "currency", needsTwoStations: false, needsOneStation: true, icon: Wallet, color: "text-warning", group: "money" },
  { key: "purchase_volume", label: "Einkaufsvolumen",     shortLabel: "EK-Volumen",  description: "Summe der Einkaufspreise (brutto).", unit: "currency", needsTwoStations: false, needsOneStation: true, icon: Wallet, color: "text-warning", group: "money" },
  { key: "discount",        label: "Preis-Differenz €",   shortLabel: "Δ Preis",     description: "Listenpreis − Verkaufspreis (positiv = Rabatt gegeben).", unit: "currency", needsTwoStations: false, needsOneStation: true, icon: TrendingDown, color: "text-destructive", group: "money" },
  { key: "discount_percent", label: "Rabatt in %",        shortLabel: "Rabatt %",    description: "Ø Rabatt in Prozent vom Listenpreis.", unit: "percent", needsTwoStations: false, needsOneStation: true, icon: Percent, color: "text-destructive", group: "money" },
  // VOLUME
  { key: "count_reached",   label: "Anzahl Fahrzeuge",    shortLabel: "Anzahl",      description: "Wie viele Fahrzeuge haben die Station im Zeitraum erreicht?", unit: "count", needsTwoStations: false, needsOneStation: true, icon: Hash, color: "text-foreground", group: "volume" },
  { key: "avg_list_price",  label: "Ø Listenpreis",       shortLabel: "Ø Listpreis", description: "Durchschnittlicher Brutto-Listenpreis.", unit: "currency", needsTwoStations: false, needsOneStation: true, icon: Tag, color: "text-foreground", group: "money" },
  { key: "avg_purchase",    label: "Ø Einkaufspreis",     shortLabel: "Ø EK-Preis",  description: "Durchschnittlicher Einkaufspreis.", unit: "currency", needsTwoStations: false, needsOneStation: true, icon: Tag, color: "text-foreground", group: "money" },
  // QUALITY
  { key: "avg_mileage",     label: "Ø Kilometerstand",    shortLabel: "Ø KM",        description: "Durchschnittlicher Kilometerstand.", unit: "km", needsTwoStations: false, needsOneStation: true, icon: Gauge, color: "text-info", group: "quality" },
  { key: "avg_age",         label: "Ø Fahrzeugalter",     shortLabel: "Ø Alter",     description: "Ø Alter ab Erstzulassung in Jahren.", unit: "years", needsTwoStations: false, needsOneStation: true, icon: CalIcon2, color: "text-info", group: "quality" },
];

export const METRIC_GROUP_LABEL: Record<MetricGroup, string> = {
  time: "Zeit & Conversion",
  money: "Geld & Marge",
  volume: "Volumen",
  quality: "Bestands-Qualität",
};

export const metricDef = (k: MetricKey) => METRICS.find((m) => m.key === k)!;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RangePreset = "week" | "month" | "quarter" | "year" | "ytd" | "last_30" | "last_90" | "last_365" | "all" | "custom";

export type Breakdown = "none" | "make" | "type" | "status" | "fuel" | "month";

export interface Measurement {
  id: string;
  title?: string;
  metric: MetricKey;
  fromStation: StationKey;
  toStation: StationKey;
  rangePreset: RangePreset;
  customFrom?: string;
  customTo?: string;
  vehicleType?: VehicleType | "all";
  make?: string | "all";
  status?: VehicleStatus | "all";
  fuel?: FuelType | "all";
  minPrice?: number;
  maxPrice?: number;
  minKm?: number;
  maxKm?: number;
  minYear?: number;
  maxYear?: number;
  breakdown: Breakdown;
}

// ---------------------------------------------------------------------------
// Range
// ---------------------------------------------------------------------------

export const RANGE_LABELS: Record<RangePreset, string> = {
  week: "Diese Woche",
  month: "Dieser Monat",
  quarter: "Dieses Quartal",
  year: "Dieses Jahr",
  ytd: "YTD (Year-to-Date)",
  last_30: "Letzte 30 Tage",
  last_90: "Letzte 90 Tage",
  last_365: "Letzte 365 Tage",
  all: "Gesamtzeitraum",
  custom: "Individuell",
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  planned: "Geplant",
  in_stock: "Im Bestand",
  reserved: "Reserviert",
  sold: "Verkauft",
};

export const FUEL_TYPES: FuelType[] = ["Benzin", "Diesel", "Hybrid", "Elektro", "Plug-in-Hybrid", "Gas"];

const startOfWeek = (now: Date) => {
  const day = (now.getDay() + 6) % 7;
  const d = new Date(now);
  d.setDate(now.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfMonth = (now: Date) => new Date(now.getFullYear(), now.getMonth(), 1);
const startOfQuarter = (now: Date) => {
  const q = Math.floor(now.getMonth() / 3) * 3;
  return new Date(now.getFullYear(), q, 1);
};
const startOfYear = (now: Date) => new Date(now.getFullYear(), 0, 1);

const customBoundary = (value: string | undefined, fallback: Date, endOfDate: boolean) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setHours(endOfDate ? 23 : 0, endOfDate ? 59 : 0, endOfDate ? 59 : 0, endOfDate ? 999 : 0);
  }
  return date;
};

export const resolveRange = (m: Measurement, now = new Date()): { from: Date; to: Date } => {
  const to = new Date(now);
  switch (m.rangePreset) {
    case "week":     return { from: startOfWeek(now),    to };
    case "month":    return { from: startOfMonth(now),   to };
    case "quarter":  return { from: startOfQuarter(now), to };
    case "year":     return { from: startOfYear(now),    to };
    case "ytd":      return { from: startOfYear(now),    to };
    case "last_30":  return { from: subDays(to, 30),  to };
    case "last_90":  return { from: subDays(to, 90),  to };
    case "last_365": return { from: subDays(to, 365), to };
    case "all":      return { from: new Date(0),      to };
    case "custom":
      return {
        from: customBoundary(m.customFrom, new Date(0), false),
        to: customBoundary(m.customTo, to, true),
      };
  }
};

// Vorperiode (gleiche Länge davor)
export const previousRange = (r: { from: Date; to: Date }): { from: Date; to: Date } => {
  const len = r.to.getTime() - r.from.getTime();
  const to = new Date(r.from.getTime() - 1);
  return { from: new Date(to.getTime() - len), to };
};

// ---------------------------------------------------------------------------
// Compute
// ---------------------------------------------------------------------------

export interface ItemRow {
  vehicle: Vehicle;
  process?: Process;
  plan?: PurchasePlan;
  value: number;       // Wert für Sortierung/Top-Liste
  label: string;       // Anzeige (Marke Modell)
  groupKey?: string;   // Breakdown-Key
  numerator?: number;  // Zähler für gewichtete Quoten
  denominator?: number;// Nenner für gewichtete Quoten
}

export interface Result {
  primary: number;
  unit: MetricDef["unit"];
  count: number;
  median?: number;
  min?: number;
  max?: number;
  total?: number;
  rows: ItemRow[];     // einbezogene Fahrzeuge (für Top-Liste)
  breakdown?: { key: string; value: number; count: number }[];
}

const matchesFilters = (v: Vehicle, m: Measurement) => {
  if (m.vehicleType && m.vehicleType !== "all" && v.type !== m.vehicleType) return false;
  if (m.make && m.make !== "all" && v.make !== m.make) return false;
  if (m.status && m.status !== "all" && v.status !== m.status) return false;
  if (m.fuel && m.fuel !== "all" && v.fuel !== m.fuel) return false;
  if (m.minPrice != null && v.listPrice < m.minPrice) return false;
  if (m.maxPrice != null && v.listPrice > m.maxPrice) return false;
  if (m.minKm != null && v.mileage < m.minKm) return false;
  if (m.maxKm != null && v.mileage > m.maxKm) return false;
  if (m.minYear != null && v.year < m.minYear) return false;
  if (m.maxYear != null && v.year > m.maxYear) return false;
  return true;
};

const breakdownKey = (v: Vehicle, b: Breakdown, refDate?: Date): string => {
  switch (b) {
    case "make":   return v.make;
    case "type":   return VEHICLE_TYPE_LABELS[v.type];
    case "status": return VEHICLE_STATUS_LABELS[v.status];
    case "fuel":   return v.fuel;
    case "month":  return refDate ? format(refDate, "MMM yy", { locale: de }) : "—";
    default:       return "Gesamt";
  }
};

const ageInYears = (v: Vehicle, at: Date): number | undefined => {
  if (!v.firstRegistration) return undefined;
  const d = new Date(v.firstRegistration);
  const years = (at.getTime() - d.getTime()) / (365.25 * 86400000);
  return Number.isFinite(years) && years >= 0 ? years : undefined;
};

export const computeInsight = (
  vehicles: Vehicle[], processes: Process[], purchasePlans: PurchasePlan[], m: Measurement, now = new Date(),
): Result => {
  const { from, to } = resolveRange(m, now);
  const def = metricDef(m.metric);

  // ---- Aging (Standzeit) — Sonderfall: zählt aktuell im Bestand befindliche Fahrzeuge ----
  if (def.key === "aging_days") {
    const matched = vehicles
      .filter((v) => matchesFilters(v, m))
      .filter((v) => v.status === "in_stock" || v.status === "reserved")
      .filter((v) => v.arrivedAt)
      .filter((v) => new Date(v.arrivedAt!).getTime() <= now.getTime())
      .map((v) => ({
        vehicle: v,
        value: differenceInDays(now, new Date(v.arrivedAt!)),
        label: `${v.make} ${v.model}`,
        groupKey: breakdownKey(v, m.breakdown, new Date(v.arrivedAt!)),
        process: processes.find((p) => p.vehicleId === v.id),
        plan: purchasePlans.find((pp) => pp.vin === v.vin),
      } as ItemRow));
    return summarize(matched, "days", m.breakdown);
  }

  // ---- Conversion (Anteil, der Ziel-Station erreicht von allen, die Von-Station erreicht haben) ----
  if (def.key === "conversion") {
    let baseCount = 0;
    let convertedCount = 0;
    const rows: ItemRow[] = [];
    vehicles.forEach((v) => {
      if (!matchesFilters(v, m)) return;
      const proc = processes.find((p) => p.vehicleId === v.id);
      const plan = purchasePlans.find((pp) => pp.vin === v.vin);
      const a = stationDate(m.fromStation, v, proc, plan);
      if (!a) return;
      if (a < from || a > to) return;
      baseCount++;
      const b = stationDate(m.toStation, v, proc, plan);
      const converted = !!b && b >= a && b <= to;
      if (converted) convertedCount++;
      rows.push({
        vehicle: v, process: proc, plan,
        value: converted ? 1 : 0,
        label: `${v.make} ${v.model}`,
        groupKey: breakdownKey(v, m.breakdown, a),
      });
    });
    const pct = baseCount > 0 ? (convertedCount / baseCount) * 100 : 0;
    const result: Result = {
      primary: pct, unit: "percent", count: baseCount, total: convertedCount, rows,
    };
    if (m.breakdown !== "none") {
      const groups = new Map<string, { converted: number; base: number }>();
      rows.forEach((r) => {
        const g = groups.get(r.groupKey!) ?? { converted: 0, base: 0 };
        g.base++;
        if (r.value === 1) g.converted++;
        groups.set(r.groupKey!, g);
      });
      result.breakdown = Array.from(groups.entries())
        .map(([key, v]) => ({ key, value: v.base > 0 ? (v.converted / v.base) * 100 : 0, count: v.base }))
        .sort((a, b) => b.value - a.value);
    }
    return result;
  }

  // ---- Duration ----
  if (def.key === "duration") {
    const rows: ItemRow[] = [];
    vehicles.forEach((v) => {
      if (!matchesFilters(v, m)) return;
      const proc = processes.find((p) => p.vehicleId === v.id);
      const plan = purchasePlans.find((pp) => pp.vin === v.vin);
      const a = stationDate(m.fromStation, v, proc, plan);
      const b = stationDate(m.toStation, v, proc, plan);
      if (!a || !b || b < a) return;
      if (b < from || b > to) return;
      rows.push({
        vehicle: v, process: proc, plan,
        value: (b.getTime() - a.getTime()) / 86400000,
        label: `${v.make} ${v.model}`,
        groupKey: breakdownKey(v, m.breakdown, b),
      });
    });
    return summarize(rows, "days", m.breakdown);
  }

  // ---- Single-Station-Metriken ----
  const matched: ItemRow[] = [];
  vehicles.forEach((v) => {
    if (!matchesFilters(v, m)) return;
    const proc = processes.find((p) => p.vehicleId === v.id);
    const plan = purchasePlans.find((pp) => pp.vin === v.vin);
    const d = stationDate(m.toStation, v, proc, plan);
    if (!d) return;
    if (d < from || d > to) return;

    let value = 0;
    let numerator: number | undefined;
    let denominator: number | undefined;
    switch (def.key) {
      case "count_reached":   value = 1; break;
      case "revenue": {
        const finalPrice = proc?.fields.finalPrice;
        if (finalPrice == null || finalPrice <= 0) return;
        value = finalPrice;
        break;
      }
      case "margin": {
        const finalPrice = proc?.fields.finalPrice;
        if (finalPrice == null || finalPrice <= 0) return;
        value = finalPrice - vehicleTotalCostsGross(v) - v.purchasePrice;
        break;
      }
      case "margin_percent": {
        const fp = proc?.fields.finalPrice;
        if (fp == null || fp <= 0) return;
        const margin = fp - vehicleTotalCostsGross(v) - v.purchasePrice;
        numerator = margin;
        denominator = fp;
        value = (margin / fp) * 100;
        break;
      }
      case "costs":           value = vehicleTotalCostsGross(v); break;
      case "purchase_volume": value = v.purchasePrice; break;
      case "discount": {
        const finalPrice = proc?.fields.finalPrice;
        if (finalPrice == null || finalPrice <= 0) return;
        value = v.listPrice - finalPrice;
        break;
      }
      case "discount_percent": {
        const fp = proc?.fields.finalPrice;
        if (fp == null || fp <= 0 || v.listPrice <= 0) return;
        numerator = v.listPrice - fp;
        denominator = v.listPrice;
        value = (numerator / denominator) * 100;
        break;
      }
      case "avg_list_price":  value = v.listPrice; break;
      case "avg_purchase":    value = v.purchasePrice; break;
      case "avg_mileage":     value = v.mileage; break;
      case "avg_age": {
        const age = ageInYears(v, d);
        if (age == null) return;
        value = age;
        break;
      }
    }
    matched.push({ vehicle: v, process: proc, plan, value, numerator, denominator, label: `${v.make} ${v.model}`, groupKey: breakdownKey(v, m.breakdown, d) });
  });

  if (def.key === "margin_percent" || def.key === "discount_percent") {
    return summarizeRatio(matched, def.unit, m.breakdown);
  }
  const isAvg = ["avg_list_price", "avg_purchase", "avg_mileage", "avg_age"].includes(def.key);
  return summarize(matched, def.unit, m.breakdown, isAvg ? "avg" : def.key === "count_reached" ? "count" : "sum");
};

const summarizeRatio = (rows: ItemRow[], unit: MetricDef["unit"], breakdown: Breakdown): Result => {
  if (!rows.length) return { primary: 0, unit, count: 0, rows: [] };
  const numerator = rows.reduce((sum, row) => sum + (row.numerator ?? 0), 0);
  const denominator = rows.reduce((sum, row) => sum + (row.denominator ?? 0), 0);
  const result = summarize(rows, unit, "none", "avg");
  result.primary = denominator > 0 ? (numerator / denominator) * 100 : 0;
  if (breakdown !== "none") {
    const groups = new Map<string, { numerator: number; denominator: number; count: number }>();
    rows.forEach((row) => {
      const group = groups.get(row.groupKey!) ?? { numerator: 0, denominator: 0, count: 0 };
      group.numerator += row.numerator ?? 0;
      group.denominator += row.denominator ?? 0;
      group.count++;
      groups.set(row.groupKey!, group);
    });
    result.breakdown = Array.from(groups.entries())
      .map(([key, group]) => ({
        key,
        value: group.denominator > 0 ? (group.numerator / group.denominator) * 100 : 0,
        count: group.count,
      }))
      .sort((a, b) => b.value - a.value);
  }
  return result;
};

const summarize = (
  rows: ItemRow[],
  unit: MetricDef["unit"],
  breakdown: Breakdown,
  mode: "avg" | "sum" | "count" = "avg",
): Result => {
  if (!rows.length) return { primary: 0, unit, count: 0, rows: [] };
  const sorted = [...rows].sort((a, b) => a.value - b.value);
  const sum = sorted.reduce((s, r) => s + r.value, 0);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1].value + sorted[mid].value) / 2 : sorted[mid].value;

  const primary =
    mode === "count" ? sorted.length :
    mode === "sum"   ? sum :
    sum / sorted.length;

  const result: Result = {
    primary,
    unit,
    count: sorted.length,
    median,
    min: sorted[0].value,
    max: sorted[sorted.length - 1].value,
    total: sum,
    rows: sorted,
  };

  if (breakdown !== "none") {
    const groups = new Map<string, { sum: number; count: number }>();
    rows.forEach((r) => {
      const g = groups.get(r.groupKey!) ?? { sum: 0, count: 0 };
      g.sum += r.value; g.count++;
      groups.set(r.groupKey!, g);
    });
    result.breakdown = Array.from(groups.entries())
      .map(([key, v]) => ({
        key,
        value: mode === "count" ? v.count : mode === "sum" ? v.sum : v.sum / Math.max(1, v.count),
        count: v.count,
      }))
      .sort((a, b) => b.value - a.value);
  }
  return result;
};

export const formatValue = (n: number, unit: MetricDef["unit"]): string => {
  if (unit === "currency") return formatCurrency(n);
  if (unit === "percent")  return `${n.toFixed(1)} %`;
  if (unit === "days")     return `${n.toFixed(1)} Tage`;
  if (unit === "km")       return `${Math.round(n).toLocaleString("de-DE")} km`;
  if (unit === "years")    return `${n.toFixed(1)} J`;
  return String(Math.round(n));
};

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export const newId = () => Math.random().toString(36).slice(2, 9);

export const baseDraft = (): Measurement => ({
  id: newId(), metric: "duration", fromStation: "arrived", toStation: "listed",
  rangePreset: "year", vehicleType: "all", make: "all", status: "all", fuel: "all", breakdown: "none",
});

export interface Template {
  id: string;
  title: string;
  icon: typeof Timer;
  description: string;
  build: () => Measurement;
}

export const TEMPLATES: Template[] = [
  {
    id: "tpl-aging", title: "Standzeit aktiv", icon: Flame,
    description: "Wie lange stehen Fahrzeuge im Bestand?",
    build: () => ({ ...baseDraft(), id: newId(), title: "Standzeit aktiv", metric: "aging_days", rangePreset: "all", breakdown: "make" }),
  },
  {
    id: "tpl-listing-speed", title: "Bestand → Inseriert", icon: Zap,
    description: "Wie schnell kommen Fahrzeuge online?",
    build: () => ({ ...baseDraft(), id: newId(), title: "Time-to-List", metric: "duration", fromStation: "arrived", toStation: "listed", rangePreset: "last_90" }),
  },
  {
    id: "tpl-revenue-ytd", title: "Umsatz YTD", icon: TrendingUp,
    description: "Verkaufsumsatz seit Jahresbeginn.",
    build: () => ({ ...baseDraft(), id: newId(), title: "Umsatz YTD", metric: "revenue", toStation: "delivery_confirmation", rangePreset: "ytd", breakdown: "month" }),
  },
  {
    id: "tpl-gp-marge", title: "Marge GP%", icon: Percent,
    description: "Gross-Profit-Marge nach Marke.",
    build: () => ({ ...baseDraft(), id: newId(), title: "Marge GP %", metric: "margin_percent", toStation: "delivery_confirmation", rangePreset: "year", breakdown: "make" }),
  },
  {
    id: "tpl-discount", title: "Rabattquote", icon: TrendingDown,
    description: "Wieviel Rabatt vom Listenpreis?",
    build: () => ({ ...baseDraft(), id: newId(), title: "Ø Rabatt %", metric: "discount_percent", toStation: "delivery_confirmation", rangePreset: "last_365" }),
  },
  {
    id: "tpl-conversion", title: "Angebot → Verkauf", icon: Target,
    description: "Conversion vom Angebot zur Lieferung.",
    build: () => ({ ...baseDraft(), id: newId(), title: "Angebot → Lieferung", metric: "conversion", fromStation: PROCESS_STEPS[0].key, toStation: "delivery_confirmation", rangePreset: "last_90" }),
  },
  {
    id: "tpl-velocity", title: "Verkäufe/Monat", icon: BarChart3,
    description: "Verkaufsvolumen pro Monat.",
    build: () => ({ ...baseDraft(), id: newId(), title: "Verkäufe/Monat", metric: "count_reached", toStation: "delivery_confirmation", rangePreset: "year", breakdown: "month" }),
  },
  {
    id: "tpl-top-makes", title: "Top-Marken", icon: Award,
    description: "Anzahl Verkäufe nach Marke.",
    build: () => ({ ...baseDraft(), id: newId(), title: "Top-Marken", metric: "count_reached", toStation: "delivery_confirmation", rangePreset: "year", breakdown: "make" }),
  },
];

export const STORAGE_KEY = "vinflow.insightplus.measurements.v1";
