import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Customer, Process, Vehicle } from "@/data/process";

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: mocks.invoke } },
}));

import { loadCustomerTrackingSnapshot, saveCustomerTrackingSnapshot } from "@/lib/customerLink";

const snapshot = {
  process: { id: "VF-2026-0001", fields: {} } as Process,
  vehicle: { id: "V-0001" } as Vehicle,
  customer: { id: "C-0001", name: "Max Mustermann" } as Customer,
  companyName: "VINflow",
};

describe("customer portal link compatibility", () => {
  beforeEach(() => mocks.invoke.mockReset());

  it("uses a random legacy-compatible token when an older function only returns ok", async () => {
    mocks.invoke.mockResolvedValue({ data: { ok: true }, error: null });

    const token = await saveCustomerTrackingSnapshot(snapshot);

    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(mocks.invoke).toHaveBeenCalledWith("customer-tracking", expect.objectContaining({
      body: expect.objectContaining({ token }),
    }));
  });

  it("prefers the server token returned by the hardened function", async () => {
    const serverToken = "A".repeat(43);
    mocks.invoke.mockResolvedValue({ data: { ok: true, token: serverToken }, error: null });

    await expect(saveCustomerTrackingSnapshot(snapshot)).resolves.toBe(serverToken);
  });

  it("adds only backend-signed document URLs to the loaded portal snapshot", async () => {
    const document = {
      id: "doc-1", name: "Zulassung.pdf", mimeType: "application/pdf", size: 123,
      storagePath: "org/process/id/doc.pdf", uploadedAt: "2026-07-01T00:00:00Z", uploadedBy: "Test",
      portalVisible: true,
    };
    mocks.invoke.mockResolvedValue({
      data: {
        snapshot: { ...snapshot, process: { ...snapshot.process, fields: { documents: [document] } } },
        documentUrls: { "doc-1": "https://signed.example/document" },
      },
      error: null,
    });

    const loaded = await loadCustomerTrackingSnapshot("secure-token", "CODE");

    expect(loaded?.process.fields.documents?.[0].portalUrl).toBe("https://signed.example/document");
  });
});
