import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { MOCK_CUSTOMERS, MOCK_PROCESSES, MOCK_VEHICLES } from "@/data/process";
import { generateBelegPdf } from "@/lib/pdf";

const readCompressedPdfText = (bytes: ArrayBuffer) => {
  const buffer = Buffer.from(bytes);
  const source = buffer.toString("latin1");
  const streamPattern = /stream\r?\n/g;
  const contents: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = streamPattern.exec(source))) {
    const start = match.index + match[0].length;
    const marker = source.indexOf("endstream", start);
    if (marker < 0) break;
    let end = marker;
    while (end > start && (buffer[end - 1] === 10 || buffer[end - 1] === 13)) end -= 1;
    try {
      contents.push(inflateSync(buffer.subarray(start, end)).toString("latin1"));
    } catch {
      // Non-Flate streams are irrelevant for the rendered payment text.
    }
    streamPattern.lastIndex = marker + "endstream".length;
  }

  return contents.join("\n");
};

describe("purchase contract payments", () => {
  it("documents deposit and final payment with date and method", () => {
    const process = structuredClone(MOCK_PROCESSES[0]);
    process.fields.downPayment = {
      invoiceNumber: "AR-2025-0042",
      invoiceDate: "2025-04-10",
      amount: 5_000,
      paymentTerms: "Sofort fällig",
      method: "Bar",
      received: true,
      receivedDate: "2025-04-14",
    };
    process.fields.invoicing = {
      invoiceNumber: "RE-2025-0088",
      invoiceDate: "2025-05-01",
      paymentTerms: "Bei Übergabe",
      method: "Finanzierung",
      paid: true,
      paidDate: "2025-05-05",
    };
    const vehicle = MOCK_VEHICLES.find((entry) => entry.id === process.vehicleId)!;
    const customer = MOCK_CUSTOMERS.find((entry) => entry.id === process.customerId)!;

    const doc = generateBelegPdf({ process, vehicle, customer, stepKey: "purchase_contract" });
    const text = readCompressedPdfText(doc.output("arraybuffer"));

    expect(text).toContain("Anzahlung");
    expect(text).toContain("AR-2025-0042");
    expect(text).toContain("14.04.2025");
    expect(text).toContain("Bar");
    expect(text).toContain("Restzahlung");
    expect(text).toContain("RE-2025-0088");
    expect(text).toContain("05.05.2025");
    expect(text).toContain("Finanzierung");
  });
});
