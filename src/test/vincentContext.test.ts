import { describe, expect, it } from "vitest";
import { buildVincentContext } from "@/lib/vincentContext";
import { useProcessStore } from "@/store/processStore";
import type { Vehicle } from "@/data/process";

describe("VINcent context minimization", () => {
  it("never exports customer, VIN, contact, payment or calendar free text", () => {
    const state = useProcessStore.getState();
    const customer = state.customers[0];
    const vehicle = state.vehicles[0];
    const event = state.calendarEvents[0];
    const serialized = JSON.stringify(buildVincentContext("Bestand Vorgänge KPI To-do Kalender Umsatz Marge"));

    if (customer) {
      expect(serialized).not.toContain(customer.name);
      if (customer.email) expect(serialized).not.toContain(customer.email);
      if (customer.phone) expect(serialized).not.toContain(customer.phone);
    }
    if (vehicle?.vin) expect(serialized).not.toContain(vehicle.vin);
    if (event?.title) expect(serialized).not.toContain(event.title);
    expect(serialized).not.toContain("downPayment");
    expect(serialized).not.toContain("paymentMethod");
  });

  it("routes only the data category needed for the question", () => {
    const stock = buildVincentContext("Welche Fahrzeuge haben lange Standzeit?") as Record<string, unknown>;
    expect(stock).toHaveProperty("stock");
    expect(stock).not.toHaveProperty("kpis");
    expect(stock).toHaveProperty("todos");

    const todos = buildVincentContext("Was ist heute bei den To-dos wichtig?") as Record<string, unknown>;
    expect(todos).toHaveProperty("todos");
    expect(todos).not.toHaveProperty("stock");
  });

  it("exports every to-do with the fields needed for concrete work guidance", () => {
    const previousTodos = useProcessStore.getState().todos;
    useProcessStore.setState({
      todos: [{
        id: "TD-CONTEXT-1",
        title: "Inserat veröffentlichen",
        description: "Fotos prüfen und Freigabe einholen",
        priority: "high",
        done: false,
        dueDate: "2026-07-06",
        startTime: "10:00",
        endTime: "10:30",
        scope: "internal_fleet",
        tags: ["marketing"],
        assignee: "Verkauf",
        createdAt: "2026-07-05T08:00:00.000Z",
        createdBy: "Disposition",
      }],
    });

    try {
      const context = buildVincentContext("Wie ist mein Umsatz?") as { todos: { items: Array<Record<string, unknown>> } };
      expect(context.todos.items).toHaveLength(1);
      expect(context.todos.items[0]).toMatchObject({
        id: "TD-CONTEXT-1",
        title: "Inserat veröffentlichen",
        url: "/todos?todo=TD-CONTEXT-1",
        description: "Fotos prüfen und Freigabe einholen",
        priority: "high",
        dueDate: "2026-07-06",
        startTime: "10:00",
        assignee: "Verkauf",
        createdBy: "Disposition",
      });
    } finally {
      useProcessStore.setState({ todos: previousTodos });
    }
  });

  it("supplies the full structured vehicle file when a specific vehicle is named in the question", () => {
    const previousVehicles = useProcessStore.getState().vehicles;
    const vehicle: Vehicle = {
      id: "V-CONTEXT-1",
      vin: "WAUZZZ8V8KA000001",
      type: "limousine",
      make: "Audi",
      model: "A6",
      year: 2015,
      color: "Schwarz",
      mileage: 120_000,
      fuel: "Diesel",
      transmission: "Automatik",
      power_kw: 150,
      power_hp: 204,
      doors: 4,
      seats: 5,
      accidentFree: true,
      serviceBookComplete: true,
      features: ["Navigationssystem", "Sitzheizung"],
      listPrice: 18_900,
      purchasePrice: 14_000,
      status: "in_stock",
      notes: "Kunde erreichbar unter kunde@example.com bei Rückfragen.",
      location: { name: "Hof A", kind: "lot", since: "2026-01-01" },
      locationHistory: [],
      costs: [{
        id: "C-1",
        category: "detailing",
        description: "Aufbereitung",
        netAmount: 200,
        vatRate: 19,
        date: "2026-01-05",
        createdAt: "2026-01-05T00:00:00.000Z",
        createdBy: "Werkstatt",
      }],
    };
    useProcessStore.setState({ vehicles: [...previousVehicles, vehicle] });

    try {
      const context = buildVincentContext(
        "Ich muss gleich einen Kunden anrufen, der Interesse an dem Audi A6 von 2015 hat. Liste mir alle Infos auf.",
      ) as { vehicleDetails?: Array<Record<string, unknown>> };

      expect(context.vehicleDetails).toHaveLength(1);
      const detail = context.vehicleDetails![0];
      expect(detail).toMatchObject({
        id: "V-CONTEXT-1",
        url: "/bestand/V-CONTEXT-1",
        identifikation: expect.objectContaining({ marke: "Audi", modell: "A6", baujahr: 2015 }),
        technik: expect.objectContaining({ kraftstoff: "Diesel", leistung_ps: 204 }),
        historie: expect.objectContaining({ laufleistung_km: 120_000, unfallfrei: true }),
        ausstattung: ["Navigationssystem", "Sitzheizung"],
        preisUndStatus: expect.objectContaining({ listenpreis: 18_900, zusatzkostenGesamt: 238 }),
      });

      const serialized = JSON.stringify(context);
      expect(serialized).not.toContain(vehicle.vin);
      expect(serialized).not.toContain("kunde@example.com");
      expect(serialized).toContain("[E-Mail entfernt]");
    } finally {
      useProcessStore.setState({ vehicles: previousVehicles });
    }
  });

  it("does not attach vehicle details for unrelated questions", () => {
    const context = buildVincentContext("Wie viele offene To-dos habe ich heute?") as Record<string, unknown>;
    expect(context).not.toHaveProperty("vehicleDetails");
  });
});
