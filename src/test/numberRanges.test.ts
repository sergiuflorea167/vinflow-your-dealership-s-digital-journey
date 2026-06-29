import { describe, expect, it } from "vitest";
import {
  DEFAULT_NUMBER_RANGES,
  formatDocumentNumber,
  nextInvoiceNumber,
  nextOrderConfirmationNumber,
  normalizeNumberRanges,
  type Process,
} from "@/data/process";

describe("number ranges", () => {
  it("formats a configurable number with year and padding", () => {
    expect(formatDocumentNumber({ prefix: "RE", startNumber: 1, digits: 5, includeYear: true }, 42, 2026))
      .toBe("RE-2026-00042");
  });

  it("normalizes missing legacy settings to defaults", () => {
    expect(normalizeNumberRanges(undefined)).toEqual(DEFAULT_NUMBER_RANGES);
  });

  it("uses the configured start number when no matching number exists", () => {
    expect(nextInvoiceNumber([], { prefix: "R", startNumber: 500, digits: 4, includeYear: false }))
      .toBe("R-0500");
  });

  it("continues after the highest matching number", () => {
    const year = new Date().getFullYear();
    const processes = [
      { fields: { invoicing: { invoiceNumber: `RE-${year}-0012` } } },
      { fields: { invoicing: { invoiceNumber: `RE-${year}-0008` } } },
    ] as unknown as Process[];

    expect(nextInvoiceNumber(processes)).toBe(`RE-${year}-0013`);
  });

  it("assigns a separate sequential number to order confirmations", () => {
    const year = new Date().getFullYear();
    const processes = [
      { fields: { orderConfirmation: { confirmationNumber: `AB-${year}-0021` } } },
    ] as unknown as Process[];

    expect(nextOrderConfirmationNumber(processes)).toBe(`AB-${year}-0022`);
  });
});
