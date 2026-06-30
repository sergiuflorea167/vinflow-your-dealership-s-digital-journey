import { describe, expect, it } from "vitest";
import { buildEmptySteps, Offer, Process, Vehicle } from "@/data/process";
import { getKpi, KpiContext } from "@/lib/kpis";

const range = { from: new Date("2026-06-01T00:00:00"), to: new Date("2026-06-30T23:59:59.999"), label: "Juni" };

const vehicle = (id: string, purchasePrice: number): Vehicle => ({
  id, vin: `VIN-${id}`, type: "limousine", make: "Test", model: id, year: 2024,
  fuel: "Benzin", transmission: "Automatik", power_kw: 100, power_hp: 136,
  color: "Schwarz", mileage: 10_000, listPrice: 30_000, purchasePrice,
  status: "sold", location: { name: "Hof", kind: "lot", since: "2026-01-01" },
  locationHistory: [], costs: [],
});

const process = (id: string, vehicleId: string, finalPrice: number): Process => ({
  id, vehicleId, customerId: "customer", acceptedOfferId: "offer", createdAt: "2026-05-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z", currentStep: "delivery_confirmation",
  steps: buildEmptySteps("delivery_confirmation"), fields: { finalPrice }, customerTodosOC: [], outboundChecklist: [],
});

const context = (overrides: Partial<KpiContext>): KpiContext => ({
  vehicles: [], processes: [], offers: [], customers: [], range, ...overrides,
});

describe("KPI formulas", () => {
  it("books deposits in their payment period and avoids cross-period double counting", () => {
    const invoiced = process("p1", "v1", 30_000);
    invoiced.steps.invoicing = { status: "completed", completedAt: "2026-07-01T10:00:00Z" };
    invoiced.fields.invoicing = { invoiceDate: "2026-06-15" };
    invoiced.fields.downPayment = { amount: 5_000, received: true, receivedDate: "2026-05-20" };
    invoiced.fields.tradeIn = { vehicleDescription: "Kundenfahrzeug", value: 8_000 };

    const currentDeposit = process("p2", "v2", 20_000);
    currentDeposit.steps.invoicing = { status: "pending" };
    currentDeposit.fields.downPayment = { amount: 2_000, received: true, receivedDate: "2026-06-10" };

    const oldDeposit = process("p3", "v3", 15_000);
    oldDeposit.steps.invoicing = { status: "pending" };
    oldDeposit.fields.downPayment = { amount: 1_000, received: true, receivedDate: "2026-05-10" };

    expect(getKpi("revenue_booked")!.compute(context({ processes: [invoiced, currentDeposit, oldDeposit] })).value)
      .toBe(19_000);
  });

  it("calculates open receivables after deposit and trade-in, even after handover", () => {
    const open = process("p1", "v1", 30_000);
    open.steps.invoicing = { status: "completed", completedAt: "2026-06-10T10:00:00Z" };
    open.steps.delivery_confirmation = { status: "completed", completedAt: "2026-06-20T10:00:00Z" };
    open.fields.invoicing = { paid: false };
    open.fields.downPayment = { amount: 5_000, received: true };
    open.fields.tradeIn = { vehicleDescription: "Kundenfahrzeug", value: 8_000 };

    const paid = process("p2", "v2", 40_000);
    paid.steps.invoicing = { status: "completed", completedAt: "2026-06-12T10:00:00Z" };
    paid.fields.invoicing = { paid: true };

    expect(getKpi("open_receivables")!.compute(context({ processes: [open, paid] })).value).toBe(17_000);
  });

  it("uses only completed offer decisions for conversion", () => {
    const offers = ["accepted", "rejected", "expired", "sent", "draft"].map((status, index) => ({
      id: String(index), status, vehicleId: "v", customerId: "c", createdAt: "2026-01-01",
      validUntil: "2026-01-31", price: 1, customerTodos: [],
    })) as Offer[];
    expect(getKpi("conversion_rate")!.compute(context({ offers })).value).toBeCloseTo(100 / 3);
  });

  it("calculates gross margin as total profit divided by total revenue", () => {
    const first = process("p1", "v1", 100);
    const second = process("p2", "v2", 900);
    first.steps.delivery_confirmation = { status: "completed", completedAt: "2026-06-10T10:00:00Z" };
    second.steps.delivery_confirmation = { status: "completed", completedAt: "2026-06-11T10:00:00Z" };

    const result = getKpi("margin_avg")!.compute(context({
      vehicles: [vehicle("v1", 90), vehicle("v2", 720)], processes: [first, second],
    }));
    expect(result.value).toBeCloseTo(19);
  });
});
