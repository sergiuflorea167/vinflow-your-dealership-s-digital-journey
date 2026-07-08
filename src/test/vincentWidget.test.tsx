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

const storeMocks = vi.hoisted(() => ({
  addTodo: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/store/processStore", () => ({
  useProcessStore: (selector: (state: {
    settings: Record<string, string>;
    addTodo: ReturnType<typeof vi.fn>;
    vehicles: unknown[];
    processes: unknown[];
  }) => unknown) => selector({
    settings: {},
    addTodo: storeMocks.addTodo,
    vehicles: [],
    processes: [],
  }),
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
    storeMocks.addTodo.mockReturnValue({
      id: "TD-1",
      title: "Büro prüfen",
      priority: "high",
      dueDate: "2026-07-09",
      scope: "general",
      done: false,
      createdAt: "2026-07-08T12:00:00.000Z",
      createdBy: "Admin",
    });
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

  it("keeps the chat locked when daily acceptance cannot be verified by the backend", async () => {
    historyMocks.loadPreference.mockRejectedValue(new Error("table unavailable"));
    historyMocks.list.mockRejectedValue(new Error("table unavailable"));
    render(<VincentWidget />);
    act(() => window.dispatchEvent(new CustomEvent("vincent:open")));

    const input = await screen.findByPlaceholderText("Nachricht an VINcent");
    expect(input).toBeDisabled();
    expect(screen.getByText("VINcent ist nicht verfügbar")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    expect(historyMocks.save).not.toHaveBeenCalled();
  });

  it("falls back to this browser after daily acceptance was verified", async () => {
    historyMocks.list.mockRejectedValue(new Error("table unavailable"));
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

  it("records and requires the daily data notice before enabling VINcent", async () => {
    historyMocks.loadPreference.mockResolvedValue({ acknowledged: false, historyEnabled: true, retentionDays: 30 });
    historyMocks.acknowledge.mockResolvedValue(undefined);

    render(<VincentWidget />);
    expect(await screen.findByText("Welche To-Do-Daten VINcent erhält")).toBeInTheDocument();
    expect(screen.getByText(/vollständige To-Do-Liste bei jeder Anfrage/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Hinweis verstanden" }));

    await waitFor(() => expect(historyMocks.acknowledge).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText("Welche To-Do-Daten VINcent erhält")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Datenschutz anzeigen" }));
    expect(await screen.findByText("Welche To-Do-Daten VINcent erhält")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Schließen" }));
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
  it("asks for missing To-Do data and creates the To-Do from the follow-up", async () => {
    render(<VincentWidget />);
    act(() => window.dispatchEvent(new CustomEvent("vincent:open")));

    const input = await screen.findByPlaceholderText("Nachricht an VINcent");
    fireEvent.change(input, { target: { value: "Erstelle ein To-Do: Büro prüfen" } });
    fireEvent.click(screen.getByRole("button", { name: "Nachricht senden" }));

    expect(await screen.findByText(/Bis wann soll das To-Do fällig sein/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    expect(storeMocks.addTodo).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "morgen, hoch" } });
    fireEvent.click(screen.getByRole("button", { name: "Nachricht senden" }));

    await waitFor(() => expect(storeMocks.addTodo).toHaveBeenCalledWith(expect.objectContaining({
      title: "Büro prüfen",
      priority: "high",
      scope: "general",
      tags: ["VINcent"],
    })));
    expect(await screen.findByRole("link", { name: "Büro prüfen" })).toHaveAttribute("href", "/todos?todo=TD-1");
    expect(fetch).not.toHaveBeenCalled();
  });
});
