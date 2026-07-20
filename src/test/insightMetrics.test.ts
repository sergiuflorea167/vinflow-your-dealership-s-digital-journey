import { describe, expect, it } from "vitest";
import { buildEmptySteps, Process, Vehicle } from "@/data/process";
import { computeInsight, Measurement, previousRange, resolveRange } from "@/lib/insightEngine";

const vehicle = (id: string, purchasePrice: number, firstRegistration?: string): Vehicle => ({
  id, vin: `VIN-${id}`, type: "limousine", make: "Test", model: id, year: 2020,
  fuel: "Benzin", transmission: "Automatik", power_kw: 100, power_hp: 136,
  color: "Schwarz", mileage: 10_000, firstRegistration, listPrice: 1_000, purchasePrice,
  status: "sold", location: { name: "Hof", kind: "lot", since: "2026-01-01" },
  locationHistory: [], costs: [],
});

const process = (id: string, vehicleId: string, finalPrice: number, offerAt: string, deliveryAt?: string): Process => {
  const steps = buildEmptySteps("delivery_confirmation");
  steps.offer = { status: "completed", completedAt: offerAt };
  steps.delivery_confirmation = deliveryAt
    ? { status: "completed", completedAt: deliveryAt }
    : { status: "pending" };
  return {
    id, vehicleId, customerId: "customer", acceptedOfferId: "offer", createdAt: offerAt, updatedAt: offerAt,
    currentStep: "delivery_confirmation", steps, fields: { finalPrice }, customerTodosOC: [], outboundChecklist: [],
  };
};

const measurement = (metric: Measurement["metric"]): Measurement => ({
  id: "m", metric, fromStation: "offer", toStation: "delivery_confirmation", rangePreset: "custom",
  customFrom: "2026-06-01", customTo: "2026-06-30", vehicleType: "all", make: "all", status: "all",
  fuel: "all", breakdown: "none",
});

describe("Insight+ formulas", () => {
  it("includes the full final day of a custom date range", () => {
    const resolved = resolveRange(measurement("revenue"), new Date("2026-07-10T12:00:00"));
    expect(resolved.to.getHours()).toBe(23);
    const result = computeInsight(
      [vehicle("v1", 80)],
      [process("p1", "v1", 100, "2026-06-01T10:00:00", "2026-06-30T18:00:00")],
      [], measurement("revenue"), new Date("2026-07-10T12:00:00"),
    );
    expect(result.primary).toBe(100);
  });

  it("does not leak later conversions into a historical reporting period", () => {
    const result = computeInsight(
      [vehicle("v1", 80)],
      [process("p1", "v1", 100, "2026-06-10T10:00:00", "2026-07-02T10:00:00")],
      [], measurement("conversion"), new Date("2026-07-10T12:00:00"),
    );
    expect(result.primary).toBe(0);
    expect(result.count).toBe(1);
  });

  it("weights GP margin by revenue", () => {
    const result = computeInsight(
      [vehicle("v1", 90), vehicle("v2", 720)],
      [
        process("p1", "v1", 100, "2026-06-01T10:00:00", "2026-06-10T10:00:00"),
        process("p2", "v2", 900, "2026-06-01T10:00:00", "2026-06-11T10:00:00"),
      ],
      [], measurement("margin_percent"), new Date("2026-07-10T12:00:00"),
    );
    expect(result.primary).toBeCloseTo(19);
  });

  it("builds a non-overlapping previous period of equal length", () => {
    const current = { from: new Date("2026-06-10T00:00:00.000Z"), to: new Date("2026-06-19T23:59:59.999Z") };
    const previous = previousRange(current);
    expect(previous.to.getTime()).toBe(current.from.getTime() - 1);
    expect(previous.to.getTime() - previous.from.getTime()).toBe(current.to.getTime() - current.from.getTime());
  });
});
