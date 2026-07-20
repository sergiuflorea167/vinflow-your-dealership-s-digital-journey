// VINcent-Text-Befehle für Insight+ — Pendant zu vincentTodoCommands.ts.
// Erkennt (a) explizite "erstelle eine Insight+ Karte für ..."-Befehle und
// (b) Datenfragen, die sich auf eine Insight+-Metrik abbilden lassen. In beiden
// Fällen wird computeInsight() (insightEngine.ts) für die exakte Zahl verwendet —
// nie eine vom Sprachmodell geschätzte Zahl.

import type { Vehicle } from "@/data/process";
import { PROCESS_STEPS, VEHICLE_TYPE_LABELS, type VehicleType, type VehicleStatus, type FuelType } from "@/data/process";
import {
  type Measurement, type MetricKey, type StationKey, type Breakdown, type RangePreset, type Result,
  baseDraft, newId, metricDef, stationLabel, formatValue,
  RANGE_LABELS, VEHICLE_STATUS_LABELS, FUEL_TYPES,
} from "@/lib/insightEngine";

export type InsightCommandResult =
  | { type: "create"; measurement: Measurement; title: string }
  | { type: "query"; measurement: Measurement; title: string };

const INSIGHT_CREATE_PATTERN =
  /\b(insight\+?|auswertung|kpi-karte|kennzahlen-karte)\b[^.?!]{0,40}\b(erstell|anleg|hinzuf(ü|ue)g|speicher|f(ü|ue)g)|\b(erstell|leg|speicher|bau)\b[^.?!]{0,40}\b(insight\+?|auswertung)\b/i;

const QUESTION_MARKER_PATTERN = /(\?|wie hoch|wie viel|wie lange|was ist|wie ist|zeig mir|zeige mir)/i;

const METRIC_KEYWORD_TABLE: { key: MetricKey; pattern: RegExp }[] = [
  { key: "aging_days", pattern: /\b(standzeit|aging|liegezeit)\b/ },
  { key: "duration", pattern: /\b(durchlaufzeit|durchlauf|time.?to.?list|wie lange (dauert|braucht))\b/ },
  { key: "conversion", pattern: /\b(conversion|abschlussquote|abschlussrate)\b/ },
  { key: "revenue", pattern: /\b(umsatz|revenue|verkaufserl(ö|oe)s)\b/ },
  { key: "margin_percent", pattern: /\b(marge|gp)\b[^.?!]{0,15}(prozent|%|quote)|\bgp\s*%\b/ },
  { key: "margin", pattern: /\b(marge|deckungsbeitrag)\b/ },
  { key: "costs", pattern: /\b(aufbereitungskosten|kosten)\b/ },
  { key: "purchase_volume", pattern: /\beinkaufsvolumen\b/ },
  { key: "discount_percent", pattern: /\brabatt\b[^.?!]{0,15}(prozent|%|quote)/ },
  { key: "discount", pattern: /\brabatt\b/ },
  { key: "count_reached", pattern: /\b(anzahl|wie viele)\b/ },
  { key: "avg_list_price", pattern: /\blistenpreis\b/ },
  { key: "avg_purchase", pattern: /\beinkaufspreis\b/ },
  { key: "avg_mileage", pattern: /\b(kilometerstand|km-stand|laufleistung)\b/ },
  { key: "avg_age", pattern: /\b(fahrzeugalter|durchschnittsalter)\b/ },
];

const STATION_KEYWORD_TABLE: { key: StationKey; pattern: RegExp }[] = [
  { key: "purchase_planned", pattern: /\beinkaufsplanung\b/ },
  { key: "listed", pattern: /\b(inseriert|inserat)\b/ },
  { key: "arrived", pattern: /\bbestand\b/ },
  { key: "offer", pattern: /\bangebot\b/ },
  { key: "down_payment", pattern: /\banzahlung\b/ },
  { key: "order_confirmation", pattern: /\b(auftragsbest(ä|ae)tigung|\bab\b)\b/ },
  { key: "outbound_check", pattern: /\b(ausgangskontrolle|(ü|ue)bergabecheck)\b/ },
  { key: "invoicing", pattern: /\brechnung(sstellung)?\b/ },
  { key: "purchase_contract", pattern: /\bkaufvertrag\b/ },
  { key: "delivery_confirmation", pattern: /\b(lieferung|(ü|ue)bergabe|auslieferung)\b/ },
];

const RANGE_KEYWORD_TABLE: { key: RangePreset; pattern: RegExp }[] = [
  { key: "week", pattern: /\bdiese woche\b/ },
  { key: "month", pattern: /\bdiese(n|r)? monat\b/ },
  { key: "quarter", pattern: /\bdieses quartal\b/ },
  { key: "ytd", pattern: /\b(ytd|year.?to.?date)\b/ },
  { key: "year", pattern: /\bdieses jahr\b/ },
  { key: "last_30", pattern: /\bletzte(n)? 30 tage(n)?\b/ },
  { key: "last_90", pattern: /\bletzte(n)? 90 tage(n)?\b/ },
  { key: "last_365", pattern: /\b(letzte(n)? 365 tage(n)?|letztes jahr)\b/ },
  { key: "all", pattern: /\b(gesamtzeitraum|gesamt|insgesamt|alle zeit)\b/ },
];

const BREAKDOWN_KEYWORD_TABLE: { key: Breakdown; pattern: RegExp }[] = [
  { key: "make", pattern: /\bnach marke\b/ },
  { key: "type", pattern: /\bnach (typ|fahrzeugtyp)\b/ },
  { key: "status", pattern: /\bnach status\b/ },
  { key: "fuel", pattern: /\bnach (kraftstoff|antrieb)\b/ },
  { key: "month", pattern: /\bnach monat\b/ },
];

const BREAKDOWN_LABEL: Record<Breakdown, string> = {
  none: "—", make: "Marke", type: "Fahrzeugtyp", status: "Status", fuel: "Kraftstoff", month: "Monat",
};

const detectMetric = (normalized: string): MetricKey | undefined =>
  METRIC_KEYWORD_TABLE.find(({ pattern }) => pattern.test(normalized))?.key;

const findStationMatches = (normalized: string): StationKey[] => {
  const found: { key: StationKey; index: number }[] = [];
  STATION_KEYWORD_TABLE.forEach(({ key, pattern }) => {
    const m = normalized.match(pattern);
    if (m && m.index != null) found.push({ key, index: m.index });
  });
  return found.sort((a, b) => a.index - b.index).map((f) => f.key);
};

const detectRange = (normalized: string): RangePreset | undefined =>
  RANGE_KEYWORD_TABLE.find(({ pattern }) => pattern.test(normalized))?.key;

const detectBreakdown = (normalized: string): Breakdown | undefined =>
  BREAKDOWN_KEYWORD_TABLE.find(({ pattern }) => pattern.test(normalized))?.key;

const detectMake = (normalized: string, vehicles: Vehicle[]): string | undefined => {
  const makes = Array.from(new Set(vehicles.map((v) => v.make))).sort((a, b) => b.length - a.length);
  return makes.find((make) => normalized.includes(make.toLocaleLowerCase("de-DE")));
};

const detectVehicleType = (normalized: string): VehicleType | undefined => {
  const entries = Object.entries(VEHICLE_TYPE_LABELS) as [VehicleType, string][];
  return entries.find(([, label]) => normalized.includes(label.toLocaleLowerCase("de-DE")))?.[0];
};

const detectFuel = (normalized: string): FuelType | undefined =>
  FUEL_TYPES.find((fuel) => normalized.includes(fuel.toLocaleLowerCase("de-DE")));

// "bestand" ist bereits als Stationsbegriff belegt; Status wird nur über eindeutige
// Begriffe erkannt (verkauft/reserviert/geplant), nicht über "im Bestand".
const detectStatus = (normalized: string): VehicleStatus | undefined => {
  if (/\bverkauft\b/.test(normalized)) return "sold";
  if (/\breserviert\b/.test(normalized)) return "reserved";
  if (/\bgeplant\b/.test(normalized)) return "planned";
  return undefined;
};

const defaultStations = (metric: MetricKey): { fromStation: StationKey; toStation: StationKey } => {
  if (metric === "duration") return { fromStation: "arrived", toStation: "listed" };
  if (metric === "conversion") return { fromStation: PROCESS_STEPS[0].key, toStation: "delivery_confirmation" };
  return { fromStation: "arrived", toStation: "delivery_confirmation" };
};

const buildTitle = (measurement: Measurement): string => {
  const def = metricDef(measurement.metric);
  if (def.needsTwoStations) return `${def.shortLabel}: ${stationLabel(measurement.fromStation)} → ${stationLabel(measurement.toStation)}`;
  if (def.key === "aging_days") return "Standzeit aktiver Bestand";
  return `${def.shortLabel} · ${stationLabel(measurement.toStation)}`;
};

export function parseVincentInsightCommand(
  text: string,
  options: { vehicles?: Vehicle[] } = {},
): InsightCommandResult | null {
  const normalized = text.toLocaleLowerCase("de-DE");
  const metric = detectMetric(normalized);
  if (!metric) return null;

  const isCreate = INSIGHT_CREATE_PATTERN.test(normalized);
  const isQuestion = !isCreate && QUESTION_MARKER_PATTERN.test(normalized);
  if (!isCreate && !isQuestion) return null;

  const def = metricDef(metric);
  const measurement: Measurement = { ...baseDraft(), id: newId(), metric };

  const stationMatches = findStationMatches(normalized);
  const defaults = defaultStations(metric);
  measurement.fromStation = defaults.fromStation;
  measurement.toStation = defaults.toStation;
  if (def.needsTwoStations) {
    if (stationMatches.length >= 2) {
      measurement.fromStation = stationMatches[0];
      measurement.toStation = stationMatches[1];
    } else if (stationMatches.length === 1) {
      measurement.toStation = stationMatches[0];
    }
  } else if (def.needsOneStation && stationMatches.length > 0) {
    measurement.toStation = stationMatches[stationMatches.length - 1];
  }

  measurement.rangePreset = detectRange(normalized) ?? "last_90";
  measurement.vehicleType = detectVehicleType(normalized) ?? "all";
  measurement.make = detectMake(normalized, options.vehicles ?? []) ?? "all";
  measurement.status = detectStatus(normalized) ?? "all";
  measurement.fuel = detectFuel(normalized) ?? "all";
  measurement.breakdown = detectBreakdown(normalized) ?? "none";
  measurement.title = buildTitle(measurement);

  return { type: isCreate ? "create" : "query", measurement, title: measurement.title };
}

/** Exakte, aus computeInsight() berechnete Antwort — keine KI-Schätzung. */
export function formatInsightAnswer(measurement: Measurement, result: Result): string {
  const def = metricDef(measurement.metric);
  const rangeLabel = measurement.rangePreset === "custom" ? "individueller Zeitraum" : RANGE_LABELS[measurement.rangePreset];

  const filterBits: string[] = [];
  if (measurement.vehicleType && measurement.vehicleType !== "all") filterBits.push(VEHICLE_TYPE_LABELS[measurement.vehicleType]);
  if (measurement.make && measurement.make !== "all") filterBits.push(measurement.make);
  if (measurement.status && measurement.status !== "all") filterBits.push(VEHICLE_STATUS_LABELS[measurement.status]);
  if (measurement.fuel && measurement.fuel !== "all") filterBits.push(measurement.fuel);
  const filterText = filterBits.length ? ` (${filterBits.join(", ")})` : "";

  if (result.count === 0) {
    return `Für **${def.label}**${filterText} im Zeitraum „${rangeLabel}" liegen keine Datensätze vor. Versuch einen anderen Zeitraum oder weichere Filter.`;
  }

  const lines: string[] = [
    `**${def.label}**${filterText} — ${rangeLabel}:`,
    "",
    `**${formatValue(result.primary, result.unit)}** (${result.count} ${result.count === 1 ? "Fahrzeug" : "Fahrzeuge"} einbezogen)`,
  ];

  if ((def.key === "duration" || def.key === "aging_days") && result.median != null) {
    lines.push(`Median: ${result.median.toFixed(1)} Tage · Min: ${result.min!.toFixed(1)} · Max: ${result.max!.toFixed(1)}`);
  }

  if (result.breakdown && result.breakdown.length > 0) {
    lines.push("", `Aufschlüsselung nach ${BREAKDOWN_LABEL[measurement.breakdown]}:`);
    result.breakdown.slice(0, 5).forEach((b) => {
      lines.push(`- ${b.key}: ${formatValue(b.value, result.unit)} (${b.count} Fzg.)`);
    });
  }

  return lines.join("\n");
}

export const INSIGHT_CONFIRM_PATTERN = /^(ja|jep|jap|klar|gerne|mach das|speicher(e)?( das)?|ok(ay)?)\b/i;
export const INSIGHT_DECLINE_PATTERN = /^(nein|nicht jetzt|sp(ä|ae)ter|no)\b/i;
