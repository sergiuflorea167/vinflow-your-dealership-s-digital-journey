// VINflow Datenmodell – VIN-zentriert, mit Kostenkalkulation, Stellplatz-Historie,
// Activity-Log, To-Dos, Zielen und konfigurierbaren Einstellungen.

// ---------- Prozess-Schritte ----------

export type ProcessStepKey =
  | "offer"
  | "down_payment"
  | "order_confirmation"
  | "outbound_check"
  | "invoicing"
  | "purchase_contract"   // NEU: finaler Kaufvertrag
  | "delivery_confirmation";

export type StepStatus = "pending" | "active" | "completed" | "skipped";

export interface ProcessStep {
  key: ProcessStepKey;
  label: string;
  shortLabel: string;
  description: string;
  documentName: string;
  skippable?: boolean;
}

export const PROCESS_STEPS: ProcessStep[] = [
  { key: "offer", label: "Angebot", shortLabel: "Angebot", description: "Verbindliches Angebot inkl. To-Dos für den Kunden.", documentName: "Angebot" },
  { key: "down_payment", label: "Anzahlung / Vorauszahlung", shortLabel: "Anzahlung", description: "Anzahlungsrechnung – kann übersprungen werden.", documentName: "Anzahlungsrechnung", skippable: true },
  { key: "order_confirmation", label: "Auftragsbestätigung", shortLabel: "AB", description: "Verbindliche Bestätigung mit Kunden-To-Dos.", documentName: "Auftragsbestätigung" },
  { key: "outbound_check", label: "Ausgangskontrolle", shortLabel: "Kontrolle", description: "Interne Übergabe-Checkliste.", documentName: "Ausgangsprotokoll" },
  { key: "invoicing", label: "Rechnungsstellung", shortLabel: "Rechnung", description: "Schlussrechnung erstellen.", documentName: "Rechnung" },
  { key: "purchase_contract", label: "Kaufvertrag", shortLabel: "Kaufvertrag", description: "Finaler Kaufvertrag vor der Übergabe.", documentName: "Kaufvertrag" },
  { key: "delivery_confirmation", label: "Abhol- / Lieferbestätigung", shortLabel: "Lieferung", description: "Übergabe mit Kundenunterschrift.", documentName: "Übergabeprotokoll" },
];

export interface StepRecord {
  status: StepStatus;
  completedAt?: string;
  documentArchived?: boolean;
}

// ---------- To-Dos ----------

export type TodoPriority = "low" | "medium" | "high";
export type TodoScope =
  | "internal_pre_purchase"   // intern, vor/nach Bestandszugang
  | "internal_fleet"          // intern, am Fahrzeug allgemein
  | "offer"                   // sichtbar für Kunden auf Angebot
  | "order_confirmation"      // sichtbar für Kunden auf AB
  | "outbound_check";         // interne Ausgangskontroll-Checkliste

export interface Todo {
  id: string;
  title: string;
  priority: TodoPriority;
  done: boolean;
  dueDate?: string;
  scope: TodoScope;
  vehicleId?: string;
  processId?: string;
  createdAt: string;
  createdBy: string;
}

// ---------- Fahrzeug ----------

export type VehicleType =
  | "kleinwagen"
  | "limousine"
  | "kombi"
  | "suv"
  | "coupe"
  | "cabrio"
  | "transporter"
  | "sportwagen";

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  kleinwagen: "Kleinwagen",
  limousine: "Limousine",
  kombi: "Kombi",
  suv: "SUV / Geländewagen",
  coupe: "Coupé",
  cabrio: "Cabrio",
  transporter: "Transporter",
  sportwagen: "Sportwagen",
};

export type FuelType = "Benzin" | "Diesel" | "Hybrid" | "Elektro" | "Plug-in-Hybrid" | "Gas";
export type Transmission = "Schaltgetriebe" | "Automatik" | "DKG" | "CVT";

export type VehicleStatus = "planned" | "in_stock" | "reserved" | "sold";

export type LocationKind = "lot" | "showroom" | "workshop" | "detailer" | "transit" | "customer" | "other";

export interface VehicleLocation {
  name: string;          // z. B. "Werkstatt Müller", "Hof A · Platz 12"
  kind: LocationKind;
  since: string;         // ISO
  note?: string;
}

export type CostCategory =
  | "purchase"
  | "transport"
  | "workshop"
  | "detailing"
  | "parts"
  | "tuv"
  | "registration"
  | "marketing"
  | "warranty"
  | "other";

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  purchase: "Einkauf",
  transport: "Transport",
  workshop: "Werkstatt",
  detailing: "Aufbereitung",
  parts: "Ersatzteile",
  tuv: "TÜV / HU",
  registration: "Zulassung",
  marketing: "Marketing / Inserate",
  warranty: "Garantie / Gewährleistung",
  other: "Sonstiges",
};

export interface CostEntry {
  id: string;
  category: CostCategory;
  description: string;
  netAmount: number;
  vatRate: number;       // z. B. 19, 7, 0
  date: string;          // ISO
  supplier?: string;
  createdAt: string;
  createdBy: string;
}

export interface Vehicle {
  id: string;
  vin: string;
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  color: string;
  mileage: number;
  fuel: FuelType;
  transmission: Transmission;
  power_kw: number;
  power_hp: number;
  doors?: number;
  seats?: number;
  firstRegistration?: string;
  hu?: string;            // nächste HU/TÜV
  listPrice: number;      // Bruttoverkaufspreis (geplant)
  purchasePrice: number;  // Brutto-Einkaufspreis
  status: VehicleStatus;
  arrivedAt?: string;
  notes?: string;
  // Stellplatz / Standort
  location: VehicleLocation;
  locationHistory: VehicleLocation[];
  // Kosten am Fahrzeug
  costs: CostEntry[];
}

// ---------- Kunden ----------

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  street?: string;
  zip?: string;
  city: string;
}

// ---------- Angebot ----------

export type OfferStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export interface Offer {
  id: string;
  vehicleId: string;
  customerId: string;
  createdAt: string;
  validUntil: string;
  price: number;
  discount?: number;
  notes?: string;
  status: OfferStatus;
  customerTodos: { id: string; title: string }[]; // werden auf den Beleg gedruckt
}

// ---------- Einkaufsplanung ----------

export type PurchasePlanStatus = "open" | "ordered" | "received" | "cancelled";

export interface PurchasePlan {
  id: string;
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  targetPrice: number;
  supplier: string;
  expectedAt: string;
  status: PurchasePlanStatus;
  vin?: string;
  notes?: string;
  createdAt: string;
}

// ---------- Vorgang ----------

export interface ProcessFields {
  finalPrice?: number;
  downPayment?: {
    amount?: number;
    dueDate?: string;
    method?: "Überweisung" | "Bar" | "EC";
    received?: boolean;
    receivedDate?: string;
  };
  orderConfirmation?: {
    orderDate?: string;
    deliveryDate?: string;
    paymentTerms?: string;
  };
  invoicing?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
  };
  purchaseContract?: {
    contractNumber?: string;
    contractDate?: string;
    warrantyMonths?: number;
    place?: string;
  };
  delivery?: {
    handoverDate?: string;
    handoverLocation?: string;
    finalMileage?: number;
    fuelLevel?: string;
    customerSignature?: boolean;
  };
}

export interface Process {
  id: string;
  vehicleId: string;
  customerId: string;
  acceptedOfferId: string;
  createdAt: string;
  updatedAt: string;
  currentStep: ProcessStepKey;
  steps: Record<ProcessStepKey, StepRecord>;
  fields: ProcessFields;
  // Customer-To-Dos pro Schritt (Angebot/AB)
  customerTodosOC: { id: string; title: string }[];
  // Interne Ausgangskontroll-Checkliste
  outboundChecklist: { id: string; label: string; done: boolean }[];
}

// ---------- Activity-Log ----------

export type ActivityType =
  | "vehicle_added"
  | "vehicle_location_changed"
  | "vehicle_cost_added"
  | "purchase_planned"
  | "purchase_received"
  | "offer_created"
  | "offer_accepted"
  | "offer_rejected"
  | "process_created"
  | "process_step_completed"
  | "process_step_skipped"
  | "process_field_updated"
  | "todo_created"
  | "todo_completed"
  | "todo_deleted"
  | "customer_added"
  | "settings_updated"
  | "goal_updated";

export interface Activity {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: string;
  user: string;
  vehicleId?: string;
  processId?: string;
  customerId?: string;
  meta?: Record<string, string | number | boolean>;
}

// ---------- Ziele ----------

export type GoalMetric = "revenue" | "vehicles_sold" | "profit";
export type GoalPeriod = "week" | "month" | "quarter" | "year";

export interface Goal {
  id: string;
  metric: GoalMetric;
  period: GoalPeriod;
  target: number;
  startDate: string;       // ISO
  endDate: string;         // ISO
  label: string;
}

// ---------- Settings ----------

export interface Settings {
  userName: string;
  companyName: string;
  locations: string[];     // freie Stellplatz-Liste
}

// ---------- Helpers ----------

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export const formatCurrencyPrecise = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export const stepIndex = (key: ProcessStepKey) => PROCESS_STEPS.findIndex((s) => s.key === key);

export const grossFromNet = (net: number, vat: number) => net * (1 + vat / 100);
export const netFromGross = (gross: number, vat: number) => gross / (1 + vat / 100);

export const vehicleTotalCostsGross = (v: Vehicle) =>
  v.costs.reduce((s, c) => s + grossFromNet(c.netAmount, c.vatRate), 0);

export const vehicleTotalCostsNet = (v: Vehicle) =>
  v.costs.reduce((s, c) => s + c.netAmount, 0);

export const vehicleMargin = (v: Vehicle, salePriceGross: number) => {
  const ekGross = v.purchasePrice + vehicleTotalCostsGross(v);
  return salePriceGross - ekGross;
};

export const buildEmptySteps = (current: ProcessStepKey): Record<ProcessStepKey, StepRecord> => {
  const idx = PROCESS_STEPS.findIndex((s) => s.key === current);
  const map = {} as Record<ProcessStepKey, StepRecord>;
  PROCESS_STEPS.forEach((step, i) => {
    if (i < idx) {
      map[step.key] = { status: "completed", completedAt: new Date(Date.now() - (idx - i) * 86400000).toISOString(), documentArchived: true };
    } else if (i === idx) {
      map[step.key] = { status: "active" };
    } else {
      map[step.key] = { status: "pending" };
    }
  });
  return map;
};

export const DEFAULT_OUTBOUND_CHECKLIST = (): { id: string; label: string; done: boolean }[] => [
  { id: "c1", label: "Fahrzeug gewaschen & innen gereinigt", done: false },
  { id: "c2", label: "Reifendruck & Profil geprüft", done: false },
  { id: "c3", label: "Ölstand & Flüssigkeiten kontrolliert", done: false },
  { id: "c4", label: "Schlüssel (Haupt & Ersatz) bereit", done: false },
  { id: "c5", label: "Servicebuch & Bordmappe vollständig", done: false },
  { id: "c6", label: "Kennzeichen montiert", done: false },
  { id: "c7", label: "Tankfüllung gemäß Vereinbarung", done: false },
  { id: "c8", label: "Fahrzeugübergabe-Termin bestätigt", done: false },
];

// ---------- Mock seed ----------

const today = new Date();
const isoDaysAgo = (n: number) => new Date(today.getTime() - n * 86400000).toISOString();

export const MOCK_CUSTOMERS: Customer[] = [
  { id: "C-001", name: "Markus Weber", email: "m.weber@example.de", phone: "+49 171 2345678", street: "Leopoldstraße 22", zip: "80802", city: "München" },
  { id: "C-002", name: "Sandra Hoffmann", email: "s.hoffmann@example.de", phone: "+49 162 9876543", street: "Mönckebergstraße 5", zip: "20095", city: "Hamburg" },
  { id: "C-003", name: "Tobias Krüger", email: "t.krueger@example.de", phone: "+49 151 1122334", street: "Friedrichstraße 100", zip: "10117", city: "Berlin" },
  { id: "C-004", name: "Julia Schneider", email: "j.schneider@example.de", phone: "+49 173 4567890", street: "Königstraße 40", zip: "70173", city: "Stuttgart" },
  { id: "C-005", name: "Andreas Bauer", email: "a.bauer@example.de", phone: "+49 170 9988776", street: "Zeil 12", zip: "60313", city: "Frankfurt" },
  { id: "C-006", name: "Lisa Maier", email: "l.maier@example.de", phone: "+49 152 3344556", street: "Hohe Straße 88", zip: "50667", city: "Köln" },
];

const baseLoc = (name = "Hof A · Platz 1", kind: LocationKind = "lot"): VehicleLocation => ({
  name, kind, since: isoDaysAgo(30),
});

const seedCosts = (entries: Array<Omit<CostEntry, "id" | "createdAt" | "createdBy">>): CostEntry[] =>
  entries.map((e, i) => ({ id: `K-${Math.random().toString(36).slice(2, 8)}-${i}`, createdAt: e.date, createdBy: "Admin", ...e }));

export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: "V-001", vin: "WBA8E9G50GNT12345", type: "kombi", make: "BMW", model: "320d xDrive Touring", year: 2024, color: "Mineralweiß",
    mileage: 12450, fuel: "Diesel", transmission: "Automatik", power_kw: 140, power_hp: 190, doors: 5, seats: 5,
    firstRegistration: "2024-01-15", hu: "2027-01-15",
    listPrice: 38900, purchasePrice: 32000, status: "reserved", arrivedAt: isoDaysAgo(34),
    location: { name: "Hof A · Platz 03", kind: "lot", since: isoDaysAgo(2) },
    locationHistory: [
      { name: "Aufbereiter Glanz GmbH", kind: "detailer", since: isoDaysAgo(7) },
      { name: "Werkstatt Müller", kind: "workshop", since: isoDaysAgo(20) },
      { name: "Hof A · Platz 03", kind: "lot", since: isoDaysAgo(34) },
    ],
    costs: seedCosts([
      { category: "transport", description: "Anlieferung Auktion München", netAmount: 280, vatRate: 19, date: isoDaysAgo(33) },
      { category: "workshop", description: "Inspektion + Bremsen vorne", netAmount: 640, vatRate: 19, date: isoDaysAgo(20) },
      { category: "detailing", description: "Komplettaufbereitung", netAmount: 320, vatRate: 19, date: isoDaysAgo(7) },
    ]),
  },
  {
    id: "V-002", vin: "WAUZZZ8V8KA098765", type: "kombi", make: "Audi", model: "A4 Avant 40 TFSI", year: 2023, color: "Daytonagrau",
    mileage: 28900, fuel: "Benzin", transmission: "Automatik", power_kw: 150, power_hp: 204, doors: 5, seats: 5,
    firstRegistration: "2023-04-10", hu: "2026-04-10",
    listPrice: 34500, purchasePrice: 28500, status: "reserved", arrivedAt: isoDaysAgo(44),
    location: { name: "Showroom", kind: "showroom", since: isoDaysAgo(15) },
    locationHistory: [{ name: "Hof A · Platz 07", kind: "lot", since: isoDaysAgo(44) }],
    costs: seedCosts([{ category: "detailing", description: "Aufbereitung", netAmount: 280, vatRate: 19, date: isoDaysAgo(20) }]),
  },
  {
    id: "V-003", vin: "WDD2050461R456789", type: "kombi", make: "Mercedes-Benz", model: "C 220 d T-Modell", year: 2024, color: "Obsidianschwarz",
    mileage: 8200, fuel: "Diesel", transmission: "Automatik", power_kw: 147, power_hp: 200, doors: 5, seats: 5,
    firstRegistration: "2024-02-20", hu: "2027-02-20",
    listPrice: 42700, purchasePrice: 36000, status: "in_stock", arrivedAt: isoDaysAgo(25),
    location: { name: "Showroom", kind: "showroom", since: isoDaysAgo(10) },
    locationHistory: [{ name: "Hof B · Platz 01", kind: "lot", since: isoDaysAgo(25) }],
    costs: seedCosts([{ category: "transport", description: "Überführung", netAmount: 220, vatRate: 19, date: isoDaysAgo(25) }]),
  },
  {
    id: "V-004", vin: "VF1RFA00X67234567", type: "suv", make: "Porsche", model: "Macan T", year: 2024, color: "Kreide",
    mileage: 4500, fuel: "Benzin", transmission: "DKG", power_kw: 195, power_hp: 265, doors: 5, seats: 5,
    firstRegistration: "2024-03-01", hu: "2027-03-01",
    listPrice: 78900, purchasePrice: 68500, status: "sold", arrivedAt: isoDaysAgo(67),
    location: { name: "Beim Kunden (übergeben)", kind: "customer", since: isoDaysAgo(2) },
    locationHistory: [
      { name: "Showroom", kind: "showroom", since: isoDaysAgo(40) },
      { name: "Hof A · Platz 01", kind: "lot", since: isoDaysAgo(67) },
    ],
    costs: seedCosts([
      { category: "transport", description: "Sondertransport", netAmount: 480, vatRate: 19, date: isoDaysAgo(66) },
      { category: "detailing", description: "Premium-Aufbereitung", netAmount: 540, vatRate: 19, date: isoDaysAgo(50) },
    ]),
  },
  {
    id: "V-005", vin: "WVWZZZ1KZ8W345678", type: "limousine", make: "Volkswagen", model: "Golf 8 GTI", year: 2024, color: "Tornadorot",
    mileage: 15600, fuel: "Benzin", transmission: "DKG", power_kw: 180, power_hp: 245, doors: 5, seats: 5,
    firstRegistration: "2024-01-05", hu: "2027-01-05",
    listPrice: 41200, purchasePrice: 34000, status: "reserved", arrivedAt: isoDaysAgo(57),
    location: { name: "Werkstatt Müller", kind: "workshop", since: isoDaysAgo(3) },
    locationHistory: [{ name: "Hof A · Platz 12", kind: "lot", since: isoDaysAgo(57) }],
    costs: seedCosts([{ category: "workshop", description: "TÜV neu + Service", netAmount: 480, vatRate: 19, date: isoDaysAgo(3) }]),
  },
  {
    id: "V-006", vin: "JTHBK1GG3F2123456", type: "suv", make: "Lexus", model: "RX 450h", year: 2025, color: "Sonic Titanium",
    mileage: 1200, fuel: "Hybrid", transmission: "CVT", power_kw: 230, power_hp: 313, doors: 5, seats: 5,
    firstRegistration: "2025-01-20", hu: "2028-01-20",
    listPrice: 71200, purchasePrice: 62000, status: "in_stock", arrivedAt: isoDaysAgo(7),
    location: { name: "Showroom", kind: "showroom", since: isoDaysAgo(5) },
    locationHistory: [{ name: "Hof A · Platz 05", kind: "lot", since: isoDaysAgo(7) }],
    costs: [],
  },
  {
    id: "V-007", vin: "ZFA31200000123456", type: "suv", make: "Alfa Romeo", model: "Stelvio Veloce", year: 2024, color: "Rosso Competizione",
    mileage: 9800, fuel: "Benzin", transmission: "Automatik", power_kw: 206, power_hp: 280, doors: 5, seats: 5,
    firstRegistration: "2024-02-12", hu: "2027-02-12",
    listPrice: 56700, purchasePrice: 47000, status: "in_stock", arrivedAt: isoDaysAgo(15),
    location: { name: "Aufbereiter Glanz GmbH", kind: "detailer", since: isoDaysAgo(2) },
    locationHistory: [{ name: "Hof A · Platz 09", kind: "lot", since: isoDaysAgo(15) }],
    costs: [],
  },
  {
    id: "V-008", vin: "SAJAA01N5SC123987", type: "suv", make: "Jaguar", model: "F-Pace P400e", year: 2024, color: "Eiger Grey",
    mileage: 3100, fuel: "Plug-in-Hybrid", transmission: "Automatik", power_kw: 297, power_hp: 404, doors: 5, seats: 5,
    firstRegistration: "2024-04-02", hu: "2027-04-02",
    listPrice: 68900, purchasePrice: 58000, status: "in_stock", arrivedAt: isoDaysAgo(10),
    location: { name: "Hof B · Platz 04", kind: "lot", since: isoDaysAgo(10) },
    locationHistory: [],
    costs: [],
  },
];

export const MOCK_PURCHASE_PLANS: PurchasePlan[] = [
  { id: "PP-2025-014", type: "suv", make: "BMW", model: "X3 xDrive30d", year: 2024, targetPrice: 48000, supplier: "BMW Auktion München", expectedAt: "2025-05-08", status: "ordered", createdAt: isoDaysAgo(15) },
  { id: "PP-2025-015", type: "suv", make: "Audi", model: "Q5 50 TFSI e", year: 2024, targetPrice: 52000, supplier: "Audi Großhandel Ingolstadt", expectedAt: "2025-05-15", status: "open", createdAt: isoDaysAgo(8) },
  { id: "PP-2025-016", type: "suv", make: "Tesla", model: "Model Y Long Range", year: 2025, targetPrice: 44000, supplier: "Direktimport NL", expectedAt: "2025-05-22", status: "open", createdAt: isoDaysAgo(5) },
];

export const MOCK_OFFERS: Offer[] = [
  { id: "OFR-2025-0231", vehicleId: "V-001", customerId: "C-001", createdAt: isoDaysAgo(14), validUntil: "2025-05-15", price: 38900, status: "accepted", customerTodos: [{ id: "t1", title: "Winterreifen-Set inkludiert" }, { id: "t2", title: "Service-Inspektion vor Übergabe" }] },
  { id: "OFR-2025-0228", vehicleId: "V-001", customerId: "C-002", createdAt: isoDaysAgo(18), validUntil: "2025-04-22", price: 39500, status: "rejected", customerTodos: [] },
  { id: "OFR-2025-0229", vehicleId: "V-002", customerId: "C-002", createdAt: isoDaysAgo(18), validUntil: "2025-05-12", price: 34500, status: "accepted", customerTodos: [{ id: "t1", title: "Lederpflege-Set inklusive" }] },
  { id: "OFR-2025-0240", vehicleId: "V-003", customerId: "C-003", createdAt: isoDaysAgo(8), validUntil: "2025-05-20", price: 42700, status: "sent", customerTodos: [] },
  { id: "OFR-2025-0241", vehicleId: "V-003", customerId: "C-005", createdAt: isoDaysAgo(6), validUntil: "2025-05-22", price: 42900, status: "sent", customerTodos: [] },
  { id: "OFR-2025-0220", vehicleId: "V-004", customerId: "C-004", createdAt: isoDaysAgo(24), validUntil: "2025-04-16", price: 78900, status: "accepted", customerTodos: [{ id: "t1", title: "Sportabgasanlage nachgerüstet" }] },
  { id: "OFR-2025-0218", vehicleId: "V-005", customerId: "C-006", createdAt: isoDaysAgo(28), validUntil: "2025-04-30", price: 41200, status: "accepted", customerTodos: [] },
];

export const MOCK_PROCESSES: Process[] = [
  {
    id: "VF-2025-0142", vehicleId: "V-001", customerId: "C-001", acceptedOfferId: "OFR-2025-0231",
    createdAt: isoDaysAgo(13), updatedAt: isoDaysAgo(2),
    currentStep: "outbound_check", steps: buildEmptySteps("outbound_check"),
    fields: {
      finalPrice: 38900,
      downPayment: { amount: 5000, dueDate: "2025-04-15", method: "Überweisung", received: true, receivedDate: "2025-04-14" },
      orderConfirmation: { orderDate: "2025-04-16", deliveryDate: "2025-05-05", paymentTerms: "Restzahlung bei Übergabe" },
    },
    customerTodosOC: [{ id: "ct1", title: "Standheizung nachrüsten" }, { id: "ct2", title: "AHK montieren" }],
    outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST().map((c, i) => ({ ...c, done: i < 4 })),
  },
  {
    id: "VF-2025-0141", vehicleId: "V-002", customerId: "C-002", acceptedOfferId: "OFR-2025-0229",
    createdAt: isoDaysAgo(18), updatedAt: isoDaysAgo(3),
    currentStep: "down_payment", steps: buildEmptySteps("down_payment"),
    fields: { finalPrice: 34500 },
    customerTodosOC: [],
    outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST(),
  },
  {
    id: "VF-2025-0139", vehicleId: "V-004", customerId: "C-004", acceptedOfferId: "OFR-2025-0220",
    createdAt: isoDaysAgo(24), updatedAt: isoDaysAgo(1),
    currentStep: "delivery_confirmation", steps: buildEmptySteps("delivery_confirmation"),
    fields: {
      finalPrice: 78900,
      downPayment: { amount: 10000, dueDate: "2025-04-05", method: "Überweisung", received: true, receivedDate: "2025-04-04" },
      orderConfirmation: { orderDate: "2025-04-06", deliveryDate: "2025-04-25", paymentTerms: "Restzahlung bei Übergabe" },
      invoicing: { invoiceNumber: "RE-2025-0418", invoiceDate: "2025-04-22", dueDate: "2025-05-06" },
      purchaseContract: { contractNumber: "KV-2025-0418", contractDate: "2025-04-23", warrantyMonths: 12, place: "München" },
    },
    customerTodosOC: [{ id: "ct1", title: "Sportabgasanlage geliefert" }],
    outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST().map((c) => ({ ...c, done: true })),
  },
  {
    id: "VF-2025-0138", vehicleId: "V-005", customerId: "C-006", acceptedOfferId: "OFR-2025-0218",
    createdAt: isoDaysAgo(28), updatedAt: isoDaysAgo(5),
    currentStep: "invoicing", steps: buildEmptySteps("invoicing"),
    fields: {
      finalPrice: 41200,
      downPayment: { amount: 5000, dueDate: "2025-04-01", method: "Überweisung", received: true, receivedDate: "2025-03-31" },
      orderConfirmation: { orderDate: "2025-04-02", deliveryDate: "2025-05-10", paymentTerms: "Restzahlung bei Übergabe" },
    },
    customerTodosOC: [],
    outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST().map((c) => ({ ...c, done: true })),
  },
];

export const MOCK_TODOS: Todo[] = [
  { id: "TD-001", title: "Felgenreparatur prüfen", priority: "high", done: false, dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), scope: "internal_fleet", vehicleId: "V-007", createdAt: isoDaysAgo(2), createdBy: "Admin" },
  { id: "TD-002", title: "Originalpapiere von Vorbesitzer anfordern", priority: "medium", done: false, dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), scope: "internal_pre_purchase", createdAt: isoDaysAgo(1), createdBy: "Admin" },
  { id: "TD-003", title: "Innenraumdesinfektion vor Auslieferung", priority: "low", done: true, scope: "internal_fleet", vehicleId: "V-006", createdAt: isoDaysAgo(4), createdBy: "Admin" },
  { id: "TD-004", title: "Probefahrt-Termin koordinieren", priority: "high", done: false, dueDate: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10), scope: "internal_fleet", vehicleId: "V-006", createdAt: isoDaysAgo(1), createdBy: "Admin" },
];

export const MOCK_ACTIVITIES: Activity[] = [
  { id: "A-001", type: "vehicle_added", message: "Lexus RX 450h aufgenommen", timestamp: isoDaysAgo(7), user: "Admin", vehicleId: "V-006" },
  { id: "A-002", type: "offer_created", message: "Angebot OFR-2025-0240 für Mercedes C 220 d", timestamp: isoDaysAgo(8), user: "Admin", vehicleId: "V-003", customerId: "C-003" },
  { id: "A-003", type: "offer_accepted", message: "Angebot OFR-2025-0231 angenommen", timestamp: isoDaysAgo(13), user: "Admin", vehicleId: "V-001", customerId: "C-001" },
  { id: "A-004", type: "process_created", message: "Vorgang VF-2025-0142 angelegt", timestamp: isoDaysAgo(13), user: "Admin", processId: "VF-2025-0142" },
  { id: "A-005", type: "process_step_completed", message: "Anzahlung abgeschlossen", timestamp: isoDaysAgo(11), user: "Admin", processId: "VF-2025-0142", meta: { step: "down_payment" } },
  { id: "A-006", type: "process_step_completed", message: "Auftragsbestätigung abgeschlossen", timestamp: isoDaysAgo(8), user: "Admin", processId: "VF-2025-0142", meta: { step: "order_confirmation" } },
  { id: "A-007", type: "vehicle_location_changed", message: "BMW 320d → Hof A · Platz 03", timestamp: isoDaysAgo(2), user: "Admin", vehicleId: "V-001" },
];

export const MOCK_GOALS: Goal[] = [
  { id: "G-001", metric: "revenue", period: "month", target: 250000, startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(), endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString(), label: "Umsatzziel Monat" },
  { id: "G-002", metric: "vehicles_sold", period: "month", target: 8, startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(), endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString(), label: "Verkaufte Fahrzeuge" },
];

export const DEFAULT_SETTINGS: Settings = {
  userName: "Admin",
  companyName: "VINflow Autohaus GmbH",
  locations: ["Hof A · Platz 01", "Hof A · Platz 02", "Hof A · Platz 03", "Hof B · Platz 01", "Showroom", "Werkstatt Müller", "Aufbereiter Glanz GmbH", "Unterwegs"],
};
