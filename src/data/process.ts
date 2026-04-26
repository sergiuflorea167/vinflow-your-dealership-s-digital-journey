export type ProcessStepKey =
  | "purchase_planning"
  | "fleet"
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
    key: "purchase_planning",
    label: "Einkaufsplanung",
    shortLabel: "Einkauf",
    description: "Bedarf erfassen, Lieferanten auswählen, Fahrzeug einplanen.",
    documentName: "Einkaufsplanung",
  },
  {
    key: "fleet",
    label: "Flotte",
    shortLabel: "Flotte",
    description: "Fahrzeug in den Bestand übernehmen, Stammdaten & Fotos.",
    documentName: "Bestandsbeleg",
  },
  {
    key: "offer",
    label: "Angebot",
    shortLabel: "Angebot",
    description: "Verbindliches Angebot an den Kunden erstellen.",
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
  notes?: string;
}

export interface OutboundChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface Vehicle {
  vin: string;
  make: string;
  model: string;
  year: number;
  color: string;
  mileage: number;
  price: number;
}

export interface Customer {
  name: string;
  email: string;
  phone: string;
  city: string;
}

export interface Process {
  id: string;
  vehicle: Vehicle;
  customer: Customer;
  createdAt: string;
  updatedAt: string;
  currentStep: ProcessStepKey;
  steps: Record<ProcessStepKey, StepRecord>;
  checklist: OutboundChecklistItem[];
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

const emptySteps = (current: ProcessStepKey): Record<ProcessStepKey, StepRecord> => {
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

export const MOCK_PROCESSES: Process[] = [
  {
    id: "VF-2025-0142",
    vehicle: {
      vin: "WBA8E9G50GNT12345",
      make: "BMW",
      model: "320d xDrive Touring",
      year: 2024,
      color: "Mineralweiß",
      mileage: 12450,
      price: 38900,
    },
    customer: {
      name: "Markus Weber",
      email: "m.weber@example.de",
      phone: "+49 171 2345678",
      city: "München",
    },
    createdAt: "2025-04-12T09:30:00Z",
    updatedAt: "2025-04-22T14:20:00Z",
    currentStep: "outbound_check",
    steps: emptySteps("outbound_check"),
    checklist: DEFAULT_CHECKLIST.map((c, i) => ({ ...c, done: i < 4 })),
  },
  {
    id: "VF-2025-0141",
    vehicle: {
      vin: "WAUZZZ8V8KA098765",
      make: "Audi",
      model: "A4 Avant 40 TFSI",
      year: 2023,
      color: "Daytonagrau",
      mileage: 28900,
      price: 34500,
    },
    customer: {
      name: "Sandra Hoffmann",
      email: "s.hoffmann@example.de",
      phone: "+49 162 9876543",
      city: "Hamburg",
    },
    createdAt: "2025-04-08T11:00:00Z",
    updatedAt: "2025-04-21T10:15:00Z",
    currentStep: "down_payment",
    steps: emptySteps("down_payment"),
    checklist: DEFAULT_CHECKLIST,
  },
  {
    id: "VF-2025-0140",
    vehicle: {
      vin: "WDD2050461R456789",
      make: "Mercedes-Benz",
      model: "C 220 d T-Modell",
      year: 2024,
      color: "Obsidianschwarz",
      mileage: 8200,
      price: 42700,
    },
    customer: {
      name: "Tobias Krüger",
      email: "t.krueger@example.de",
      phone: "+49 151 1122334",
      city: "Berlin",
    },
    createdAt: "2025-04-15T13:45:00Z",
    updatedAt: "2025-04-23T09:00:00Z",
    currentStep: "offer",
    steps: emptySteps("offer"),
    checklist: DEFAULT_CHECKLIST,
  },
  {
    id: "VF-2025-0139",
    vehicle: {
      vin: "VF1RFA00X67234567",
      make: "Porsche",
      model: "Macan T",
      year: 2024,
      color: "Kreide",
      mileage: 4500,
      price: 78900,
    },
    customer: {
      name: "Julia Schneider",
      email: "j.schneider@example.de",
      phone: "+49 173 4567890",
      city: "Stuttgart",
    },
    createdAt: "2025-04-02T08:15:00Z",
    updatedAt: "2025-04-24T16:30:00Z",
    currentStep: "delivery_confirmation",
    steps: emptySteps("delivery_confirmation"),
    checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c, done: true })),
  },
  {
    id: "VF-2025-0143",
    vehicle: {
      vin: "JTHBK1GG3F2123456",
      make: "Lexus",
      model: "RX 450h",
      year: 2025,
      color: "Sonic Titanium",
      mileage: 1200,
      price: 71200,
    },
    customer: {
      name: "Andreas Bauer",
      email: "a.bauer@example.de",
      phone: "+49 170 9988776",
      city: "Frankfurt",
    },
    createdAt: "2025-04-20T15:00:00Z",
    updatedAt: "2025-04-24T11:45:00Z",
    currentStep: "purchase_planning",
    steps: emptySteps("purchase_planning"),
    checklist: DEFAULT_CHECKLIST,
  },
  {
    id: "VF-2025-0138",
    vehicle: {
      vin: "WVWZZZ1KZ8W345678",
      make: "Volkswagen",
      model: "Golf 8 GTI",
      year: 2024,
      color: "Tornadorot",
      mileage: 15600,
      price: 41200,
    },
    customer: {
      name: "Lisa Maier",
      email: "l.maier@example.de",
      phone: "+49 152 3344556",
      city: "Köln",
    },
    createdAt: "2025-03-28T10:00:00Z",
    updatedAt: "2025-04-19T17:00:00Z",
    currentStep: "invoicing",
    steps: emptySteps("invoicing"),
    checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c, done: true })),
  },
];

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));

export const stepIndex = (key: ProcessStepKey) => PROCESS_STEPS.findIndex((s) => s.key === key);
