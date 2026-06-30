// Konfigurierbarer Import/Export für den Fahrzeugbestand (CSV + Excel).
// Felder werden über eine Registry definiert. UI kann Reihenfolge und
// Auswahl der Spalten frei festlegen, sowohl beim Export als auch beim
// Mapping beim Import.
import ExcelJS from "exceljs";

// CSV helpers
const escapeCsvCell = (val: unknown): string => {
  if (val === undefined || val === null) return "";
  const s = String(val);
  if (s.includes(";") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const rowsToCsv = (headers: string[], rows: Record<string, unknown>[]): string => {
  const lines = [headers.map(escapeCsvCell).join(";")];
  for (const r of rows) lines.push(headers.map((h) => escapeCsvCell(r[h])).join(";"));
  return lines.join("\r\n");
};

const parseCsv = (text: string): Record<string, string>[] => {
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = "";
  let inQuotes = false;
  const delim = text.includes(";") ? ";" : ",";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === delim) { cur.push(cell); cell = ""; }
      else if (ch === "\n") { cur.push(cell); rows.push(cur); cur = []; cell = ""; }
      else if (ch === "\r") { /* skip */ }
      else cell += ch;
    }
  }
  if (cell.length > 0 || cur.length > 0) { cur.push(cell); rows.push(cur); }
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((c) => c !== "")).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = r[idx] ?? ""; });
    return obj;
  });
};

const writeXlsxBuffer = async (
  sheetName: string,
  headers: string[],
  rows: Record<string, unknown>[],
): Promise<ArrayBuffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.addRow(headers);
  for (const r of rows) ws.addRow(headers.map((h) => r[h] ?? ""));
  return await wb.xlsx.writeBuffer();
};

const GENERIC_SUBHEADERS = new Set(["datum", "preis", "€", "%", "betrag", "summe", "wert"]);

const cellToString = (v: unknown): string => {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("text" in o) return String(o.text ?? "");
    if ("result" in o) return String(o.result ?? "");
    return String(v);
  }
  return String(v);
};

const readXlsxRows = async (buf: ArrayBuffer): Promise<Record<string, string>[]> => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const row1 = ws.getRow(1);
  const row2 = ws.getRow(2);
  const colCount = ws.columnCount;
  const r1: string[] = [];
  const r2: string[] = [];
  for (let c = 1; c <= colCount; c++) {
    r1.push(cellToString(row1.getCell(c).value).trim());
    r2.push(cellToString(row2.getCell(c).value).trim());
  }
  const r1Filled = r1.filter(Boolean).length;
  const r2Filled = r2.filter(Boolean).length;
  // Heuristik: Zweizeiliger Header, wenn Zeile 2 erkennbar mehr Spalten füllt
  // als Zeile 1 (Zeile 1 = nur Gruppen-Labels wie EK / VK / Marge).
  const twoRowHeader = r2Filled > r1Filled && r2Filled >= colCount / 2;

  const headers: string[] = [];
  if (twoRowHeader) {
    // Gruppen-Label aus Zeile 1 nach rechts „forwarden“, bis nächstes Label kommt.
    let currentGroup = "";
    for (let c = 0; c < colCount; c++) {
      if (r1[c]) currentGroup = r1[c];
      const sub = r2[c];
      if (!sub) { headers[c] = ""; continue; }
      // Generische Sub-Header mit Gruppe prefixen (z.B. EK Datum, VK Preis).
      const isGeneric = GENERIC_SUBHEADERS.has(sub.toLowerCase());
      headers[c] = isGeneric && currentGroup ? `${currentGroup} ${sub}` : sub;
    }
  } else {
    for (let c = 0; c < colCount; c++) headers[c] = r1[c];
  }
  // Duplikate eindeutig machen
  const seen = new Map<string, number>();
  headers.forEach((h, i) => {
    if (!h) return;
    const n = seen.get(h) ?? 0;
    if (n > 0) headers[i] = `${h} (${n + 1})`;
    seen.set(h, n + 1);
  });

  const firstData = twoRowHeader ? 3 : 2;
  const out: Record<string, string>[] = [];
  for (let r = firstData; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const obj: Record<string, string> = {};
    let any = false;
    headers.forEach((h, i) => {
      if (!h) return;
      const s = cellToString(row.getCell(i + 1).value);
      obj[h] = s;
      if (s !== "") any = true;
    });
    if (any) out.push(obj);
  }
  return out;
};
import {
  Vehicle,
  VehicleType,
  VEHICLE_TYPE_LABELS,
  FuelType,
  Transmission,
  VehicleStatus,
  vehicleTotalCostsGross,
  Process,
} from "@/data/process";
import { VehicleIntakePayload } from "@/components/fleet/VehicleIntakeDialog";

// ============================================================
// Export-Kontext: erlaubt z.B. Umsatz aus dem Vorgang zu ziehen.
// ============================================================
export interface ExportContext {
  processes?: Process[];
}

/**
 * Umsatz wird nur als realisiert behandelt, wenn:
 * - eine Rechnung erstellt wurde (invoiceNumber + invoiceDate)
 * - die Rechnung als bezahlt markiert ist (paid)
 * - der Rechnungsstellungs-Schritt gebucht/abgeschlossen ist (completed)
 */
const realizedRevenue = (v: Vehicle, ctx?: ExportContext): number | undefined => {
  if (!ctx?.processes) return undefined;
  const proc = ctx.processes.find((p) => p.vehicleId === v.id);
  if (!proc) return undefined;
  const inv = proc.fields.invoicing;
  const stepDone = proc.steps?.invoicing?.status === "completed";
  if (!inv?.invoiceNumber || !inv.invoiceDate || !inv.paid || !stepDone) return undefined;
  return proc.fields.finalPrice ?? undefined;
};

// ============================================================
// Feld-Registry
// ============================================================

export interface FieldDef {
  /** Interner stabiler Schlüssel. */
  key: string;
  /** Sichtbarer Spalten-Header (in Export-Dateien & UI). */
  header: string;
  /** Kategorie für die UI-Gruppierung. */
  group: "ident" | "tech" | "innen" | "preis" | "status" | "datum" | "kosten";
  /** Standard-Aktivierung beim Export. */
  defaultEnabled: boolean;
  /** Wert aus Vehicle für Export ableiten. */
  get: (v: Vehicle, ctx?: ExportContext) => string | number | undefined;
  /** Wert beim Import in das Payload schreiben (optional → Spalte nur Export). */
  set?: (acc: ImportAccumulator, raw: unknown) => void;
  /** Zusätzliche akzeptierte Header-Schreibweisen beim Import. */
  aliases?: string[];
}

// Container, in den der Import die Felder schreibt. Wird am Ende in
// VehicleIntakePayload überführt.
interface ImportAccumulator {
  vin?: string;
  make?: string;
  model?: string;
  type?: VehicleType;
  year?: number;
  color?: string;
  mileage?: number;
  fuel?: FuelType;
  transmission?: Transmission;
  power_hp?: number;
  firstRegistration?: string;
  hu?: string;
  hsn?: string;
  tsn?: string;
  purchasePrice?: number;
  listPrice?: number;
  vatReportable?: boolean;
  locationName?: string;
  status?: VehicleStatus;
  sold?: boolean;
  listed?: boolean;
  arrivedAt?: string;     // Kaufdatum
  listedAt?: string;
  soldAt?: string;
  notes?: string;
}

const num = (raw: unknown): number => {
  if (raw == null || raw === "") return 0;
  if (typeof raw === "number") return raw;
  const s = String(raw).replace(/[€\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const parseBool = (raw: unknown): boolean => {
  if (typeof raw === "boolean") return raw;
  const s = String(raw ?? "").trim().toLowerCase();
  return ["wahr", "true", "ja", "y", "x", "1"].includes(s);
};

const parseDate = (raw: unknown): string | undefined => {
  if (!raw) return undefined;
  // Excel serial number?
  if (typeof raw === "number" && raw > 25000 && raw < 80000) {
    // Excel serial date: days since 1899-12-30 (UTC)
    const ms = Math.round(raw * 86400000);
    return new Date(Date.UTC(1899, 11, 30) + ms).toISOString();
  }
  const s = String(raw).trim();
  if (!s) return undefined;
  // dd.mm.yyyy
  const de = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (de) {
    const [, d, m, y] = de;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    const iso = new Date(Date.UTC(year, Number(m) - 1, Number(d)));
    if (iso.getUTCFullYear() === year && iso.getUTCMonth() === Number(m) - 1 && iso.getUTCDate() === Number(d)) {
      return iso.toISOString();
    }
  }
  // ISO / yyyy-mm-dd
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();
  return undefined;
};

const TYPE_LOOKUP: Record<string, VehicleType> = Object.entries(VEHICLE_TYPE_LABELS).reduce(
  (acc, [k, v]) => ({ ...acc, [v.toLowerCase()]: k as VehicleType, [k.toLowerCase()]: k as VehicleType }),
  {} as Record<string, VehicleType>,
);
const FUEL_VALUES: FuelType[] = ["Benzin", "Diesel", "Hybrid", "Elektro", "Plug-in-Hybrid", "Gas"];
const TRANS_VALUES: Transmission[] = ["Schaltgetriebe", "Automatik", "DKG", "CVT"];

export const FIELD_DEFS: FieldDef[] = [
  // --- Identifikation ---
  { key: "vin", header: "VIN", group: "ident", defaultEnabled: true,
    get: (v) => v.vin,
    set: (a, raw) => { a.vin = String(raw ?? "").trim().toUpperCase(); },
    aliases: ["fin", "fahrgestellnummer"] },
  { key: "make", header: "Marke", group: "ident", defaultEnabled: true,
    get: (v) => v.make,
    set: (a, raw) => { a.make = String(raw ?? "").trim(); },
    aliases: ["hersteller", "brand"] },
  { key: "model", header: "Modell", group: "ident", defaultEnabled: true,
    get: (v) => v.model,
    set: (a, raw) => { a.model = String(raw ?? "").trim(); },
    aliases: ["modell-bezeichnung"] },
  { key: "type", header: "Fahrzeugtyp", group: "ident", defaultEnabled: true,
    get: (v) => VEHICLE_TYPE_LABELS[v.type],
    set: (a, raw) => {
      const k = String(raw ?? "").trim().toLowerCase();
      a.type = TYPE_LOOKUP[k] ?? "limousine";
    },
    aliases: ["typ", "fahrzeug-typ"] },
  { key: "year", header: "Baujahr", group: "ident", defaultEnabled: true,
    get: (v) => v.year,
    set: (a, raw) => { a.year = num(raw) || undefined; },
    aliases: ["jahr"] },
  { key: "color", header: "Farbe", group: "innen", defaultEnabled: true,
    get: (v) => v.color, set: (a, raw) => { a.color = String(raw ?? "").trim(); } },
  { key: "mileage", header: "Kilometer", group: "tech", defaultEnabled: true,
    get: (v) => v.mileage, set: (a, raw) => { a.mileage = num(raw); },
    aliases: ["km", "laufleistung", "km-stand", "kmstand", "km stand"] },
  { key: "fuel", header: "Kraftstoff", group: "tech", defaultEnabled: true,
    get: (v) => v.fuel,
    set: (a, raw) => {
      const s = String(raw ?? "").trim().toLowerCase();
      a.fuel = FUEL_VALUES.find((f) => f.toLowerCase() === s) ?? "Benzin";
    },
    aliases: ["kraftstoffart", "treibstoff"] },
  { key: "transmission", header: "Getriebe", group: "tech", defaultEnabled: true,
    get: (v) => v.transmission,
    set: (a, raw) => {
      const s = String(raw ?? "").trim().toLowerCase();
      if (["schalter", "manuell", "manual"].includes(s)) { a.transmission = "Schaltgetriebe"; return; }
      if (["automat", "auto"].includes(s)) { a.transmission = "Automatik"; return; }
      a.transmission = TRANS_VALUES.find((t) => t.toLowerCase() === s) ?? "Automatik";
    } },
  { key: "power_hp", header: "Leistung (PS)", group: "tech", defaultEnabled: true,
    get: (v) => v.power_hp, set: (a, raw) => { a.power_hp = num(raw); },
    aliases: ["ps", "leistung"] },
  { key: "firstRegistration", header: "Erstzulassung", group: "datum", defaultEnabled: true,
    get: (v) => v.firstRegistration ?? "",
    set: (a, raw) => {
      const s = String(raw ?? "").trim();
      // Nur Jahr (z.B. "2010") → 01.01.2010
      if (/^\d{4}$/.test(s)) a.firstRegistration = `${s}-01-01`;
      else a.firstRegistration = parseDate(s)?.slice(0, 10);
      // Baujahr aus EZ ableiten, falls separat fehlend
      const y = s.match(/(\d{4})/);
      if (y && !a.year) a.year = Number(y[1]);
    },
    aliases: ["ez", "erstzulassung-datum"] },
  { key: "hu", header: "HU/TÜV gültig bis", group: "datum", defaultEnabled: true,
    get: (v) => v.hu ?? "", set: (a, raw) => { a.hu = String(raw ?? "").trim() || undefined; },
    aliases: ["hu", "tüv", "tuv"] },
  { key: "hsn", header: "HSN", group: "tech", defaultEnabled: false,
    get: (v) => v.hsn ?? "", set: (a, raw) => { a.hsn = String(raw ?? "").trim() || undefined; } },
  { key: "tsn", header: "TSN", group: "tech", defaultEnabled: false,
    get: (v) => v.tsn ?? "", set: (a, raw) => { a.tsn = String(raw ?? "").trim() || undefined; } },

  // --- Preis ---
  { key: "purchasePrice", header: "Einkaufspreis (EUR)", group: "preis", defaultEnabled: true,
    get: (v) => v.purchasePrice, set: (a, raw) => { a.purchasePrice = num(raw); },
    aliases: ["ek", "einkauf", "ek preis", "einkaufspreis"] },
  { key: "listPrice", header: "Listenpreis (EUR)", group: "preis", defaultEnabled: true,
    get: (v) => v.listPrice, set: (a, raw) => { a.listPrice = num(raw); },
    aliases: ["vk", "listenpreis", "vk preis"] },
  { key: "vatReportable", header: "Besteuerung", group: "preis", defaultEnabled: true,
    get: (v) => (v.vatReportable ? "Regelbesteuerung" : "Differenzbesteuerung"),
    set: (a, raw) => {
      const s = String(raw ?? "").toLowerCase();
      a.vatReportable = s.startsWith("regel") || s.includes("19") || s === "true" || s === "ja";
    } },
  { key: "totalCosts", header: "Kosten gesamt brutto (EUR)", group: "kosten", defaultEnabled: false,
    get: (v) => vehicleTotalCostsGross(v) /* read-only Export */ },
  { key: "salesRevenue", header: "Verkauft für (EUR)", group: "preis", defaultEnabled: true,
    get: (v, ctx) => realizedRevenue(v, ctx) ?? "" /* nur gebuchter & bezahlter Umsatz */ },

  // --- Standort ---
  { key: "location", header: "Stellplatz", group: "status", defaultEnabled: true,
    get: (v) => v.location.name,
    set: (a, raw) => { a.locationName = String(raw ?? "").trim() || undefined; },
    aliases: ["standort", "platz"] },

  // --- Status / Verkauft ---
  { key: "sold", header: "Verkauft", group: "status", defaultEnabled: true,
    get: (v) => (v.status === "sold" ? "WAHR" : "FALSCH"),
    set: (a, raw) => { a.sold = parseBool(raw); },
    aliases: ["sold", "verkauf"] },
  { key: "status", header: "Status", group: "status", defaultEnabled: false,
    get: (v) => v.status,
    set: (a, raw) => {
      const s = String(raw ?? "").trim().toLowerCase();
      if (["sold", "verkauft"].includes(s)) a.status = "sold";
      else if (["reserved", "reserviert"].includes(s)) a.status = "reserved";
      else if (["planned", "geplant"].includes(s)) a.status = "planned";
      else if (["in_stock", "bestand", "im bestand", "verfügbar", "verfuegbar", "auf lager"].includes(s)) a.status = "in_stock";
    } },
  { key: "listed", header: "Inseriert", group: "status", defaultEnabled: true,
    get: (v) => (v.listed?.active ? "WAHR" : "FALSCH"),
    set: (a, raw) => {
      a.listed = parseBool(raw);
    } },

  // --- Daten (Datumsfelder) ---
  { key: "purchaseDate", header: "Kaufdatum", group: "datum", defaultEnabled: true,
    get: (v) => (v.arrivedAt ? v.arrivedAt.slice(0, 10) : ""),
    set: (a, raw) => { a.arrivedAt = parseDate(raw); },
    aliases: ["zugang", "zugang am", "einkaufsdatum", "ankauf", "ankaufsdatum", "ek datum"] },
  { key: "listedAt", header: "Inseratsdatum", group: "datum", defaultEnabled: true,
    get: (v) => (v.listed?.listedAt ? v.listed.listedAt.slice(0, 10) : ""),
    set: (a, raw) => { a.listedAt = parseDate(raw); },
    aliases: ["inseriert seit", "inseratdatum", "online seit"] },
  { key: "soldAt", header: "Verkaufsdatum", group: "datum", defaultEnabled: true,
    get: (v) => (v.soldAt ? v.soldAt.slice(0, 10) : ""),
    set: (a, raw) => { a.soldAt = parseDate(raw); },
    aliases: ["verkauft am", "verkaufdatum"] },

  // --- Notizen ---
  { key: "notes", header: "Notizen", group: "innen", defaultEnabled: false,
    get: (v) => v.notes ?? "", set: (a, raw) => { a.notes = String(raw ?? "").trim() || undefined; } },
];

export const FIELD_GROUP_LABELS: Record<FieldDef["group"], string> = {
  ident: "Identifikation",
  tech: "Technik",
  innen: "Innen / Außen",
  preis: "Preise & Besteuerung",
  status: "Status & Standort",
  datum: "Daten / Termine",
  kosten: "Kosten",
};

export const DEFAULT_EXPORT_KEYS = FIELD_DEFS.filter((f) => f.defaultEnabled).map((f) => f.key);

export const getFieldByKey = (key: string): FieldDef | undefined =>
  FIELD_DEFS.find((f) => f.key === key);

// ============================================================
// Export
// ============================================================

export const exportVehicles = async (
  vehicles: Vehicle[],
  format: "csv" | "xlsx",
  columnKeys: string[] = DEFAULT_EXPORT_KEYS,
  filenameBase = "bestand",
  ctx: ExportContext = {},
) => {
  const cols = columnKeys.map(getFieldByKey).filter((f): f is FieldDef => !!f);
  const headers = cols.map((c) => c.header);
  const rows = vehicles.map((v) => {
    const row: Record<string, unknown> = {};
    cols.forEach((c) => (row[c.header] = c.get(v, ctx)));
    return row;
  });
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const csv = rowsToCsv(headers, rows);
    downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `${filenameBase}_${stamp}.csv`);
  } else {
    const buf = await writeXlsxBuffer("Bestand", headers, rows);
    downloadBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${filenameBase}_${stamp}.xlsx`);
  }
};

/** Vorlage anhand der ausgewählten Spalten — mit 1 Beispielzeile. */
export const downloadTemplate = async (
  format: "csv" | "xlsx",
  columnKeys: string[] = DEFAULT_EXPORT_KEYS,
) => {
  const cols = columnKeys.map(getFieldByKey).filter((f): f is FieldDef => !!f);
  const headers = cols.map((c) => c.header);
  const example: Record<string, string | number> = {};
  cols.forEach((c) => (example[c.header] = ""));

  const sample: Record<string, string | number> = {
    "VIN": "WBA8E9G50GNT12345",
    "Marke": "BMW",
    "Modell": "X3 xDrive30d",
    "Fahrzeugtyp": "SUV",
    "Baujahr": 2022,
    "Kilometer": 45000,
    "Kraftstoff": "Diesel",
    "Getriebe": "Automatik",
    "Leistung (PS)": 286,
    "Einkaufspreis (EUR)": 35000,
    "Listenpreis (EUR)": 42000,
    "Besteuerung": "Differenzbesteuerung",
    "Stellplatz": "Hof A · Platz 01",
    "Kaufdatum": "2025-01-15",
    "Inseratsdatum": "2025-01-20",
    "Verkauft": "FALSCH",
    "Inseriert": "WAHR",
    "Verkaufsdatum": "",
    "Verkauft für (EUR)": "",
    "Kosten gesamt brutto (EUR)": "",
  };
  cols.forEach((c) => { if (sample[c.header] !== undefined) example[c.header] = sample[c.header]; });

  if (format === "csv") {
    const csv = rowsToCsv(headers, [example]);
    downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), "bestand_vorlage.csv");
  } else {
    const buf = await writeXlsxBuffer("Vorlage", headers, [example]);
    downloadBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "bestand_vorlage.xlsx");
  }
};

// ============================================================
// Import
// ============================================================

export interface ImportRow {
  rowNumber: number;
  payload?: VehicleIntakePayload;
  errors: string[];
}

export interface ImportResult {
  rows: ImportRow[];
  validCount: number;
  errorCount: number;
}

/** Liest nur die Header-Zeile aus und liefert die roh enthaltenen Zeilen zurück. */
export interface ParsedFile {
  headers: string[];
  rawRows: Record<string, unknown>[];
}

export const readFile = async (file: File): Promise<ParsedFile> => {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = await file.text();
    const rawRows = parseCsv(text);
    const headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
    return { headers, rawRows };
  }
  const buf = await file.arrayBuffer();
  const rawRows = await readXlsxRows(buf);
  const headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
  return { headers, rawRows };
};

/**
 * Schlägt automatisch eine Zuordnung "Datei-Header → Feld-Key" vor.
 * Unbekannte Spalten werden auf `null` gesetzt (= ignorieren).
 */
export const detectMapping = (headers: string[]): Record<string, string | null> => {
  const aliasMap = new Map<string, string>();
  FIELD_DEFS.forEach((f) => {
    aliasMap.set(f.header.toLowerCase(), f.key);
    aliasMap.set(f.key.toLowerCase(), f.key);
    f.aliases?.forEach((a) => aliasMap.set(a.toLowerCase(), f.key));
  });
  const mapping: Record<string, string | null> = {};
  headers.forEach((h) => {
    const norm = String(h).trim().toLowerCase();
    mapping[h] = aliasMap.get(norm) ?? null;
  });
  return mapping;
};

/** Parsen mit gegebener Mapping-Konfiguration. */
export const buildImportResult = (
  parsed: ParsedFile,
  mapping: Record<string, string | null>,
  defaultLocation: string,
): ImportResult => {
  const rows = parsed.rawRows.map((raw, i) => parseRow(raw, i + 2, mapping, defaultLocation));
  return {
    rows,
    validCount: rows.filter((r) => r.payload).length,
    errorCount: rows.filter((r) => r.errors.length > 0).length,
  };
};

const parseRow = (
  raw: Record<string, unknown>,
  rowNumber: number,
  mapping: Record<string, string | null>,
  defaultLocation: string,
): ImportRow => {
  const acc: ImportAccumulator = {};
  let legacyNumber: string | undefined;
  Object.entries(raw).forEach(([sourceHeader, value]) => {
    // Verkaufsdatum-Spalten überspringen (laut Anwender ignorieren)
    if (/verkaufsdatum/i.test(sourceHeader)) return;
    // Fahrzeugnr. als Platzhalter für fehlende VIN merken
    if (/^fahrzeug(nr|nummer)\.?$/i.test(sourceHeader.trim())) {
      if (value != null && value !== "") legacyNumber = String(value).trim();
      return;
    }
    const fieldKey = mapping[sourceHeader];
    if (!fieldKey) return;
    const def = getFieldByKey(fieldKey);
    if (!def?.set) return;
    if (value === "" || value == null) return;
    def.set(acc, value);
  });

  // Make/Model trimmen + Kapitalisierung normalisieren (z.B. "Vw ", "Bmw ")
  const titleCase = (s: string) =>
    s.trim().split(/\s+/).map((w) => {
      const u = w.toUpperCase();
      if (["BMW","VW","DS","KTM","MG","SEAT"].includes(u)) return u;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(" ");
  if (acc.make) acc.make = titleCase(acc.make);

  // VIN-Platzhalter, wenn keine echte VIN vorhanden ist
  if (!acc.vin || acc.vin.length < 11) {
    const ref = legacyNumber || String(rowNumber);
    acc.vin = `LEGACY-${ref.padStart(6, "0")}`;
  }

  const errors: string[] = [];
  if (!acc.make) errors.push("Marke fehlt");
  if (!acc.model) errors.push("Modell fehlt");
  if (errors.length > 0) return { rowNumber, errors };

  // Status ableiten: explizites Status-Feld > "Verkauft"-Flag > default in_stock.
  let status: VehicleStatus = acc.status ?? "in_stock";
  if (!acc.status && acc.sold === true) status = "sold";

  const hp = acc.power_hp ?? 0;
  const arrivedAt = acc.arrivedAt ?? new Date().toISOString();
  const listedFlag = acc.listed ?? !!acc.listedAt;

  const payload: VehicleIntakePayload = {
    vin: acc.vin!,
    type: acc.type ?? "limousine",
    make: acc.make!,
    model: acc.model!,
    year: acc.year ?? new Date().getFullYear(),
    color: acc.color ?? "",
    mileage: acc.mileage ?? 0,
    fuel: acc.fuel ?? "Benzin",
    transmission: acc.transmission ?? "Automatik",
    power_hp: hp,
    power_kw: Math.round(hp * 0.7355),
    firstRegistration: acc.firstRegistration ?? "",
    hu: acc.hu,
    hsn: acc.hsn,
    tsn: acc.tsn,
    listPrice: acc.listPrice ?? 0,
    purchasePrice: acc.purchasePrice ?? 0,
    vatReportable: acc.vatReportable ?? false,
    arrivedAt,
    location: {
      name: acc.locationName || defaultLocation,
      kind: "lot",
      since: arrivedAt,
    },
    status,
    soldAt: status === "sold" ? acc.soldAt : undefined,
    listed: listedFlag ? { active: true, listedAt: acc.listedAt } : undefined,
    notes: acc.notes,
  };
  return { rowNumber, payload, errors: [] };
};

/** Bequem-Wrapper: Datei lesen + Auto-Mapping anwenden. */
export const parseImportFile = async (file: File, defaultLocation: string): Promise<ImportResult & { parsed: ParsedFile; mapping: Record<string, string | null> }> => {
  const parsed = await readFile(file);
  const mapping = detectMapping(parsed.headers);
  const result = buildImportResult(parsed, mapping, defaultLocation);
  return { ...result, parsed, mapping };
};

// ============================================================
// Util
// ============================================================

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
