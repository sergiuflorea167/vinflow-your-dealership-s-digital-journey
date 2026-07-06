import { describe, expect, it } from "vitest";
import { buildVincentContext } from "@/lib/vincentContext";
import { useProcessStore } from "@/store/processStore";

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
});
