import { beforeEach, describe, expect, it } from "vitest";
import {
  buildEmptySteps,
  CalendarEvent,
  Customer,
  Process,
  Todo,
  Vehicle,
} from "@/data/process";
import { mirroredTodoId, seedDataState, useProcessStore } from "@/store/processStore";
import { buildImportResult, detectMapping } from "@/lib/fleetIO";
import { buildZugferdXml } from "@/lib/eInvoice";

const makeVehicle = (id = "V-0001"): Vehicle => ({
  id, vin: `WVWZZZ1JZXW${id.replace(/\D/g, "").padStart(6, "0")}`.slice(0, 17), type: "limousine",
  make: "Test", model: "Modell", year: 2024, fuel: "Benzin", transmission: "Automatik",
  power_kw: 100, power_hp: 136, color: "Schwarz", mileage: 10_000,
  listPrice: 30_000, purchasePrice: 20_000, status: "reserved",
  location: { name: "Hof", kind: "lot", since: "2026-01-01" }, locationHistory: [], costs: [],
});

const makeCustomer = (): Customer => ({ id: "C-0001", name: "Max Mustermann", email: "max@example.com", phone: "123", city: "Köln" });

const makeProcess = (vehicleId = "V-0001"): Process => ({
  id: "VF-2026-0142", vehicleId, customerId: "C-0001", acceptedOfferId: "", createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z", currentStep: "down_payment", steps: buildEmptySteps("down_payment"),
  fields: { finalPrice: 30_000 }, customerTodosOC: [], outboundChecklist: [{ id: "check-1", label: "Prüfen", done: false }],
});

beforeEach(() => {
  useProcessStore.setState({ ...seedDataState() });
});

describe("backend state integrity", () => {
  it("rejects out-of-order step completion and records/clears soldAt on finalization rollback", () => {
    const vehicle = makeVehicle();
    const process = makeProcess();
    useProcessStore.setState({ vehicles: [vehicle], customers: [makeCustomer()], processes: [process] });

    useProcessStore.getState().completeStep(process.id, "invoicing");
    expect(useProcessStore.getState().processes[0].steps.invoicing.status).toBe("pending");

    const finalProcess = makeProcess();
    finalProcess.currentStep = "delivery_confirmation";
    finalProcess.steps = buildEmptySteps("delivery_confirmation");
    useProcessStore.setState({ processes: [finalProcess] });
    useProcessStore.getState().completeStep(finalProcess.id, "delivery_confirmation");
    expect(useProcessStore.getState().vehicles[0].status).toBe("sold");
    expect(useProcessStore.getState().vehicles[0].soldAt).toBeTruthy();

    useProcessStore.getState().cancelStep(finalProcess.id, "delivery_confirmation");
    expect(useProcessStore.getState().vehicles[0].status).toBe("reserved");
    expect(useProcessStore.getState().vehicles[0].soldAt).toBeUndefined();
  });

  it("generates IDs from the highest existing sequence instead of array length", () => {
    const existing = [
      { id: "TD-0001", title: "A" },
      { id: "TD-0003", title: "B" },
    ].map((item) => ({
      ...item, priority: "medium", scope: "general", done: false,
      createdAt: "2026-01-01", createdBy: "Test",
    })) as Todo[];
    useProcessStore.setState({ todos: existing });
    const created = useProcessStore.getState().addTodo({ title: "C", priority: "medium", scope: "general" });
    expect(created.id).toBe("TD-0004");
  });

  it("sets mirrored checklist state idempotently", () => {
    const process = makeProcess();
    useProcessStore.setState({ processes: [process] });
    const id = mirroredTodoId("oc", process.id, "check-1");

    useProcessStore.getState().updateTodo(id, { done: false });
    expect(useProcessStore.getState().processes[0].outboundChecklist[0].done).toBe(false);
    useProcessStore.getState().updateTodo(id, { done: true });
    expect(useProcessStore.getState().processes[0].outboundChecklist[0].done).toBe(true);
  });

  it("keeps linked listing todo, calendar event and vehicle status in sync", () => {
    const vehicle = { ...makeVehicle(), status: "in_stock" as const, listed: { active: false } };
    const todo: Todo = {
      id: "TD-0001", title: "Inserat erstellen", priority: "medium", scope: "internal_fleet",
      done: false, vehicleId: vehicle.id, calendarEventId: "EV-1", tags: ["auto"], createdAt: "2026-01-01", createdBy: "Test",
    };
    const event: CalendarEvent = {
      id: "EV-1", title: todo.title, date: "2026-06-30", startTime: "09:00", endTime: "10:00",
      type: "todo", todoId: todo.id, done: false, createdAt: "2026-01-01", createdBy: "Test",
    };
    useProcessStore.setState({ vehicles: [vehicle], todos: [todo], calendarEvents: [event] });
    useProcessStore.getState().toggleCalendarEventDone(event.id);
    expect(useProcessStore.getState().todos[0].done).toBe(true);
    expect(useProcessStore.getState().vehicles[0].listed?.active).toBe(true);
  });
});

describe("backend document and import formulas", () => {
  it("uses only received deposits and trade-in value for e-invoice prepaid amount", () => {
    const vehicle = makeVehicle();
    const customer = makeCustomer();
    const process = makeProcess();
    process.fields.downPayment = { amount: 5_000, received: true };
    process.fields.tradeIn = { vehicleDescription: "Kundenfahrzeug", value: 8_000 };
    const xml = buildZugferdXml({ process, vehicle, customer, companyName: "Autohaus", finalPrice: 30_000 });
    expect(xml).toContain("<ram:TotalPrepaidAmount>13000.00</ram:TotalPrepaidAmount>");
    expect(xml).toContain("<ram:DuePayableAmount>17000.00</ram:DuePayableAmount>");

    process.fields.downPayment.received = false;
    process.fields.tradeIn = undefined;
    const openXml = buildZugferdXml({ process, vehicle, customer, companyName: "Autohaus", finalPrice: 30_000 });
    expect(openXml).toContain("<ram:TotalPrepaidAmount>0.00</ram:TotalPrepaidAmount>");
    expect(openXml).toContain("<ram:DuePayableAmount>30000.00</ram:DuePayableAmount>");
  });

  it("rejects impossible German dates and respects an explicit not-listed flag", () => {
    const rawRows = [{ Marke: "BMW", Modell: "320d", Erstzulassung: "31.02.2020", Inseriert: "FALSCH", Inseratsdatum: "2026-01-10" }];
    const parsed = { headers: Object.keys(rawRows[0]), rawRows };
    const result = buildImportResult(parsed, detectMapping(parsed.headers), "Hof");
    expect(result.validCount).toBe(1);
    expect(result.rows[0].payload?.firstRegistration).toBe("");
    expect(result.rows[0].payload?.listed).toBeUndefined();
  });
});
