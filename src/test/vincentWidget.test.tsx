import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "node:util";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VincentWidget } from "@/components/vincent/VincentWidget";

const historyMocks = vi.hoisted(() => ({
  acknowledge: vi.fn(),
  deleteAll: vi.fn(),
  deleteOne: vi.fn(),
  list: vi.fn(),
  loadMessages: vi.fn(),
  loadPreference: vi.fn(),
  rename: vi.fn(),
  save: vi.fn(),
  setEnabled: vi.fn(),
}));

const authState = vi.hoisted(() => ({
  user: { id: "user-1" },
  profile: { organization_id: "org-1", email: "admin@example.test" },
  organization: { name: "Testbetrieb" },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/store/processStore", () => ({
  useProcessStore: (selector: (state: { settings: Record<string, string> }) => unknown) => selector({ settings: {} }),
}));

vi.mock("@/lib/i18n", () => ({ useLang: () => "de" }));
vi.mock("@/lib/vincentContext", () => ({ buildVincentContext: () => ({}) }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "test-token" } } }) } },
}));
vi.mock("@/lib/vincentHistory", () => ({
  acknowledgeVincentNotice: historyMocks.acknowledge,
  deleteAllVincentConversations: historyMocks.deleteAll,
  deleteVincentConversation: historyMocks.deleteOne,
  listVincentConversations: historyMocks.list,
  loadVincentMessages: historyMocks.loadMessages,
  loadVincentPreference: historyMocks.loadPreference,
  renameVincentConversation: historyMocks.rename,
  saveVincentConversation: historyMocks.save,
  setVincentHistoryEnabled: historyMocks.setEnabled,
}));

describe("VINcent chat workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    historyMocks.list.mockResolvedValue([]);
    historyMocks.loadPreference.mockResolvedValue({ acknowledged: true, historyEnabled: true, retentionDays: 30 });
    historyMocks.save.mockResolvedValue(new Date(Date.now() + 30 * 86_400_000).toISOString());
    historyMocks.setEnabled.mockResolvedValue(undefined);
    Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });
    vi.stubGlobal("TextDecoder", TextDecoder);
    vi.stubGlobal("TextEncoder", TextEncoder);
    const chunks = [new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Alles klar."}}]}\n\ndata: [DONE]\n\n')];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: { getReader: () => ({ read: vi.fn().mockImplementation(() => Promise.resolve(chunks.length ? { value: chunks.shift(), done: false } : { value: undefined, done: true })) }) },
    }));
  });

  it("creates and automatically saves a conversation around the AI response", async () => {
    render(<VincentWidget />);
    act(() => window.dispatchEvent(new CustomEvent("vincent:open")));

    const input = await screen.findByPlaceholderText("Nachricht an VINcent");
    expect(screen.getByTestId("vincent-window")).toHaveClass("fixed");
    expect(input).toBeEnabled();
    expect(screen.getByRole("button", { name: "Neuer Chat" })).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "Wie entwickelt sich mein Umsatz?" } });
    expect(input).toHaveValue("Wie entwickelt sich mein Umsatz?");
    const sendButton = screen.getByRole("button", { name: "Nachricht senden" });
    await waitFor(() => expect(sendButton).toBeEnabled());
    fireEvent.click(sendButton);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(historyMocks.save).toHaveBeenCalled();
    expect(historyMocks.save.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(fetch).mock.invocationCallOrder[0]);
    await waitFor(() => expect(historyMocks.save).toHaveBeenCalledTimes(2));

    const savedPayloads = historyMocks.save.mock.calls.map(([payload]) => payload);
    expect(savedPayloads[0].conversationId).toBe(savedPayloads[1].conversationId);
    expect(savedPayloads[0].messages).toHaveLength(1);
    expect(savedPayloads[1].messages).toHaveLength(2);
    expect(screen.getByText("Automatisch gespeichert")).toHaveClass("text-emerald-600");
  });

  it("falls back to this browser and keeps the saved chat in the sidebar", async () => {
    historyMocks.loadPreference.mockRejectedValue(new Error("table unavailable"));
    historyMocks.list.mockRejectedValue(new Error("table unavailable"));
    localStorage.setItem("vincent-notice:user-1", "2026-07-03");

    render(<VincentWidget />);
    act(() => window.dispatchEvent(new CustomEvent("vincent:open")));

    const input = await screen.findByPlaceholderText("Nachricht an VINcent");
    expect(input).toBeEnabled();
    expect(screen.getByText("Automatisch gespeichert · Dieser Browser")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "Temporäre Frage" } });
    const sendButton = screen.getByRole("button", { name: "Nachricht senden" });
    await waitFor(() => expect(sendButton).toBeEnabled());
    fireEvent.click(sendButton);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText("Automatisch gespeichert")).toHaveClass("text-emerald-600"));
    expect(historyMocks.save).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Temporäre Frage" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Neuer Chat" }));
    expect(screen.getByText("Neue Unterhaltung")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Temporäre Frage" })).toBeInTheDocument();
  });

  it("keeps the failed AI request in the saved conversation", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 502,
      body: {},
      json: vi.fn().mockResolvedValue({ error: "KI vorübergehend nicht erreichbar" }),
    } as unknown as Response);

    render(<VincentWidget />);
    act(() => window.dispatchEvent(new CustomEvent("vincent:open")));

    const input = await screen.findByPlaceholderText("Nachricht an VINcent");
    fireEvent.change(input, { target: { value: "Bitte analysieren" } });
    fireEvent.click(screen.getByRole("button", { name: "Nachricht senden" }));

    await waitFor(() => expect(historyMocks.save).toHaveBeenCalledTimes(2));
    const finalPayload = historyMocks.save.mock.calls[1][0];
    expect(finalPayload.messages).toHaveLength(2);
    expect(finalPayload.messages[1].content).toContain("KI vorübergehend nicht erreichbar");
    expect(screen.getByText("Automatisch gespeichert")).toBeInTheDocument();
  });
});
