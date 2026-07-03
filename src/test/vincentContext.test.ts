import { describe, expect, it } from "vitest";
import { buildVincentContext } from "@/lib/vincentContext";
import { useProcessStore } from "@/store/processStore";

describe("Vincent context minimization", () => {
  it("never exports customer, VIN, contact, payment, todo or calendar free text", () => {
    const state = useProcessStore.getState();
    const customer = state.customers[0];
    const vehicle = state.vehicles[0];
    const todo = state.todos[0];
    const event = state.calendarEvents[0];
    const serialized = JSON.stringify(buildVincentContext("Bestand Vorgänge KPI To-do Kalender Umsatz Marge"));

    if (customer) {
      expect(serialized).not.toContain(customer.name);
      if (customer.email) expect(serialized).not.toContain(customer.email);
      if (customer.phone) expect(serialized).not.toContain(customer.phone);
    }
    if (vehicle?.vin) expect(serialized).not.toContain(vehicle.vin);
    if (todo?.title) expect(serialized).not.toContain(todo.title);
    if (event?.title) expect(serialized).not.toContain(event.title);
    expect(serialized).not.toContain("downPayment");
    expect(serialized).not.toContain("paymentMethod");
  });

  it("routes only the data category needed for the question", () => {
    const stock = buildVincentContext("Welche Fahrzeuge haben lange Standzeit?") as Record<string, unknown>;
    expect(stock).toHaveProperty("stock");
    expect(stock).not.toHaveProperty("kpis");
    expect(stock).not.toHaveProperty("todos");

    const todos = buildVincentContext("Was ist heute bei den To-dos wichtig?") as Record<string, unknown>;
    expect(todos).toHaveProperty("todos");
    expect(todos).not.toHaveProperty("stock");
  });
});
