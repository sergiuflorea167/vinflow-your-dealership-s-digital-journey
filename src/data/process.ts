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
  | "general"                 // freistehend, ohne Bezug zu Kunde/Fahrzeug
  | "internal_pre_purchase"   // intern, vor/nach Bestandszugang
  | "internal_fleet"          // intern, am Fahrzeug allgemein
  | "offer"                   // sichtbar für Kunden auf Angebot
  | "order_confirmation"      // sichtbar für Kunden auf AB
  | "outbound_check";         // interne Ausgangskontroll-Checkliste

export interface Todo {
  id: string;
  title: string;
  description?: string;
  priority: TodoPriority;
  done: boolean;
  dueDate?: string;
  scope: TodoScope;
  vehicleId?: string;
  processId?: string;
  tags?: string[];
  assignee?: string;
  createdAt: string;
  completedAt?: string;
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
export type DriveType = "Frontantrieb" | "Heckantrieb" | "Allradantrieb";
export type EmissionClass = "Euro 4" | "Euro 5" | "Euro 6" | "Euro 6d" | "Euro 6d-TEMP" | "Elektro";
export type VehicleCondition = "Neu" | "Gebraucht" | "Jahreswagen" | "Vorführwagen" | "Tageszulassung" | "Oldtimer";

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
  // --- Identifikation ---
  vin: string;
  type: VehicleType;
  make: string;
  model: string;
  modelDetail?: string;       // z. B. "M-Sport Paket Pro"
  year: number;
  condition?: VehicleCondition;
  hsn?: string;               // Herstellerschlüssel
  tsn?: string;               // Typschlüssel
  licensePlate?: string;
  previousOwners?: number;
  // --- Technik ---
  fuel: FuelType;
  transmission: Transmission;
  drive?: DriveType;
  power_kw: number;
  power_hp: number;
  displacement_ccm?: number;  // Hubraum
  cylinders?: number;
  emissionClass?: EmissionClass;
  co2_g_km?: number;
  consumption_l_100km?: number;
  batteryCapacity_kwh?: number;
  range_km?: number;
  // --- Innen / Außen ---
  color: string;              // Außenfarbe (Verkaufsname)
  paintCode?: string;         // Hersteller-Lackcode
  metallic?: boolean;
  interiorColor?: string;
  interiorMaterial?: string;  // "Leder", "Stoff", "Alcantara"
  doors?: number;
  seats?: number;
  // --- Zulassung / Historie ---
  mileage: number;
  firstRegistration?: string;
  hu?: string;                // nächste HU/TÜV
  serviceBookComplete?: boolean;
  accidentFree?: boolean;
  nonSmoker?: boolean;
  // --- Ausstattung ---
  features?: string[];        // freie Ausstattungsliste
  // --- Preis & Status ---
  listPrice: number;          // Bruttoverkaufspreis (geplant)
  purchasePrice: number;      // Brutto-Einkaufspreis
  vatReportable?: boolean;    // MwSt. ausweisbar
  status: VehicleStatus;
  arrivedAt?: string;
  notes?: string;
  // --- Stellplatz / Standort ---
  location: VehicleLocation;
  locationHistory: VehicleLocation[];
  // --- Kosten ---
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
  | "vehicle_updated"
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
  | "process_step_cancelled"
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

export type PartnerKind =
  | "detailer"      // Aufbereiter
  | "mechanic"      // Werkstatt / Mechaniker
  | "transport"     // Transporteur
  | "appraiser"     // Gutachter
  | "tuv"           // TÜV / Prüfstelle
  | "supplier"      // Teilelieferant
  | "other";

export const PARTNER_KIND_LABELS: Record<PartnerKind, string> = {
  detailer:  "Aufbereiter",
  mechanic:  "Mechaniker / Werkstatt",
  transport: "Transporteur",
  appraiser: "Gutachter",
  tuv:       "TÜV / Prüfstelle",
  supplier:  "Teilelieferant",
  other:     "Sonstiges",
};

export interface Partner {
  id: string;
  name: string;
  kind: PartnerKind;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface Settings {
  userName: string;
  companyName: string;
  locations: string[];     // freie Stellplatz-Liste
  partners: Partner[];
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
  { id: "C-007", name: "Daniel Fischer", email: "d.fischer@example.de", phone: "+49 176 4455667", street: "Rathenauplatz 3", zip: "90489", city: "Nürnberg" },
  { id: "C-008", name: "Katharina Wolf", email: "k.wolf@example.de", phone: "+49 159 8877665", street: "Bahnhofstraße 14", zip: "30159", city: "Hannover" },
  { id: "C-009", name: "Stefan Becker", email: "s.becker@example.de", phone: "+49 174 6677889", street: "Schloßstraße 77", zip: "12163", city: "Berlin" },
  { id: "C-010", name: "Nadine Klein", email: "n.klein@example.de", phone: "+49 162 5544332", street: "Maximilianstraße 9", zip: "80539", city: "München" },
  { id: "C-011", name: "Christoph Lehmann", email: "c.lehmann@example.de", phone: "+49 175 9988771", street: "Sandweg 22", zip: "60316", city: "Frankfurt" },
  { id: "C-012", name: "Eva Schwarz", email: "e.schwarz@example.de", phone: "+49 151 2233445", street: "Lindenstraße 4", zip: "01067", city: "Dresden" },
  { id: "C-013", name: "Jürgen Hartmann", email: "j.hartmann@example.de", phone: "+49 170 6655443", street: "Hafenstraße 18", zip: "20359", city: "Hamburg" },
  { id: "C-014", name: "Petra Lang", email: "p.lang@example.de", phone: "+49 152 4433221", street: "Kaiserstraße 2", zip: "76131", city: "Karlsruhe" },
  { id: "C-015", name: "Florian Roth", email: "f.roth@example.de", phone: "+49 171 7766554", street: "Theaterplatz 1", zip: "99423", city: "Weimar" },
  { id: "C-016", name: "Miriam Köhler", email: "m.koehler@example.de", phone: "+49 173 1212343", street: "Marienplatz 8", zip: "80331", city: "München" },
  { id: "C-017", name: "Robert Vogel", email: "r.vogel@example.de", phone: "+49 152 9090101", street: "Reeperbahn 145", zip: "20359", city: "Hamburg" },
  { id: "C-018", name: "Sophie Werner", email: "s.werner@example.de", phone: "+49 170 4545676", street: "Gendarmenmarkt 5", zip: "10117", city: "Berlin" },
  { id: "C-019", name: "Matthias Brandt", email: "m.brandt@example.de", phone: "+49 162 7878989", street: "Schillerplatz 3", zip: "70173", city: "Stuttgart" },
  { id: "C-020", name: "Anna Sommer", email: "a.sommer@example.de", phone: "+49 174 3434565", street: "Goetheplatz 11", zip: "60313", city: "Frankfurt" },
  { id: "C-021", name: "Patrick Engel", email: "p.engel@example.de", phone: "+49 176 6767878", street: "Rudolfplatz 22", zip: "50674", city: "Köln" },
  { id: "C-022", name: "Vanessa Huber", email: "v.huber@example.de", phone: "+49 159 2323454", street: "Hauptmarkt 9", zip: "90403", city: "Nürnberg" },
  { id: "C-023", name: "Sebastian Frank", email: "s.frank@example.de", phone: "+49 175 8181828", street: "Lister Meile 4", zip: "30161", city: "Hannover" },
  { id: "C-024", name: "Carina Pohl", email: "c.pohl@example.de", phone: "+49 151 9292939", street: "Prager Straße 18", zip: "01069", city: "Dresden" },
  { id: "C-025", name: "Alexander Hahn", email: "a.hahn@example.de", phone: "+49 171 5050514", street: "Marktplatz 7", zip: "76133", city: "Karlsruhe" },
  { id: "C-026", name: "Linda Voss", email: "l.voss@example.de", phone: "+49 173 6363647", street: "Bismarckstraße 33", zip: "10625", city: "Berlin" },
  { id: "C-027", name: "Auto Müller GmbH", email: "einkauf@auto-mueller.de", phone: "+49 89 7878000", street: "Industriestraße 4", zip: "85716", city: "Unterschleißheim" },
  { id: "C-028", name: "Logistik Nord GmbH", email: "fuhrpark@logistik-nord.de", phone: "+49 40 8181000", street: "Hafenring 12", zip: "21079", city: "Hamburg" },
];

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
    costs: seedCosts([{ category: "detailing", description: "Felgen aufbereiten", netAmount: 380, vatRate: 19, date: isoDaysAgo(2) }]),
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
  {
    id: "V-009", vin: "WP0AB29928S701234", type: "limousine", make: "Porsche", model: "911 Carrera S", year: 2023, color: "GT Silber",
    mileage: 18400, fuel: "Benzin", transmission: "DKG", power_kw: 331, power_hp: 450, doors: 2, seats: 4,
    firstRegistration: "2023-06-22", hu: "2026-06-22",
    listPrice: 134900, purchasePrice: 118000, status: "sold", arrivedAt: isoDaysAgo(95),
    location: { name: "Beim Kunden (übergeben)", kind: "customer", since: isoDaysAgo(40) },
    locationHistory: [{ name: "Showroom", kind: "showroom", since: isoDaysAgo(95) }],
    costs: seedCosts([
      { category: "transport", description: "Premium-Transport Stuttgart", netAmount: 690, vatRate: 19, date: isoDaysAgo(94) },
      { category: "detailing", description: "Keramikversiegelung", netAmount: 1200, vatRate: 19, date: isoDaysAgo(80) },
      { category: "workshop", description: "Service B + Bremsen", netAmount: 1850, vatRate: 19, date: isoDaysAgo(75) },
    ]),
  },
  {
    id: "V-010", vin: "WDB2030461F112233", type: "limousine", make: "Mercedes-Benz", model: "E 300 de", year: 2024, color: "Cavansitblau",
    mileage: 11200, fuel: "Plug-in-Hybrid", transmission: "Automatik", power_kw: 225, power_hp: 306, doors: 4, seats: 5,
    firstRegistration: "2024-02-08", hu: "2027-02-08",
    listPrice: 58400, purchasePrice: 49500, status: "sold", arrivedAt: isoDaysAgo(82),
    location: { name: "Beim Kunden (übergeben)", kind: "customer", since: isoDaysAgo(25) },
    locationHistory: [{ name: "Hof A · Platz 02", kind: "lot", since: isoDaysAgo(82) }],
    costs: seedCosts([
      { category: "workshop", description: "Hochvolt-Check + Software", netAmount: 420, vatRate: 19, date: isoDaysAgo(70) },
      { category: "detailing", description: "Aufbereitung", netAmount: 320, vatRate: 19, date: isoDaysAgo(60) },
    ]),
  },
  {
    id: "V-011", vin: "WVGZZZ5NZMW998877", type: "suv", make: "Volkswagen", model: "Tiguan R-Line", year: 2024, color: "Atlanticblau",
    mileage: 14800, fuel: "Benzin", transmission: "DKG", power_kw: 180, power_hp: 245, doors: 5, seats: 5,
    firstRegistration: "2024-03-12", hu: "2027-03-12",
    listPrice: 46500, purchasePrice: 39000, status: "sold", arrivedAt: isoDaysAgo(72),
    location: { name: "Beim Kunden (übergeben)", kind: "customer", since: isoDaysAgo(18) },
    locationHistory: [{ name: "Hof B · Platz 02", kind: "lot", since: isoDaysAgo(72) }],
    costs: seedCosts([
      { category: "detailing", description: "Aufbereitung", netAmount: 290, vatRate: 19, date: isoDaysAgo(60) },
    ]),
  },
  {
    id: "V-012", vin: "ZAR93900007891234", type: "kleinwagen", make: "Fiat", model: "500 La Prima", year: 2024, color: "Mineral Grey",
    mileage: 6800, fuel: "Elektro", transmission: "Automatik", power_kw: 87, power_hp: 118, doors: 3, seats: 4,
    firstRegistration: "2024-05-04", hu: "2027-05-04",
    listPrice: 24900, purchasePrice: 19800, status: "in_stock", arrivedAt: isoDaysAgo(20),
    location: { name: "Hof A · Platz 14", kind: "lot", since: isoDaysAgo(20) },
    locationHistory: [],
    costs: [],
  },
  {
    id: "V-013", vin: "VF7SC9HRC12567890", type: "kleinwagen", make: "Peugeot", model: "208 GT", year: 2024, color: "Blau Vertigo",
    mileage: 9300, fuel: "Benzin", transmission: "Automatik", power_kw: 96, power_hp: 130, doors: 5, seats: 5,
    firstRegistration: "2024-04-18", hu: "2027-04-18",
    listPrice: 21800, purchasePrice: 17500, status: "in_stock", arrivedAt: isoDaysAgo(12),
    location: { name: "Hof B · Platz 06", kind: "lot", since: isoDaysAgo(12) },
    locationHistory: [],
    costs: seedCosts([{ category: "detailing", description: "Aufbereitung", netAmount: 180, vatRate: 19, date: isoDaysAgo(8) }]),
  },
  {
    id: "V-014", vin: "WF0AXXTTGAGH54321", type: "transporter", make: "Ford", model: "Transit Custom L2H1", year: 2023, color: "Frost-Weiß",
    mileage: 42000, fuel: "Diesel", transmission: "Schaltgetriebe", power_kw: 125, power_hp: 170, doors: 5, seats: 3,
    firstRegistration: "2023-09-12", hu: "2025-09-12",
    listPrice: 32400, purchasePrice: 26500, status: "reserved", arrivedAt: isoDaysAgo(38),
    location: { name: "Hof B · Platz 08", kind: "lot", since: isoDaysAgo(38) },
    locationHistory: [],
    costs: seedCosts([
      { category: "workshop", description: "AHK 13-polig nachgerüstet", netAmount: 580, vatRate: 19, date: isoDaysAgo(20) },
      { category: "transport", description: "Überführung Düsseldorf", netAmount: 240, vatRate: 19, date: isoDaysAgo(38) },
    ]),
  },
  {
    id: "V-015", vin: "5YJ3E1EA8KF112233", type: "limousine", make: "Tesla", model: "Model 3 Long Range", year: 2024, color: "Pearl White",
    mileage: 7100, fuel: "Elektro", transmission: "Automatik", power_kw: 324, power_hp: 440, doors: 4, seats: 5,
    firstRegistration: "2024-02-28", hu: "2027-02-28",
    listPrice: 49800, purchasePrice: 41500, status: "sold", arrivedAt: isoDaysAgo(60),
    location: { name: "Beim Kunden (übergeben)", kind: "customer", since: isoDaysAgo(8) },
    locationHistory: [{ name: "Hof A · Platz 11", kind: "lot", since: isoDaysAgo(60) }],
    costs: seedCosts([
      { category: "workshop", description: "Software-Update + Bremsenservice", netAmount: 280, vatRate: 19, date: isoDaysAgo(40) },
      { category: "detailing", description: "Aufbereitung + Folierung", netAmount: 720, vatRate: 19, date: isoDaysAgo(30) },
    ]),
  },
  {
    id: "V-016", vin: "WAUZZZ4M9NA776655", type: "suv", make: "Audi", model: "Q7 50 TDI", year: 2024, color: "Manhattangrau",
    mileage: 19800, fuel: "Diesel", transmission: "Automatik", power_kw: 210, power_hp: 286, doors: 5, seats: 7,
    firstRegistration: "2024-01-30", hu: "2027-01-30",
    listPrice: 84900, purchasePrice: 73000, status: "in_stock", arrivedAt: isoDaysAgo(48),
    location: { name: "Showroom", kind: "showroom", since: isoDaysAgo(20) },
    locationHistory: [{ name: "Hof A · Platz 06", kind: "lot", since: isoDaysAgo(48) }],
    costs: seedCosts([
      { category: "detailing", description: "Premium-Aufbereitung", netAmount: 480, vatRate: 19, date: isoDaysAgo(35) },
      { category: "workshop", description: "Standheizung-Check", netAmount: 220, vatRate: 19, date: isoDaysAgo(25) },
    ]),
  },
  {
    id: "V-017", vin: "WMWXP7C50K2T11223", type: "kleinwagen", make: "Mini", model: "Cooper S", year: 2024, color: "Chili Red",
    mileage: 5400, fuel: "Benzin", transmission: "DKG", power_kw: 131, power_hp: 178, doors: 3, seats: 4,
    firstRegistration: "2024-04-05", hu: "2027-04-05",
    listPrice: 32900, purchasePrice: 27200, status: "in_stock", arrivedAt: isoDaysAgo(18),
    location: { name: "Showroom", kind: "showroom", since: isoDaysAgo(10) },
    locationHistory: [],
    costs: [],
  },
  {
    id: "V-018", vin: "ZAMJK45J100445566", type: "cabrio", make: "Maserati", model: "GranCabrio", year: 2023, color: "Blu Emozione",
    mileage: 8900, fuel: "Benzin", transmission: "Automatik", power_kw: 338, power_hp: 460, doors: 2, seats: 4,
    firstRegistration: "2023-07-15", hu: "2026-07-15",
    listPrice: 142000, purchasePrice: 124000, status: "in_stock", arrivedAt: isoDaysAgo(28),
    location: { name: "Showroom", kind: "showroom", since: isoDaysAgo(28) },
    locationHistory: [],
    costs: seedCosts([
      { category: "transport", description: "Cabrio-Spezialtransport", netAmount: 980, vatRate: 19, date: isoDaysAgo(28) },
      { category: "detailing", description: "Lederaufbereitung", netAmount: 640, vatRate: 19, date: isoDaysAgo(20) },
    ]),
  },
  {
    id: "V-019", vin: "WBA4J11070BL55443", type: "suv", make: "BMW", model: "X1 sDrive18d", year: 2024, color: "Alpinweiß",
    mileage: 16200, fuel: "Diesel", transmission: "Automatik", power_kw: 110, power_hp: 150, doors: 5, seats: 5,
    firstRegistration: "2024-03-20", hu: "2027-03-20",
    listPrice: 39800, purchasePrice: 33000, status: "in_stock", arrivedAt: isoDaysAgo(9),
    location: { name: "Hof A · Platz 04", kind: "lot", since: isoDaysAgo(9) },
    locationHistory: [],
    costs: [],
  },
  {
    id: "V-020", vin: "VF3LBYHZRJW998822", type: "kombi", make: "Citroën", model: "C5 X Hybrid", year: 2024, color: "Schwarz Perla",
    mileage: 11500, fuel: "Plug-in-Hybrid", transmission: "Automatik", power_kw: 165, power_hp: 225, doors: 5, seats: 5,
    firstRegistration: "2024-02-26", hu: "2027-02-26",
    listPrice: 36400, purchasePrice: 29800, status: "in_stock", arrivedAt: isoDaysAgo(22),
    location: { name: "Hof B · Platz 03", kind: "lot", since: isoDaysAgo(22) },
    locationHistory: [],
    costs: seedCosts([{ category: "workshop", description: "Inspektion", netAmount: 320, vatRate: 19, date: isoDaysAgo(15) }]),
  },
];

export const MOCK_PURCHASE_PLANS: PurchasePlan[] = [
  { id: "PP-2025-014", type: "suv", make: "BMW", model: "X3 xDrive30d", year: 2024, targetPrice: 48000, supplier: "BMW Auktion München", expectedAt: "2025-05-08", status: "ordered", createdAt: isoDaysAgo(15) },
  { id: "PP-2025-015", type: "suv", make: "Audi", model: "Q5 50 TFSI e", year: 2024, targetPrice: 52000, supplier: "Audi Großhandel Ingolstadt", expectedAt: "2025-05-15", status: "open", createdAt: isoDaysAgo(8) },
  { id: "PP-2025-016", type: "suv", make: "Tesla", model: "Model Y Long Range", year: 2025, targetPrice: 44000, supplier: "Direktimport NL", expectedAt: "2025-05-22", status: "open", createdAt: isoDaysAgo(5) },
  { id: "PP-2025-017", type: "limousine", make: "Mercedes-Benz", model: "S 580", year: 2024, targetPrice: 92000, supplier: "MB Auktion Bremen", expectedAt: "2025-05-30", status: "ordered", createdAt: isoDaysAgo(3) },
  { id: "PP-2025-018", type: "kleinwagen", make: "Renault", model: "Clio TCe 90", year: 2024, targetPrice: 14500, supplier: "Renault Großhandel", expectedAt: "2025-06-05", status: "open", createdAt: isoDaysAgo(2) },
];

export const MOCK_OFFERS: Offer[] = [
  { id: "OFR-2025-0231", vehicleId: "V-001", customerId: "C-001", createdAt: isoDaysAgo(14), validUntil: "2025-05-15", price: 38900, status: "accepted", customerTodos: [{ id: "t1", title: "Winterreifen-Set inkludiert" }, { id: "t2", title: "Service-Inspektion vor Übergabe" }] },
  { id: "OFR-2025-0228", vehicleId: "V-001", customerId: "C-002", createdAt: isoDaysAgo(18), validUntil: "2025-04-22", price: 39500, status: "rejected", customerTodos: [] },
  { id: "OFR-2025-0229", vehicleId: "V-002", customerId: "C-002", createdAt: isoDaysAgo(18), validUntil: "2025-05-12", price: 34500, status: "accepted", customerTodos: [{ id: "t1", title: "Lederpflege-Set inklusive" }] },
  { id: "OFR-2025-0240", vehicleId: "V-003", customerId: "C-003", createdAt: isoDaysAgo(8), validUntil: "2025-05-20", price: 42700, status: "sent", customerTodos: [] },
  { id: "OFR-2025-0241", vehicleId: "V-003", customerId: "C-005", createdAt: isoDaysAgo(6), validUntil: "2025-05-22", price: 42900, status: "sent", customerTodos: [] },
  { id: "OFR-2025-0220", vehicleId: "V-004", customerId: "C-004", createdAt: isoDaysAgo(24), validUntil: "2025-04-16", price: 78900, status: "accepted", customerTodos: [{ id: "t1", title: "Sportabgasanlage nachgerüstet" }] },
  { id: "OFR-2025-0218", vehicleId: "V-005", customerId: "C-006", createdAt: isoDaysAgo(28), validUntil: "2025-04-30", price: 41200, status: "accepted", customerTodos: [] },
  { id: "OFR-2025-0245", vehicleId: "V-006", customerId: "C-007", createdAt: isoDaysAgo(4), validUntil: "2025-05-25", price: 71200, status: "sent", customerTodos: [] },
  { id: "OFR-2025-0246", vehicleId: "V-006", customerId: "C-010", createdAt: isoDaysAgo(2), validUntil: "2025-05-26", price: 71500, status: "sent", customerTodos: [] },
  { id: "OFR-2025-0210", vehicleId: "V-009", customerId: "C-008", createdAt: isoDaysAgo(85), validUntil: "2025-02-28", price: 134900, status: "accepted", customerTodos: [{ id: "t1", title: "Originalfelgen + Sommerreifen" }] },
  { id: "OFR-2025-0212", vehicleId: "V-010", customerId: "C-009", createdAt: isoDaysAgo(75), validUntil: "2025-03-15", price: 58400, status: "accepted", customerTodos: [] },
  { id: "OFR-2025-0215", vehicleId: "V-011", customerId: "C-011", createdAt: isoDaysAgo(65), validUntil: "2025-03-25", price: 46500, status: "accepted", customerTodos: [{ id: "t1", title: "AHK abnehmbar nachrüsten" }] },
  { id: "OFR-2025-0238", vehicleId: "V-014", customerId: "C-013", createdAt: isoDaysAgo(20), validUntil: "2025-05-10", price: 32400, status: "accepted", customerTodos: [{ id: "t1", title: "Beschriftung möglich" }] },
  { id: "OFR-2025-0205", vehicleId: "V-015", customerId: "C-012", createdAt: isoDaysAgo(55), validUntil: "2025-03-15", price: 49800, status: "accepted", customerTodos: [] },
  { id: "OFR-2025-0247", vehicleId: "V-016", customerId: "C-014", createdAt: isoDaysAgo(3), validUntil: "2025-05-28", price: 84900, status: "sent", customerTodos: [] },
  { id: "OFR-2025-0248", vehicleId: "V-018", customerId: "C-015", createdAt: isoDaysAgo(1), validUntil: "2025-06-01", price: 142000, status: "draft", customerTodos: [] },
];

export const MOCK_PROCESSES: Process[] = [
  // In-Flight Vorgang #1: Outbound-Check
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
  // Vorgang #2: erst Anzahlung
  {
    id: "VF-2025-0141", vehicleId: "V-002", customerId: "C-002", acceptedOfferId: "OFR-2025-0229",
    createdAt: isoDaysAgo(18), updatedAt: isoDaysAgo(3),
    currentStep: "down_payment", steps: buildEmptySteps("down_payment"),
    fields: { finalPrice: 34500 },
    customerTodosOC: [],
    outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST(),
  },
  // Vorgang #3: vollständig abgeschlossen (Übergabe vor 2 Tagen)
  {
    id: "VF-2025-0139", vehicleId: "V-004", customerId: "C-004", acceptedOfferId: "OFR-2025-0220",
    createdAt: isoDaysAgo(24), updatedAt: isoDaysAgo(2),
    currentStep: "delivery_confirmation",
    steps: {
      offer: { status: "completed", completedAt: isoDaysAgo(24), documentArchived: true },
      down_payment: { status: "completed", completedAt: isoDaysAgo(20), documentArchived: true },
      order_confirmation: { status: "completed", completedAt: isoDaysAgo(18), documentArchived: true },
      outbound_check: { status: "completed", completedAt: isoDaysAgo(8), documentArchived: true },
      invoicing: { status: "completed", completedAt: isoDaysAgo(5), documentArchived: true },
      purchase_contract: { status: "completed", completedAt: isoDaysAgo(3), documentArchived: true },
      delivery_confirmation: { status: "completed", completedAt: isoDaysAgo(2), documentArchived: true },
    },
    fields: {
      finalPrice: 78900,
      downPayment: { amount: 10000, dueDate: "2025-04-05", method: "Überweisung", received: true, receivedDate: "2025-04-04" },
      orderConfirmation: { orderDate: "2025-04-06", deliveryDate: "2025-04-25", paymentTerms: "Restzahlung bei Übergabe" },
      invoicing: { invoiceNumber: "RE-2025-0418", invoiceDate: isoDaysAgo(5).slice(0, 10), dueDate: "2025-05-06" },
      purchaseContract: { contractNumber: "KV-2025-0418", contractDate: isoDaysAgo(3).slice(0, 10), warrantyMonths: 12, place: "München" },
    },
    customerTodosOC: [{ id: "ct1", title: "Sportabgasanlage geliefert" }],
    outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST().map((c) => ({ ...c, done: true })),
  },
  // Vorgang #4: Rechnungsstellung aktiv
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
  // Vorgang #5: vollständig (vor 8 Tagen übergeben)
  {
    id: "VF-2025-0137", vehicleId: "V-015", customerId: "C-012", acceptedOfferId: "OFR-2025-0205",
    createdAt: isoDaysAgo(55), updatedAt: isoDaysAgo(8),
    currentStep: "delivery_confirmation",
    steps: {
      offer: { status: "completed", completedAt: isoDaysAgo(55), documentArchived: true },
      down_payment: { status: "skipped", completedAt: isoDaysAgo(54) },
      order_confirmation: { status: "completed", completedAt: isoDaysAgo(50), documentArchived: true },
      outbound_check: { status: "completed", completedAt: isoDaysAgo(20), documentArchived: true },
      invoicing: { status: "completed", completedAt: isoDaysAgo(15), documentArchived: true },
      purchase_contract: { status: "completed", completedAt: isoDaysAgo(10), documentArchived: true },
      delivery_confirmation: { status: "completed", completedAt: isoDaysAgo(8), documentArchived: true },
    },
    fields: {
      finalPrice: 49800,
      orderConfirmation: { orderDate: isoDaysAgo(50).slice(0, 10), deliveryDate: isoDaysAgo(10).slice(0, 10), paymentTerms: "Sofort bei Übergabe" },
      invoicing: { invoiceNumber: "RE-2025-0405", invoiceDate: isoDaysAgo(15).slice(0, 10), dueDate: isoDaysAgo(1).slice(0, 10) },
      purchaseContract: { contractNumber: "KV-2025-0405", contractDate: isoDaysAgo(10).slice(0, 10), warrantyMonths: 12, place: "Dresden" },
    },
    customerTodosOC: [],
    outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST().map((c) => ({ ...c, done: true })),
  },
  // Vorgang #6: vollständig (vor 18 Tagen übergeben)
  {
    id: "VF-2025-0135", vehicleId: "V-011", customerId: "C-011", acceptedOfferId: "OFR-2025-0215",
    createdAt: isoDaysAgo(65), updatedAt: isoDaysAgo(18),
    currentStep: "delivery_confirmation",
    steps: {
      offer: { status: "completed", completedAt: isoDaysAgo(65), documentArchived: true },
      down_payment: { status: "completed", completedAt: isoDaysAgo(60), documentArchived: true },
      order_confirmation: { status: "completed", completedAt: isoDaysAgo(55), documentArchived: true },
      outbound_check: { status: "completed", completedAt: isoDaysAgo(30), documentArchived: true },
      invoicing: { status: "completed", completedAt: isoDaysAgo(25), documentArchived: true },
      purchase_contract: { status: "completed", completedAt: isoDaysAgo(20), documentArchived: true },
      delivery_confirmation: { status: "completed", completedAt: isoDaysAgo(18), documentArchived: true },
    },
    fields: {
      finalPrice: 46500,
      downPayment: { amount: 6000, dueDate: isoDaysAgo(60).slice(0, 10), method: "Überweisung", received: true, receivedDate: isoDaysAgo(60).slice(0, 10) },
      orderConfirmation: { orderDate: isoDaysAgo(55).slice(0, 10), deliveryDate: isoDaysAgo(20).slice(0, 10), paymentTerms: "Restzahlung bei Übergabe" },
      invoicing: { invoiceNumber: "RE-2025-0395", invoiceDate: isoDaysAgo(25).slice(0, 10), dueDate: isoDaysAgo(11).slice(0, 10) },
      purchaseContract: { contractNumber: "KV-2025-0395", contractDate: isoDaysAgo(20).slice(0, 10), warrantyMonths: 12, place: "Frankfurt" },
    },
    customerTodosOC: [{ id: "ct1", title: "AHK abnehmbar montiert" }],
    outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST().map((c) => ({ ...c, done: true })),
  },
  // Vorgang #7: vollständig (vor 25 Tagen übergeben)
  {
    id: "VF-2025-0132", vehicleId: "V-010", customerId: "C-009", acceptedOfferId: "OFR-2025-0212",
    createdAt: isoDaysAgo(75), updatedAt: isoDaysAgo(25),
    currentStep: "delivery_confirmation",
    steps: {
      offer: { status: "completed", completedAt: isoDaysAgo(75), documentArchived: true },
      down_payment: { status: "completed", completedAt: isoDaysAgo(70), documentArchived: true },
      order_confirmation: { status: "completed", completedAt: isoDaysAgo(65), documentArchived: true },
      outbound_check: { status: "completed", completedAt: isoDaysAgo(40), documentArchived: true },
      invoicing: { status: "completed", completedAt: isoDaysAgo(32), documentArchived: true },
      purchase_contract: { status: "completed", completedAt: isoDaysAgo(28), documentArchived: true },
      delivery_confirmation: { status: "completed", completedAt: isoDaysAgo(25), documentArchived: true },
    },
    fields: {
      finalPrice: 58400,
      downPayment: { amount: 8000, dueDate: isoDaysAgo(70).slice(0, 10), method: "Überweisung", received: true, receivedDate: isoDaysAgo(70).slice(0, 10) },
      orderConfirmation: { orderDate: isoDaysAgo(65).slice(0, 10), deliveryDate: isoDaysAgo(28).slice(0, 10), paymentTerms: "Restzahlung bei Übergabe" },
      invoicing: { invoiceNumber: "RE-2025-0382", invoiceDate: isoDaysAgo(32).slice(0, 10), dueDate: isoDaysAgo(18).slice(0, 10) },
      purchaseContract: { contractNumber: "KV-2025-0382", contractDate: isoDaysAgo(28).slice(0, 10), warrantyMonths: 24, place: "Berlin" },
    },
    customerTodosOC: [],
    outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST().map((c) => ({ ...c, done: true })),
  },
  // Vorgang #8: vollständig vor 40 Tagen
  {
    id: "VF-2025-0128", vehicleId: "V-009", customerId: "C-008", acceptedOfferId: "OFR-2025-0210",
    createdAt: isoDaysAgo(85), updatedAt: isoDaysAgo(40),
    currentStep: "delivery_confirmation",
    steps: {
      offer: { status: "completed", completedAt: isoDaysAgo(85), documentArchived: true },
      down_payment: { status: "completed", completedAt: isoDaysAgo(80), documentArchived: true },
      order_confirmation: { status: "completed", completedAt: isoDaysAgo(75), documentArchived: true },
      outbound_check: { status: "completed", completedAt: isoDaysAgo(50), documentArchived: true },
      invoicing: { status: "completed", completedAt: isoDaysAgo(46), documentArchived: true },
      purchase_contract: { status: "completed", completedAt: isoDaysAgo(43), documentArchived: true },
      delivery_confirmation: { status: "completed", completedAt: isoDaysAgo(40), documentArchived: true },
    },
    fields: {
      finalPrice: 134900,
      downPayment: { amount: 25000, dueDate: isoDaysAgo(80).slice(0, 10), method: "Überweisung", received: true, receivedDate: isoDaysAgo(80).slice(0, 10) },
      orderConfirmation: { orderDate: isoDaysAgo(75).slice(0, 10), deliveryDate: isoDaysAgo(43).slice(0, 10), paymentTerms: "Restzahlung bei Übergabe" },
      invoicing: { invoiceNumber: "RE-2025-0331", invoiceDate: isoDaysAgo(46).slice(0, 10), dueDate: isoDaysAgo(32).slice(0, 10) },
      purchaseContract: { contractNumber: "KV-2025-0331", contractDate: isoDaysAgo(43).slice(0, 10), warrantyMonths: 24, place: "Hannover" },
    },
    customerTodosOC: [{ id: "ct1", title: "Originalfelgen + Sommerreifen übergeben" }],
    outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST().map((c) => ({ ...c, done: true })),
  },
  // Vorgang #9: AB aktiv (Transporter)
  {
    id: "VF-2025-0143", vehicleId: "V-014", customerId: "C-013", acceptedOfferId: "OFR-2025-0238",
    createdAt: isoDaysAgo(20), updatedAt: isoDaysAgo(2),
    currentStep: "order_confirmation", steps: buildEmptySteps("order_confirmation"),
    fields: {
      finalPrice: 32400,
      downPayment: { amount: 4000, dueDate: isoDaysAgo(15).slice(0, 10), method: "Überweisung", received: true, receivedDate: isoDaysAgo(15).slice(0, 10) },
    },
    customerTodosOC: [{ id: "ct1", title: "Beschriftung mit Firmenlogo" }],
    outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST(),
  },
];

export const MOCK_TODOS: Todo[] = [
  { id: "TD-001", title: "Felgenreparatur prüfen", priority: "high", done: false, dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), scope: "internal_fleet", vehicleId: "V-007", createdAt: isoDaysAgo(2), createdBy: "Admin" },
  { id: "TD-002", title: "Originalpapiere von Vorbesitzer anfordern", priority: "medium", done: false, dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), scope: "internal_pre_purchase", createdAt: isoDaysAgo(1), createdBy: "Admin" },
  { id: "TD-003", title: "Innenraumdesinfektion vor Auslieferung", priority: "low", done: true, scope: "internal_fleet", vehicleId: "V-006", createdAt: isoDaysAgo(4), createdBy: "Admin" },
  { id: "TD-004", title: "Probefahrt-Termin koordinieren", priority: "high", done: false, dueDate: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10), scope: "internal_fleet", vehicleId: "V-006", createdAt: isoDaysAgo(1), createdBy: "Admin" },
  { id: "TD-005", title: "Garantieverlängerung anbieten", priority: "medium", done: false, dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), scope: "internal_fleet", vehicleId: "V-016", createdAt: isoDaysAgo(3), createdBy: "Admin" },
  { id: "TD-006", title: "Cabrio-Verdeck Funktion testen", priority: "high", done: false, dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), scope: "internal_fleet", vehicleId: "V-018", createdAt: isoDaysAgo(2), createdBy: "Admin" },
  { id: "TD-007", title: "TÜV-Termin V-014 vereinbaren", priority: "high", done: false, dueDate: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10), scope: "internal_fleet", vehicleId: "V-014", createdAt: isoDaysAgo(1), createdBy: "Admin" },
];

export const MOCK_ACTIVITIES: Activity[] = [
  { id: "A-001", type: "vehicle_added", message: "Lexus RX 450h aufgenommen", timestamp: isoDaysAgo(7), user: "Admin", vehicleId: "V-006" },
  { id: "A-002", type: "offer_created", message: "Angebot OFR-2025-0240 für Mercedes C 220 d", timestamp: isoDaysAgo(8), user: "Admin", vehicleId: "V-003", customerId: "C-003" },
  { id: "A-003", type: "offer_accepted", message: "Angebot OFR-2025-0231 angenommen", timestamp: isoDaysAgo(13), user: "Admin", vehicleId: "V-001", customerId: "C-001" },
  { id: "A-004", type: "process_created", message: "Vorgang VF-2025-0142 angelegt", timestamp: isoDaysAgo(13), user: "Admin", processId: "VF-2025-0142" },
  { id: "A-005", type: "process_step_completed", message: "Anzahlung abgeschlossen", timestamp: isoDaysAgo(11), user: "Admin", processId: "VF-2025-0142", meta: { step: "down_payment" } },
  { id: "A-006", type: "process_step_completed", message: "Auftragsbestätigung abgeschlossen", timestamp: isoDaysAgo(8), user: "Admin", processId: "VF-2025-0142", meta: { step: "order_confirmation" } },
  { id: "A-007", type: "vehicle_location_changed", message: "BMW 320d → Hof A · Platz 03", timestamp: isoDaysAgo(2), user: "Admin", vehicleId: "V-001" },
  { id: "A-008", type: "vehicle_added", message: "Maserati GranCabrio aufgenommen", timestamp: isoDaysAgo(28), user: "Admin", vehicleId: "V-018" },
  { id: "A-009", type: "process_step_completed", message: "Übergabe abgeschlossen", timestamp: isoDaysAgo(2), user: "Admin", processId: "VF-2025-0139", meta: { step: "delivery_confirmation" } },
  { id: "A-010", type: "process_step_completed", message: "Übergabe abgeschlossen", timestamp: isoDaysAgo(8), user: "Admin", processId: "VF-2025-0137", meta: { step: "delivery_confirmation" } },
  { id: "A-011", type: "vehicle_cost_added", message: "Kosten Felgen aufbereiten (380,00 € netto)", timestamp: isoDaysAgo(2), user: "Admin", vehicleId: "V-007" },
  { id: "A-012", type: "offer_created", message: "Angebot OFR-2025-0247 für Audi Q7", timestamp: isoDaysAgo(3), user: "Admin", vehicleId: "V-016", customerId: "C-014" },
];

export const MOCK_GOALS: Goal[] = [
  { id: "G-001", metric: "revenue", period: "month", target: 250000, startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(), endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString(), label: "Umsatzziel Monat" },
  { id: "G-002", metric: "vehicles_sold", period: "month", target: 8, startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(), endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString(), label: "Verkaufte Fahrzeuge" },
  { id: "G-003", metric: "profit", period: "quarter", target: 120000, startDate: new Date(today.getFullYear(), Math.floor(today.getMonth()/3)*3, 1).toISOString(), endDate: new Date(today.getFullYear(), Math.floor(today.getMonth()/3)*3 + 3, 0).toISOString(), label: "Gewinnziel Quartal" },
];

export const DEFAULT_SETTINGS: Settings = {
  userName: "Admin",
  companyName: "VINflow Autohaus GmbH",
  locations: ["Hof A · Platz 01", "Hof A · Platz 02", "Hof A · Platz 03", "Hof B · Platz 01", "Showroom", "Werkstatt Müller", "Aufbereiter Glanz GmbH", "Unterwegs"],
  partners: [
    { id: "P-0001", name: "Aufbereiter Glanz GmbH", kind: "detailer", contactPerson: "Stefan Glanz", email: "info@glanz-gmbh.de", phone: "+49 30 1234567", address: "Industriestr. 12, 10115 Berlin", createdAt: new Date().toISOString() },
    { id: "P-0002", name: "Werkstatt Müller",       kind: "mechanic", contactPerson: "Karl Müller",   email: "service@mueller-kfz.de", phone: "+49 30 7654321", address: "Werkstatthof 4, 10119 Berlin", createdAt: new Date().toISOString() },
    { id: "P-0003", name: "AutoTrans Berlin",       kind: "transport", contactPerson: "Frau Klein",   email: "dispo@autotrans.de", phone: "+49 30 998877",  address: "Logistikzentrum 1, 12099 Berlin", createdAt: new Date().toISOString() },
    { id: "P-0004", name: "DEKRA Berlin Mitte",     kind: "tuv",      contactPerson: "Hr. Schmidt",  email: "berlin@dekra.de",       phone: "+49 30 555100",  address: "Prüfweg 7, 10117 Berlin", createdAt: new Date().toISOString() },
  ],
};
