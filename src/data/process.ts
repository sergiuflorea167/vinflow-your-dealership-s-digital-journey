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
  /** Zwischenstand: Schritt wurde verbindlich „gebucht" (Pflichtfelder fixiert), aber Beleg noch nicht erzeugt. */
  bookedAt?: string;
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
  /** Optionale Uhrzeit (HH:mm). Nur in Verbindung mit dueDate sinnvoll. */
  startTime?: string;
  endTime?: string;
  scope: TodoScope;
  vehicleId?: string;
  processId?: string;
  tags?: string[];
  assignee?: string;
  createdAt: string;
  completedAt?: string;
  createdBy: string;
  /** Auto-erzeugte Verknüpfung zu einem Calendar-Event (1:1) */
  calendarEventId?: string;
}

// ---------- Kalender ----------

export type CalendarEventType =
  | "appointment"   // klassischer Termin
  | "todo"          // verlinkt mit einem To-Do
  | "block"         // Tagesstruktur-Block (Fokus, Pause …)
  | "viewing"       // Fahrzeug-Besichtigung
  | "handover"      // Abholung / Übergabe
  | "call"          // Telefonat
  | "internal";     // intern / sonstiges

export const CALENDAR_EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  appointment: "Termin",
  todo:        "To-Do",
  block:       "Tagesblock",
  viewing:     "Besichtigung",
  handover:    "Übergabe",
  call:        "Telefonat",
  internal:    "Intern",
};

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  /** ISO Datum YYYY-MM-DD */
  date: string;
  /** HH:mm */
  startTime: string;
  /** HH:mm */
  endTime: string;
  type: CalendarEventType;
  /** Hex- oder Token-Farbe (optional, sonst aus type) */
  color?: string;
  location?: string;
  vehicleId?: string;
  processId?: string;
  customerId?: string;
  /** verlinktes To-Do */
  todoId?: string;
  done?: boolean;
  createdAt: string;
  createdBy: string;
}

/** Vorlage für die Tagesstruktur (z. B. „Verkaufstag") */
export interface DayTemplate {
  id: string;
  name: string;
  description?: string;
  blocks: Array<{
    id: string;
    title: string;
    startTime: string;   // HH:mm
    endTime: string;     // HH:mm
    type: CalendarEventType;
  }>;
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
  /** Inseratstatus: ist das Fahrzeug aktiv inseriert (mobile.de, AutoScout24, eigene Website …)? */
  listed?: { active: boolean; listedAt?: string; portals?: string[] };
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
  birthDate?: string; // YYYY-MM-DD
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

/**
 * Status eines Einkaufsplans.
 *  - tracking:  Wird verfolgt (Auktion läuft, Verhandlung mit Privatperson, Beobachtung).
 *  - won:       Deal abgeschlossen, Fahrzeug noch nicht im Bestand (z. B. Zuschlag erhalten,
 *               aber noch nicht abgeholt). Bereit zur Überführung in den Bestand.
 *  - received:  In den Bestand übergegangen.
 *  - lost:      Zuschlag verpasst / Verkäufer abgesprungen.
 *  - cancelled: Manuell verworfen.
 */
export type PurchasePlanStatus = "tracking" | "won" | "received" | "lost" | "cancelled";

export type PurchasePlanSource =
  | "auction"          // Auktionsplattform (BCA, Copart, …)
  | "private_listing"  // Privatinserat (mobile.de, AutoScout, Kleinanzeigen)
  | "dealer"           // Händler / Großhandel
  | "tip"              // Tipp / Empfehlung
  | "other";

export const PURCHASE_PLAN_SOURCE_LABELS: Record<PurchasePlanSource, string> = {
  auction: "Auktion",
  private_listing: "Privatinserat",
  dealer: "Händler",
  tip: "Tipp",
  other: "Sonstiges",
};

export interface PurchasePlanNote {
  id: string;
  text: string;
  createdAt: string;
  createdBy: string;
}

export interface PurchasePlan {
  id: string;
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  /** Geschätzter / Ziel-Einkaufspreis brutto. */
  targetPrice: number;
  /** Quelle des potenziellen Einkaufs. */
  source: PurchasePlanSource;
  /** Anbieter / Plattform / Verkäufer (z. B. „BCA Hamburg", „Privat – Müller"). */
  supplier: string;
  /** Optionaler Direktlink zum Inserat / zur Auktion. */
  sourceUrl?: string;
  /** Optional: erwartetes Abschluss-/Auktionsdatum. */
  expectedAt?: string;
  status: PurchasePlanStatus;
  /** Sobald bekannt – wird beim Bestandsübergang übernommen. */
  vin?: string;
  /** Chronologische Notizen mit Zeitstempel. */
  noteEntries: PurchasePlanNote[];
  createdAt: string;
}

// ---------- Vorgang ----------

export interface ProcessFields {
  finalPrice?: number;
  downPayment?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    amount?: number;
    dueDate?: string;
    paymentTerms?: string;
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
    paymentTerms?: string;
    paid?: boolean;
    paidDate?: string;
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
  // Customer-To-Dos pro Schritt (Angebot/AB) – mit optionalem Fälligkeitsdatum + Erledigt-Status
  customerTodosOC: { id: string; title: string; dueDate?: string; done?: boolean }[];
  // Interne Ausgangskontroll-Checkliste – mit optionalem Fälligkeitsdatum
  outboundChecklist: { id: string; label: string; done: boolean; dueDate?: string }[];
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
  // Profil – optional für Rückwärtskompatibilität
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  avatarUrl?: string;
  pdfTheme?: string;
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

// ---------- Auto-Nummern für Belege ----------

const nextSeqForPrefix = (processes: Process[], prefix: string, getter: (p: Process) => string | undefined): string => {
  const year = new Date().getFullYear();
  const re = new RegExp(`^${prefix}-${year}-(\\d{4})$`);
  let max = 0;
  for (const p of processes) {
    const v = getter(p);
    if (!v) continue;
    const m = v.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
};

export const nextInvoiceNumber = (processes: Process[]) =>
  nextSeqForPrefix(processes, "RE", (p) => p.fields.invoicing?.invoiceNumber);

export const nextDownPaymentInvoiceNumber = (processes: Process[]) =>
  nextSeqForPrefix(processes, "AR", (p) => p.fields.downPayment?.invoiceNumber);

export const nextContractNumber = (processes: Process[]) =>
  nextSeqForPrefix(processes, "KV", (p) => p.fields.purchaseContract?.contractNumber);

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
  { id: "c1", label: "Fahrzeug aufbereitet & gereinigt", done: false },
  { id: "c2", label: "Schlüssel (Haupt & Ersatz) bereit", done: false },
  { id: "c3", label: "Dokumente vollständig (Brief, Schein, Servicebuch)", done: false },
  { id: "c4", label: "Übergabe-Termin bestätigt", done: false },
];

// ---------- Mock seed ----------

const today = new Date();
const isoDaysAgo = (n: number) => new Date(today.getTime() - n * 86400000).toISOString();

// Stabile Demo-Anker: erzwingen feste Liefer-Zeitpunkte pro aktuellem Monat,
// damit das Monats-Umsatzziel zwischen Sessions nicht "wandert", wenn der
// Browser-Storage neu geseedet wird. Wenn der Tag noch in der Zukunft liegt,
// rutscht der Eintrag in den Vormonat (verhält sich realistisch).
export const stableThisMonthISO = (dayOfMonth: number): string => {
  const ref = new Date();
  const d = new Date(ref.getFullYear(), ref.getMonth(), dayOfMonth, 10, 0, 0, 0);
  if (d > ref) d.setMonth(d.getMonth() - 1);
  return d.toISOString();
};

export const stablePrevMonthISO = (dayOfMonth: number): string => {
  const ref = new Date();
  const d = new Date(ref.getFullYear(), ref.getMonth() - 1, dayOfMonth, 10, 0, 0, 0);
  return d.toISOString();
};

// Fixe Verankerung der 7 abgeschlossenen Demo-Lieferungen.
// Summe der 5 "in diesem Monat" Lieferungen = 185.500 € (konstant).
export const DEMO_DELIVERY_ANCHORS: Record<string, string> = {
  "VF-2025-0139": stableThisMonthISO(2),   // 38.900 €
  "VF-2025-0144": stableThisMonthISO(5),   // 39.900 €
  "VF-2025-0145": stableThisMonthISO(10),  // 36.900 €
  "VF-2025-0137": stableThisMonthISO(14),  // 32.900 €
  "VF-2025-0135": stableThisMonthISO(18),  // 36.900 €
  "VF-2025-0132": stablePrevMonthISO(22),  // 39.900 € (Vormonat)
  "VF-2025-0128": stablePrevMonthISO(8),   // 39.800 € (Vormonat)
};


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
    listPrice: 32900, purchasePrice: 27500, status: "reserved", arrivedAt: isoDaysAgo(34),
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
    listPrice: 28900, purchasePrice: 23500, status: "reserved", arrivedAt: isoDaysAgo(44),
    location: { name: "Showroom", kind: "showroom", since: isoDaysAgo(15) },
    locationHistory: [{ name: "Hof A · Platz 07", kind: "lot", since: isoDaysAgo(44) }],
    costs: seedCosts([{ category: "detailing", description: "Aufbereitung", netAmount: 280, vatRate: 19, date: isoDaysAgo(20) }]),
  },
  {
    id: "V-003", vin: "WDD2050461R456789", type: "kombi", make: "Mercedes-Benz", model: "C 220 d T-Modell", year: 2024, color: "Obsidianschwarz",
    mileage: 8200, fuel: "Diesel", transmission: "Automatik", power_kw: 147, power_hp: 200, doors: 5, seats: 5,
    firstRegistration: "2024-02-20", hu: "2027-02-20",
    listPrice: 36900, purchasePrice: 30500, status: "in_stock", arrivedAt: isoDaysAgo(25),
    location: { name: "Showroom", kind: "showroom", since: isoDaysAgo(10) },
    locationHistory: [{ name: "Hof B · Platz 01", kind: "lot", since: isoDaysAgo(25) }],
    costs: seedCosts([{ category: "transport", description: "Überführung", netAmount: 220, vatRate: 19, date: isoDaysAgo(25) }]),
  },
  {
    id: "V-004", vin: "VF1RFA00X67234567", type: "suv", make: "BMW", model: "X1 xDrive20d", year: 2024, color: "Kreide",
    mileage: 4500, fuel: "Diesel", transmission: "Automatik", power_kw: 110, power_hp: 150, doors: 5, seats: 5,
    firstRegistration: "2024-03-01", hu: "2027-03-01",
    listPrice: 38900, purchasePrice: 32500, status: "sold", arrivedAt: isoDaysAgo(67),
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
    listPrice: 34500, purchasePrice: 28800, status: "reserved", arrivedAt: isoDaysAgo(57),
    location: { name: "Werkstatt Müller", kind: "workshop", since: isoDaysAgo(3) },
    locationHistory: [{ name: "Hof A · Platz 12", kind: "lot", since: isoDaysAgo(57) }],
    costs: seedCosts([{ category: "workshop", description: "TÜV neu + Service", netAmount: 480, vatRate: 19, date: isoDaysAgo(3) }]),
  },
  {
    id: "V-006", vin: "JTHBK1GG3F2123456", type: "suv", make: "Audi", model: "Q3 35 TFSI", year: 2025, color: "Sonic Titanium",
    mileage: 1200, fuel: "Benzin", transmission: "DKG", power_kw: 110, power_hp: 150, doors: 5, seats: 5,
    firstRegistration: "2025-01-20", hu: "2028-01-20",
    listPrice: 36900, purchasePrice: 30500, status: "in_stock", arrivedAt: isoDaysAgo(7),
    location: { name: "Showroom", kind: "showroom", since: isoDaysAgo(5) },
    locationHistory: [{ name: "Hof A · Platz 05", kind: "lot", since: isoDaysAgo(7) }],
    costs: [],
  },
  {
    id: "V-007", vin: "ZFA31200000123456", type: "suv", make: "Audi", model: "Q3 Sportback 35 TDI", year: 2024, color: "Rosso Competizione",
    mileage: 9800, fuel: "Diesel", transmission: "Automatik", power_kw: 110, power_hp: 150, doors: 5, seats: 5,
    firstRegistration: "2024-02-12", hu: "2027-02-12",
    listPrice: 37500, purchasePrice: 30800, status: "in_stock", arrivedAt: isoDaysAgo(15),
    location: { name: "Aufbereiter Glanz GmbH", kind: "detailer", since: isoDaysAgo(2) },
    locationHistory: [{ name: "Hof A · Platz 09", kind: "lot", since: isoDaysAgo(15) }],
    costs: seedCosts([{ category: "detailing", description: "Felgen aufbereiten", netAmount: 380, vatRate: 19, date: isoDaysAgo(2) }]),
  },
  {
    id: "V-008", vin: "SAJAA01N5SC123987", type: "suv", make: "Mercedes-Benz", model: "GLB 200 d", year: 2024, color: "Eiger Grey",
    mileage: 3100, fuel: "Diesel", transmission: "Automatik", power_kw: 110, power_hp: 150, doors: 5, seats: 5,
    firstRegistration: "2024-04-02", hu: "2027-04-02",
    listPrice: 38400, purchasePrice: 31500, status: "in_stock", arrivedAt: isoDaysAgo(10),
    location: { name: "Hof B · Platz 04", kind: "lot", since: isoDaysAgo(10) },
    locationHistory: [],
    costs: [],
  },
  {
    id: "V-009", vin: "WP0AB29928S701234", type: "limousine", make: "Audi", model: "A5 Sportback 40 TDI", year: 2023, color: "GT Silber",
    mileage: 18400, fuel: "Diesel", transmission: "Automatik", power_kw: 150, power_hp: 204, doors: 2, seats: 4,
    firstRegistration: "2023-06-22", hu: "2026-06-22",
    listPrice: 39800, purchasePrice: 33500, status: "sold", arrivedAt: isoDaysAgo(95),
    location: { name: "Beim Kunden (übergeben)", kind: "customer", since: isoDaysAgo(40) },
    locationHistory: [{ name: "Showroom", kind: "showroom", since: isoDaysAgo(95) }],
    costs: seedCosts([
      { category: "transport", description: "Premium-Transport Stuttgart", netAmount: 690, vatRate: 19, date: isoDaysAgo(94) },
      { category: "detailing", description: "Keramikversiegelung", netAmount: 1200, vatRate: 19, date: isoDaysAgo(80) },
      { category: "workshop", description: "Service B + Bremsen", netAmount: 1850, vatRate: 19, date: isoDaysAgo(75) },
    ]),
  },
  {
    id: "V-010", vin: "WDB2030461F112233", type: "limousine", make: "Mercedes-Benz", model: "E 220 d", year: 2024, color: "Cavansitblau",
    mileage: 11200, fuel: "Diesel", transmission: "Automatik", power_kw: 145, power_hp: 197, doors: 4, seats: 5,
    firstRegistration: "2024-02-08", hu: "2027-02-08",
    listPrice: 39900, purchasePrice: 33800, status: "sold", arrivedAt: isoDaysAgo(82),
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
    listPrice: 36900, purchasePrice: 30500, status: "sold", arrivedAt: isoDaysAgo(72),
    location: { name: "Beim Kunden (übergeben)", kind: "customer", since: isoDaysAgo(18) },
    locationHistory: [{ name: "Hof B · Platz 02", kind: "lot", since: isoDaysAgo(72) }],
    costs: seedCosts([
      { category: "detailing", description: "Aufbereitung", netAmount: 290, vatRate: 19, date: isoDaysAgo(60) },
    ]),
  },
  {
    id: "V-012", vin: "ZAR93900007891234", type: "kleinwagen", make: "Volkswagen", model: "e-up!", year: 2024, color: "Mineral Grey",
    mileage: 6800, fuel: "Elektro", transmission: "Automatik", power_kw: 61, power_hp: 83, doors: 3, seats: 4,
    firstRegistration: "2024-05-04", hu: "2027-05-04",
    listPrice: 17900, purchasePrice: 14200, status: "in_stock", arrivedAt: isoDaysAgo(20),
    location: { name: "Hof A · Platz 14", kind: "lot", since: isoDaysAgo(20) },
    locationHistory: [],
    costs: [],
  },
  {
    id: "V-013", vin: "VF7SC9HRC12567890", type: "kleinwagen", make: "Opel", model: "Corsa GS Line", year: 2024, color: "Blau Vertigo",
    mileage: 9300, fuel: "Benzin", transmission: "Automatik", power_kw: 96, power_hp: 130, doors: 5, seats: 5,
    firstRegistration: "2024-04-18", hu: "2027-04-18",
    listPrice: 18900, purchasePrice: 14800, status: "in_stock", arrivedAt: isoDaysAgo(12),
    location: { name: "Hof B · Platz 06", kind: "lot", since: isoDaysAgo(12) },
    locationHistory: [],
    costs: seedCosts([{ category: "detailing", description: "Aufbereitung", netAmount: 180, vatRate: 19, date: isoDaysAgo(8) }]),
  },
  {
    id: "V-014", vin: "WF0AXXTTGAGH54321", type: "transporter", make: "Volkswagen", model: "T6.1 Transporter Kasten", year: 2023, color: "Frost-Weiß",
    mileage: 42000, fuel: "Diesel", transmission: "Schaltgetriebe", power_kw: 110, power_hp: 150, doors: 5, seats: 3,
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
    id: "V-015", vin: "5YJ3E1EA8KF112233", type: "limousine", make: "Volkswagen", model: "ID.3 Pro S", year: 2024, color: "Pearl White",
    mileage: 7100, fuel: "Elektro", transmission: "Automatik", power_kw: 150, power_hp: 204, doors: 4, seats: 5,
    firstRegistration: "2024-02-28", hu: "2027-02-28",
    listPrice: 32900, purchasePrice: 27500, status: "sold", arrivedAt: isoDaysAgo(60),
    location: { name: "Beim Kunden (übergeben)", kind: "customer", since: isoDaysAgo(8) },
    locationHistory: [{ name: "Hof A · Platz 11", kind: "lot", since: isoDaysAgo(60) }],
    costs: seedCosts([
      { category: "workshop", description: "Software-Update + Bremsenservice", netAmount: 280, vatRate: 19, date: isoDaysAgo(40) },
      { category: "detailing", description: "Aufbereitung + Folierung", netAmount: 720, vatRate: 19, date: isoDaysAgo(30) },
    ]),
  },
  {
    id: "V-016", vin: "WAUZZZ4M9NA776655", type: "suv", make: "Audi", model: "Q5 40 TDI", year: 2024, color: "Manhattangrau",
    mileage: 19800, fuel: "Diesel", transmission: "Automatik", power_kw: 150, power_hp: 204, doors: 5, seats: 7,
    firstRegistration: "2024-01-30", hu: "2027-01-30",
    listPrice: 39800, purchasePrice: 33500, status: "in_stock", arrivedAt: isoDaysAgo(48),
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
    listPrice: 28900, purchasePrice: 23800, status: "in_stock", arrivedAt: isoDaysAgo(18),
    location: { name: "Showroom", kind: "showroom", since: isoDaysAgo(10) },
    locationHistory: [],
    costs: [],
  },
  {
    id: "V-018", vin: "ZAMJK45J100445566", type: "cabrio", make: "Mercedes-Benz", model: "E 220 Cabrio", year: 2023, color: "Blu Emozione",
    mileage: 8900, fuel: "Benzin", transmission: "Automatik", power_kw: 145, power_hp: 197, doors: 2, seats: 4,
    firstRegistration: "2023-07-15", hu: "2026-07-15",
    listPrice: 39900, purchasePrice: 33500, status: "in_stock", arrivedAt: isoDaysAgo(28),
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
    listPrice: 35900, purchasePrice: 29800, status: "in_stock", arrivedAt: isoDaysAgo(9),
    location: { name: "Hof A · Platz 04", kind: "lot", since: isoDaysAgo(9) },
    locationHistory: [],
    costs: [],
  },
  {
    id: "V-020", vin: "VF3LBYHZRJW998822", type: "kombi", make: "Opel", model: "Insignia Sports Tourer 2.0 D", year: 2024, color: "Schwarz Perla",
    mileage: 11500, fuel: "Diesel", transmission: "Automatik", power_kw: 128, power_hp: 174, doors: 5, seats: 5,
    firstRegistration: "2024-02-26", hu: "2027-02-26",
    listPrice: 32900, purchasePrice: 27200, status: "in_stock", arrivedAt: isoDaysAgo(22),
    location: { name: "Hof B · Platz 03", kind: "lot", since: isoDaysAgo(22) },
    locationHistory: [],
    costs: seedCosts([{ category: "workshop", description: "Inspektion", netAmount: 320, vatRate: 19, date: isoDaysAgo(15) }]),
  },
  {
    id: "V-021", vin: "WBAJB91070BL77234", type: "limousine", make: "BMW", model: "318i Touring", year: 2024, color: "Frozen Bluestone",
    mileage: 6200, fuel: "Benzin", transmission: "Automatik", power_kw: 115, power_hp: 156, doors: 4, seats: 5,
    firstRegistration: "2024-02-14", hu: "2027-02-14",
    listPrice: 32900, purchasePrice: 27200, status: "in_stock", arrivedAt: isoDaysAgo(11),
    location: { name: "Showroom", kind: "showroom", since: isoDaysAgo(11) },
    locationHistory: [],
    costs: seedCosts([{ category: "transport", description: "Premium-Anlieferung", netAmount: 720, vatRate: 19, date: isoDaysAgo(11) }]),
  },
  {
    id: "V-022", vin: "WAUZZZF55LA112388", type: "suv", make: "Audi", model: "Q3 35 TFSI advanced", year: 2024, color: "Kyalamigrün",
    mileage: 8400, fuel: "Benzin", transmission: "DKG", power_kw: 110, power_hp: 150, doors: 5, seats: 5,
    firstRegistration: "2024-04-22", hu: "2027-04-22",
    listPrice: 31900, purchasePrice: 26500, status: "in_stock", arrivedAt: isoDaysAgo(5),
    location: { name: "Showroom", kind: "showroom", since: isoDaysAgo(5) },
    locationHistory: [],
    costs: [],
  },
  {
    id: "V-023", vin: "1HGCM82633A123456", type: "limousine", make: "Volkswagen", model: "Golf 1.5 TSI R-Line", year: 2024, color: "Boost Blue",
    mileage: 4200, fuel: "Benzin", transmission: "DKG", power_kw: 110, power_hp: 150, doors: 5, seats: 4,
    firstRegistration: "2024-03-08", hu: "2027-03-08",
    listPrice: 31900, purchasePrice: 26800, status: "in_stock", arrivedAt: isoDaysAgo(7),
    location: { name: "Hof A · Platz 08", kind: "lot", since: isoDaysAgo(7) },
    locationHistory: [],
    costs: [],
  },
  {
    id: "V-024", vin: "JN1AZ4EH7CM334455", type: "limousine", make: "BMW", model: "Z4 sDrive20i", year: 2023, color: "Pearl White",
    mileage: 12800, fuel: "Benzin", transmission: "Automatik", power_kw: 145, power_hp: 197, doors: 2, seats: 4,
    firstRegistration: "2023-08-30", hu: "2026-08-30",
    listPrice: 36900, purchasePrice: 30800, status: "in_stock", arrivedAt: isoDaysAgo(34),
    location: { name: "Showroom", kind: "showroom", since: isoDaysAgo(20) },
    locationHistory: [{ name: "Hof A · Platz 13", kind: "lot", since: isoDaysAgo(34) }],
    costs: seedCosts([
      { category: "detailing", description: "Premium-Aufbereitung + Versiegelung", netAmount: 980, vatRate: 19, date: isoDaysAgo(28) },
      { category: "workshop", description: "Großer Service", netAmount: 1450, vatRate: 19, date: isoDaysAgo(25) },
    ]),
  },
  {
    id: "V-025", vin: "WMEEJ8AA9KK665544", type: "kleinwagen", make: "Smart", model: "EQ fortwo", year: 2024, color: "Cool Silver",
    mileage: 3100, fuel: "Elektro", transmission: "Automatik", power_kw: 60, power_hp: 82, doors: 3, seats: 2,
    firstRegistration: "2024-05-18", hu: "2027-05-18",
    listPrice: 18900, purchasePrice: 14500, status: "in_stock", arrivedAt: isoDaysAgo(14),
    location: { name: "Hof B · Platz 09", kind: "lot", since: isoDaysAgo(14) },
    locationHistory: [],
    costs: [],
  },
  {
    id: "V-026", vin: "ZHWUC1ZD7LLA22311", type: "limousine", make: "Audi", model: "A4 Avant 35 TDI", year: 2023, color: "Verde Mantis",
    mileage: 5400, fuel: "Diesel", transmission: "Automatik", power_kw: 120, power_hp: 163, doors: 2, seats: 2,
    firstRegistration: "2023-05-12", hu: "2026-05-12",
    listPrice: 32900, purchasePrice: 27200, status: "in_stock", arrivedAt: isoDaysAgo(45),
    location: { name: "Showroom", kind: "showroom", since: isoDaysAgo(45) },
    locationHistory: [],
    costs: seedCosts([
      { category: "transport", description: "Geschlossener Spezialtransport", netAmount: 1450, vatRate: 19, date: isoDaysAgo(45) },
      { category: "detailing", description: "Carbon-Politur + Lackschutz", netAmount: 1850, vatRate: 19, date: isoDaysAgo(38) },
    ]),
  },
  {
    id: "V-027", vin: "VF1FW18B543987122", type: "transporter", make: "Mercedes-Benz", model: "Sprinter 314 CDI", year: 2023, color: "Grau Mineral",
    mileage: 38500, fuel: "Diesel", transmission: "Schaltgetriebe", power_kw: 105, power_hp: 143, doors: 5, seats: 3,
    firstRegistration: "2023-06-28", hu: "2025-06-28",
    listPrice: 28900, purchasePrice: 22500, status: "reserved", arrivedAt: isoDaysAgo(31),
    location: { name: "Hof B · Platz 11", kind: "lot", since: isoDaysAgo(31) },
    locationHistory: [],
    costs: seedCosts([{ category: "workshop", description: "Service A + Reifen", netAmount: 540, vatRate: 19, date: isoDaysAgo(20) }]),
  },
  {
    id: "V-028", vin: "WP1ZZZ92ZGLA45678", type: "suv", make: "Audi", model: "Q5 Sportback 40 TDI", year: 2024, color: "Carraraweiß",
    mileage: 9800, fuel: "Diesel", transmission: "Automatik", power_kw: 150, power_hp: 204, doors: 5, seats: 5,
    firstRegistration: "2024-01-22", hu: "2027-01-22",
    listPrice: 39900, purchasePrice: 33500, status: "sold", arrivedAt: isoDaysAgo(78),
    location: { name: "Beim Kunden (übergeben)", kind: "customer", since: isoDaysAgo(12) },
    locationHistory: [{ name: "Showroom", kind: "showroom", since: isoDaysAgo(78) }],
    costs: seedCosts([
      { category: "detailing", description: "Komplettaufbereitung", netAmount: 780, vatRate: 19, date: isoDaysAgo(60) },
      { category: "workshop", description: "Inspektion + Software-Update", netAmount: 920, vatRate: 19, date: isoDaysAgo(50) },
    ]),
  },
  {
    id: "V-029", vin: "VF7N4HMZ8GL445566", type: "kombi", make: "Opel", model: "Insignia Sports Tourer 1.5", year: 2024, color: "Perle Nera",
    mileage: 14200, fuel: "Benzin", transmission: "Automatik", power_kw: 121, power_hp: 165, doors: 5, seats: 5,
    firstRegistration: "2024-02-10", hu: "2027-02-10",
    listPrice: 35900, purchasePrice: 29500, status: "in_stock", arrivedAt: isoDaysAgo(19),
    location: { name: "Hof A · Platz 10", kind: "lot", since: isoDaysAgo(19) },
    locationHistory: [],
    costs: seedCosts([{ category: "detailing", description: "Aufbereitung", netAmount: 220, vatRate: 19, date: isoDaysAgo(10) }]),
  },
  {
    id: "V-030", vin: "KMHK481GBHU778899", type: "suv", make: "Opel", model: "Grandland 1.6 PHEV", year: 2024, color: "Phantom Black",
    mileage: 11700, fuel: "Plug-in-Hybrid", transmission: "Automatik", power_kw: 165, power_hp: 224, doors: 5, seats: 5,
    firstRegistration: "2024-03-15", hu: "2027-03-15",
    listPrice: 32900, purchasePrice: 26500, status: "in_stock", arrivedAt: isoDaysAgo(16),
    location: { name: "Hof B · Platz 05", kind: "lot", since: isoDaysAgo(16) },
    locationHistory: [],
    costs: [],
  },
  {
    id: "V-031", vin: "TMBJG9NE3K0334450", type: "kombi", make: "Škoda", model: "Octavia RS Combi", year: 2023, color: "Race Blau",
    mileage: 22800, fuel: "Benzin", transmission: "DKG", power_kw: 180, power_hp: 245, doors: 5, seats: 5,
    firstRegistration: "2023-04-08", hu: "2026-04-08",
    listPrice: 28500, purchasePrice: 23500, status: "reserved", arrivedAt: isoDaysAgo(40),
    location: { name: "Werkstatt Müller", kind: "workshop", since: isoDaysAgo(4) },
    locationHistory: [{ name: "Hof A · Platz 02", kind: "lot", since: isoDaysAgo(40) }],
    costs: seedCosts([
      { category: "workshop", description: "Bremsen rundum + Service", netAmount: 780, vatRate: 19, date: isoDaysAgo(4) },
      { category: "detailing", description: "Aufbereitung", netAmount: 260, vatRate: 19, date: isoDaysAgo(20) },
    ]),
  },
  {
    id: "V-032", vin: "5UXTR9C50MLE99887", type: "suv", make: "BMW", model: "X3 xDrive20d", year: 2024, color: "Carbonschwarz",
    mileage: 13400, fuel: "Diesel", transmission: "Automatik", power_kw: 140, power_hp: 190, doors: 5, seats: 5,
    firstRegistration: "2024-01-08", hu: "2027-01-08",
    listPrice: 39900, purchasePrice: 33500, status: "in_stock", arrivedAt: isoDaysAgo(26),
    location: { name: "Showroom", kind: "showroom", since: isoDaysAgo(15) },
    locationHistory: [{ name: "Hof A · Platz 06", kind: "lot", since: isoDaysAgo(26) }],
    costs: seedCosts([{ category: "detailing", description: "Premium-Aufbereitung", netAmount: 480, vatRate: 19, date: isoDaysAgo(15) }]),
  },
  {
    id: "V-033", vin: "WV2ZZZ7HZNH883344", type: "transporter", make: "Volkswagen", model: "T6.1 Transporter Kombi", year: 2023, color: "Mojavebeige",
    mileage: 35200, fuel: "Diesel", transmission: "DKG", power_kw: 110, power_hp: 150, doors: 5, seats: 7,
    firstRegistration: "2023-03-18", hu: "2026-03-18",
    listPrice: 32900, purchasePrice: 27500, status: "in_stock", arrivedAt: isoDaysAgo(52),
    location: { name: "Hof B · Platz 12", kind: "lot", since: isoDaysAgo(52) },
    locationHistory: [],
    costs: seedCosts([
      { category: "workshop", description: "Großer Service + AHK-Test", netAmount: 690, vatRate: 19, date: isoDaysAgo(40) },
      { category: "detailing", description: "Innenraum-Komplettreinigung", netAmount: 380, vatRate: 19, date: isoDaysAgo(30) },
    ]),
  },
  {
    id: "V-034", vin: "JM3KFBDMXM0556677", type: "suv", make: "Opel", model: "Mokka-e Elegance", year: 2024, color: "Soul Red Crystal",
    mileage: 7800, fuel: "Elektro", transmission: "Automatik", power_kw: 100, power_hp: 136, doors: 5, seats: 5,
    firstRegistration: "2024-04-12", hu: "2027-04-12",
    listPrice: 28900, purchasePrice: 23500, status: "in_stock", arrivedAt: isoDaysAgo(8),
    location: { name: "Hof A · Platz 15", kind: "lot", since: isoDaysAgo(8) },
    locationHistory: [],
    costs: [],
  },
  {
    id: "V-035", vin: "5YJYGDEE6MF114455", type: "suv", make: "Volkswagen", model: "ID.4 Pro", year: 2024, color: "Solid Black",
    mileage: 9100, fuel: "Elektro", transmission: "Automatik", power_kw: 150, power_hp: 204, doors: 5, seats: 5,
    firstRegistration: "2024-02-28", hu: "2027-02-28",
    listPrice: 36900, purchasePrice: 30500, status: "sold", arrivedAt: isoDaysAgo(70),
    location: { name: "Beim Kunden (übergeben)", kind: "customer", since: isoDaysAgo(5) },
    locationHistory: [{ name: "Showroom", kind: "showroom", since: isoDaysAgo(70) }],
    costs: seedCosts([
      { category: "workshop", description: "Software-Update + Reifenwechsel", netAmount: 320, vatRate: 19, date: isoDaysAgo(45) },
      { category: "detailing", description: "Folierung + Versiegelung", netAmount: 1280, vatRate: 19, date: isoDaysAgo(30) },
    ]),
  },
  {
    id: "V-036", vin: "WDDXJ8KB3JA001234", type: "cabrio", make: "Mercedes-Benz", model: "CLA 220 Coupé", year: 2023, color: "Selenitgrau Magno",
    mileage: 6800, fuel: "Benzin", transmission: "DKG", power_kw: 140, power_hp: 190, doors: 2, seats: 2,
    firstRegistration: "2023-07-04", hu: "2026-07-04",
    listPrice: 38900, purchasePrice: 32500, status: "in_stock", arrivedAt: isoDaysAgo(38),
    location: { name: "Showroom", kind: "showroom", since: isoDaysAgo(38) },
    locationHistory: [],
    costs: seedCosts([
      { category: "transport", description: "Geschlossener Transport", netAmount: 850, vatRate: 19, date: isoDaysAgo(38) },
      { category: "detailing", description: "Cabrio-Verdeckpflege + Versiegelung", netAmount: 720, vatRate: 19, date: isoDaysAgo(30) },
    ]),
  },
  {
    id: "V-037", vin: "WVWZZZAUZNW445566", type: "kleinwagen", make: "Volkswagen", model: "Polo GTI", year: 2024, color: "Reflexsilber",
    mileage: 5600, fuel: "Benzin", transmission: "DKG", power_kw: 152, power_hp: 207, doors: 5, seats: 5,
    firstRegistration: "2024-04-30", hu: "2027-04-30",
    listPrice: 28900, purchasePrice: 23800, status: "in_stock", arrivedAt: isoDaysAgo(6),
    location: { name: "Hof A · Platz 16", kind: "lot", since: isoDaysAgo(6) },
    locationHistory: [],
    costs: [],
  },
];

export const MOCK_PURCHASE_PLANS: PurchasePlan[] = [
  { id: "PP-2025-014", type: "suv", make: "BMW", model: "X1 xDrive20d", year: 2024, targetPrice: 32000, source: "auction", supplier: "BCA Hamburg", sourceUrl: "https://bca.com/auctions/12345", expectedAt: "2025-05-08", status: "won", noteEntries: [
      { id: "n1", text: "Auktion endet 08.05. – Mindestgebot 30k. VIN noch nicht freigegeben.", createdAt: isoDaysAgo(15), createdBy: "Admin" },
      { id: "n2", text: "Zuschlag erhalten bei 31.500 €. Abholung KW 20.", createdAt: isoDaysAgo(2), createdBy: "Admin" },
    ], createdAt: isoDaysAgo(15) },
  { id: "PP-2025-015", type: "suv", make: "Audi", model: "Q3 35 TFSI", year: 2024, targetPrice: 31500, source: "dealer", supplier: "Audi Großhandel Ingolstadt", expectedAt: "2025-05-15", status: "tracking", noteEntries: [
      { id: "n1", text: "Erstkontakt – Verkäufer prüft Konditionen, Rückmeldung bis Mittwoch.", createdAt: isoDaysAgo(8), createdBy: "Admin" },
    ], createdAt: isoDaysAgo(8) },
  { id: "PP-2025-016", type: "suv", make: "Volkswagen", model: "ID.4 Pro", year: 2024, targetPrice: 30500, source: "private_listing", supplier: "Privat – mobile.de", sourceUrl: "https://mobile.de/inserate/vw-id4", status: "tracking", noteEntries: [
      { id: "n1", text: "Privatverkäufer aus Stuttgart. Probefahrt Samstag vereinbart.", createdAt: isoDaysAgo(5), createdBy: "Admin" },
      { id: "n2", text: "Zustand top, 22.000 km. Verhandlungsbasis 31k – Gegenangebot 30k abgegeben.", createdAt: isoDaysAgo(3), createdBy: "Admin" },
    ], createdAt: isoDaysAgo(5) },
  { id: "PP-2025-017", type: "limousine", make: "Mercedes-Benz", model: "E 220 d", year: 2023, targetPrice: 33500, source: "auction", supplier: "MB Auktion Bremen", expectedAt: "2025-05-30", status: "won", noteEntries: [
      { id: "n1", text: "Limit 34k gesetzt. VIN folgt nach Zuschlag.", createdAt: isoDaysAgo(3), createdBy: "Admin" },
    ], createdAt: isoDaysAgo(3) },
  { id: "PP-2025-018", type: "kleinwagen", make: "Opel", model: "Corsa 1.2", year: 2024, targetPrice: 14500, source: "dealer", supplier: "Opel Großhandel Rüsselsheim", expectedAt: "2025-06-05", status: "tracking", noteEntries: [], createdAt: isoDaysAgo(2) },
  { id: "PP-2025-019", type: "kombi", make: "BMW", model: "320d Touring", year: 2024, targetPrice: 32500, source: "private_listing", supplier: "Privat – AutoScout24", sourceUrl: "https://autoscout24.de/inserate/bmw-320d", status: "tracking", noteEntries: [
      { id: "n1", text: "Verkäufer hat noch 2 weitere Interessenten. Telefonat heute Abend.", createdAt: isoDaysAgo(1), createdBy: "Admin" },
    ], createdAt: isoDaysAgo(1) },
  { id: "PP-2025-020", type: "suv", make: "Mercedes-Benz", model: "GLB 200 d", year: 2024, targetPrice: 31500, source: "auction", supplier: "MB Auktion Köln", expectedAt: "2025-06-18", status: "won", noteEntries: [
      { id: "n1", text: "Zuschlag bei 31k. Transport organisiert für KW 25.", createdAt: isoDaysAgo(4), createdBy: "Admin" },
    ], createdAt: isoDaysAgo(4) },
  { id: "PP-2025-021", type: "limousine", make: "Volkswagen", model: "ID.3 Pro", year: 2024, targetPrice: 27500, source: "tip", supplier: "Tipp – Kollege Becker", status: "lost", noteEntries: [
      { id: "n1", text: "Anderer Händler war schneller – Deal verloren.", createdAt: isoDaysAgo(2), createdBy: "Admin" },
    ], createdAt: isoDaysAgo(2) },
  { id: "PP-2025-022", type: "kleinwagen", make: "Volkswagen", model: "Polo 1.0 TSI", year: 2024, targetPrice: 16900, source: "private_listing", supplier: "Privat – Kleinanzeigen", sourceUrl: "https://kleinanzeigen.de/vw-polo", status: "tracking", noteEntries: [], createdAt: isoDaysAgo(1) },
  { id: "PP-2025-023", type: "transporter", make: "Mercedes-Benz", model: "Sprinter 314 CDI", year: 2024, targetPrice: 28500, source: "dealer", supplier: "MB Großhandel", expectedAt: "2025-07-08", status: "won", noteEntries: [
      { id: "n1", text: "Bestellung bestätigt – Liefertermin 08.07.", createdAt: isoDaysAgo(6), createdBy: "Admin" },
    ], createdAt: isoDaysAgo(6) },
];

export const MOCK_OFFERS: Offer[] = [
  { id: "OFR-2025-0231", vehicleId: "V-001", customerId: "C-001", createdAt: isoDaysAgo(14), validUntil: "2025-05-15", price: 32900, status: "accepted", customerTodos: [{ id: "t1", title: "Winterreifen-Set inkludiert" }, { id: "t2", title: "Service-Inspektion vor Übergabe" }] },
  { id: "OFR-2025-0228", vehicleId: "V-001", customerId: "C-002", createdAt: isoDaysAgo(18), validUntil: "2025-04-22", price: 32900, status: "rejected", customerTodos: [] },
  { id: "OFR-2025-0229", vehicleId: "V-002", customerId: "C-002", createdAt: isoDaysAgo(18), validUntil: "2025-05-12", price: 28900, status: "accepted", customerTodos: [{ id: "t1", title: "Lederpflege-Set inklusive" }] },
  { id: "OFR-2025-0240", vehicleId: "V-003", customerId: "C-003", createdAt: isoDaysAgo(8), validUntil: "2025-05-20", price: 36900, status: "sent", customerTodos: [] },
  { id: "OFR-2025-0241", vehicleId: "V-003", customerId: "C-005", createdAt: isoDaysAgo(6), validUntil: "2025-05-22", price: 36900, status: "sent", customerTodos: [] },
  { id: "OFR-2025-0220", vehicleId: "V-004", customerId: "C-004", createdAt: isoDaysAgo(24), validUntil: "2025-04-16", price: 38900, status: "accepted", customerTodos: [{ id: "t1", title: "Sportabgasanlage nachgerüstet" }] },
  { id: "OFR-2025-0218", vehicleId: "V-005", customerId: "C-006", createdAt: isoDaysAgo(28), validUntil: "2025-04-30", price: 34500, status: "accepted", customerTodos: [] },
  { id: "OFR-2025-0245", vehicleId: "V-006", customerId: "C-007", createdAt: isoDaysAgo(4), validUntil: "2025-05-25", price: 36900, status: "sent", customerTodos: [] },
  { id: "OFR-2025-0246", vehicleId: "V-006", customerId: "C-010", createdAt: isoDaysAgo(2), validUntil: "2025-05-26", price: 36900, status: "sent", customerTodos: [] },
  { id: "OFR-2025-0210", vehicleId: "V-009", customerId: "C-008", createdAt: isoDaysAgo(85), validUntil: "2025-02-28", price: 39800, status: "accepted", customerTodos: [{ id: "t1", title: "Originalfelgen + Sommerreifen" }] },
  { id: "OFR-2025-0212", vehicleId: "V-010", customerId: "C-009", createdAt: isoDaysAgo(75), validUntil: "2025-03-15", price: 39900, status: "accepted", customerTodos: [] },
  { id: "OFR-2025-0215", vehicleId: "V-011", customerId: "C-011", createdAt: isoDaysAgo(65), validUntil: "2025-03-25", price: 36900, status: "accepted", customerTodos: [{ id: "t1", title: "AHK abnehmbar nachrüsten" }] },
  { id: "OFR-2025-0238", vehicleId: "V-014", customerId: "C-013", createdAt: isoDaysAgo(20), validUntil: "2025-05-10", price: 32400, status: "accepted", customerTodos: [{ id: "t1", title: "Beschriftung möglich" }] },
  { id: "OFR-2025-0205", vehicleId: "V-015", customerId: "C-012", createdAt: isoDaysAgo(55), validUntil: "2025-03-15", price: 32900, status: "accepted", customerTodos: [] },
  { id: "OFR-2025-0247", vehicleId: "V-016", customerId: "C-014", createdAt: isoDaysAgo(3), validUntil: "2025-05-28", price: 39800, status: "sent", customerTodos: [] },
  { id: "OFR-2025-0248", vehicleId: "V-018", customerId: "C-015", createdAt: isoDaysAgo(1), validUntil: "2025-06-01", price: 39900, status: "draft", customerTodos: [] },
  { id: "OFR-2025-0249", vehicleId: "V-021", customerId: "C-016", createdAt: isoDaysAgo(5), validUntil: "2025-06-04", price: 32900, status: "sent", customerTodos: [{ id: "t1", title: "Garantie-Verlängerung 12 Monate" }] },
  { id: "OFR-2025-0250", vehicleId: "V-022", customerId: "C-017", createdAt: isoDaysAgo(2), validUntil: "2025-06-08", price: 31900, status: "sent", customerTodos: [] },
  { id: "OFR-2025-0251", vehicleId: "V-024", customerId: "C-018", createdAt: isoDaysAgo(7), validUntil: "2025-05-30", price: 36900, status: "sent", customerTodos: [{ id: "t1", title: "Probefahrt am Wochenende" }] },
  { id: "OFR-2025-0252", vehicleId: "V-026", customerId: "C-019", createdAt: isoDaysAgo(15), validUntil: "2025-05-25", price: 32900, status: "sent", customerTodos: [{ id: "t1", title: "Finanzierungsangebot prüfen" }] },
  { id: "OFR-2025-0253", vehicleId: "V-027", customerId: "C-028", createdAt: isoDaysAgo(12), validUntil: "2025-05-20", price: 28900, status: "accepted", customerTodos: [{ id: "t1", title: "Firmenbeschriftung organisieren" }] },
  { id: "OFR-2025-0254", vehicleId: "V-028", customerId: "C-019", createdAt: isoDaysAgo(72), validUntil: "2025-03-30", price: 39900, status: "accepted", customerTodos: [] },
  { id: "OFR-2025-0255", vehicleId: "V-031", customerId: "C-020", createdAt: isoDaysAgo(8), validUntil: "2025-06-01", price: 28500, status: "accepted", customerTodos: [{ id: "t1", title: "Winterreifen mitnehmen" }] },
  { id: "OFR-2025-0256", vehicleId: "V-032", customerId: "C-021", createdAt: isoDaysAgo(4), validUntil: "2025-05-29", price: 39900, status: "sent", customerTodos: [] },
  { id: "OFR-2025-0257", vehicleId: "V-033", customerId: "C-022", createdAt: isoDaysAgo(11), validUntil: "2025-05-26", price: 32900, status: "draft", customerTodos: [] },
  { id: "OFR-2025-0258", vehicleId: "V-034", customerId: "C-023", createdAt: isoDaysAgo(3), validUntil: "2025-06-02", price: 28900, status: "sent", customerTodos: [{ id: "t1", title: "Testtag mit Familie" }] },
  { id: "OFR-2025-0259", vehicleId: "V-035", customerId: "C-024", createdAt: isoDaysAgo(60), validUntil: "2025-03-30", price: 36900, status: "accepted", customerTodos: [] },
  { id: "OFR-2025-0260", vehicleId: "V-036", customerId: "C-019", createdAt: isoDaysAgo(20), validUntil: "2025-05-15", price: 38900, status: "rejected", customerTodos: [] },
  { id: "OFR-2025-0261", vehicleId: "V-036", customerId: "C-025", createdAt: isoDaysAgo(8), validUntil: "2025-06-04", price: 38900, status: "sent", customerTodos: [{ id: "t1", title: "Ledersitze in Sonderfarbe" }] },
  { id: "OFR-2025-0262", vehicleId: "V-037", customerId: "C-026", createdAt: isoDaysAgo(4), validUntil: "2025-06-01", price: 28900, status: "sent", customerTodos: [] },
  { id: "OFR-2025-0263", vehicleId: "V-008", customerId: "C-020", createdAt: isoDaysAgo(6), validUntil: "2025-05-28", price: 38400, status: "sent", customerTodos: [{ id: "t1", title: "Wallbox 11kW als Zubehör" }] },
  { id: "OFR-2025-0264", vehicleId: "V-013", customerId: "C-016", createdAt: isoDaysAgo(9), validUntil: "2025-05-22", price: 18900, status: "rejected", customerTodos: [] },
  { id: "OFR-2025-0265", vehicleId: "V-019", customerId: "C-026", createdAt: isoDaysAgo(2), validUntil: "2025-06-08", price: 35900, status: "sent", customerTodos: [] },
  { id: "OFR-2025-0266", vehicleId: "V-029", customerId: "C-022", createdAt: isoDaysAgo(7), validUntil: "2025-05-26", price: 35900, status: "sent", customerTodos: [{ id: "t1", title: "Anhängerkupplung nachrüsten" }] },
  { id: "OFR-2025-0267", vehicleId: "V-030", customerId: "C-027", createdAt: isoDaysAgo(5), validUntil: "2025-05-30", price: 32900, status: "draft", customerTodos: [] },
];

export const MOCK_PROCESSES: Process[] = [
  // In-Flight Vorgang #1: Outbound-Check
  {
    id: "VF-2025-0142", vehicleId: "V-001", customerId: "C-001", acceptedOfferId: "OFR-2025-0231",
    createdAt: isoDaysAgo(13), updatedAt: isoDaysAgo(2),
    currentStep: "outbound_check", steps: buildEmptySteps("outbound_check"),
    fields: {
      finalPrice: 32900,
      downPayment: { amount: 4500, dueDate: "2025-04-15", method: "Überweisung", received: true, receivedDate: "2025-04-14" },
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
    fields: { finalPrice: 28900 },
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
      delivery_confirmation: { status: "completed", completedAt: DEMO_DELIVERY_ANCHORS["VF-2025-0139"], documentArchived: true },
    },
    fields: {
      finalPrice: 38900,
      downPayment: { amount: 5000, dueDate: "2025-04-05", method: "Überweisung", received: true, receivedDate: "2025-04-04" },
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
      finalPrice: 34500,
      downPayment: { amount: 4500, dueDate: "2025-04-01", method: "Überweisung", received: true, receivedDate: "2025-03-31" },
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
      delivery_confirmation: { status: "completed", completedAt: DEMO_DELIVERY_ANCHORS["VF-2025-0137"], documentArchived: true },
    },
    fields: {
      finalPrice: 32900,
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
      delivery_confirmation: { status: "completed", completedAt: DEMO_DELIVERY_ANCHORS["VF-2025-0135"], documentArchived: true },
    },
    fields: {
      finalPrice: 36900,
      downPayment: { amount: 5000, dueDate: isoDaysAgo(60).slice(0, 10), method: "Überweisung", received: true, receivedDate: isoDaysAgo(60).slice(0, 10) },
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
      delivery_confirmation: { status: "completed", completedAt: DEMO_DELIVERY_ANCHORS["VF-2025-0132"], documentArchived: true },
    },
    fields: {
      finalPrice: 39900,
      downPayment: { amount: 5000, dueDate: isoDaysAgo(70).slice(0, 10), method: "Überweisung", received: true, receivedDate: isoDaysAgo(70).slice(0, 10) },
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
      delivery_confirmation: { status: "completed", completedAt: DEMO_DELIVERY_ANCHORS["VF-2025-0128"], documentArchived: true },
    },
    fields: {
      finalPrice: 39800,
      downPayment: { amount: 5000, dueDate: isoDaysAgo(80).slice(0, 10), method: "Überweisung", received: true, receivedDate: isoDaysAgo(80).slice(0, 10) },
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
  // Vorgang #10: Cayenne (V-028) - Übergeben
  {
    id: "VF-2025-0144", vehicleId: "V-028", customerId: "C-019", acceptedOfferId: "OFR-2025-0254",
    createdAt: isoDaysAgo(72), updatedAt: isoDaysAgo(12),
    currentStep: "delivery_confirmation",
    steps: {
      offer: { status: "completed", completedAt: isoDaysAgo(72), documentArchived: true },
      down_payment: { status: "completed", completedAt: isoDaysAgo(68), documentArchived: true },
      order_confirmation: { status: "completed", completedAt: isoDaysAgo(60), documentArchived: true },
      outbound_check: { status: "completed", completedAt: isoDaysAgo(20), documentArchived: true },
      invoicing: { status: "completed", completedAt: isoDaysAgo(15), documentArchived: true },
      purchase_contract: { status: "completed", completedAt: isoDaysAgo(13), documentArchived: true },
      delivery_confirmation: { status: "completed", completedAt: DEMO_DELIVERY_ANCHORS["VF-2025-0144"], documentArchived: true },
    },
    fields: {
      finalPrice: 39900,
      downPayment: { amount: 5000, dueDate: isoDaysAgo(68).slice(0, 10), method: "Überweisung", received: true, receivedDate: isoDaysAgo(68).slice(0, 10) },
      orderConfirmation: { orderDate: isoDaysAgo(60).slice(0, 10), deliveryDate: isoDaysAgo(13).slice(0, 10), paymentTerms: "Restzahlung bei Übergabe" },
      invoicing: { invoiceNumber: "RE-2025-0438", invoiceDate: isoDaysAgo(15).slice(0, 10), dueDate: isoDaysAgo(1).slice(0, 10) },
      purchaseContract: { contractNumber: "KV-2025-0438", contractDate: isoDaysAgo(13).slice(0, 10), warrantyMonths: 24, place: "Stuttgart" },
    },
    customerTodosOC: [],
    outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST().map((c) => ({ ...c, done: true })),
  },
  // Vorgang #11: VW ID.4 Proerformance (V-035) - Übergeben
  {
    id: "VF-2025-0145", vehicleId: "V-035", customerId: "C-024", acceptedOfferId: "OFR-2025-0259",
    createdAt: isoDaysAgo(60), updatedAt: isoDaysAgo(5),
    currentStep: "delivery_confirmation",
    steps: {
      offer: { status: "completed", completedAt: isoDaysAgo(60), documentArchived: true },
      down_payment: { status: "skipped", completedAt: isoDaysAgo(58) },
      order_confirmation: { status: "completed", completedAt: isoDaysAgo(50), documentArchived: true },
      outbound_check: { status: "completed", completedAt: isoDaysAgo(15), documentArchived: true },
      invoicing: { status: "completed", completedAt: isoDaysAgo(10), documentArchived: true },
      purchase_contract: { status: "completed", completedAt: isoDaysAgo(7), documentArchived: true },
      delivery_confirmation: { status: "completed", completedAt: DEMO_DELIVERY_ANCHORS["VF-2025-0145"], documentArchived: true },
    },
    fields: {
      finalPrice: 36900,
      orderConfirmation: { orderDate: isoDaysAgo(50).slice(0, 10), deliveryDate: isoDaysAgo(7).slice(0, 10), paymentTerms: "Sofort bei Übergabe" },
      invoicing: { invoiceNumber: "RE-2025-0445", invoiceDate: isoDaysAgo(10).slice(0, 10), dueDate: isoDaysAgo(0).slice(0, 10) },
      purchaseContract: { contractNumber: "KV-2025-0445", contractDate: isoDaysAgo(7).slice(0, 10), warrantyMonths: 24, place: "Dresden" },
    },
    customerTodosOC: [],
    outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST().map((c) => ({ ...c, done: true })),
  },
  // Vorgang #12: Mercedes Sprinter (V-027) - Anzahlung erhalten, AB als nächstes
  {
    id: "VF-2025-0146", vehicleId: "V-027", customerId: "C-028", acceptedOfferId: "OFR-2025-0253",
    createdAt: isoDaysAgo(11), updatedAt: isoDaysAgo(3),
    currentStep: "order_confirmation", steps: buildEmptySteps("order_confirmation"),
    fields: {
      finalPrice: 28900,
      downPayment: { amount: 4000, dueDate: isoDaysAgo(8).slice(0, 10), method: "Überweisung", received: true, receivedDate: isoDaysAgo(7).slice(0, 10) },
    },
    customerTodosOC: [{ id: "ct1", title: "Firmenbeschriftung organisieren" }],
    outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST(),
  },
  // Vorgang #13: Skoda Octavia RS (V-031) - in Outbound Check
  {
    id: "VF-2025-0147", vehicleId: "V-031", customerId: "C-020", acceptedOfferId: "OFR-2025-0255",
    createdAt: isoDaysAgo(7), updatedAt: isoDaysAgo(1),
    currentStep: "outbound_check", steps: buildEmptySteps("outbound_check"),
    fields: {
      finalPrice: 28500,
      downPayment: { amount: 3500, dueDate: isoDaysAgo(5).slice(0, 10), method: "Überweisung", received: true, receivedDate: isoDaysAgo(5).slice(0, 10) },
      orderConfirmation: { orderDate: isoDaysAgo(4).slice(0, 10), deliveryDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10), paymentTerms: "Restzahlung bei Übergabe" },
    },
    customerTodosOC: [{ id: "ct1", title: "Winterreifen einlagern" }],
    outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST().map((c, i) => ({ ...c, done: i < 3 })),
  },
];

// Chronologie der verankerten Lieferungen sicherstellen: purchase_contract und
// invoicing dürfen nicht zeitlich NACH der Übergabe liegen.
(() => {
  const DAY = 86400000;
  for (const p of MOCK_PROCESSES) {
    const anchor = DEMO_DELIVERY_ANCHORS[p.id];
    if (!anchor) continue;
    const recDel = p.steps.delivery_confirmation;
    if (!recDel || recDel.status !== "completed") continue;
    const at = new Date(anchor).getTime();
    const fix = (rec: typeof recDel | undefined, daysBefore: number) => {
      if (!rec || rec.status !== "completed" || !rec.completedAt) return;
      const t = new Date(rec.completedAt).getTime();
      if (t > at - DAY) rec.completedAt = new Date(at - daysBefore * DAY).toISOString();
    };
    fix(p.steps.invoicing, 3);
    fix(p.steps.purchase_contract, 1);
  }
})();


export const MOCK_TODOS: Todo[] = [
  { id: "TD-001", title: "Felgenreparatur prüfen", priority: "high", done: false, dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), scope: "internal_fleet", vehicleId: "V-007", createdAt: isoDaysAgo(2), createdBy: "Admin" },
  { id: "TD-002", title: "Originalpapiere von Vorbesitzer anfordern", priority: "medium", done: false, dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), scope: "internal_pre_purchase", createdAt: isoDaysAgo(1), createdBy: "Admin" },
  { id: "TD-003", title: "Innenraumdesinfektion vor Auslieferung", priority: "low", done: true, scope: "internal_fleet", vehicleId: "V-006", createdAt: isoDaysAgo(4), createdBy: "Admin" },
  { id: "TD-004", title: "Probefahrt-Termin koordinieren", priority: "high", done: false, dueDate: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10), scope: "internal_fleet", vehicleId: "V-006", createdAt: isoDaysAgo(1), createdBy: "Admin" },
  { id: "TD-005", title: "Garantieverlängerung anbieten", priority: "medium", done: false, dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), scope: "internal_fleet", vehicleId: "V-016", createdAt: isoDaysAgo(3), createdBy: "Admin" },
  { id: "TD-006", title: "Cabrio-Verdeck Funktion testen", priority: "high", done: false, dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), scope: "internal_fleet", vehicleId: "V-018", createdAt: isoDaysAgo(2), createdBy: "Admin" },
  { id: "TD-007", title: "TÜV-Termin V-014 vereinbaren", priority: "high", done: false, dueDate: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10), scope: "internal_fleet", vehicleId: "V-014", createdAt: isoDaysAgo(1), createdBy: "Admin" },
  { id: "TD-008", title: "Audi A4 Avant: Probefahrt vorbereiten", priority: "high", done: false, dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), scope: "internal_fleet", vehicleId: "V-026", createdAt: isoDaysAgo(1), createdBy: "Admin" },
  { id: "TD-009", title: "VW ID.3 Pro in Verkaufsplanung aufnehmen", priority: "low", done: false, scope: "internal_pre_purchase", createdAt: isoDaysAgo(2), createdBy: "Admin" },
  { id: "TD-010", title: "Sprinter Anlieferung mit Logistik klären", priority: "medium", done: true, scope: "internal_pre_purchase", createdAt: isoDaysAgo(5), createdBy: "Admin" },
  { id: "TD-011", title: "BMW M5: Detailfotos für Online-Inserat", priority: "medium", done: false, dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), scope: "internal_fleet", vehicleId: "V-021", createdAt: isoDaysAgo(2), createdBy: "Admin" },
  { id: "TD-012", title: "VW Golf R-Line: Reifen prüfen", priority: "low", done: false, scope: "internal_fleet", vehicleId: "V-023", createdAt: isoDaysAgo(1), createdBy: "Admin" },
  { id: "TD-013", title: "Mercedes-Benz CLA 220: Cabrioverdeck einölen", priority: "high", done: false, dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), scope: "internal_fleet", vehicleId: "V-036", createdAt: isoDaysAgo(3), createdBy: "Admin" },
  { id: "TD-014", title: "Polo GTI: Standortwechsel zur Übergabe", priority: "medium", done: false, dueDate: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10), scope: "internal_fleet", vehicleId: "V-037", createdAt: isoDaysAgo(1), createdBy: "Admin" },
  { id: "TD-015", title: "Tucson: Hybrid-Batteriegarantie dokumentieren", priority: "low", done: true, scope: "internal_fleet", vehicleId: "V-030", createdAt: isoDaysAgo(7), createdBy: "Admin" },
  { id: "TD-016", title: "Multivan: Innenraumreinigung 7-Sitzer", priority: "medium", done: false, dueDate: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10), scope: "internal_fleet", vehicleId: "V-033", createdAt: isoDaysAgo(2), createdBy: "Admin" },
];

export const MOCK_ACTIVITIES: Activity[] = [
  { id: "A-001", type: "vehicle_added", message: "Audi Q3 35 TFSI aufgenommen", timestamp: isoDaysAgo(7), user: "Admin", vehicleId: "V-006" },
  { id: "A-002", type: "offer_created", message: "Angebot OFR-2025-0240 für Mercedes C 220 d", timestamp: isoDaysAgo(8), user: "Admin", vehicleId: "V-003", customerId: "C-003" },
  { id: "A-003", type: "offer_accepted", message: "Angebot OFR-2025-0231 angenommen", timestamp: isoDaysAgo(13), user: "Admin", vehicleId: "V-001", customerId: "C-001" },
  { id: "A-004", type: "process_created", message: "Vorgang VF-2025-0142 angelegt", timestamp: isoDaysAgo(13), user: "Admin", processId: "VF-2025-0142" },
  { id: "A-005", type: "process_step_completed", message: "Anzahlung abgeschlossen", timestamp: isoDaysAgo(11), user: "Admin", processId: "VF-2025-0142", meta: { step: "down_payment" } },
  { id: "A-006", type: "process_step_completed", message: "Auftragsbestätigung abgeschlossen", timestamp: isoDaysAgo(8), user: "Admin", processId: "VF-2025-0142", meta: { step: "order_confirmation" } },
  { id: "A-007", type: "vehicle_location_changed", message: "BMW 320d → Hof A · Platz 03", timestamp: isoDaysAgo(2), user: "Admin", vehicleId: "V-001" },
  { id: "A-008", type: "vehicle_added", message: "Mercedes-Benz E 220 Cabrio aufgenommen", timestamp: isoDaysAgo(28), user: "Admin", vehicleId: "V-018" },
  { id: "A-009", type: "process_step_completed", message: "Übergabe abgeschlossen", timestamp: isoDaysAgo(2), user: "Admin", processId: "VF-2025-0139", meta: { step: "delivery_confirmation" } },
  { id: "A-010", type: "process_step_completed", message: "Übergabe abgeschlossen", timestamp: isoDaysAgo(8), user: "Admin", processId: "VF-2025-0137", meta: { step: "delivery_confirmation" } },
  { id: "A-011", type: "vehicle_cost_added", message: "Kosten Felgen aufbereiten (380,00 € netto)", timestamp: isoDaysAgo(2), user: "Admin", vehicleId: "V-007" },
  { id: "A-012", type: "offer_created", message: "Angebot OFR-2025-0247 für Audi Q5 40 TDI", timestamp: isoDaysAgo(3), user: "Admin", vehicleId: "V-016", customerId: "C-014" },
  { id: "A-013", type: "vehicle_added", message: "Audi A4 Avant 35 TDI aufgenommen", timestamp: isoDaysAgo(45), user: "Admin", vehicleId: "V-026" },
  { id: "A-014", type: "vehicle_added", message: "Mercedes-Benz CLA 220 C Roadster aufgenommen", timestamp: isoDaysAgo(38), user: "Admin", vehicleId: "V-036" },
  { id: "A-015", type: "offer_created", message: "Angebot OFR-2025-0252 für Audi A4 Avant", timestamp: isoDaysAgo(15), user: "Admin", vehicleId: "V-026", customerId: "C-019" },
  { id: "A-016", type: "offer_accepted", message: "Angebot OFR-2025-0254 angenommen (Audi Q5 Sportback)", timestamp: isoDaysAgo(72), user: "Admin", vehicleId: "V-028", customerId: "C-019" },
  { id: "A-017", type: "process_step_completed", message: "Übergabe abgeschlossen (Audi Q5 Sportback)", timestamp: isoDaysAgo(12), user: "Admin", processId: "VF-2025-0144", meta: { step: "delivery_confirmation" } },
  { id: "A-018", type: "offer_accepted", message: "Angebot OFR-2025-0255 angenommen (Octavia RS)", timestamp: isoDaysAgo(7), user: "Admin", vehicleId: "V-031", customerId: "C-020" },
  { id: "A-019", type: "process_created", message: "Vorgang VF-2025-0147 angelegt (Octavia RS)", timestamp: isoDaysAgo(7), user: "Admin", processId: "VF-2025-0147" },
  { id: "A-020", type: "process_step_completed", message: "Anzahlung erhalten (Octavia RS)", timestamp: isoDaysAgo(5), user: "Admin", processId: "VF-2025-0147", meta: { step: "down_payment" } },
  { id: "A-021", type: "offer_rejected", message: "Angebot OFR-2025-0260 abgelehnt (AMG GT)", timestamp: isoDaysAgo(18), user: "Admin", vehicleId: "V-036", customerId: "C-019" },
  { id: "A-022", type: "vehicle_cost_added", message: "Carbon-Politur Audi A4 Avant (1.850,00 € netto)", timestamp: isoDaysAgo(38), user: "Admin", vehicleId: "V-026" },
  { id: "A-023", type: "vehicle_added", message: "BMW M5 Competition aufgenommen", timestamp: isoDaysAgo(11), user: "Admin", vehicleId: "V-021" },
  { id: "A-024", type: "customer_added", message: "Auto Müller GmbH als B2B-Kunde angelegt", timestamp: isoDaysAgo(12), user: "Admin", customerId: "C-027" },
  { id: "A-025", type: "customer_added", message: "Logistik Nord GmbH als B2B-Kunde angelegt", timestamp: isoDaysAgo(14), user: "Admin", customerId: "C-028" },
  { id: "A-026", type: "vehicle_location_changed", message: "BMW M5 → Showroom", timestamp: isoDaysAgo(11), user: "Admin", vehicleId: "V-021" },
  { id: "A-027", type: "process_step_completed", message: "Übergabe abgeschlossen (VW ID.4 Pro)", timestamp: isoDaysAgo(5), user: "Admin", processId: "VF-2025-0145", meta: { step: "delivery_confirmation" } },
];

export const MOCK_GOALS: Goal[] = [
  { id: "G-001", metric: "revenue", period: "month", target: 125000, startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(), endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString(), label: "Umsatzziel Monat" },
  { id: "G-002", metric: "vehicles_sold", period: "month", target: 5, startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(), endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString(), label: "Verkaufte Fahrzeuge" },
  { id: "G-003", metric: "profit", period: "quarter", target: 45000, startDate: new Date(today.getFullYear(), Math.floor(today.getMonth()/3)*3, 1).toISOString(), endDate: new Date(today.getFullYear(), Math.floor(today.getMonth()/3)*3 + 3, 0).toISOString(), label: "Gewinnziel Quartal" },
];

// ---------- Kalender-Mocks ----------

const isoToday = (offset = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: "EV-001",
    title: "Besichtigung BMW M5",
    description: "Kunde Hr. Weber, Probefahrt eingeplant.",
    date: isoToday(0),
    startTime: "10:00",
    endTime: "11:00",
    type: "viewing",
    vehicleId: "V-021",
    location: "Showroom",
    createdAt: new Date().toISOString(),
    createdBy: "Admin",
  },
  {
    id: "EV-002",
    title: "Telefonat Auto Müller GmbH",
    description: "Rückruf wg. Großabnahme.",
    date: isoToday(0),
    startTime: "14:30",
    endTime: "15:00",
    type: "call",
    customerId: "C-027",
    createdAt: new Date().toISOString(),
    createdBy: "Admin",
  },
  {
    id: "EV-003",
    title: "Übergabe VW ID.4 Pro",
    date: isoToday(1),
    startTime: "09:00",
    endTime: "10:30",
    type: "handover",
    location: "Showroom Premium",
    createdAt: new Date().toISOString(),
    createdBy: "Admin",
  },
  {
    id: "EV-004",
    title: "Fokuszeit – Angebote schreiben",
    date: isoToday(0),
    startTime: "08:00",
    endTime: "09:30",
    type: "block",
    createdAt: new Date().toISOString(),
    createdBy: "Admin",
  },
];

export const DEFAULT_DAY_TEMPLATES: DayTemplate[] = [
  {
    id: "DT-VERKAUF",
    name: "Verkaufstag",
    description: "Klassischer Tag mit Kundenfokus.",
    blocks: [
      { id: "b1", title: "Posteingang & Anrufe",   startTime: "08:00", endTime: "09:00", type: "call" },
      { id: "b2", title: "Angebote schreiben",     startTime: "09:00", endTime: "10:30", type: "block" },
      { id: "b3", title: "Kundenbesichtigungen",   startTime: "10:30", endTime: "13:00", type: "viewing" },
      { id: "b4", title: "Mittagspause",           startTime: "13:00", endTime: "14:00", type: "block" },
      { id: "b5", title: "Übergaben",              startTime: "14:00", endTime: "16:00", type: "handover" },
      { id: "b6", title: "Tagesabschluss / CRM",   startTime: "16:00", endTime: "17:30", type: "internal" },
    ],
  },
  {
    id: "DT-WERKSTATT",
    name: "Werkstatt-Tag",
    description: "Fokus auf Bestand, Aufbereitung, Logistik.",
    blocks: [
      { id: "b1", title: "Bestand-Check",          startTime: "08:00", endTime: "09:00", type: "internal" },
      { id: "b2", title: "Werkstatt-Koordination", startTime: "09:00", endTime: "11:00", type: "internal" },
      { id: "b3", title: "Aufbereiter abstimmen",  startTime: "11:00", endTime: "12:00", type: "call" },
      { id: "b4", title: "Mittagspause",           startTime: "12:00", endTime: "13:00", type: "block" },
      { id: "b5", title: "Inserate & Fotos",       startTime: "13:00", endTime: "16:00", type: "block" },
      { id: "b6", title: "Tagesabschluss",         startTime: "16:00", endTime: "17:00", type: "internal" },
    ],
  },
  {
    id: "DT-EINKAUF",
    name: "Einkaufstag",
    description: "Plattformen sichten, Auktionen, Verhandlungen.",
    blocks: [
      { id: "b1", title: "Plattformen sichten",    startTime: "08:00", endTime: "10:00", type: "block" },
      { id: "b2", title: "Verhandlungen",          startTime: "10:00", endTime: "12:00", type: "call" },
      { id: "b3", title: "Mittagspause",           startTime: "12:00", endTime: "13:00", type: "block" },
      { id: "b4", title: "Auktionen / Bieten",     startTime: "13:00", endTime: "15:00", type: "block" },
      { id: "b5", title: "Logistik organisieren",  startTime: "15:00", endTime: "17:00", type: "internal" },
    ],
  },
];

export const DEFAULT_SETTINGS: Settings = {
  userName: "Sergiu-Razvan Florea",
  firstName: "Sergiu-Razvan",
  lastName: "Florea",
  email: "sergiu.florea@vinflow.de",
  phone: "+49 151 2233 4455",
  role: "Geschäftsführer",
  avatarUrl: "",
  companyName: "VINflow Autohaus GmbH",
  pdfTheme: "indigo",
  locations: [
    "Hof A · Platz 01", "Hof A · Platz 02", "Hof A · Platz 03", "Hof A · Platz 04", "Hof A · Platz 05",
    "Hof A · Platz 06", "Hof A · Platz 07", "Hof A · Platz 08", "Hof A · Platz 09", "Hof A · Platz 10",
    "Hof B · Platz 01", "Hof B · Platz 02", "Hof B · Platz 03", "Hof B · Platz 04", "Hof B · Platz 05",
    "Showroom", "Showroom Premium", "Werkstatt Müller", "Werkstatt Schneider", "Aufbereiter Glanz GmbH",
    "Lackiererei Wagner", "Folierung Profi", "DEKRA Prüfstelle", "Unterwegs",
  ],
  partners: [
    { id: "P-0001", name: "Aufbereiter Glanz GmbH", kind: "detailer", contactPerson: "Stefan Glanz", email: "info@glanz-gmbh.de", phone: "+49 30 1234567", address: "Industriestr. 12, 10115 Berlin", createdAt: new Date().toISOString() },
    { id: "P-0002", name: "Werkstatt Müller",       kind: "mechanic", contactPerson: "Karl Müller",   email: "service@mueller-kfz.de", phone: "+49 30 7654321", address: "Werkstatthof 4, 10119 Berlin", createdAt: new Date().toISOString() },
    { id: "P-0003", name: "AutoTrans Berlin",       kind: "transport", contactPerson: "Frau Klein",   email: "dispo@autotrans.de", phone: "+49 30 998877",  address: "Logistikzentrum 1, 12099 Berlin", createdAt: new Date().toISOString() },
    { id: "P-0004", name: "DEKRA Berlin Mitte",     kind: "tuv",      contactPerson: "Hr. Schmidt",  email: "berlin@dekra.de",       phone: "+49 30 555100",  address: "Prüfweg 7, 10117 Berlin", createdAt: new Date().toISOString() },
    { id: "P-0005", name: "Lackiererei Wagner",     kind: "detailer", contactPerson: "Andreas Wagner", email: "anfrage@lack-wagner.de", phone: "+49 89 4422100", address: "Gewerbestr. 8, 80939 München", createdAt: new Date().toISOString() },
    { id: "P-0006", name: "Werkstatt Schneider",    kind: "mechanic", contactPerson: "Ingo Schneider", email: "kontakt@kfz-schneider.de", phone: "+49 89 7711234", address: "Bayernring 22, 80335 München", createdAt: new Date().toISOString() },
    { id: "P-0007", name: "TÜV Süd München",        kind: "tuv",      contactPerson: "Frau Berger",   email: "muenchen@tuvsud.de",     phone: "+49 89 5790000", address: "Westendstr. 199, 80686 München", createdAt: new Date().toISOString() },
    { id: "P-0008", name: "AutoLogistik Hamburg",   kind: "transport", contactPerson: "Herr Petersen", email: "service@autolog-hh.de",  phone: "+49 40 6677889", address: "Speicherstr. 3, 20457 Hamburg", createdAt: new Date().toISOString() },
    { id: "P-0009", name: "Folierung Profi",        kind: "detailer", contactPerson: "Tim Becker",    email: "info@folierung-profi.de", phone: "+49 30 4040501", address: "Tempelhofer Damm 88, 12101 Berlin", createdAt: new Date().toISOString() },
    { id: "P-0010", name: "DAT Gutachter Hartmann", kind: "appraiser", contactPerson: "Dr. Hartmann", email: "gutachten@hartmann-dat.de", phone: "+49 30 9090909", address: "Bewertungsweg 1, 10437 Berlin", createdAt: new Date().toISOString() },
    { id: "P-0011", name: "Reifen-Express GmbH",    kind: "supplier", contactPerson: "Frau Mertens",  email: "b2b@reifen-express.de",   phone: "+49 800 7733100", address: "Gutenbergstr. 14, 50226 Frechen", createdAt: new Date().toISOString() },
    { id: "P-0012", name: "Kfz-Teile Großhandel Süd", kind: "supplier", contactPerson: "Hans Reiter", email: "vertrieb@teile-sued.de", phone: "+49 711 2233445", address: "Stuttgarter Str. 99, 70469 Stuttgart", createdAt: new Date().toISOString() },
  ],
};
