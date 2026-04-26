// VINflow Datenmodell – VIN-zentriert
// Ein Vehicle (mit VIN) ist das Stammobjekt. Es kann beliebig viele
// Angebote (Offers) haben. Sobald ein Angebot angenommen wird, entsteht
// genau EIN Vorgang (Process) mit den Folgebelegen bis zur Übergabe.

export type ProcessStepKey =
  | "offer"
  | "down_payment"
  | "order_confirmation"
  | "outbound_check"
  | "invoicing"
  | "delivery_confirmation";

export type StepStatus = "pending" | "active" | "completed";

export interface ProcessStep {
  key: ProcessStepKey;
  label: string;
  shortLabel: string;
  description: string;
  documentName: string;
}

export const PROCESS_STEPS: ProcessStep[] = [
  {
    key: "offer",
    label: "Angebot",
    shortLabel: "Angebot",
    description: "Verbindliches Angebot an den Kunden – Basis des Vorgangs.",
    documentName: "Angebot",
  },
  {
    key: "down_payment",
    label: "Anzahlung / Vorauszahlung",
    shortLabel: "Anzahlung",
    description: "Anzahlungsrechnung stellen, Zahlungseingang prüfen.",
    documentName: "Anzahlungsrechnung",
  },
  {
    key: "order_confirmation",
    label: "Auftragsbestätigung",
    shortLabel: "AB",
    description: "Verbindliche Bestätigung des Kaufauftrags.",
    documentName: "Auftragsbestätigung",
  },
  {
    key: "outbound_check",
    label: "Ausgangskontrolle",
    shortLabel: "Kontrolle",
    description: "Fahrzeug-Übergabe vorbereiten – To-Do-Checkliste abarbeiten.",
    documentName: "Ausgangsprotokoll",
  },
  {
    key: "invoicing",
    label: "Rechnungsstellung",
    shortLabel: "Rechnung",
    description: "Schlussrechnung erstellen und versenden.",
    documentName: "Rechnung",
  },
  {
    key: "delivery_confirmation",
    label: "Abhol- / Lieferbestätigung",
    shortLabel: "Lieferung",
    description: "Übergabe dokumentieren, Kundenunterschrift einholen.",
    documentName: "Übergabeprotokoll",
  },
];

export interface StepRecord {
  status: StepStatus;
  completedAt?: string;
  documentArchived?: boolean;
  data?: Record<string, string | number | boolean>;
}

export interface OutboundChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export type VehicleStatus =
  | "planned"      // in Einkaufsplanung
  | "in_stock"     // im Bestand / Flotte
  | "reserved"     // angenommenes Angebot → Vorgang läuft
  | "sold";        // Übergabe abgeschlossen

export interface Vehicle {
  id: string;          // intern
  vin: string;         // 17-stellig
  make: string;
  model: string;
  year: number;
  color: string;
  mileage: number;
  listPrice: number;   // Verkaufspreis
  purchasePrice: number;
  status: VehicleStatus;
  arrivedAt?: string;  // Wann ins Lager
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  street?: string;
  zip?: string;
  city: string;
}

export type OfferStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export interface Offer {
  id: string;             // OFR-...
  vehicleId: string;
  customerId: string;
  createdAt: string;
  validUntil: string;
  price: number;
  discount?: number;
  notes?: string;
  status: OfferStatus;
}

export type PurchasePlanStatus = "open" | "ordered" | "received" | "cancelled";

export interface PurchasePlan {
  id: string;             // PP-...
  make: string;
  model: string;
  year: number;
  targetPrice: number;
  supplier: string;
  expectedAt: string;
  status: PurchasePlanStatus;
  vin?: string;           // sobald bekannt
  notes?: string;
  createdAt: string;
}

export interface Process {
  id: string;             // VF-YYYY-XXXX
  vehicleId: string;
  customerId: string;
  acceptedOfferId: string;
  createdAt: string;
  updatedAt: string;
  currentStep: ProcessStepKey;
  steps: Record<ProcessStepKey, StepRecord>;
  checklist: OutboundChecklistItem[];
  // Schritt-spezifische Pflichtdaten
  fields: ProcessFields;
}

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
  delivery?: {
    handoverDate?: string;
    handoverLocation?: string;
    finalMileage?: number;
    fuelLevel?: string;
    customerSignature?: boolean;
  };
}

export const DEFAULT_CHECKLIST: OutboundChecklistItem[] = [
  { id: "c1", label: "Fahrzeug gewaschen & innen gereinigt", done: false },
  { id: "c2", label: "Reifendruck & Profil geprüft", done: false },
  { id: "c3", label: "Ölstand & Flüssigkeiten kontrolliert", done: false },
  { id: "c4", label: "Schlüssel (Haupt & Ersatz) bereit", done: false },
  { id: "c5", label: "Servicebuch & Bordmappe vollständig", done: false },
  { id: "c6", label: "Kennzeichen montiert", done: false },
  { id: "c7", label: "Tankfüllung gemäß Vereinbarung", done: false },
  { id: "c8", label: "Fahrzeugübergabe-Termin bestätigt", done: false },
];

export const buildEmptySteps = (current: ProcessStepKey): Record<ProcessStepKey, StepRecord> => {
  const idx = PROCESS_STEPS.findIndex((s) => s.key === current);
  const map = {} as Record<ProcessStepKey, StepRecord>;
  PROCESS_STEPS.forEach((step, i) => {
    if (i < idx) {
      map[step.key] = {
        status: "completed",
        completedAt: new Date(Date.now() - (idx - i) * 86400000).toISOString(),
        documentArchived: true,
      };
    } else if (i === idx) {
      map[step.key] = { status: "active" };
    } else {
      map[step.key] = { status: "pending" };
    }
  });
  return map;
};

// ---- Mock seed -----------------------------------------------------

export const MOCK_CUSTOMERS: Customer[] = [
  { id: "C-001", name: "Markus Weber", email: "m.weber@example.de", phone: "+49 171 2345678", street: "Leopoldstraße 22", zip: "80802", city: "München" },
  { id: "C-002", name: "Sandra Hoffmann", email: "s.hoffmann@example.de", phone: "+49 162 9876543", street: "Mönckebergstraße 5", zip: "20095", city: "Hamburg" },
  { id: "C-003", name: "Tobias Krüger", email: "t.krueger@example.de", phone: "+49 151 1122334", street: "Friedrichstraße 100", zip: "10117", city: "Berlin" },
  { id: "C-004", name: "Julia Schneider", email: "j.schneider@example.de", phone: "+49 173 4567890", street: "Königstraße 40", zip: "70173", city: "Stuttgart" },
  { id: "C-005", name: "Andreas Bauer", email: "a.bauer@example.de", phone: "+49 170 9988776", street: "Zeil 12", zip: "60313", city: "Frankfurt" },
  { id: "C-006", name: "Lisa Maier", email: "l.maier@example.de", phone: "+49 152 3344556", street: "Hohe Straße 88", zip: "50667", city: "Köln" },
];

export const MOCK_VEHICLES: Vehicle[] = [
  { id: "V-001", vin: "WBA8E9G50GNT12345", make: "BMW", model: "320d xDrive Touring", year: 2024, color: "Mineralweiß", mileage: 12450, listPrice: 38900, purchasePrice: 32000, status: "reserved", arrivedAt: "2025-03-22T10:00:00Z" },
  { id: "V-002", vin: "WAUZZZ8V8KA098765", make: "Audi", model: "A4 Avant 40 TFSI", year: 2023, color: "Daytonagrau", mileage: 28900, listPrice: 34500, purchasePrice: 28500, status: "reserved", arrivedAt: "2025-03-12T10:00:00Z" },
  { id: "V-003", vin: "WDD2050461R456789", make: "Mercedes-Benz", model: "C 220 d T-Modell", year: 2024, color: "Obsidianschwarz", mileage: 8200, listPrice: 42700, purchasePrice: 36000, status: "reserved", arrivedAt: "2025-04-01T10:00:00Z" },
  { id: "V-004", vin: "VF1RFA00X67234567", make: "Porsche", model: "Macan T", year: 2024, color: "Kreide", mileage: 4500, listPrice: 78900, purchasePrice: 68500, status: "sold", arrivedAt: "2025-02-18T10:00:00Z" },
  { id: "V-005", vin: "WVWZZZ1KZ8W345678", make: "Volkswagen", model: "Golf 8 GTI", year: 2024, color: "Tornadorot", mileage: 15600, listPrice: 41200, purchasePrice: 34000, status: "reserved", arrivedAt: "2025-02-28T10:00:00Z" },
  { id: "V-006", vin: "JTHBK1GG3F2123456", make: "Lexus", model: "RX 450h", year: 2025, color: "Sonic Titanium", mileage: 1200, listPrice: 71200, purchasePrice: 62000, status: "in_stock", arrivedAt: "2025-04-18T10:00:00Z" },
  { id: "V-007", vin: "ZFA31200000123456", make: "Alfa Romeo", model: "Stelvio Veloce", year: 2024, color: "Rosso Competizione", mileage: 9800, listPrice: 56700, purchasePrice: 47000, status: "in_stock", arrivedAt: "2025-04-10T10:00:00Z" },
  { id: "V-008", vin: "SAJAA01N5SC123987", make: "Jaguar", model: "F-Pace P400e", year: 2024, color: "Eiger Grey", mileage: 3100, listPrice: 68900, purchasePrice: 58000, status: "in_stock", arrivedAt: "2025-04-15T10:00:00Z" },
];

export const MOCK_PURCHASE_PLANS: PurchasePlan[] = [
  { id: "PP-2025-014", make: "BMW", model: "X3 xDrive30d", year: 2024, targetPrice: 48000, supplier: "BMW Auktion München", expectedAt: "2025-05-08", status: "ordered", createdAt: "2025-04-12T09:00:00Z" },
  { id: "PP-2025-015", make: "Audi", model: "Q5 50 TFSI e", year: 2024, targetPrice: 52000, supplier: "Audi Großhandel Ingolstadt", expectedAt: "2025-05-15", status: "open", createdAt: "2025-04-18T11:30:00Z" },
  { id: "PP-2025-016", make: "Tesla", model: "Model Y Long Range", year: 2025, targetPrice: 44000, supplier: "Direktimport NL", expectedAt: "2025-05-22", status: "open", createdAt: "2025-04-20T14:00:00Z" },
  { id: "PP-2025-013", make: "Mercedes-Benz", model: "GLC 300 4matic", year: 2024, targetPrice: 55000, supplier: "Daimler Remarketing", expectedAt: "2025-04-25", status: "received", vin: "WDC2539541F123456", createdAt: "2025-03-30T10:00:00Z" },
];

export const MOCK_OFFERS: Offer[] = [
  // V-001 BMW: angenommenes Angebot + ein abgelehntes davor
  { id: "OFR-2025-0231", vehicleId: "V-001", customerId: "C-001", createdAt: "2025-04-12T09:30:00Z", validUntil: "2025-04-26", price: 38900, status: "accepted" },
  { id: "OFR-2025-0228", vehicleId: "V-001", customerId: "C-002", createdAt: "2025-04-08T14:00:00Z", validUntil: "2025-04-22", price: 39500, status: "rejected" },
  // V-002 Audi
  { id: "OFR-2025-0229", vehicleId: "V-002", customerId: "C-002", createdAt: "2025-04-08T11:00:00Z", validUntil: "2025-04-22", price: 34500, status: "accepted" },
  // V-003 Mercedes — zwei offene Angebote, noch keine Annahme → kein Vorgang
  { id: "OFR-2025-0240", vehicleId: "V-003", customerId: "C-003", createdAt: "2025-04-18T13:45:00Z", validUntil: "2025-05-02", price: 42700, status: "sent" },
  { id: "OFR-2025-0241", vehicleId: "V-003", customerId: "C-005", createdAt: "2025-04-20T10:00:00Z", validUntil: "2025-05-04", price: 42900, status: "sent" },
  // V-004 Porsche
  { id: "OFR-2025-0220", vehicleId: "V-004", customerId: "C-004", createdAt: "2025-04-02T08:15:00Z", validUntil: "2025-04-16", price: 78900, status: "accepted" },
  // V-005 VW
  { id: "OFR-2025-0218", vehicleId: "V-005", customerId: "C-006", createdAt: "2025-03-28T10:00:00Z", validUntil: "2025-04-11", price: 41200, status: "accepted" },
];

export const MOCK_PROCESSES: Process[] = [
  {
    id: "VF-2025-0142",
    vehicleId: "V-001",
    customerId: "C-001",
    acceptedOfferId: "OFR-2025-0231",
    createdAt: "2025-04-12T09:30:00Z",
    updatedAt: "2025-04-22T14:20:00Z",
    currentStep: "outbound_check",
    steps: buildEmptySteps("outbound_check"),
    checklist: DEFAULT_CHECKLIST.map((c, i) => ({ ...c, done: i < 4 })),
    fields: {
      finalPrice: 38900,
      downPayment: { amount: 5000, dueDate: "2025-04-15", method: "Überweisung", received: true, receivedDate: "2025-04-14" },
      orderConfirmation: { orderDate: "2025-04-16", deliveryDate: "2025-04-28", paymentTerms: "Restzahlung bei Übergabe" },
    },
  },
  {
    id: "VF-2025-0141",
    vehicleId: "V-002",
    customerId: "C-002",
    acceptedOfferId: "OFR-2025-0229",
    createdAt: "2025-04-08T11:00:00Z",
    updatedAt: "2025-04-21T10:15:00Z",
    currentStep: "down_payment",
    steps: buildEmptySteps("down_payment"),
    checklist: DEFAULT_CHECKLIST,
    fields: { finalPrice: 34500 },
  },
  {
    id: "VF-2025-0139",
    vehicleId: "V-004",
    customerId: "C-004",
    acceptedOfferId: "OFR-2025-0220",
    createdAt: "2025-04-02T08:15:00Z",
    updatedAt: "2025-04-24T16:30:00Z",
    currentStep: "delivery_confirmation",
    steps: buildEmptySteps("delivery_confirmation"),
    checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c, done: true })),
    fields: {
      finalPrice: 78900,
      downPayment: { amount: 10000, dueDate: "2025-04-05", method: "Überweisung", received: true, receivedDate: "2025-04-04" },
      orderConfirmation: { orderDate: "2025-04-06", deliveryDate: "2025-04-25", paymentTerms: "Restzahlung bei Übergabe" },
      invoicing: { invoiceNumber: "RE-2025-0418", invoiceDate: "2025-04-22", dueDate: "2025-05-06" },
    },
  },
  {
    id: "VF-2025-0138",
    vehicleId: "V-005",
    customerId: "C-006",
    acceptedOfferId: "OFR-2025-0218",
    createdAt: "2025-03-28T10:00:00Z",
    updatedAt: "2025-04-19T17:00:00Z",
    currentStep: "invoicing",
    steps: buildEmptySteps("invoicing"),
    checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c, done: true })),
    fields: {
      finalPrice: 41200,
      downPayment: { amount: 5000, dueDate: "2025-04-01", method: "Überweisung", received: true, receivedDate: "2025-03-31" },
      orderConfirmation: { orderDate: "2025-04-02", deliveryDate: "2025-04-25", paymentTerms: "Restzahlung bei Übergabe" },
    },
  },
];

// ---- Helpers --------------------------------------------------------

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));

export const stepIndex = (key: ProcessStepKey) => PROCESS_STEPS.findIndex((s) => s.key === key);
