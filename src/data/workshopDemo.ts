// Demo-Daten ausschließlich für den Dashboard-Workshop.
// Werden NUR angezeigt, wenn der Workshop aktiv ist – nichts wird gespeichert.
import { Process, ProcessStepKey, Vehicle, Customer, Todo, CalendarEvent } from "./process";

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
      fields: { finalPrice: 32900 } as any,
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
      fields: { finalPrice: 28500 } as any,
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
      fields: { finalPrice: 24750 } as any,
    },
    vehicle: { id: "demo-veh-3", make: "BMW", model: "320d Touring", vin: "WBA8E910X0K947213", listPrice: 24750 },
    customer: { id: "demo-cus-3", name: "Jens Hartmann" },
  },
];

// ---------- Fleet-Workshop Demo ----------
import { MOCK_VEHICLES, MOCK_OFFERS, MOCK_PROCESSES } from "./process";

// Wir nutzen einen Slice der bestehenden Mock-Daten, damit das Erlebnis im Workshop realistisch ist.
export const FLEET_DEMO_VEHICLES = MOCK_VEHICLES.slice(0, 8).map((v, i) => ({
  ...v,
  // Sorgen für Mix an Inseratsstatus
  listed: i % 2 === 0 ? { active: true, listedAt: v.arrivedAt, portals: ["mobile.de"] } : undefined,
}));
const FLEET_DEMO_VIDS = new Set(FLEET_DEMO_VEHICLES.map((v) => v.id));
export const FLEET_DEMO_OFFERS = MOCK_OFFERS.filter((o) => FLEET_DEMO_VIDS.has(o.vehicleId));
export const FLEET_DEMO_PROCESSES = MOCK_PROCESSES.filter((p) => FLEET_DEMO_VIDS.has(p.vehicleId));
