// Import/Export für den Fahrzeugbestand (CSV + Excel).
import * as XLSX from "xlsx";
import {
  Vehicle,
  VehicleType,
  VEHICLE_TYPE_LABELS,
  FuelType,
  Transmission,
  vehicleTotalCostsGross,
} from "@/data/process";
import { VehicleIntakePayload } from "@/components/fleet/VehicleIntakeDialog";

// ---------- Spalten-Definition ----------
// Reihenfolge = Spaltenreihenfolge im Export.
// `key` = interner Feldname für den Import.
const COLUMNS: { key: string; header: string; get: (v: Vehicle) => string | number | undefined }[] = [
  { key: "vin",            header: "VIN",                       get: (v) => v.vin },
  { key: "make",           header: "Marke",                     get: (v) => v.make },
  { key: "model",          header: "Modell",                    get: (v) => v.model },
  { key: "type",           header: "Fahrzeugtyp",               get: (v) => VEHICLE_TYPE_LABELS[v.type] },
  { key: "year",           header: "Baujahr",                   get: (v) => v.year },
  { key: "color",          header: "Farbe",                     get: (v) => v.color },
  { key: "mileage",        header: "Kilometer",                 get: (v) => v.mileage },
  { key: "fuel",           header: "Kraftstoff",                get: (v) => v.fuel },
  { key: "transmission",   header: "Getriebe",                  get: (v) => v.transmission },
  { key: "power_hp",       header: "Leistung (PS)",             get: (v) => v.power_hp },
  { key: "firstRegistration", header: "Erstzulassung",          get: (v) => v.firstRegistration ?? "" },
  { key: "hu",             header: "HU/TÜV gültig bis",         get: (v) => v.hu ?? "" },
  { key: "hsn",            header: "HSN",                       get: (v) => v.hsn ?? "" },
  { key: "tsn",            header: "TSN",                       get: (v) => v.tsn ?? "" },
  { key: "purchasePrice",  header: "Einkaufspreis (EUR)",       get: (v) => v.purchasePrice },
  { key: "listPrice",      header: "Listenpreis (EUR)",         get: (v) => v.listPrice },
  { key: "vatReportable",  header: "Besteuerung",               get: (v) => (v.vatReportable ? "Regelbesteuerung" : "Differenzbesteuerung") },
  { key: "totalCosts",     header: "Kosten gesamt brutto (EUR)", get: (v) => vehicleTotalCostsGross(v) },
  { key: "location",       header: "Stellplatz",                get: (v) => v.location.name },
  { key: "status",         header: "Status",                    get: (v) => v.status },
  { key: "listed",         header: "Inseriert",                 get: (v) => (v.listed?.active ? "Ja" : "Nein") },
  { key: "arrivedAt",      header: "Zugang am",                 get: (v) => (v.arrivedAt ? v.arrivedAt.slice(0, 10) : "") },
];

// ---------- Export ----------

export const exportVehicles = (vehicles: Vehicle[], format: "csv" | "xlsx", filenameBase = "bestand") => {
  const rows = vehicles.map((v) => {
    const row: Record<string, string | number | undefined> = {};
    COLUMNS.forEach((c) => (row[c.header] = c.get(v)));
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows, { header: COLUMNS.map((c) => c.header) });
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: ";" }); // Semikolon für DE-Excel
    // BOM für korrekte UTF-8 Umlaute in Excel
    downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `${filenameBase}_${stamp}.csv`);
  } else {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bestand");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    downloadBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${filenameBase}_${stamp}.xlsx`);
  }
};

/** Leere Vorlagedatei mit Spaltenköpfen + 1 Beispielzeile. */
export const downloadTemplate = (format: "csv" | "xlsx") => {
  const example: Record<string, string | number> = {};
  COLUMNS.forEach((c) => (example[c.header] = ""));
  example["VIN"] = "WBA8E9G50GNT12345";
  example["Marke"] = "BMW";
  example["Modell"] = "X3 xDrive30d";
  example["Fahrzeugtyp"] = "SUV";
  example["Baujahr"] = 2022;
  example["Kilometer"] = 45000;
  example["Kraftstoff"] = "Diesel";
  example["Getriebe"] = "Automatik";
  example["Leistung (PS)"] = 286;
  example["Einkaufspreis (EUR)"] = 35000;
  example["Listenpreis (EUR)"] = 42000;
  example["Besteuerung"] = "Differenzbesteuerung";
  example["Stellplatz"] = "Hof A · Platz 01";

  const ws = XLSX.utils.json_to_sheet([example], { header: COLUMNS.map((c) => c.header) });
  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: ";" });
    downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), "bestand_vorlage.csv");
  } else {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vorlage");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    downloadBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "bestand_vorlage.xlsx");
  }
};

// ---------- Import ----------

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

const TYPE_LOOKUP: Record<string, VehicleType> = Object.entries(VEHICLE_TYPE_LABELS).reduce(
  (acc, [k, v]) => ({ ...acc, [v.toLowerCase()]: k as VehicleType, [k.toLowerCase()]: k as VehicleType }),
  {} as Record<string, VehicleType>,
);

const FUEL_VALUES: FuelType[] = ["Benzin", "Diesel", "Hybrid", "Elektro", "Plug-in-Hybrid", "Gas"];
const TRANS_VALUES: Transmission[] = ["Schaltgetriebe", "Automatik", "DKG", "CVT"];

const HEADER_ALIASES: Record<string, string> = COLUMNS.reduce(
  (acc, c) => ({ ...acc, [c.header.toLowerCase()]: c.key }),
  {} as Record<string, string>,
);
// zusätzliche tolerante Aliase
Object.assign(HEADER_ALIASES, {
  "vin": "vin",
  "marke": "make",
  "modell": "model",
  "typ": "type",
  "fahrzeug-typ": "type",
  "km": "mileage",
  "ps": "power_hp",
  "ez": "firstRegistration",
  "hu": "hu",
  "tüv": "hu",
  "einkauf": "purchasePrice",
  "ek": "purchasePrice",
  "vk": "listPrice",
  "listenpreis": "listPrice",
  "stellplatz": "location",
  "standort": "location",
  "platz": "location",
});

const num = (raw: any): number => {
  if (raw == null || raw === "") return 0;
  if (typeof raw === "number") return raw;
  const s = String(raw).replace(/[€\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const parseRow = (raw: Record<string, any>, rowNumber: number, defaultLocation: string): ImportRow => {
  const errors: string[] = [];
  const data: Record<string, any> = {};
  Object.entries(raw).forEach(([k, v]) => {
    const norm = HEADER_ALIASES[String(k).trim().toLowerCase()];
    if (norm) data[norm] = v;
  });

  const vin = String(data.vin ?? "").trim().toUpperCase();
  const make = String(data.make ?? "").trim();
  const model = String(data.model ?? "").trim();
  if (vin.length < 11) errors.push("VIN fehlt oder zu kurz (min. 11 Zeichen)");
  if (!make) errors.push("Marke fehlt");
  if (!model) errors.push("Modell fehlt");

  const typeRaw = String(data.type ?? "limousine").trim().toLowerCase();
  const type: VehicleType = TYPE_LOOKUP[typeRaw] ?? "limousine";

  const fuelRaw = String(data.fuel ?? "Benzin").trim();
  const fuel = (FUEL_VALUES.find((f) => f.toLowerCase() === fuelRaw.toLowerCase()) ?? "Benzin") as FuelType;

  const transRaw = String(data.transmission ?? "Automatik").trim();
  const transmission = (TRANS_VALUES.find((t) => t.toLowerCase() === transRaw.toLowerCase()) ?? "Automatik") as Transmission;

  const hp = num(data.power_hp) || 0;
  const vatRaw = String(data.vatReportable ?? "Differenz").toLowerCase();
  const vatReportable = vatRaw.startsWith("regel") || vatRaw.includes("19") || vatRaw === "true" || vatRaw === "ja";

  const locationName = String(data.location ?? "").trim() || defaultLocation;

  if (errors.length > 0) return { rowNumber, errors };

  const payload: VehicleIntakePayload = {
    vin,
    type,
    make,
    model,
    year: num(data.year) || new Date().getFullYear(),
    color: String(data.color ?? "").trim(),
    mileage: num(data.mileage),
    fuel,
    transmission,
    power_hp: hp,
    power_kw: Math.round(hp * 0.7355),
    firstRegistration: String(data.firstRegistration ?? "").trim(),
    hu: data.hu ? String(data.hu).trim() : undefined,
    listPrice: num(data.listPrice),
    purchasePrice: num(data.purchasePrice),
    vatReportable,
    arrivedAt: new Date().toISOString(),
    location: { name: locationName, kind: "lot", since: new Date().toISOString() },
  };
  return { rowNumber, payload, errors: [] };
};

export const parseImportFile = async (file: File, defaultLocation: string): Promise<ImportResult> => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "", raw: false });

  const rows = raw.map((r, i) => parseRow(r, i + 2, defaultLocation)); // +2 = Header-Zeile + 1-indexed
  return {
    rows,
    validCount: rows.filter((r) => r.payload).length,
    errorCount: rows.filter((r) => r.errors.length > 0).length,
  };
};

// ---------- Util ----------

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
