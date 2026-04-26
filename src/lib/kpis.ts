// Zentraler KPI-Katalog – eine Quelle der Wahrheit.
// Jeder KPI berechnet sich live aus dem Store-State.

import { Process, Vehicle, Offer, Customer, formatCurrency, vehicleTotalCostsGross } from "@/data/process";

export type KpiCategory = "Umsatz" | "Verkauf & Marge" | "Bestand" | "Kosten" | "Pipeline";

export type KpiFormat = "currency" | "number" | "percent" | "days";

export interface KpiContext {
  vehicles: Vehicle[];
  processes: Process[];
  offers: Offer[];
  customers: Customer[];
}

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
  compute: (ctx: KpiContext) => KpiResult;
}

// ---- Helpers ----
const startOfYear = () => new Date(new Date().getFullYear(), 0, 1);
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const startOfWeek = () => {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const d = new Date(now); d.setDate(now.getDate() - day); d.setHours(0, 0, 0, 0);
  return d;
};

const fmt = (value: number, format: KpiFormat) => {
  switch (format) {
    case "currency": return formatCurrency(value);
    case "percent": return `${value.toFixed(1)}%`;
    case "days": return `${value.toFixed(1)} Tage`;
    default: return Math.round(value).toLocaleString("de-DE");
  }
};

// Verkauf zählt zum Zeitpunkt der Übergabe (delivery_confirmation completed)
const handoverInRange = (p: Process, from: Date, to: Date = new Date()) => {
  const rec = p.steps.delivery_confirmation;
  if (!rec || rec.status !== "completed" || !rec.completedAt) return false;
  const t = new Date(rec.completedAt);
  return t >= from && t <= to;
};

// Rechnung gestellt im Zeitraum
const invoicedInRange = (p: Process, from: Date, to: Date = new Date()) => {
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
    label: "Jahresumsatz",
    category: "Umsatz",
    description: "Summe der Verkäufe (Übergabe) seit Jahresbeginn.",
    interpretation:
      "Hauptindikator für den geschäftlichen Erfolg im laufenden Jahr. Steigt mit jeder vollständig übergebenen Verkaufsabwicklung. Ein Wert deutlich unter dem Vorjahr → Vertrieb / Lead-Zufluss prüfen.",
    format: "currency",
    compute: ({ processes }) => {
      const from = startOfYear();
      const sold = processes.filter((p) => handoverInRange(p, from));
      const value = sold.reduce((s, p) => s + (p.fields.finalPrice ?? 0), 0);
      return { value, display: fmt(value, "currency"), sub: `${sold.length} Übergaben in ${from.getFullYear()}` };
    },
  },
  {
    id: "revenue_month",
    label: "Monatsumsatz",
    category: "Umsatz",
    description: "Summe der Verkäufe im aktuellen Monat.",
    interpretation:
      "Zeigt die kurzfristige Verkaufsdynamik. Vergleichswert zum Vormonat / Monatsziel. Niedriger Wert mid-month bei vollem Bestand → aktive Vermarktung / Preise prüfen.",
    format: "currency",
    compute: ({ processes }) => {
      const from = startOfMonth();
      const sold = processes.filter((p) => handoverInRange(p, from));
      const value = sold.reduce((s, p) => s + (p.fields.finalPrice ?? 0), 0);
      return { value, display: fmt(value, "currency"), sub: `${sold.length} Übergaben` };
    },
  },
  {
    id: "revenue_week",
    label: "Wochenumsatz",
    category: "Umsatz",
    description: "Summe der Verkäufe in der laufenden Woche.",
    interpretation:
      "Sehr kurzfristiger Puls — gut für Tagesgeschäft & Wochen-Standups. Schwankt naturgemäß stark, einzelner Premium-Verkauf kann ihn dominieren.",
    format: "currency",
    compute: ({ processes }) => {
      const from = startOfWeek();
      const sold = processes.filter((p) => handoverInRange(p, from));
      const value = sold.reduce((s, p) => s + (p.fields.finalPrice ?? 0), 0);
      return { value, display: fmt(value, "currency"), sub: `${sold.length} Übergaben` };
    },
  },
  {
    id: "revenue_booked",
    label: "Umsatz (gebucht)",
    category: "Umsatz",
    description: "Anzahlungen + Schlussrechnungen, ohne Doppelzählung.",
    interpretation:
      "Zeigt das bereits buchhalterisch gesicherte Volumen — also Geld, das entweder schon eingegangen ist (Anzahlung) oder über eine Rechnung verbindlich gestellt wurde. Der relevante Wert für Liquiditätsplanung.",
    format: "currency",
    compute: ({ processes }) => {
      const invoiced = processes.filter((p) => p.steps.invoicing?.status === "completed");
      const invoicedRevenue = invoiced.reduce((s, p) => s + (p.fields.finalPrice ?? 0), 0);
      const dpReceived = processes.reduce((s, p) => s + (p.fields.downPayment?.received ? (p.fields.downPayment.amount ?? 0) : 0), 0);
      const dpInInvoiced = invoiced.reduce((s, p) => s + (p.fields.downPayment?.received ? (p.fields.downPayment.amount ?? 0) : 0), 0);
      const value = invoicedRevenue + (dpReceived - dpInInvoiced);
      return { value, display: fmt(value, "currency"), sub: "Anzahlungen + Rechnungen" };
    },
  },
  {
    id: "revenue_invoiced",
    label: "Umsatz (Rechnungen)",
    category: "Umsatz",
    description: "Tatsächlich gestellte Schlussrechnungen.",
    interpretation:
      "Buchhalterischer Bruttoumsatz aus formellen Rechnungen — Basis für USt-Voranmeldung & GuV. Differenz zum „Gebucht"-Wert = noch nicht abgerechnete Anzahlungen.",
    format: "currency",
    compute: ({ processes }) => {
      const invoiced = processes.filter((p) => p.steps.invoicing?.status === "completed");
      const value = invoiced.reduce((s, p) => s + (p.fields.finalPrice ?? 0), 0);
      return { value, display: fmt(value, "currency"), sub: `${invoiced.length} Rechnungen` };
    },
  },
  {
    id: "revenue_invoiced_month",
    label: "Rechnungen (Monat)",
    category: "Umsatz",
    description: "Schlussrechnungen, die im laufenden Monat gestellt wurden.",
    interpretation:
      "Relevanter Wert für die monatliche USt-Voranmeldung. Ein Spike am Monatsende ist normal (Rechnungen werden gebündelt gestellt).",
    format: "currency",
    compute: ({ processes }) => {
      const from = startOfMonth();
      const inv = processes.filter((p) => invoicedInRange(p, from));
      const value = inv.reduce((s, p) => s + (p.fields.finalPrice ?? 0), 0);
      return { value, display: fmt(value, "currency"), sub: `${inv.length} Rechnungen` };
    },
  },
  {
    id: "down_payments_received",
    label: "Anzahlungen erhalten",
    category: "Umsatz",
    description: "Bereits eingegangene Anzahlungen aus laufenden Vorgängen.",
    interpretation:
      "Bereits zugeflossene Liquidität, die vertraglich an einen noch laufenden Vorgang gebunden ist. Hoch = viele aktive, finanziell abgesicherte Verkäufe.",
    format: "currency",
    compute: ({ processes }) => {
      const value = processes.reduce((s, p) => s + (p.fields.downPayment?.received ? (p.fields.downPayment.amount ?? 0) : 0), 0);
      return { value, display: fmt(value, "currency"), sub: "Cashflow im Prozess" };
    },
  },
  {
    id: "down_payments_open",
    label: "Anzahlungen offen",
    category: "Umsatz",
    description: "Vereinbarte, aber noch nicht eingegangene Anzahlungen.",
    interpretation:
      "Risiko-Wert: Geld, mit dem gerechnet wird, das aber noch nicht da ist. Hoher Wert → aktiv beim Kunden nachfassen, sonst stockt der Vorgang.",
    format: "currency",
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
    description: "Rechnung gestellt, Übergabe noch ausstehend (abzüglich Anzahlung).",
    interpretation:
      "Klassisches Debitorenrisiko: Rechnung raus, Geld noch nicht voll da, Fahrzeug noch im Hof. Sollte zeitnah Richtung Null gehen — sonst Mahnwesen aktivieren.",
    format: "currency",
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
    label: "Jahresgewinn",
    category: "Verkauf & Marge",
    description: "Gewinn der Übergaben seit Jahresbeginn (VK − EK − Kosten).",
    interpretation:
      "Echte Wertschöpfung des Jahres — wichtiger als der Bruttoumsatz. Sinkt bei Preisnachlässen oder hohen Aufbereitungskosten. Ziel: kontinuierlich steigender Trend.",
    format: "currency",
    compute: ({ processes, vehicles }) => {
      const sold = processes.filter((p) => handoverInRange(p, startOfYear()));
      const value = sold.reduce((s, p) => s + profitOf(p, vehicles), 0);
      return { value, display: fmt(value, "currency"), sub: `${sold.length} Übergaben` };
    },
  },
  {
    id: "profit_month",
    label: "Monatsgewinn",
    category: "Verkauf & Marge",
    description: "Gewinn der Übergaben im laufenden Monat.",
    interpretation:
      "Operativer Erfolg des Monats. Vergleich mit Monatsumsatz zeigt die Margenqualität — niedriger Gewinn bei hohem Umsatz = zu viel Rabatt oder zu hohe Kosten.",
    format: "currency",
    compute: ({ processes, vehicles }) => {
      const sold = processes.filter((p) => handoverInRange(p, startOfMonth()));
      const value = sold.reduce((s, p) => s + profitOf(p, vehicles), 0);
      return { value, display: fmt(value, "currency"), sub: `${sold.length} Übergaben` };
    },
  },
  {
    id: "profit_total",
    label: "Gewinn gesamt",
    category: "Verkauf & Marge",
    description: "Gewinn aller je übergebenen Fahrzeuge.",
    interpretation:
      "Lebenslange kumulierte Wertschöpfung. Der Ø-Wert pro Verkauf ist die wichtigere Steuerungsgröße — er zeigt, wie profitabel ein „typischer" Deal ist.",
    format: "currency",
    compute: ({ processes, vehicles }) => {
      const sold = processes.filter((p) => p.steps.delivery_confirmation?.status === "completed");
      const value = sold.reduce((s, p) => s + profitOf(p, vehicles), 0);
      const avg = sold.length ? value / sold.length : 0;
      return { value, display: fmt(value, "currency"), sub: `Ø ${formatCurrency(avg)} / Verkauf` };
    },
  },
  {
    id: "margin_avg",
    label: "Ø Marge",
    category: "Verkauf & Marge",
    description: "Durchschnittliche Bruttomarge der Verkäufe.",
    interpretation:
      "Effizienz-Indikator: Wieviel Prozent des Verkaufspreises bleiben als Roh-Gewinn? Branchenwert im Gebrauchtwagenhandel ~10–15%. Sinkt sie, sind Einkauf oder Standzeitkosten zu hoch.",
    format: "percent",
    compute: ({ processes, vehicles }) => {
      const sold = processes.filter((p) => p.steps.delivery_confirmation?.status === "completed");
      const value = sold.length
        ? sold.reduce((acc, p) => {
            const v = vehicles.find((x) => x.id === p.vehicleId);
            if (!v) return acc;
            const ek = v.purchasePrice + vehicleTotalCostsGross(v);
            const sale = p.fields.finalPrice ?? 0;
            return acc + (sale > 0 ? ((sale - ek) / sale) * 100 : 0);
          }, 0) / sold.length
        : 0;
      return { value, display: fmt(value, "percent"), sub: `${sold.length} Verkäufe` };
    },
  },
  {
    id: "conversion_rate",
    label: "Conversion",
    category: "Verkauf & Marge",
    description: "Angenommene Angebote ÷ alle versendeten Angebote.",
    interpretation:
      "Effizienz des Vertriebs: Wie viele Angebote werden zu echten Aufträgen? Werte unter 20% deuten auf Preis-, Qualifikations- oder Nachfass-Probleme hin.",
    format: "percent",
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
    description: "Listenpreise aller Fahrzeuge im Bestand inkl. reservierter.",
    interpretation:
      "Gebundenes Vermögen auf dem Hof. Hoher Wert = viel Kapital gebunden → braucht Verkaufsdynamik. Vergleich mit EK zeigt das Margenpotenzial.",
    format: "currency",
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
    description: "Anzahl Fahrzeuge im Bestand inkl. reservierter.",
    interpretation:
      "Operative Größe des Hofs. Zu viele Fahrzeuge = Kapitalbindung + Standzeitrisiko, zu wenige = drohende Umsatzlücken. Reservierungs-Anteil zeigt aktive Nachfrage.",
    format: "number",
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
    description: "Durchschnittliche Tage im Hof (nur Bestand).",
    interpretation:
      "Wichtigster Frühindikator für Liquiditätsprobleme. Faustregel: > 90 Tage = Preis prüfen, > 120 Tage = aktive Maßnahmen (Vermarktung, Rabatt).",
    format: "days",
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
    description: "Tage von Vorgang-Anlage bis Übergabe.",
    interpretation:
      "Effizienz der Verkaufsabwicklung selbst. Lange Durchlaufzeit trotz Anzahlung = interne Engpässe (Aufbereitung, Papiere, Termin­findung).",
    format: "days",
    compute: ({ processes }) => {
      const sold = processes.filter((p) => p.steps.delivery_confirmation?.completedAt);
      const times = sold.map((p) => Math.max(0, (new Date(p.steps.delivery_confirmation!.completedAt!).getTime() - new Date(p.createdAt).getTime()) / 86400000));
      const value = times.length ? times.reduce((s, n) => s + n, 0) / times.length : 0;
      return { value, display: fmt(value, "days"), sub: "Vorgang → Übergabe" };
    },
  },

  // -------- Kosten --------
  {
    id: "costs_total",
    label: "Kosten gesamt",
    category: "Kosten",
    description: "Brutto-Kosten aller Fahrzeuge (Werkstatt, Aufbereitung, …).",
    interpretation:
      "Summe aller fahrzeugbezogenen Aufwände. Verglichen mit dem Gewinn zeigt sie, wie kostenintensiv das aktuelle Portfolio ist.",
    format: "currency",
    compute: ({ vehicles }) => {
      const value = vehicles.reduce((s, v) => s + vehicleTotalCostsGross(v), 0);
      return { value, display: fmt(value, "currency"), sub: `${vehicles.length} Fahrzeuge` };
    },
  },
  {
    id: "costs_stock",
    label: "Kosten am Bestand",
    category: "Kosten",
    description: "Brutto-Kosten der aktiv im Bestand stehenden Fahrzeuge.",
    interpretation:
      "Bereits investiertes Geld in Fahrzeuge, die noch nicht verkauft sind — also „gebundenes Aufbereitungskapital". Senkt direkt die Marge bei Verkauf.",
    format: "currency",
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
    description: "Durchschnittliche Brutto-Kosten je Fahrzeug.",
    interpretation:
      "Steuerungsgröße für den Einkauf: Wie viel muss ein „typisches" Fahrzeug zusätzlich verkraften, bevor es marktfähig ist? Hoch → Einkaufsqualität verbessern.",
    format: "currency",
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
    description: "Vorgänge ohne abgeschlossene Übergabe.",
    interpretation:
      "Operative Arbeitslast. Hoher Wert in „in Kontrolle" = Übergaben stehen kurz bevor (gut für Cashflow). Hoher Wert in frühen Phasen = volle Pipeline für die nächsten Wochen.",
    format: "number",
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
    description: "Versendete, noch nicht entschiedene Angebote.",
    interpretation:
      "Vertriebsmotor — alle Angebote, die noch konvertiert werden können. Niedrig → mehr Leads / Angebote rausschicken. Hoch & alt → konsequent nachfassen.",
    format: "number",
    compute: ({ offers }) => {
      const open = offers.filter((o) => o.status === "sent");
      return { value: open.length, display: fmt(open.length, "number"), sub: `${offers.length} Angebote gesamt` };
    },
  },
  {
    id: "pipeline_value",
    label: "Pipeline-Wert",
    category: "Pipeline",
    description: "Summe finalPrice aller laufenden Vorgänge.",
    interpretation:
      "Erwarteter Umsatz aus aktuell laufenden Verkäufen — also die nächsten Wochen Umsatz, sofern alle Vorgänge wie geplant durchlaufen. Die Forecast-Zahl.",
    format: "currency",
    compute: ({ processes }) => {
      const value = processes
        .filter((p) => p.steps.delivery_confirmation?.status !== "completed")
        .reduce((s, p) => s + (p.fields.finalPrice ?? 0), 0);
      return { value, display: fmt(value, "currency"), sub: "In Arbeit" };
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
  "revenue_month",
  "profit_year",
  "profit_month",
  "stock_value",
  "stock_count",
];
