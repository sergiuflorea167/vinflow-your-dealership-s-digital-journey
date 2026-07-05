import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: supabaseMocks.getSession },
    storage: { from: supabaseMocks.from },
  },
}));

import { uploadStoredDocument } from "@/lib/documentStorage";

describe("document storage gateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.getSession.mockResolvedValue({ data: { session: { access_token: "legacy-user-token" } } });
  });

  it("uploads through the protected gateway instead of the legacy bucket", async () => {
    const stored = {
      id: "doc-1",
      name: "Angebot.pdf",
      mimeType: "application/pdf",
      size: 3,
      storagePath: "org-1/todo/todo-1/doc-1-Angebot.pdf",
      uploadedAt: "2026-07-05T12:00:00.000Z",
      uploadedBy: "Testnutzer",
      portalVisible: false,
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: vi.fn().mockResolvedValue(stored) });
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["pdf"], "Angebot.pdf", { type: "application/pdf" });

    await expect(uploadStoredDocument({
      file,
      organizationId: "org-1",
      entityType: "todo",
      entityId: "todo-1",
      uploadedBy: "Testnutzer",
    })).resolves.toEqual(stored);

    expect(supabaseMocks.from).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toContain("/functions/v1/document-storage");
    expect(url.searchParams.get("action")).toBe("upload");
    expect(url.searchParams.get("entityType")).toBe("todo");
    expect(options.body).toBe(file);
    expect(options.headers).toMatchObject({
      Authorization: "Bearer legacy-user-token",
      "x-organization-id": "org-1",
    });
  });
});
