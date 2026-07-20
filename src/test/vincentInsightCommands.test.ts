import { describe, expect, it } from "vitest";
import { buildEmptySteps, formatCurrency, Process, Vehicle } from "@/data/process";
import { computeInsight } from "@/lib/insightEngine";
import { formatInsightAnswer, parseVincentInsightCommand } from "@/lib/vincentInsightCommands";

const vehicle = (id: string, make: string, model: string): Vehicle => ({
  id, vin: `VIN-${id}`, type: "limousine", make, model, year: 2020,
  fuel: "Benzin", transmission: "Automatik", power_kw: 100, power_hp: 136,
  color: "Schwarz", mileage: 10_000, listPrice: 1_000, purchasePrice: 500,
  status: "sold", location: { name: "Hof", kind: "lot", since: "2026-01-01" },
  locationHistory: [], costs: [],
});

const process = (id: string, vehicleId: string, finalPrice: number, deliveryAt: string): Process => {
  const steps = buildEmptySteps("delivery_confirmation");
  steps.delivery_confirmation = { status: "completed", completedAt: deliveryAt };
  return {
    id, vehicleId, customerId: "customer", acceptedOfferId: "offer", createdAt: deliveryAt, updatedAt: deliveryAt,
    currentStep: "delivery_confirmation", steps, fields: { finalPrice }, customerTodosOC: [], outboundChecklist: [],
  };
};

describe("VINcent Insight+ commands", () => {
  it("returns null for text without a recognizable metric", () => {
    expect(parseVincentInsightCommand("Was sollte ich heute zuerst angehen?")).toBeNull();
  });

  it("parses a data question into a query measurement with the right metric, station and range", () => {
    const result = parseVincentInsightCommand("Wie hoch ist mein Umsatz insgesamt bei der Lieferung?");
    expect(result?.type).toBe("query");
    expect(result?.measurement.metric).toBe("revenue");
    expect(result?.measurement.toStation).toBe("delivery_confirmation");
    expect(result?.measurement.rangePreset).toBe("all");
  });

  it("parses an explicit creation command into a create-type measurement", () => {
    const result = parseVincentInsightCommand("Erstelle mir eine Insight+ Karte für den Umsatz bei der Lieferung, gesamt");
    expect(result?.type).toBe("create");
    expect(result?.measurement.metric).toBe("revenue");
    expect(result?.measurement.toStation).toBe("delivery_confirmation");
    expect(result?.measurement.rangePreset).toBe("all");
  });

  it("detects a make filter and a breakdown from free text", () => {
    const result = parseVincentInsightCommand("Wie hoch ist die Standzeit von Audi nach Marke?", {
      vehicles: [vehicle("v1", "Audi", "A6"), vehicle("v2", "BMW", "320d")],
    });
    expect(result?.measurement.metric).toBe("aging_days");
    expect(result?.measurement.make).toBe("Audi");
    expect(result?.measurement.breakdown).toBe("make");
  });

  it("formats an exact, computed answer that matches the real numbers — not an LLM guess", () => {
    const vehicles = [vehicle("v1", "Audi", "A6"), vehicle("v2", "BMW", "320d")];
    const processes = [
      process("p1", "v1", 15_000, "2026-01-15T10:00:00.000Z"),
      process("p2", "v2", 25_000, "2026-02-10T10:00:00.000Z"),
    ];
    const parsed = parseVincentInsightCommand("Wie hoch ist mein Umsatz insgesamt bei der Lieferung?");
    expect(parsed).not.toBeNull();
    const result = computeInsight(vehicles, processes, [], parsed!.measurement);
    expect(result.primary).toBe(40_000);
    expect(result.count).toBe(2);

    const answer = formatInsightAnswer(parsed!.measurement, result);
    expect(answer).toContain(formatCurrency(40_000));
    expect(answer).toContain("2 Fahrzeuge");
  });

  it("reports when no data matches the requested measurement", () => {
    const parsed = parseVincentInsightCommand("Wie hoch ist mein Umsatz insgesamt bei der Lieferung?");
    const result = computeInsight([], [], [], parsed!.measurement);
    const answer = formatInsightAnswer(parsed!.measurement, result);
    expect(answer).toContain("keine Datensätze");
  });
});
