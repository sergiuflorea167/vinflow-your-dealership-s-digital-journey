// Insight+ BI-Builder — Pro-Variante.
// Konfigurierbare Auswertungen: Metrik → Station(en) → Zeitraum → Filter → Breakdown.
// Live berechnet aus Bestands-, Vorgangs- und Einkaufsdaten.
// Mit Quick-Templates, Trend vs. Vorperiode, Top-Liste, Mini-Bar-Charts.

import { useEffect, useMemo, useState } from "react";
import { format, differenceInDays, subDays, subMonths } from "date-fns";
import { de } from "date-fns/locale";
import {
  Calendar as CalendarIcon, Plus, Trash2, Info, ArrowRight, Car,
  Sparkles, Timer, Euro, TrendingUp, TrendingDown, Wallet, Hash, Tag,
  Filter, Percent, Layers, BarChart3, Target, Zap, Award, Flame,
  Fuel, Gauge, Calendar as CalIcon2, ChevronDown, ChevronUp, Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
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
  VehicleType, VEHICLE_TYPE_LABELS, VehicleStatus, FuelType,
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
  { key: "purchase_planned", label: "Einkaufsplanung", shortLabel: "Einkaufsplanung", description: "Aufnahme in Einkaufsplanung (per VIN).", group: "lifecycle" },
  { key: "arrived", label: "Bestand", shortLabel: "Bestand", description: "Fahrzeug ist physisch im Bestand.", group: "lifecycle" },
  { key: "listed", label: "Bestand (inseriert)", shortLabel: "Inseriert", description: "Fahrzeug aktiv vermarktet.", group: "lifecycle" },
];

const PROCESS_STATIONS: Station[] = PROCESS_STEPS.map((s) => ({
  key: s.key, label: s.label, shortLabel: s.shortLabel, description: s.description, group: "process" as const,
}));

const STATIONS: Station[] = [...LIFECYCLE_STATIONS, ...PROCESS_STATIONS];

const stationIndex = (k: StationKey) => STATIONS.findIndex((s) => s.key === k);
const stationLabel = (k: StationKey) => STATIONS.find((s) => s.key === k)?.shortLabel ?? k;
const stationFull  = (k: StationKey) => STATIONS.find((s) => s.key === k)?.label ?? k;

const stationDate = (
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

type MetricKey =
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

type MetricGroup = "time" | "money" | "volume" | "quality";

interface MetricDef {
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

const METRICS: MetricDef[] = [
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

const METRIC_GROUP_LABEL: Record<MetricGroup, string> = {
  time: "Zeit & Conversion",
  money: "Geld & Marge",
  volume: "Volumen",
  quality: "Bestands-Qualität",
};

const metricDef = (k: MetricKey) => METRICS.find((m) => m.key === k)!;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RangePreset = "week" | "month" | "quarter" | "year" | "ytd" | "last_30" | "last_90" | "last_365" | "all" | "custom";

type Breakdown = "none" | "make" | "type" | "status" | "fuel" | "month";

interface Measurement {
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

interface Props {
  processes: Process[];
  vehicles: Vehicle[];
  purchasePlans: PurchasePlan[];
}

// ---------------------------------------------------------------------------
// Range
// ---------------------------------------------------------------------------

const RANGE_LABELS: Record<RangePreset, string> = {
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

const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  planned: "Geplant",
  in_stock: "Im Bestand",
  reserved: "Reserviert",
  sold: "Verkauft",
};

const FUEL_TYPES: FuelType[] = ["Benzin", "Diesel", "Hybrid", "Elektro", "Plug-in-Hybrid", "Gas"];

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
    case "week":     return { from: startOfWeek(),    to };
    case "month":    return { from: startOfMonth(),   to };
    case "quarter":  return { from: startOfQuarter(), to };
    case "year":     return { from: startOfYear(),    to };
    case "ytd":      return { from: startOfYear(),    to };
    case "last_30":  return { from: subDays(to, 30),  to };
    case "last_90":  return { from: subDays(to, 90),  to };
    case "last_365": return { from: subDays(to, 365), to };
    case "all":      return { from: new Date(0),      to };
    case "custom":
      return {
        from: m.customFrom ? new Date(m.customFrom) : new Date(0),
        to:   m.customTo   ? new Date(m.customTo)   : to,
      };
  }
};

// Vorperiode (gleiche Länge davor)
const previousRange = (r: { from: Date; to: Date }): { from: Date; to: Date } => {
  const len = r.to.getTime() - r.from.getTime();
  return { from: new Date(r.from.getTime() - len), to: new Date(r.from.getTime()) };
};

// ---------------------------------------------------------------------------
// Compute
// ---------------------------------------------------------------------------

interface ItemRow {
  vehicle: Vehicle;
  process?: Process;
  plan?: PurchasePlan;
  value: number;       // Wert für Sortierung/Top-Liste
  label: string;       // Anzeige (Marke Modell)
  groupKey?: string;   // Breakdown-Key
}

interface Result {
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

const ageInYears = (v: Vehicle): number | undefined => {
  if (!v.firstRegistration) return undefined;
  const d = new Date(v.firstRegistration);
  return (Date.now() - d.getTime()) / (365.25 * 86400000);
};

const compute = (
  vehicles: Vehicle[], processes: Process[], purchasePlans: PurchasePlan[], m: Measurement,
): Result => {
  const { from, to } = resolveRange(m);
  const def = metricDef(m.metric);

  // ---- Aging (Standzeit) — Sonderfall: zählt aktuell im Bestand befindliche Fahrzeuge ----
  if (def.key === "aging_days") {
    const now = new Date();
    const matched = vehicles
      .filter((v) => matchesFilters(v, m))
      .filter((v) => v.status === "in_stock" || v.status === "reserved")
      .filter((v) => v.arrivedAt)
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
      const converted = !!b && b >= a;
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
    switch (def.key) {
      case "count_reached":   value = 1; break;
      case "revenue":         value = proc?.fields.finalPrice ?? 0; break;
      case "margin":          value = (proc?.fields.finalPrice ?? 0) - vehicleTotalCostsGross(v) - v.purchasePrice; break;
      case "margin_percent": {
        const fp = proc?.fields.finalPrice ?? 0;
        const margin = fp - vehicleTotalCostsGross(v) - v.purchasePrice;
        value = fp > 0 ? (margin / fp) * 100 : 0;
        break;
      }
      case "costs":           value = vehicleTotalCostsGross(v); break;
      case "purchase_volume": value = v.purchasePrice; break;
      case "discount":        value = v.listPrice - (proc?.fields.finalPrice ?? v.listPrice); break;
      case "discount_percent": {
        const fp = proc?.fields.finalPrice ?? v.listPrice;
        value = v.listPrice > 0 ? ((v.listPrice - fp) / v.listPrice) * 100 : 0;
        break;
      }
      case "avg_list_price":  value = v.listPrice; break;
      case "avg_purchase":    value = v.purchasePrice; break;
      case "avg_mileage":     value = v.mileage; break;
      case "avg_age":         value = ageInYears(v) ?? 0; break;
    }
    matched.push({ vehicle: v, process: proc, plan, value, label: `${v.make} ${v.model}`, groupKey: breakdownKey(v, m.breakdown, d) });
  });

  const isAvg = ["margin_percent", "discount_percent", "avg_list_price", "avg_purchase", "avg_mileage", "avg_age"].includes(def.key);
  return summarize(matched, def.unit, m.breakdown, isAvg ? "avg" : def.key === "count_reached" ? "count" : "sum");
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

const formatValue = (n: number, unit: MetricDef["unit"]): string => {
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

const newId = () => Math.random().toString(36).slice(2, 9);

const baseDraft = (): Measurement => ({
  id: newId(), metric: "duration", fromStation: "arrived", toStation: "listed",
  rangePreset: "year", vehicleType: "all", make: "all", status: "all", fuel: "all", breakdown: "none",
});

interface Template {
  id: string;
  title: string;
  icon: typeof Timer;
  description: string;
  build: () => Measurement;
}

const TEMPLATES: Template[] = [
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const InsightPlusBuilder = ({ processes, vehicles, purchasePlans }: Props) => {
  const allMakes = useMemo(() => Array.from(new Set(vehicles.map((v) => v.make))).sort(), [vehicles]);

  const [measurements, setMeasurements] = useState<Measurement[]>(() => [
    TEMPLATES[2].build(),
    TEMPLATES[3].build(),
    TEMPLATES[0].build(),
    TEMPLATES[6].build(),
  ]);

  const [draft, setDraft] = useState<Measurement>(baseDraft());
  const [builderOpen, setBuilderOpen] = useState(false);

  const def = metricDef(draft.metric);
  const validDraft =
    (def.needsTwoStations ? stationIndex(draft.toStation) > stationIndex(draft.fromStation) : true) &&
    (draft.rangePreset !== "custom" || (!!draft.customFrom && !!draft.customTo));

  const addMeasurement = (m?: Measurement) => {
    const toAdd = m ?? { ...draft, id: newId() };
    setMeasurements((prev) => [...prev, toAdd]);
    if (!m) setBuilderOpen(false);
  };

  const removeMeasurement = (id: string) => setMeasurements((prev) => prev.filter((m) => m.id !== id));
  const duplicateMeasurement = (id: string) => {
    const src = measurements.find((m) => m.id === id);
    if (src) addMeasurement({ ...src, id: newId(), title: src.title ? `${src.title} (Kopie)` : undefined });
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">

        {/* ===== Quick-Templates ===== */}
        <Card data-tour="insight-templates" className="p-4 bg-card border-border shadow-card">
          <div className="flex items-center gap-2 mb-3">

            <Sparkles className="size-4 text-primary-glow" />
            <h3 className="text-sm font-semibold">Schnell-Vorlagen</h3>
            <span className="text-xs text-muted-foreground">— ein Klick → Auswertung erscheint unten</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {TEMPLATES.map((t) => {
              const Icon = t.icon;
              return (
                <Tooltip key={t.id} delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => addMeasurement(t.build())}
                      className="rounded-lg border border-border bg-background/40 hover:border-primary/50 hover:bg-primary/5 p-2.5 text-left transition-smooth group"
                    >
                      <Icon className="size-4 text-primary-glow mb-1.5" />
                      <p className="text-xs font-semibold leading-tight truncate">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">{t.description}</p>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{t.description}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </Card>

        {/* ===== Builder (collapsible) ===== */}
        <Card data-tour="insight-builder" className="bg-card border-border shadow-card overflow-hidden">

          <button
            type="button"
            onClick={() => setBuilderOpen((v) => !v)}
            className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-smooth text-left"
          >
            <div className="size-9 rounded-xl bg-gradient-brand grid place-items-center shadow-glow">
              <Layers className="size-4 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">Eigene Auswertung bauen</h3>
              <p className="text-xs text-muted-foreground">Metrik · Station(en) · Zeitraum · Filter · Breakdown</p>
            </div>
            {builderOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </button>

          {builderOpen && (
            <div className="border-t border-border p-4 space-y-5">
              {/* STEP 1: Metrik */}
              <Step number={1} title="Was möchtest du messen?" hint="Wähle eine Metrik">
                <div className="space-y-2.5">
                  {(Object.keys(METRIC_GROUP_LABEL) as MetricGroup[]).map((g) => (
                    <div key={g}>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1.5">{METRIC_GROUP_LABEL[g]}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        {METRICS.filter((m) => m.group === g).map((m) => {
                          const Icon = m.icon;
                          const active = draft.metric === m.key;
                          return (
                            <Tooltip key={m.key} delayDuration={250}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => setDraft((d) => ({ ...d, metric: m.key }))}
                                  className={cn(
                                    "rounded-lg border p-2 text-left transition-smooth",
                                    active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-background/40 hover:border-primary/40",
                                  )}
                                >
                                  <Icon className={cn("size-3.5 mb-1", active ? "text-primary-glow" : m.color)} />
                                  <p className="text-[11px] font-semibold leading-tight">{m.shortLabel}</p>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs text-xs">{m.description}</TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Step>

              {/* STEP 2: Stationen */}
              <Step number={2} title="An welcher Stelle im Prozess?" hint={def.needsTwoStations ? "Von- und Bis-Station wählen" : "Ziel-Station wählen"}>
                <div className="flex flex-wrap items-end gap-2">
                  {def.needsTwoStations && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Von</label>
                        <StationSelect value={draft.fromStation} onChange={(v) => setDraft((d) => ({ ...d, fromStation: v }))} width={200} excludeLast />
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground mb-2" />
                    </>
                  )}
                  {(def.needsOneStation || def.needsTwoStations) && (
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider">{def.needsTwoStations ? "Bis" : "Station"}</label>
                      <StationSelect value={draft.toStation} onChange={(v) => setDraft((d) => ({ ...d, toStation: v }))} width={210} minIndex={def.needsTwoStations ? stationIndex(draft.fromStation) + 1 : 0} />
                    </div>
                  )}
                  {!def.needsOneStation && !def.needsTwoStations && (
                    <p className="text-xs text-muted-foreground italic">Diese Metrik (Standzeit) braucht keine Station — sie nutzt den aktuellen Bestand.</p>
                  )}
                </div>
              </Step>

              {/* STEP 3: Zeitraum */}
              <Step number={3} title="In welchem Zeitraum?" hint="Vorperioden-Vergleich automatisch">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Zeitraum</label>
                    <Select value={draft.rangePreset} onValueChange={(v) => setDraft((d) => ({ ...d, rangePreset: v as RangePreset }))}>
                      <SelectTrigger className="h-9 w-[180px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(RANGE_LABELS) as RangePreset[]).map((r) => (
                          <SelectItem key={r} value={r}>{RANGE_LABELS[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {draft.rangePreset === "custom" && (
                    <>
                      <DatePop label="Von" value={draft.customFrom} onChange={(s) => setDraft((d) => ({ ...d, customFrom: s }))} />
                      <DatePop label="Bis" value={draft.customTo} onChange={(s) => setDraft((d) => ({ ...d, customTo: s }))} disabledBefore={draft.customFrom} />
                    </>
                  )}
                </div>
              </Step>

              {/* STEP 4: Filter & Breakdown */}
              <Step number={4} title="Filter & Aufschlüsselung" hint="Optional — schränke Datenbasis ein und gruppiere">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <FilterField label="Fahrzeugtyp">
                      <Select value={draft.vehicleType} onValueChange={(v) => setDraft((d) => ({ ...d, vehicleType: v as VehicleType | "all" }))}>
                        <SelectTrigger className="h-9 w-[150px] text-xs"><Car className="size-3 mr-1 inline" /><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Typen</SelectItem>
                          {(Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((t) => (
                            <SelectItem key={t} value={t}>{VEHICLE_TYPE_LABELS[t]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FilterField>
                    <FilterField label="Marke">
                      <Select value={draft.make} onValueChange={(v) => setDraft((d) => ({ ...d, make: v }))}>
                        <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Marken</SelectItem>
                          {allMakes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FilterField>
                    <FilterField label="Status">
                      <Select value={draft.status} onValueChange={(v) => setDraft((d) => ({ ...d, status: v as VehicleStatus | "all" }))}>
                        <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Status</SelectItem>
                          {(Object.keys(VEHICLE_STATUS_LABELS) as VehicleStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{VEHICLE_STATUS_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FilterField>
                    <FilterField label="Kraftstoff">
                      <Select value={draft.fuel} onValueChange={(v) => setDraft((d) => ({ ...d, fuel: v as FuelType | "all" }))}>
                        <SelectTrigger className="h-9 w-[140px] text-xs"><Fuel className="size-3 mr-1 inline" /><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle</SelectItem>
                          {FUEL_TYPES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FilterField>
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    <RangeField label="Listenpreis (€)" iconLabel="€"
                      min={draft.minPrice} max={draft.maxPrice}
                      onChange={(min, max) => setDraft((d) => ({ ...d, minPrice: min, maxPrice: max }))}
                    />
                    <RangeField label="KM-Stand" iconLabel="km"
                      min={draft.minKm} max={draft.maxKm}
                      onChange={(min, max) => setDraft((d) => ({ ...d, minKm: min, maxKm: max }))}
                    />
                    <RangeField label="Baujahr" iconLabel="J"
                      min={draft.minYear} max={draft.maxYear}
                      onChange={(min, max) => setDraft((d) => ({ ...d, minYear: min, maxYear: max }))}
                    />

                    <FilterField label="Aufschlüsselung nach">
                      <Select value={draft.breakdown} onValueChange={(v) => setDraft((d) => ({ ...d, breakdown: v as Breakdown }))}>
                        <SelectTrigger className="h-9 w-[170px] text-xs"><BarChart3 className="size-3 mr-1 inline" /><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Keine (Gesamt)</SelectItem>
                          <SelectItem value="make">Marke</SelectItem>
                          <SelectItem value="type">Fahrzeugtyp</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                          <SelectItem value="fuel">Kraftstoff</SelectItem>
                          <SelectItem value="month">Monat</SelectItem>
                        </SelectContent>
                      </Select>
                    </FilterField>
                  </div>
                </div>
              </Step>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="ghost" size="sm" onClick={() => setDraft(baseDraft())}>Zurücksetzen</Button>
                <Button size="sm" className="bg-gradient-brand gap-1.5" disabled={!validDraft} onClick={() => addMeasurement()}>
                  <Plus className="size-4" /> Auswertung hinzufügen
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* ===== Ergebnisse ===== */}
        <div data-tour="insight-results">

          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="size-4 text-primary-glow" />
              Deine Auswertungen
              <Badge variant="outline" className="text-[10px]">{measurements.length}</Badge>
            </h3>
            {measurements.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setMeasurements([])} className="text-xs text-muted-foreground hover:text-destructive">
                Alle entfernen
              </Button>
            )}
          </div>

          {measurements.length === 0 ? (
            <Card className="p-10 text-center border-dashed">
              <Sparkles className="size-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Klicke oben auf eine Vorlage oder baue eine eigene Auswertung.</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {measurements.map((m) => (
                <MeasurementCard
                  key={m.id} measurement={m}
                  processes={processes} vehicles={vehicles} purchasePlans={purchasePlans}
                  onRemove={() => removeMeasurement(m.id)}
                  onDuplicate={() => duplicateMeasurement(m.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

// ---------------------------------------------------------------------------
// Helper-Komponenten Builder
// ---------------------------------------------------------------------------

const Step = ({ number, title, hint, children }: { number: number; title: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <div className="flex items-baseline gap-2">
      <span className="size-5 rounded-full bg-primary/15 text-primary-glow text-[10px] font-bold grid place-items-center shrink-0">{number}</span>
      <h4 className="text-sm font-semibold">{title}</h4>
      {hint && <span className="text-[11px] text-muted-foreground">— {hint}</span>}
    </div>
    <div className="pl-7">{children}</div>
  </div>
);

const FilterField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

const RangeField = ({
  label, iconLabel, min, max, onChange,
}: { label: string; iconLabel: string; min?: number; max?: number; onChange: (min?: number, max?: number) => void }) => (
  <FilterField label={label}>
    <div className="flex items-center gap-1">
      <Input
        type="number" placeholder="min" value={min ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value), max)}
        className="h-9 w-20 text-xs"
      />
      <span className="text-[10px] text-muted-foreground">–</span>
      <Input
        type="number" placeholder="max" value={max ?? ""}
        onChange={(e) => onChange(min, e.target.value === "" ? undefined : Number(e.target.value))}
        className="h-9 w-20 text-xs"
      />
      <span className="text-[10px] text-muted-foreground ml-1">{iconLabel}</span>
    </div>
  </FilterField>
);

const DatePop = ({
  label, value, onChange, disabledBefore,
}: { label: string; value?: string; onChange: (s: string | undefined) => void; disabledBefore?: string }) => (
  <FilterField label={label}>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-9 w-[140px] justify-start text-xs", !value && "text-muted-foreground")}>
          <CalendarIcon className="size-3.5 mr-1" />
          {value ? format(new Date(value), "dd.MM.yyyy") : "Datum"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={(d) => onChange(d?.toISOString())}
          locale={de}
          disabled={(d) => !!disabledBefore && d < new Date(disabledBefore)}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  </FilterField>
);

const StationSelect = ({
  value, onChange, width, minIndex = 0, excludeLast = false,
}: {
  value: StationKey; onChange: (v: StationKey) => void; width: number; minIndex?: number; excludeLast?: boolean;
}) => {
  const filtered = STATIONS.filter((_s, i) => i >= minIndex && (!excludeLast || i < STATIONS.length - 1));
  const lifecycle = filtered.filter((s) => s.group === "lifecycle");
  const process = filtered.filter((s) => s.group === "process");

  return (
    <Select value={value} onValueChange={(v) => onChange(v as StationKey)}>
      <SelectTrigger className="h-9 text-xs" style={{ width }}><SelectValue /></SelectTrigger>
      <SelectContent>
        {lifecycle.length > 0 && (
          <>
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Bestand</div>
            {lifecycle.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </>
        )}
        {process.length > 0 && (
          <>
            <div className="px-2 py-1 mt-1 text-[10px] uppercase tracking-wider text-muted-foreground border-t border-border">Vorgangs-Schritte</div>
            {process.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </>
        )}
      </SelectContent>
    </Select>
  );
};

// ---------------------------------------------------------------------------
// Result Card
// ---------------------------------------------------------------------------

const MeasurementCard = ({
  measurement, processes, vehicles, purchasePlans, onRemove, onDuplicate,
}: {
  measurement: Measurement;
  processes: Process[]; vehicles: Vehicle[]; purchasePlans: PurchasePlan[];
  onRemove: () => void; onDuplicate: () => void;
}) => {
  const result = useMemo(() => compute(vehicles, processes, purchasePlans, measurement), [vehicles, processes, purchasePlans, measurement]);
  const def = metricDef(measurement.metric);
  const Icon = def.icon;

  // Trend vs Vorperiode
  const prev = useMemo(() => {
    if (measurement.metric === "aging_days") return null;
    const r = resolveRange(measurement);
    const p = previousRange(r);
    const prevM: Measurement = { ...measurement, rangePreset: "custom", customFrom: p.from.toISOString(), customTo: p.to.toISOString() };
    return compute(vehicles, processes, purchasePlans, prevM);
  }, [measurement, vehicles, processes, purchasePlans]);

  const delta = prev && prev.primary !== 0 ? ((result.primary - prev.primary) / Math.abs(prev.primary)) * 100 : null;

  const { from, to } = resolveRange(measurement);
  const rangeText = measurement.rangePreset === "all" ? "Gesamt"
    : measurement.rangePreset === "custom" ? `${format(from, "dd.MM.yy")} – ${format(to, "dd.MM.yy")}`
    : RANGE_LABELS[measurement.rangePreset];

  const filterChips: string[] = [];
  if (measurement.vehicleType && measurement.vehicleType !== "all") filterChips.push(VEHICLE_TYPE_LABELS[measurement.vehicleType]);
  if (measurement.make && measurement.make !== "all") filterChips.push(measurement.make);
  if (measurement.status && measurement.status !== "all") filterChips.push(VEHICLE_STATUS_LABELS[measurement.status]);
  if (measurement.fuel && measurement.fuel !== "all") filterChips.push(measurement.fuel);
  if (measurement.minPrice != null || measurement.maxPrice != null) filterChips.push(`${measurement.minPrice ?? "0"} – ${measurement.maxPrice ?? "∞"} €`);
  if (measurement.minKm != null || measurement.maxKm != null) filterChips.push(`${measurement.minKm ?? "0"} – ${measurement.maxKm ?? "∞"} km`);
  if (measurement.minYear != null || measurement.maxYear != null) filterChips.push(`BJ ${measurement.minYear ?? ""}–${measurement.maxYear ?? ""}`);

  // Trend-Bewertung: für Zeit-Metriken ist niedriger besser
  const lowerIsBetter = ["duration", "aging_days", "discount", "discount_percent", "costs"].includes(def.key);
  const trendPositive = delta != null && (lowerIsBetter ? delta < 0 : delta > 0);
  const trendColor = delta == null ? "text-muted-foreground" : trendPositive ? "text-success" : "text-destructive";

  // Top-3 Fahrzeuge
  const topRows = useMemo(() => {
    const dir = lowerIsBetter ? 1 : -1; // bei "lowerIsBetter" zeigen wir die schlimmsten 3 (zur Aktion)
    return [...result.rows].sort((a, b) => dir * (a.value - b.value)).slice(0, 3);
  }, [result.rows, lowerIsBetter]);

  // Breakdown bar max
  const breakdownMax = result.breakdown ? Math.max(...result.breakdown.map((b) => Math.abs(b.value))) : 0;

  const title = measurement.title || (def.needsTwoStations
    ? `${def.shortLabel}: ${stationLabel(measurement.fromStation)} → ${stationLabel(measurement.toStation)}`
    : def.key === "aging_days" ? "Standzeit aktiver Bestand"
    : `${def.shortLabel} · ${stationLabel(measurement.toStation)}`);

  return (
    <div className="rounded-xl border border-border bg-background/40 p-4 space-y-3 group relative hover:border-primary/30 transition-smooth">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon className={cn("size-3.5", def.color)} />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{def.shortLabel}</span>
          </div>
          <h4 className="text-sm font-display font-semibold leading-tight truncate">{title}</h4>
        </div>
        <div className="flex opacity-0 group-hover:opacity-100 transition-smooth">
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-primary-glow" onClick={onDuplicate} aria-label="Duplizieren">
            <Copy className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label="Entfernen">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[10px] gap-1 border-border">
          <CalendarIcon className="size-2.5" />{rangeText}
        </Badge>
        {filterChips.map((c) => (
          <Badge key={c} variant="outline" className="text-[10px] border-border">{c}</Badge>
        ))}
        {measurement.breakdown !== "none" && (
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary-glow gap-1">
            <BarChart3 className="size-2.5" /> nach {measurement.breakdown}
          </Badge>
        )}
      </div>

      {/* Hauptzahl + Trend */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-3xl font-display font-bold tracking-tight tabular-nums">
            {formatValue(result.primary, result.unit)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {result.count} {result.count === 1 ? "Fahrzeug" : "Fahrzeuge"} einbezogen
          </p>
        </div>
        {delta != null && Number.isFinite(delta) && (
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <div className={cn("flex items-center gap-1 text-xs font-semibold rounded-md px-2 py-1 bg-secondary/40", trendColor)}>
                {trendPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {delta > 0 ? "+" : ""}{delta.toFixed(1)} %
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              vs. Vorperiode: {prev ? formatValue(prev.primary, prev.unit) : "—"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Sekundäre Werte */}
      {(def.key === "duration" || def.key === "aging_days") && result.count > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Median" value={`${result.median!.toFixed(1)}`} />
          <Stat label="Min" value={`${result.min!.toFixed(1)}`} />
          <Stat label="Max" value={`${result.max!.toFixed(1)}`} />
        </div>
      )}
      {(def.key === "revenue" || def.key === "margin" || def.key === "costs" || def.key === "purchase_volume" || def.key === "discount") && result.count > 0 && (
        <div className="grid grid-cols-2 gap-2 text-center">
          <Stat label="Ø pro Fzg." value={formatCurrency(result.primary / Math.max(1, result.count))} />
          <Stat label="Max" value={formatCurrency(result.max ?? 0)} />
        </div>
      )}

      {/* Breakdown Bar-Chart */}
      {result.breakdown && result.breakdown.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Aufschlüsselung</p>
          <div className="space-y-1">
            {result.breakdown.slice(0, 6).map((b) => (
              <div key={b.key} className="space-y-0.5">
                <div className="flex justify-between text-[11px] gap-2">
                  <span className="truncate font-medium">{b.key}</span>
                  <span className="text-muted-foreground tabular-nums shrink-0">{formatValue(b.value, result.unit)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary/40 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary/80 to-primary-glow rounded-full"
                    style={{ width: `${breakdownMax > 0 ? (Math.abs(b.value) / breakdownMax) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
            {result.breakdown.length > 6 && (
              <p className="text-[10px] text-muted-foreground pt-0.5">+ {result.breakdown.length - 6} weitere</p>
            )}
          </div>
        </div>
      )}

      {/* Top-3 Liste */}
      {topRows.length > 0 && def.key !== "count_reached" && def.key !== "conversion" && (
        <div className="pt-2 border-t border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
            {lowerIsBetter ? "Hotspots (höchster Wert)" : "Top 3"}
          </p>
          <ul className="space-y-0.5">
            {[...topRows].reverse().map((r) => (
              <li key={r.vehicle.id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate text-foreground">{r.label}</span>
                <span className="text-muted-foreground tabular-nums shrink-0">{formatValue(r.value, result.unit)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.count === 0 && (
        <p className="text-xs text-muted-foreground italic pt-1">Keine Datensätze für diese Konfiguration. Filter weicher setzen oder Zeitraum erweitern.</p>
      )}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-secondary/40 px-2 py-1.5">
    <p className="text-[9px] uppercase tracking-wider text-muted-foreground leading-none">{label}</p>
    <p className="text-sm font-semibold leading-tight mt-0.5 tabular-nums">{value}</p>
  </div>
);
