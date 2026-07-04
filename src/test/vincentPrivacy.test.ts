import { describe, expect, it } from "vitest";
import { containsSpecialCategoryHint, conversationTitle, redactSensitiveText } from "@/lib/vincentPrivacy";

describe("VINcent privacy guard", () => {
  it("redacts direct identifiers before transmission", () => {
    const result = redactSensitiveText(
      "Mail max@example.de, IBAN DE89 3704 0044 0532 0130 00, VIN WBA12345678901234, Tel. +49 (170) 12345678",
    );

    expect(result.redacted).toBe(true);
    expect(result.text).not.toContain("max@example.de");
    expect(result.text).not.toContain("DE89");
    expect(result.text).not.toContain("WBA12345678901234");
    expect(result.text).not.toContain("12345678");
  });

  it("blocks hints of GDPR special-category data in German and English", () => {
    expect(containsSpecialCategoryHint("Der Kunde hat eine Diagnose")).toBe(true);
    expect(containsSpecialCategoryHint("Employee trade union membership")).toBe(true);
    expect(containsSpecialCategoryHint("Welche Fahrzeuge stehen lange?")).toBe(false);
  });

  it("never uses identifiers in generated conversation titles", () => {
    expect(conversationTitle("Frage zu max@example.de und WBA12345678901234")).not.toMatch(/max@|WBA123/);
  });
});
