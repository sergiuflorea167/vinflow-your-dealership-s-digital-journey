import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "node:util";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VincentWidget } from "@/components/vincent/VincentWidget";
import { buildEmptySteps, formatCurrency, type Process, type Vehicle } from "@/data/process";

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
const storeState = vi.hoisted(() => ({
  vehicles: [] as unknown[],
  processes: [] as unknown[],
  purchasePlans: [] as unknown[],
}));
const speechMocks = vi.hoisted(() => ({
  instances: [] as Array<{
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onend: (() => void) | null;
    onerror: (() => void) | null;
    onresult: ((event: {
      resultIndex: number;
      results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
    }) => void) | null;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }>,
  recorders: [] as Array<{
    mimeType: string;
    ondataavailable: ((event: { data: Blob }) => void) | null;
    onerror: (() => void) | null;
    onstop: (() => void) | null;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }>,
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
    purchasePlans: unknown[];
  }) => unknown) => selector({
    settings: {},
    addTodo: storeMocks.addTodo,
    vehicles: storeState.vehicles,
    processes: storeState.processes,
    purchasePlans: storeState.purchasePlans,
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
    storeState.vehicles = [];
    storeState.processes = [];
    storeState.purchasePlans = [];
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
    delete (window as typeof window & { SpeechRecognition?: unknown }).SpeechRecognition;
    speechMocks.instances = [];
    speechMocks.recorders = [];
  });

  it("creates and automatically saves a conversation around the AI response", async () => {
    render(<VincentWidget />);
    act(() => window.dispatchEvent(new CustomEvent("vincent:open")));

    const input = await screen.findByPlaceholderText("Nachricht an VINcent");
    expect(screen.getByTestId("vincent-window")).toHaveClass("fixed");
    await waitFor(() => expect(input).toBeEnabled());
    expect(screen.getByRole("button", { name: "Neuer Chat" })).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "Was sollte ich heute zuerst angehen?" } });
    expect(input).toHaveValue("Was sollte ich heute zuerst angehen?");
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

  it("keeps the chat locked when weekly acceptance cannot be verified by the backend", async () => {
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

  it("falls back to this browser after weekly acceptance was verified", async () => {
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

  it("records and requires the weekly data notice before enabling VINcent", async () => {
    historyMocks.loadPreference.mockResolvedValue({ acknowledged: false, historyEnabled: true, retentionDays: 30 });
    historyMocks.acknowledge.mockResolvedValue(undefined);

    render(<VincentWidget />);
    expect(await screen.findByText("Welche To-Do-Daten VINcent erhält")).toBeInTheDocument();
    expect(screen.getByText(/Bei jeder Anfrage wird deine vollständige To-Do-Liste/)).toBeInTheDocument();
    expect(screen.getByText("Welche Fahrzeugdaten VINcent erhält")).toBeInTheDocument();
    expect(screen.getByText(/Fahrgestellnummer \(VIN\) und Kennzeichen werden bewusst nie übermittelt/)).toBeInTheDocument();

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

describe("VINcent Insight+ commands", () => {
  const vehicle = (id: string, make: string, model: string): Vehicle => ({
    id, vin: `VIN-${id}`, type: "limousine", make, model, year: 2020,
    fuel: "Benzin", transmission: "Automatik", power_kw: 100, power_hp: 136,
    color: "Schwarz", mileage: 10_000, listPrice: 1_000, purchasePrice: 500,
    status: "sold", location: { name: "Hof", kind: "lot", since: "2026-01-01" },
    locationHistory: [], costs: [],
  });
  const process = (id: string, vehicleId: string, finalPrice: number, deliveryAt: string): Process => {
    const steps = buildEmptySteps("delivery_confirmation");
    steps.delivery_confirmation = { status: "completed", completedAt: deliveryAt };
    return {
      id, vehicleId, customerId: "customer", acceptedOfferId: "offer", createdAt: deliveryAt, updatedAt: deliveryAt,
      currentStep: "delivery_confirmation", steps, fields: { finalPrice }, customerTodosOC: [], outboundChecklist: [],
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    storeState.vehicles = [vehicle("v1", "Audi", "A6"), vehicle("v2", "BMW", "320d")];
    storeState.processes = [
      process("p1", "v1", 15_000, "2026-01-15T10:00:00.000Z"),
      process("p2", "v2", 25_000, "2026-02-10T10:00:00.000Z"),
    ];
    storeState.purchasePlans = [];
    historyMocks.list.mockResolvedValue([]);
    historyMocks.loadPreference.mockResolvedValue({ acknowledged: true, historyEnabled: true, retentionDays: 30 });
    historyMocks.save.mockResolvedValue(new Date(Date.now() + 30 * 86_400_000).toISOString());
    historyMocks.setEnabled.mockResolvedValue(undefined);
    Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });
    vi.stubGlobal("fetch", vi.fn());
  });

  const readSavedMeasurements = (): Array<{ metric: string }> =>
    JSON.parse(localStorage.getItem("vinflow.insightplus.measurements.v1") ?? "[]");

  // RTL's getByText only matches an element's own direct text nodes, and normalizes
  // whitespace — currency formatting can embed a narrow no-break space, so comparing
  // against the fully concatenated, whitespace-normalized window text is more robust
  // than trying to match a single markdown-rendered node.
  const windowText = () => (screen.getByTestId("vincent-window").textContent ?? "").replace(/\s+/g, " ");

  it("answers a data question with the exact computed figure and never calls the AI", async () => {
    render(<VincentWidget />);
    act(() => window.dispatchEvent(new CustomEvent("vincent:open")));

    const input = await screen.findByPlaceholderText("Nachricht an VINcent");
    fireEvent.change(input, { target: { value: "Wie hoch ist mein Umsatz insgesamt bei der Lieferung?" } });
    fireEvent.click(screen.getByRole("button", { name: "Nachricht senden" }));

    await waitFor(() => expect(windowText()).toContain(formatCurrency(40_000).replace(/\s+/g, " ")));
    expect(windowText()).toContain("2 Fahrzeuge einbezogen");
    expect(fetch).not.toHaveBeenCalled();
    expect(readSavedMeasurements()).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Ja, als Insight+ Karte speichern" }));

    await waitFor(() => expect(windowText()).toContain("gespeichert"));
    const insightLinks = screen.getAllByRole("link", { name: "Insight+ Karte" });
    expect(insightLinks[insightLinks.length - 1]).toHaveAttribute("href", "/insights");
    await waitFor(() => expect(readSavedMeasurements()).toHaveLength(1));
    expect(readSavedMeasurements()[0].metric).toBe("revenue");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("creates a card immediately when explicitly asked to, with no follow-up question", async () => {
    render(<VincentWidget />);
    act(() => window.dispatchEvent(new CustomEvent("vincent:open")));

    const input = await screen.findByPlaceholderText("Nachricht an VINcent");
    fireEvent.change(input, { target: { value: "Erstelle mir eine Insight+ Karte für den Umsatz bei der Lieferung, gesamt" } });
    fireEvent.click(screen.getByRole("button", { name: "Nachricht senden" }));

    await waitFor(() => expect(windowText()).toContain("Insight+ Karte erstellt"));
    const insightsLink = screen.getAllByRole("link").find((a) => a.getAttribute("href") === "/insights");
    expect(insightsLink).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    await waitFor(() => expect(readSavedMeasurements()).toHaveLength(1));
    expect(readSavedMeasurements()[0].metric).toBe("revenue");
  });
});

describe("VINcent speech input", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    historyMocks.list.mockResolvedValue([]);
    historyMocks.loadPreference.mockResolvedValue({ acknowledged: true, historyEnabled: true, retentionDays: 30 });
    historyMocks.save.mockResolvedValue(new Date(Date.now() + 30 * 86_400_000).toISOString());
    historyMocks.setEnabled.mockResolvedValue(undefined);
    speechMocks.instances = [];
    speechMocks.recorders = [];
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

  it("sends a spoken question to VINcent automatically", async () => {
    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onresult: ((event: {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void) | null = null;
      start = vi.fn();
      stop = vi.fn(() => this.onend?.());

      constructor() {
        speechMocks.instances.push(this);
      }
    }
    (window as typeof window & { SpeechRecognition: typeof MockSpeechRecognition }).SpeechRecognition = MockSpeechRecognition;

    render(<VincentWidget />);
    act(() => window.dispatchEvent(new CustomEvent("vincent:open")));

    const input = await screen.findByPlaceholderText("Nachricht an VINcent");
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Mit VINcent sprechen" }));

    expect(speechMocks.instances[0].start).toHaveBeenCalledTimes(1);
    act(() => {
      speechMocks.instances[0].onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: "Welche Fahrzeuge stehen zu lange?" } }],
      });
    });

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const request = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(request.messages[0]).toEqual({ role: "user", content: "Welche Fahrzeuge stehen zu lange?" });
  });

  it("records audio and transcribes it when browser speech recognition is unavailable", async () => {
    delete (window as typeof window & { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as typeof window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    const trackStop = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: trackStop }] }) },
    });
    class MockMediaRecorder {
      mimeType = "audio/webm";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onerror: (() => void) | null = null;
      onstop: (() => void) | null = null;
      start = vi.fn();
      stop = vi.fn(() => {
        this.ondataavailable?.({ data: new Blob(["audio"], { type: "audio/webm" }) });
        this.onstop?.();
      });

      constructor() {
        speechMocks.recorders.push(this);
      }
    }
    vi.stubGlobal("MediaRecorder", MockMediaRecorder);
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ text: "Welche Aufgaben sind dringend?" }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: { getReader: () => ({ read: vi.fn()
          .mockResolvedValueOnce({ value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Alles klar."}}]}\n\n'), done: false })
          .mockResolvedValueOnce({ value: new TextEncoder().encode("data: [DONE]\n\n"), done: false })
          .mockResolvedValueOnce({ value: undefined, done: true }) }) },
      } as unknown as Response);

    render(<VincentWidget />);
    act(() => window.dispatchEvent(new CustomEvent("vincent:open")));

    const input = await screen.findByPlaceholderText("Nachricht an VINcent");
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Mit VINcent sprechen" }));
    await waitFor(() => expect(speechMocks.recorders[0].start).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Zuhören beenden" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain("/functions/v1/vincent-transcribe");
    const request = JSON.parse(vi.mocked(fetch).mock.calls[1][1]?.body as string);
    expect(request.messages[0]).toEqual({ role: "user", content: "Welche Aufgaben sind dringend?" });
    expect(trackStop).toHaveBeenCalled();
  });
});
