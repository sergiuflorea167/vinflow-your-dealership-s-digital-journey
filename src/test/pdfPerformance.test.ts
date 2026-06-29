import { describe, expect, it } from "vitest";

import { MOCK_CUSTOMERS, MOCK_PROCESSES, MOCK_VEHICLES } from "@/data/process";
import { generateBelegPdf } from "@/lib/pdf";

describe("PDF performance", () => {
  it("creates a compact, compressed purchase contract with only used fonts", () => {
    const process = MOCK_PROCESSES[0];
    const vehicle = MOCK_VEHICLES.find((entry) => entry.id === process.vehicleId)!;
    const customer = MOCK_CUSTOMERS.find((entry) => entry.id === process.customerId)!;

    const doc = generateBelegPdf({
      process,
      vehicle,
      customer,
      stepKey: "purchase_contract",
    });
    const bytes = doc.output("arraybuffer");
    const source = Buffer.from(bytes).toString("latin1");
    const embeddedFonts = source.match(/\/Type \/Font\b/g) ?? [];

    expect(bytes.byteLength).toBeLessThan(50_000);
    expect(source).toContain("/FlateDecode");
    expect(embeddedFonts.length).toBeLessThanOrEqual(4);
  });
});
