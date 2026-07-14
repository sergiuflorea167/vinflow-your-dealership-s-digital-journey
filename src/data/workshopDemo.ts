// Demo-Daten ausschließlich für den Dashboard-Workshop.
// Werden NUR angezeigt, wenn der Workshop aktiv ist – nichts wird gespeichert.
import { Process, ProcessStepKey, Vehicle, Customer, Offer, Todo, CalendarEvent, buildEmptySteps, DEFAULT_OUTBOUND_CHECKLIST } from "./process";

const today = () => new Date().toISOString().slice(0, 10);

export interface DemoCardData {
  process: Pick<Process, "id" | "currentStep" | "fields"> & { vehicleId: string; customerId: string };
  vehicle: Pick<Vehicle, "id" | "make" | "model" | "vin" | "listPrice">;
  customer: Pick<Customer, "id" | "name">;
}

export const DEMO_TODOS: Todo[] = [
  {
    id: "demo-todo-1",
    title: "Probefahrt mit Frau Becker vorbereiten",
    priority: "high",
    done: false,
    dueDate: today(),
    scope: "general",
    vehicleId: "demo-veh-1",
    createdAt: new Date().toISOString(),
    createdBy: "Workshop",
    tags: ["Demo"],
    assignee: "Du",
  },
  {
    id: "demo-todo-2",
    title: "Rechnung 2026-014 an Kunden senden",
    priority: "medium",
    done: false,
    dueDate: today(),
    scope: "general",
    vehicleId: "demo-veh-2",
    createdAt: new Date().toISOString(),
    createdBy: "Workshop",
    tags: ["Demo"],
    assignee: "Du",
  },
  {
    id: "demo-todo-3",
    title: "TÜV-Termin BMW 320d buchen",
    priority: "low",
    done: false,
    dueDate: today(),
    scope: "general",
    vehicleId: "demo-veh-3",
    createdAt: new Date().toISOString(),
    createdBy: "Workshop",
    tags: ["Demo"],
  },
];

export const DEMO_EVENTS: CalendarEvent[] = [
  {
    id: "demo-evt-1",
    title: "Übergabe Audi A4 – Herr Voss",
    date: today(),
    startTime: "10:00",
    endTime: "10:45",
    type: "handover",
    location: "Showroom",
    createdAt: new Date().toISOString(),
    createdBy: "Workshop",
  },
  {
    id: "demo-evt-2",
    title: "Probefahrt VW Tiguan – Frau Becker",
    date: today(),
    startTime: "13:30",
    endTime: "14:15",
    type: "viewing",
    location: "Hof 2",
    createdAt: new Date().toISOString(),
    createdBy: "Workshop",
  },
  {
    id: "demo-evt-3",
    title: "Rückruf Leasingfirma",
    date: today(),
    startTime: "15:00",
    endTime: "15:15",
    type: "call",
    createdAt: new Date().toISOString(),
    createdBy: "Workshop",
  },
];

export const DEMO_VEHICLE_MAP: Record<string, { id: string; make: string; model: string }> = {
  "demo-veh-1": { id: "demo-veh-1", make: "VW", model: "Tiguan 2.0 TDI" },
  "demo-veh-2": { id: "demo-veh-2", make: "Audi", model: "A4 Avant" },
  "demo-veh-3": { id: "demo-veh-3", make: "BMW", model: "320d Touring" },
};

// Vereinfachte Pipeline-Verteilung (für die Stufen-Übersicht)
export const DEMO_PIPELINE: Record<ProcessStepKey, number> = {
  offer: 4,
  down_payment: 2,
  order_confirmation: 3,
  outbound_check: 5,
  invoicing: 2,
  purchase_contract: 1,
  delivery_confirmation: 2,
};

export const DEMO_ACTIVE_COUNT = Object.values(DEMO_PIPELINE).reduce((a, b) => a + b, 0);

export const DEMO_PROCESS_CARDS: DemoCardData[] = [
  {
    process: {
      id: "VF-2026-014",
      currentStep: "outbound_check",
      vehicleId: "demo-veh-2",
      customerId: "demo-cus-1",
      fields: { finalPrice: 32900 },
    },
    vehicle: { id: "demo-veh-2", make: "Audi", model: "A4 Avant", vin: "WAUZZZ8K4HA000142", listPrice: 32900 },
    customer: { id: "demo-cus-1", name: "Markus Voss" },
  },
  {
    process: {
      id: "VF-2026-015",
      currentStep: "offer",
      vehicleId: "demo-veh-1",
      customerId: "demo-cus-2",
      fields: { finalPrice: 28500 },
    },
    vehicle: { id: "demo-veh-1", make: "VW", model: "Tiguan 2.0 TDI", vin: "WVGZZZ5NZJW823014", listPrice: 28500 },
    customer: { id: "demo-cus-2", name: "Sabine Becker" },
  },
  {
    process: {
      id: "VF-2026-016",
      currentStep: "invoicing",
      vehicleId: "demo-veh-3",
      customerId: "demo-cus-3",
      fields: { finalPrice: 24750 },
    },
    vehicle: { id: "demo-veh-3", make: "BMW", model: "320d Touring", vin: "WBA8E910X0K947213", listPrice: 24750 },
    customer: { id: "demo-cus-3", name: "Jens Hartmann" },
  },
];

// ---------- Fleet-Workshop Demo ----------
import { MOCK_VEHICLES, MOCK_OFFERS, MOCK_PROCESSES, Partner } from "./process";

// Wir nutzen einen Slice der bestehenden Mock-Daten, damit das Erlebnis im Workshop realistisch ist.
export const FLEET_DEMO_VEHICLES = MOCK_VEHICLES.slice(0, 8).map((v, i) => ({
  ...v,
  // Sorgen für Mix an Inseratsstatus
  listed: i % 2 === 0 ? { active: true, listedAt: v.arrivedAt, portals: ["mobile.de"] } : undefined,
}));
const FLEET_DEMO_VIDS = new Set(FLEET_DEMO_VEHICLES.map((v) => v.id));
export const FLEET_DEMO_OFFERS = MOCK_OFFERS.filter((o) => FLEET_DEMO_VIDS.has(o.vehicleId));
export const FLEET_DEMO_PROCESSES = MOCK_PROCESSES.filter((p) => FLEET_DEMO_VIDS.has(p.vehicleId));

// ---------------------------------------------------------------------------
// Gemeinsames Demo-Set für alle übrigen Workshops (Vorgänge, Einkaufsplanung,
// To-Dos, Kalender, KPIs, Insight+, Stammdaten). Ein einziges, in sich
// konsistentes Mock-Org (Fahrzeuge, Kunden, Angebote, Vorgänge, Einkaufsplanung,
// To-Dos, Kalender, Aktivitäten) — deterministisch erzeugt, nichts wird gespeichert.
// ---------------------------------------------------------------------------
import { buildDemoSeed } from "./demoSeed";

export const WORKSHOP_DEMO = buildDemoSeed();

export const DEMO_PARTNERS: Partner[] = [
  {
    id: "demo-partner-1",
    name: "AutoGlanz Aufbereitung GmbH",
    kind: "detailer",
    contactPerson: "Sven Kowalski",
    email: "kontakt@autoglanz-beispiel.de",
    phone: "+49 89 55512340",
    address: "Industriestraße 14, 80939 München",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-partner-2",
    name: "KFZ-Werkstatt Reiter",
    kind: "mechanic",
    contactPerson: "Andrea Reiter",
    email: "info@werkstatt-reiter-beispiel.de",
    phone: "+49 89 55598761",
    address: "Werkstattweg 3, 80995 München",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-partner-3",
    name: "Schnell-Transport Süd",
    kind: "transport",
    contactPerson: "Murat Yıldız",
    email: "dispo@schnell-transport-beispiel.de",
    phone: "+49 89 55534567",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-partner-4",
    name: "Sachverständigenbüro Lang",
    kind: "appraiser",
    contactPerson: "Dr. Elisabeth Lang",
    email: "buero@sv-lang-beispiel.de",
    phone: "+49 89 55578901",
    address: "Gutachterallee 7, 81543 München",
    createdAt: new Date().toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Vorgänge-Workshop (vertieft): durchgängiges Demo für „Vorgang von Anfang bis
// Ende anlegen". Ein eigenes, isoliertes Fahrzeug/Kunde/Angebot/Vorgang-Set,
// erreichbar über feste IDs – so kann der Workshop gezielt auf
// /bestand/:id und /vorgaenge/:id navigieren, ohne echte Bestandsdaten zu
// berühren. Es wird nichts gespeichert (siehe workshopGuard.ts).
// ---------------------------------------------------------------------------

export const WORKSHOP_PROCESS_DEMO_VEHICLE_ID = "workshop-demo-vehicle";
export const WORKSHOP_PROCESS_DEMO_CUSTOMER_ID = "workshop-demo-customer";
export const WORKSHOP_PROCESS_DEMO_OFFER_ID = "OFR-WORKSHOP-DEMO";
export const WORKSHOP_PROCESS_DEMO_PROCESS_ID = "VF-WORKSHOP-DEMO";

export const WORKSHOP_PROCESS_DEMO_VEHICLE: Vehicle = {
  id: WORKSHOP_PROCESS_DEMO_VEHICLE_ID,
  vin: "WVWZZZ3CZPE123456",
  type: "kombi",
  make: "Volkswagen",
  model: "Passat Variant 2.0 TDI",
  modelDetail: "Elegance DSG",
  year: 2023,
  condition: "Gebraucht",
  hsn: "0603",
  tsn: "ASN",
  licensePlate: "M-VF 1234",
  previousOwners: 1,
  fuel: "Diesel",
  transmission: "Automatik",
  drive: "Frontantrieb",
  power_kw: 110,
  power_hp: 150,
  displacement_ccm: 1968,
  cylinders: 4,
  emissionClass: "Euro 6d",
  co2_g_km: 128,
  consumption_l_100km: 4.9,
  color: "Mondsteinsilber",
  paintCode: "K3K3",
  metallic: true,
  interiorColor: "Titanschwarz",
  interiorMaterial: "Stoff/Leder",
  doors: 5,
  seats: 5,
  mileage: 28500,
  firstRegistration: "2023-03-14",
  hu: "2026-03-01",
  serviceBookComplete: true,
  accidentFree: true,
  nonSmoker: true,
  features: ["Navigation", "Sitzheizung", "Einparkhilfe", "Adaptive Cruise Control", "LED-Scheinwerfer"],
  listPrice: 28900,
  purchasePrice: 23200,
  vatReportable: true,
  status: "in_stock",
  arrivedAt: new Date(Date.now() - 21 * 86400000).toISOString(),
  notes: "Demo-Fahrzeug für den Vorgänge-Workshop – wird nirgends gespeichert.",
  listed: { active: true, listedAt: new Date(Date.now() - 18 * 86400000).toISOString(), portals: ["mobile.de"] },
  location: { name: "Showroom", kind: "showroom", since: new Date(Date.now() - 10 * 86400000).toISOString() },
  locationHistory: [{ name: "Hof A · Platz 04", kind: "lot", since: new Date(Date.now() - 21 * 86400000).toISOString() }],
  costs: [],
};

export const WORKSHOP_PROCESS_DEMO_CUSTOMER: Customer = {
  id: WORKSHOP_PROCESS_DEMO_CUSTOMER_ID,
  salutation: "herr",
  name: "Thomas Reinhardt",
  email: "t.reinhardt@beispiel.de",
  phone: "+49 171 5556789",
  street: "Ahornweg 12",
  zip: "80337",
  city: "München",
};

export const WORKSHOP_PROCESS_DEMO_OFFER: Offer = {
  id: WORKSHOP_PROCESS_DEMO_OFFER_ID,
  vehicleId: WORKSHOP_PROCESS_DEMO_VEHICLE_ID,
  customerId: WORKSHOP_PROCESS_DEMO_CUSTOMER_ID,
  createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  validUntil: new Date(Date.now() + 9 * 86400000).toISOString(),
  price: 28900,
  status: "accepted",
  customerTodos: [],
};

/** Frisch erzeugt einen neuen Vorgang – exakt wie acceptOffer()/startProcessForVehicle()
 * ihn anlegen würden: Angebot bereits abgeschlossen, alle übrigen Felder leer. So muss der
 * Nutzer im Workshop dieselben Pflichtfelder wie im echten Vorgang ausfüllen. */
export const buildWorkshopProcessDemo = (): Process => ({
  id: WORKSHOP_PROCESS_DEMO_PROCESS_ID,
  vehicleId: WORKSHOP_PROCESS_DEMO_VEHICLE_ID,
  customerId: WORKSHOP_PROCESS_DEMO_CUSTOMER_ID,
  acceptedOfferId: WORKSHOP_PROCESS_DEMO_OFFER_ID,
  createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  currentStep: "down_payment",
  steps: buildEmptySteps("down_payment"),
  fields: { finalPrice: 28900 },
  customerTodosOC: [{ id: "workshop-ct1", title: "Anhängerkupplung montieren" }],
  outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST(),
});
