// Zentraler KPI-Katalog – eine Quelle der Wahrheit.
// Jeder KPI berechnet sich live aus dem Store-State.
// Zeitabhängige KPIs (timeMode: "range") nutzen den globalen Zeitraum-Filter.

import {
  Customer, Offer, Process, ProcessStepKey, Vehicle, formatCurrency,
  getLastProcessStepKey, vehicleTotalCostsGross,
} from "@/data/process";

export type KpiCategory = "Umsatz" | "Verkauf & Marge" | "Bestand" | "Kosten" | "Pipeline";

export type KpiFormat = "currency" | "number" | "percent" | "days";

export interface KpiContext {
  vehicles: Vehicle[];
  processes: Process[];
  offers: Offer[];
  customers: Customer[];
  processStepKeys?: ProcessStepKey[];
  /** Globaler Zeitraum-Filter (zentral via KpiRangeContext). */
  range: { from: Date; to: Date; label: string };
}

/** Markiert eine KPI, deren Wert vom globalen Zeitraum-Filter abhängt. */
export type KpiTimeMode = "range" | "static";

export interface KpiResult {
  value: number;
  display: string;
  sub?: string;
}

export interface KpiDef {
  id: string;
  label: string;
  category: KpiCategory;
  /** Was misst dieser KPI? (kurze fachliche Definition) */
  description: string;
  /**
   * Wie ist die Zahl zu deuten? Praktischer Klartext für den User:
   * Was bedeutet ein hoher / niedriger Wert, worauf achten, was tun.
   */
  interpretation: string;
  format: KpiFormat;
  /**
   * "range"  → Wert wird über den globalen Zeitraum-Filter gesteuert.
   * "static" → Stichtagswert (z. B. aktueller Bestand).
   */
  timeMode: KpiTimeMode;
  compute: (ctx: KpiContext) => KpiResult;
}

// ---- Helpers ----
const fmt = (value: number, format: KpiFormat) => {
  switch (format) {
    case "currency": return formatCurrency(value);
    case "percent": return `${value.toFixed(1)}%`;
    case "days": return `${value.toFixed(1)} Tage`;
    default: return Math.round(value).toLocaleString("de-DE");
  }
};

const dateInRange = (value: string | undefined, from: Date, to: Date) => {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp >= from.getTime() && timestamp <= to.getTime();
};

// Verkauf zählt am Ende der konfigurierten Vorgangskette.
const saleInRange = (p: Process, from: Date, to: Date, saleStepKey: ProcessStepKey) => {
  const rec = p.steps[saleStepKey];
  return !!rec && rec.status === "completed" && dateInRange(rec.completedAt, from, to);
};

const isSaleCompleted = (p: Process, saleStepKey: ProcessStepKey) =>
  p.steps[saleStepKey]?.status === "completed";

// Rechnung gestellt im Zeitraum
const invoicedInRange = (p: Process, from: Date, to: Date) => {
  const rec = p.steps.invoicing;
  if (!rec || rec.status !== "completed") return false;
  return dateInRange(p.fields.invoicing?.invoiceDate ?? rec.completedAt, from, to);
};

const downPaymentReceivedInRange = (p: Process, from: Date, to: Date) => {
  const downPayment = p.fields.downPayment;
  if (!downPayment?.received) return false;
  return dateInRange(downPayment.receivedDate ?? p.steps.down_payment?.completedAt, from, to);
};

const profitOf = (p: Process, vehicles: Vehicle[]) => {
  const v = vehicles.find((x) => x.id === p.vehicleId);
  if (!v || (p.fields.finalPrice ?? 0) <= 0) return undefined;
  const ek = v.purchasePrice + vehicleTotalCostsGross(v);
  return p.fields.finalPrice! - ek;
};

// ---- KPI-Katalog ----
export const KPI_CATALOG: KpiDef[] = [
  // -------- Umsatz --------
  {
    id: "revenue_year",
    label: "Umsatz",
    category: "Umsatz",
    description: "Summe der Verkäufe (Übergabe) im gewählten Zeitraum.",
    interpretation:
      "Hauptindikator für den geschäftlichen Erfolg. Ein Wert deutlich unter Vergleichszeitraum → Vertrieb / Lead-Zufluss prüfen.",
    format: "currency",
    timeMode: "range",
    compute: ({ processes, range, processStepKeys }) => {
      const saleStepKey = getLastProcessStepKey(processStepKeys);
      const sold = processes.filter((p) => saleInRange(p, range.from, range.to, saleStepKey));
      const value = sold.reduce((s, p) => s + (p.fields.finalPrice ?? 0), 0);
      return { value, display: fmt(value, "currency"), sub: `${sold.length} Übergaben · ${range.label}` };
    },
  },
  {
    id: "revenue_invoiced",
    label: "Umsatz (Rechnungen)",
    category: "Umsatz",
    description: "Tatsächlich gestellte Schlussrechnungen im Zeitraum.",
    interpretation:
      "Buchhalterischer Bruttoumsatz aus formellen Rechnungen — Basis für USt-Voranmeldung & GuV.",
    format: "currency",
    timeMode: "range",
    compute: ({ processes, range }) => {
      const inv = processes.filter((p) => invoicedInRange(p, range.from, range.to));
      const value = inv.reduce((s, p) => s + (p.fields.finalPrice ?? 0), 0);
      return { value, display: fmt(value, "currency"), sub: `${inv.length} Rechnungen · ${range.label}` };
    },
  },
  {
    id: "revenue_booked",
    label: "Zahlungsvolumen (gebucht)",
    category: "Umsatz",
    description: "Eingegangene Anzahlungen plus zahlbarer Restbetrag neuer Schlussrechnungen im Zeitraum, nach Inzahlungnahme und ohne Doppelzählung.",
    interpretation:
      "Bereits buchhalterisch gesichertes Volumen — relevanter Wert für Liquiditätsplanung.",
    format: "currency",
    timeMode: "range",
    compute: ({ processes, range }) => {
      const invoiced = processes.filter((p) => invoicedInRange(p, range.from, range.to));
      const invoicedRemainder = invoiced.reduce(
        (s, p) => s + Math.max(0, (p.fields.finalPrice ?? 0) -
          (p.fields.downPayment?.received ? (p.fields.downPayment.amount ?? 0) : 0) -
          (p.fields.tradeIn?.value ?? 0)),
        0
      );
      // Nur im Zeitraum tatsächlich eingegangene Anzahlungen einbeziehen.
      const dpReceived = processes
        .filter((p) => downPaymentReceivedInRange(p, range.from, range.to))
        .reduce(
        (s, p) => s + (p.fields.downPayment?.received ? (p.fields.downPayment.amount ?? 0) : 0),
        0
      );
      const value = invoicedRemainder + dpReceived;
      return { value, display: fmt(value, "currency"), sub: `Anzahlungen + Rechnungen · ${range.label}` };
    },
  },
  {
    id: "down_payments_received",
    label: "Anzahlungen erhalten",
    category: "Umsatz",
    description: "Bereits eingegangene Anzahlungen (Stichtag, alle laufenden Vorgänge).",
    interpretation:
      "Bereits zugeflossene Liquidität, vertraglich an einen noch laufenden Vorgang gebunden.",
    format: "currency",
    timeMode: "static",
    compute: ({ processes, processStepKeys }) => {
      const saleStepKey = getLastProcessStepKey(processStepKeys);
      const value = processes.filter((p) => !isSaleCompleted(p, saleStepKey)).reduce(
        (s, p) => s + (p.fields.downPayment?.received ? (p.fields.downPayment.amount ?? 0) : 0),
        0
      );
      return { value, display: fmt(value, "currency"), sub: "Cashflow im Prozess" };
    },
  },
  {
    id: "down_payments_open",
    label: "Anzahlungen offen",
    category: "Umsatz",
    description: "Vereinbarte, aber noch nicht eingegangene Anzahlungen (Stichtag).",
    interpretation:
      "Risiko-Wert: Geld, mit dem gerechnet wird, das aber noch nicht da ist. Hoher Wert → nachfassen.",
    format: "currency",
    timeMode: "static",
    compute: ({ processes, processStepKeys }) => {
      const saleStepKey = getLastProcessStepKey(processStepKeys);
      const value = processes.filter((p) => !isSaleCompleted(p, saleStepKey)).reduce((s, p) => {
        const dp = p.fields.downPayment;
        return s + (dp && !dp.received ? (dp.amount ?? 0) : 0);
      }, 0);
      return { value, display: fmt(value, "currency"), sub: "Noch nicht eingegangen" };
    },
  },
  {
    id: "open_receivables",
    label: "Offene Forderungen",
    category: "Umsatz",
    description: "Unbezahlte Schlussrechnungen abzüglich erhaltener Anzahlung und Inzahlungnahme (Stichtag).",
    interpretation:
      "Klassisches Debitorenrisiko. Sollte zeitnah Richtung Null gehen — sonst Mahnwesen aktivieren.",
    format: "currency",
    timeMode: "static",
    compute: ({ processes }) => {
      const value = processes
        .filter((p) => p.steps.invoicing?.status === "completed" && !p.fields.invoicing?.paid)
        .reduce((s, p) => {
          const total = p.fields.finalPrice ?? 0;
          const dp = p.fields.downPayment?.received ? (p.fields.downPayment.amount ?? 0) : 0;
          const tradeIn = p.fields.tradeIn?.value ?? 0;
          return s + Math.max(0, total - dp - tradeIn);
        }, 0);
      return { value, display: fmt(value, "currency"), sub: "Rechnung offen" };
    },
  },

  // -------- Verkauf & Marge --------
  {
    id: "profit_year",
    label: "Gewinn",
    category: "Verkauf & Marge",
    description: "Gewinn der Übergaben im gewählten Zeitraum (VK − EK − Kosten).",
    interpretation:
      "Echte Wertschöpfung — wichtiger als Bruttoumsatz. Sinkt bei Preisnachlässen oder hohen Aufbereitungskosten.",
    format: "currency",
    timeMode: "range",
    compute: ({ processes, vehicles, range, processStepKeys }) => {
      const saleStepKey = getLastProcessStepKey(processStepKeys);
      const sold = processes.filter((p) => saleInRange(p, range.from, range.to, saleStepKey));
      const profits = sold.flatMap((p) => {
        const profit = profitOf(p, vehicles);
        return profit == null ? [] : [profit];
      });
      const value = profits.reduce((sum, profit) => sum + profit, 0);
      return { value, display: fmt(value, "currency"), sub: `${profits.length} Übergaben · ${range.label}` };
    },
  },
  {
    id: "profit_avg",
    label: "Ø Gewinn / Verkauf",
    category: "Verkauf & Marge",
    description: "Durchschnittlicher Gewinn pro Übergabe im gewählten Zeitraum.",
    interpretation:
      'Steuerungsgröße für die Profitabilität eines „typischen" Deals. Sinkt → Einkauf oder Pricing prüfen.',
    format: "currency",
    timeMode: "range",
    compute: ({ processes, vehicles, range, processStepKeys }) => {
      const saleStepKey = getLastProcessStepKey(processStepKeys);
      const sold = processes.filter((p) => saleInRange(p, range.from, range.to, saleStepKey));
      const profits = sold.flatMap((p) => {
        const profit = profitOf(p, vehicles);
        return profit == null ? [] : [profit];
      });
      const total = profits.reduce((sum, profit) => sum + profit, 0);
      const value = profits.length ? total / profits.length : 0;
      return { value, display: fmt(value, "currency"), sub: `${profits.length} Verkäufe · ${range.label}` };
    },
  },
  {
    id: "margin_avg",
    label: "Marge (GP %)",
    category: "Verkauf & Marge",
    description: "Durchschnittliche Bruttomarge der Verkäufe im Zeitraum.",
    interpretation:
      "Effizienz: Wieviel % vom VK bleibt als Roh-Gewinn? Branchenwert ~10–15%. Sinkt sie → EK oder Standzeit zu hoch.",
    format: "percent",
    timeMode: "range",
    compute: ({ processes, vehicles, range, processStepKeys }) => {
      const saleStepKey = getLastProcessStepKey(processStepKeys);
      const sold = processes.filter((p) => saleInRange(p, range.from, range.to, saleStepKey));
      const validSales = sold.flatMap((p) => {
        const vehicle = vehicles.find((v) => v.id === p.vehicleId);
        const revenue = p.fields.finalPrice ?? 0;
        return vehicle && revenue > 0 ? [{ vehicle, revenue }] : [];
      });
      const revenue = validSales.reduce((sum, sale) => sum + sale.revenue, 0);
      const profit = validSales.reduce(
        (sum, sale) => sum + sale.revenue - sale.vehicle.purchasePrice - vehicleTotalCostsGross(sale.vehicle),
        0,
      );
      const value = revenue > 0 ? (profit / revenue) * 100 : 0;
      return { value, display: fmt(value, "percent"), sub: `${validSales.length} Verkäufe · ${range.label}` };
    },
  },
  {
    id: "conversion_rate",
    label: "Conversion",
    category: "Verkauf & Marge",
    description: "Angenommene Angebote ÷ alle abgeschlossenen Entscheidungen (angenommen, abgelehnt oder abgelaufen).",
    interpretation:
      "Vertriebs-Effizienz. Werte unter 20% deuten auf Preis-, Qualifikations- oder Nachfass-Probleme.",
    format: "percent",
    timeMode: "static",
    compute: ({ offers }) => {
      const decided = offers.filter((o) => o.status === "accepted" || o.status === "rejected" || o.status === "expired");
      const accepted = offers.filter((o) => o.status === "accepted").length;
      const value = decided.length ? (accepted / decided.length) * 100 : 0;
      return { value, display: fmt(value, "percent"), sub: `${accepted}/${decided.length} entschieden` };
    },
  },

  // -------- Bestand --------
  {
    id: "stock_value",
    label: "Bestandswert",
    category: "Bestand",
    description: "Listenpreise aller Fahrzeuge im Bestand (Stichtag).",
    interpretation:
      "Gebundenes Vermögen auf dem Hof. Hoch = viel Kapital gebunden → braucht Verkaufsdynamik.",
    format: "currency",
    timeMode: "static",
    compute: ({ vehicles }) => {
      const stock = vehicles.filter((v) => v.status === "in_stock" || v.status === "reserved");
      const value = stock.reduce((s, v) => s + v.listPrice, 0);
      const ek = stock.reduce((s, v) => s + v.purchasePrice, 0);
      return { value, display: fmt(value, "currency"), sub: `EK ${formatCurrency(ek)}` };
    },
  },
  {
    id: "stock_count",
    label: "Fahrzeuge im Bestand",
    category: "Bestand",
    description: "Anzahl Fahrzeuge im Bestand inkl. reservierter (Stichtag).",
    interpretation:
      "Operative Größe des Hofs. Reservierungs-Anteil zeigt aktive Nachfrage.",
    format: "number",
    timeMode: "static",
    compute: ({ vehicles }) => {
      const stock = vehicles.filter((v) => v.status === "in_stock" || v.status === "reserved");
      const reserved = vehicles.filter((v) => v.status === "reserved").length;
      return { value: stock.length, display: fmt(stock.length, "number"), sub: `${reserved} reserviert` };
    },
  },
  {
    id: "stock_age_avg",
    label: "Ø Standzeit",
    category: "Bestand",
    description: "Durchschnittliche Tage im Hof (nur aktueller Bestand).",
    interpretation:
      "Frühindikator für Liquiditätsprobleme. > 90 Tage = Preis prüfen, > 120 Tage = aktive Maßnahmen.",
    format: "days",
    timeMode: "static",
    compute: ({ vehicles }) => {
      const now = Date.now();
      const ages = vehicles
        .filter((v) => (v.status === "in_stock" || v.status === "reserved") && v.arrivedAt)
        .map((v) => (now - new Date(v.arrivedAt!).getTime()) / 86400000)
        .filter((age) => Number.isFinite(age) && age >= 0);
      const value = ages.length ? ages.reduce((s, n) => s + n, 0) / ages.length : 0;
      return { value, display: fmt(value, "days"), sub: "Im Hof" };
    },
  },
  {
    id: "cycle_time_avg",
    label: "Ø Durchlaufzeit",
    category: "Bestand",
    description: "Tage von Vorgang-Anlage bis Übergabe — für Übergaben im Zeitraum.",
    interpretation:
      "Effizienz der Verkaufsabwicklung. Lang trotz Anzahlung = interne Engpässe (Aufbereitung, Termine).",
    format: "days",
    timeMode: "range",
    compute: ({ processes, range, processStepKeys }) => {
      const saleStepKey = getLastProcessStepKey(processStepKeys);
      const sold = processes.filter((p) => saleInRange(p, range.from, range.to, saleStepKey));
      const times = sold.map((p) =>
        (new Date(p.steps[saleStepKey]!.completedAt!).getTime() - new Date(p.createdAt).getTime()) / 86400000
      ).filter((days) => Number.isFinite(days) && days >= 0);
      const value = times.length ? times.reduce((s, n) => s + n, 0) / times.length : 0;
      return { value, display: fmt(value, "days"), sub: `${sold.length} Verkäufe · ${range.label}` };
    },
  },

  // -------- Kosten --------
  {
    id: "costs_total",
    label: "Kosten gesamt",
    category: "Kosten",
    description: "Brutto-Kosten aller Fahrzeuge (Werkstatt, Aufbereitung, …) — Stichtag.",
    interpretation:
      "Summe aller fahrzeugbezogenen Aufwände. Verglichen mit dem Gewinn zeigt sie, wie kostenintensiv das Portfolio ist.",
    format: "currency",
    timeMode: "static",
    compute: ({ vehicles }) => {
      const value = vehicles.reduce((s, v) => s + vehicleTotalCostsGross(v), 0);
      return { value, display: fmt(value, "currency"), sub: `${vehicles.length} Fahrzeuge` };
    },
  },
  {
    id: "costs_stock",
    label: "Kosten am Bestand",
    category: "Kosten",
    description: "Brutto-Kosten der aktiv im Bestand stehenden Fahrzeuge (Stichtag).",
    interpretation:
      "Bereits investiertes Geld in Fahrzeuge, die noch nicht verkauft sind — gebundenes Aufbereitungskapital.",
    format: "currency",
    timeMode: "static",
    compute: ({ vehicles }) => {
      const stock = vehicles.filter((v) => v.status === "in_stock" || v.status === "reserved");
      const value = stock.reduce((s, v) => s + vehicleTotalCostsGross(v), 0);
      return { value, display: fmt(value, "currency"), sub: `${stock.length} aktive Fahrzeuge` };
    },
  },
  {
    id: "costs_avg_vehicle",
    label: "Ø Kosten / Fahrzeug",
    category: "Kosten",
    description: "Durchschnittliche Brutto-Kosten je Fahrzeug (Stichtag).",
    interpretation:
      'Wie viel muss ein „typisches" Fahrzeug zusätzlich verkraften, bevor es marktfähig ist? Hoch → Einkaufsqualität verbessern.',
    format: "currency",
    timeMode: "static",
    compute: ({ vehicles }) => {
      const total = vehicles.reduce((s, v) => s + vehicleTotalCostsGross(v), 0);
      const value = vehicles.length ? total / vehicles.length : 0;
      return { value, display: fmt(value, "currency"), sub: "Über gesamten Bestand" };
    },
  },

  // -------- Pipeline --------
  {
    id: "active_processes",
    label: "Aktive Vorgänge",
    category: "Pipeline",
    description: "Vorgänge ohne abgeschlossene Übergabe (Stichtag).",
    interpretation:
      'Operative Arbeitslast. Hoher Wert in „in Kontrolle" = Übergaben stehen kurz bevor (gut für Cashflow).',
    format: "number",
    timeMode: "static",
    compute: ({ processes, processStepKeys }) => {
      const saleStepKey = getLastProcessStepKey(processStepKeys);
      const active = processes.filter((p) => !isSaleCompleted(p, saleStepKey));
      const inOutbound = active.filter((p) => p.currentStep === "outbound_check").length;
      return { value: active.length, display: fmt(active.length, "number"), sub: `${inOutbound} in Kontrolle` };
    },
  },
  {
    id: "open_offers",
    label: "Offene Angebote",
    category: "Pipeline",
    description: "Versendete, noch nicht entschiedene Angebote (Stichtag).",
    interpretation:
      "Vertriebsmotor — alle Angebote, die noch konvertiert werden können.",
    format: "number",
    timeMode: "static",
    compute: ({ offers }) => {
      const open = offers.filter((o) => o.status === "sent");
      return { value: open.length, display: fmt(open.length, "number"), sub: `${offers.length} Angebote gesamt` };
    },
  },
  {
    id: "pipeline_value",
    label: "Pipeline-Wert",
    category: "Pipeline",
    description: "Summe finalPrice aller laufenden Vorgänge (Stichtag).",
    interpretation:
      "Erwarteter Umsatz aus aktuell laufenden Verkäufen — die Forecast-Zahl.",
    format: "currency",
    timeMode: "static",
    compute: ({ processes, processStepKeys }) => {
      const saleStepKey = getLastProcessStepKey(processStepKeys);
      const value = processes
        .filter((p) => !isSaleCompleted(p, saleStepKey))
        .reduce((s, p) => s + (p.fields.finalPrice ?? 0), 0);
      return { value, display: fmt(value, "currency"), sub: "In Arbeit" };
    },
  },
  {
    id: "handovers_count",
    label: "Übergaben",
    category: "Pipeline",
    description: "Anzahl der vollständig übergebenen Verkäufe im Zeitraum.",
    interpretation:
      "Volumen-Indikator: Wie viele Deals wurden abgeschlossen? Ergänzt den Umsatz um die Stückzahl.",
    format: "number",
    timeMode: "range",
    compute: ({ processes, range, processStepKeys }) => {
      const saleStepKey = getLastProcessStepKey(processStepKeys);
      const sold = processes.filter((p) => saleInRange(p, range.from, range.to, saleStepKey));
      return { value: sold.length, display: fmt(sold.length, "number"), sub: range.label };
    },
  },
];

export const getKpi = (id: string) => KPI_CATALOG.find((k) => k.id === id);

export const KPI_BY_CATEGORY = (() => {
  const map = new Map<KpiCategory, KpiDef[]>();
  KPI_CATALOG.forEach((k) => {
    const arr = map.get(k.category) ?? [];
    arr.push(k);
    map.set(k.category, arr);
  });
  return map;
})();

// Default-Pin-Set
export const DEFAULT_PINNED_KPIS = [
  "revenue_year",
  "profit_year",
  "margin_avg",
  "stock_value",
  "stock_count",
  "active_processes",
];
