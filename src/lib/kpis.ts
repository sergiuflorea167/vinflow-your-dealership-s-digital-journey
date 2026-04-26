// Zentraler KPI-Katalog – eine Quelle der Wahrheit.
// Jeder KPI berechnet sich live aus dem Store-State.
// Zeitabhängige KPIs (timeMode: "range") nutzen den globalen Zeitraum-Filter.

import { Process, Vehicle, Offer, Customer, formatCurrency, vehicleTotalCostsGross } from "@/data/process";

export type KpiCategory = "Umsatz" | "Verkauf & Marge" | "Bestand" | "Kosten" | "Pipeline";

export type KpiFormat = "currency" | "number" | "percent" | "days";

export interface KpiContext {
  vehicles: Vehicle[];
  processes: Process[];
  offers: Offer[];
  customers: Customer[];
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

// Verkauf zählt zum Zeitpunkt der Übergabe (delivery_confirmation completed)
const handoverInRange = (p: Process, from: Date, to: Date) => {
  const rec = p.steps.delivery_confirmation;
  if (!rec || rec.status !== "completed" || !rec.completedAt) return false;
  const t = new Date(rec.completedAt);
  return t >= from && t <= to;
};

// Rechnung gestellt im Zeitraum
const invoicedInRange = (p: Process, from: Date, to: Date) => {
  const rec = p.steps.invoicing;
  if (!rec || rec.status !== "completed" || !rec.completedAt) return false;
  const t = new Date(rec.completedAt);
  return t >= from && t <= to;
};

const profitOf = (p: Process, vehicles: Vehicle[]) => {
  const v = vehicles.find((x) => x.id === p.vehicleId);
  if (!v) return 0;
  const ek = v.purchasePrice + vehicleTotalCostsGross(v);
  return (p.fields.finalPrice ?? 0) - ek;
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
    compute: ({ processes, range }) => {
      const sold = processes.filter((p) => handoverInRange(p, range.from, range.to));
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
    label: "Umsatz (gebucht)",
    category: "Umsatz",
    description: "Anzahlungen + Schlussrechnungen im Zeitraum, ohne Doppelzählung.",
    interpretation:
      "Bereits buchhalterisch gesichertes Volumen — relevanter Wert für Liquiditätsplanung.",
    format: "currency",
    timeMode: "range",
    compute: ({ processes, range }) => {
      const invoiced = processes.filter((p) => invoicedInRange(p, range.from, range.to));
      const invoicedRevenue = invoiced.reduce((s, p) => s + (p.fields.finalPrice ?? 0), 0);
      // Anzahlungen werden ohne explizite Datums-Info erfasst — hier alle erhaltenen
      // einbeziehen und Doppelzählung mit Rechnungen vermeiden.
      const dpReceived = processes.reduce(
        (s, p) => s + (p.fields.downPayment?.received ? (p.fields.downPayment.amount ?? 0) : 0),
        0
      );
      const dpInInvoiced = invoiced.reduce(
        (s, p) => s + (p.fields.downPayment?.received ? (p.fields.downPayment.amount ?? 0) : 0),
        0
      );
      const value = invoicedRevenue + (dpReceived - dpInInvoiced);
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
    compute: ({ processes }) => {
      const value = processes.reduce(
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
    compute: ({ processes }) => {
      const value = processes.reduce((s, p) => {
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
    description: "Rechnung gestellt, Übergabe noch ausstehend (abzüglich Anzahlung). Stichtag.",
    interpretation:
      "Klassisches Debitorenrisiko. Sollte zeitnah Richtung Null gehen — sonst Mahnwesen aktivieren.",
    format: "currency",
    timeMode: "static",
    compute: ({ processes }) => {
      const value = processes
        .filter((p) => p.steps.invoicing?.status === "completed" && p.steps.delivery_confirmation?.status !== "completed")
        .reduce((s, p) => {
          const total = p.fields.finalPrice ?? 0;
          const dp = p.fields.downPayment?.received ? (p.fields.downPayment.amount ?? 0) : 0;
          return s + Math.max(0, total - dp);
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
    compute: ({ processes, vehicles, range }) => {
      const sold = processes.filter((p) => handoverInRange(p, range.from, range.to));
      const value = sold.reduce((s, p) => s + profitOf(p, vehicles), 0);
      return { value, display: fmt(value, "currency"), sub: `${sold.length} Übergaben · ${range.label}` };
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
    compute: ({ processes, vehicles, range }) => {
      const sold = processes.filter((p) => handoverInRange(p, range.from, range.to));
      const total = sold.reduce((s, p) => s + profitOf(p, vehicles), 0);
      const value = sold.length ? total / sold.length : 0;
      return { value, display: fmt(value, "currency"), sub: `${sold.length} Verkäufe · ${range.label}` };
    },
  },
  {
    id: "margin_avg",
    label: "Ø Marge",
    category: "Verkauf & Marge",
    description: "Durchschnittliche Bruttomarge der Verkäufe im Zeitraum.",
    interpretation:
      "Effizienz: Wieviel % vom VK bleibt als Roh-Gewinn? Branchenwert ~10–15%. Sinkt sie → EK oder Standzeit zu hoch.",
    format: "percent",
    timeMode: "range",
    compute: ({ processes, vehicles, range }) => {
      const sold = processes.filter((p) => handoverInRange(p, range.from, range.to));
      const value = sold.length
        ? sold.reduce((acc, p) => {
            const v = vehicles.find((x) => x.id === p.vehicleId);
            if (!v) return acc;
            const ek = v.purchasePrice + vehicleTotalCostsGross(v);
            const sale = p.fields.finalPrice ?? 0;
            return acc + (sale > 0 ? ((sale - ek) / sale) * 100 : 0);
          }, 0) / sold.length
        : 0;
      return { value, display: fmt(value, "percent"), sub: `${sold.length} Verkäufe · ${range.label}` };
    },
  },
  {
    id: "conversion_rate",
    label: "Conversion",
    category: "Verkauf & Marge",
    description: "Angenommene Angebote ÷ alle entschiedenen Angebote (gesamt).",
    interpretation:
      "Vertriebs-Effizienz. Werte unter 20% deuten auf Preis-, Qualifikations- oder Nachfass-Probleme.",
    format: "percent",
    timeMode: "static",
    compute: ({ offers }) => {
      const sent = offers.filter((o) => o.status === "sent" || o.status === "accepted" || o.status === "rejected");
      const accepted = offers.filter((o) => o.status === "accepted").length;
      const value = sent.length ? (accepted / sent.length) * 100 : 0;
      return { value, display: fmt(value, "percent"), sub: `${accepted}/${sent.length}` };
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
        .map((v) => (now - new Date(v.arrivedAt!).getTime()) / 86400000);
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
    compute: ({ processes, range }) => {
      const sold = processes.filter((p) => handoverInRange(p, range.from, range.to));
      const times = sold.map((p) =>
        Math.max(0, (new Date(p.steps.delivery_confirmation!.completedAt!).getTime() - new Date(p.createdAt).getTime()) / 86400000)
      );
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
    compute: ({ processes }) => {
      const active = processes.filter((p) => p.steps.delivery_confirmation?.status !== "completed");
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
    compute: ({ processes }) => {
      const value = processes
        .filter((p) => p.steps.delivery_confirmation?.status !== "completed")
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
    compute: ({ processes, range }) => {
      const sold = processes.filter((p) => handoverInRange(p, range.from, range.to));
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
