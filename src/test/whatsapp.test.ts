import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl, normalizeWhatsAppPhone } from "@/lib/whatsapp";

describe("WhatsApp links", () => {
  it("normalizes German phone numbers for wa.me", () => {
    expect(normalizeWhatsAppPhone("+49 151 2233 4455")).toBe("4915122334455");
    expect(normalizeWhatsAppPhone("0151 2233 4455")).toBe("4915122334455");
    expect(normalizeWhatsAppPhone("0049 151 2233 4455")).toBe("4915122334455");
  });

  it("builds a WhatsApp URL with the prepared message", () => {
    const url = buildWhatsAppUrl({ phone: "+49 151 2233 4455", message: "Beleg senden" });

    expect(url).toBe("https://wa.me/4915122334455?text=Beleg+senden");
  });

  it("falls back to the generic share URL when no phone number is available", () => {
    const url = buildWhatsAppUrl({ phone: "", message: "Kundenlink" });

    expect(url).toBe("https://wa.me/?text=Kundenlink");
  });
});
