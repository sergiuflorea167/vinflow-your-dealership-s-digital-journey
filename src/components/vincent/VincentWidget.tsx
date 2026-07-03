import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download, History, Loader2, Maximize2, MessageSquarePlus, Minimize2, Minus,
  MoreHorizontal, PanelLeftClose, Save, Send, ShieldCheck, Sparkles, Trash2, X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { buildVincentContext } from "@/lib/vincentContext";
import {
  acknowledgeVincentNotice, deleteAllVincentConversations, deleteVincentConversation,
  listVincentConversations, loadVincentMessages, loadVincentPreference,
  saveVincentConversation, setVincentHistoryEnabled, type VincentConversation,
  type VincentMessage,
} from "@/lib/vincentHistory";
import {
  containsSpecialCategoryHint, conversationTitle, redactSensitiveText,
  VINCENT_MAX_INPUT_LENGTH, VINCENT_NOTICE_VERSION, VINCENT_RETENTION_DAYS,
} from "@/lib/vincentPrivacy";
import { useLang } from "@/lib/i18n";
import { useProcessStore } from "@/store/processStore";

type WindowMode = "normal" | "maximized" | "minimized";

const SUGGESTIONS_DE = [
  "Wie ist mein Umsatz dieses Jahr und wie bewertest du ihn?",
  "Welche Fahrzeuge haben die längste Standzeit?",
  "Wo verliere ich gerade Marge?",
  "Was sollte ich heute zuerst angehen?",
];
const SUGGESTIONS_EN = [
  "How is my revenue this year and how do you rate it?",
  "Which vehicles have the longest stock age?",
  "Where am I losing margin right now?",
  "What should I tackle first today?",
];

const newMessage = (role: VincentMessage["role"], content: string): VincentMessage => ({
  id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString(),
});

const noticeStorageKey = (userId: string) => `vincent-notice:${userId}`;

export const VincentWidget = () => {
  const lang = useLang();
  const { user, profile, organization } = useAuth();
  const settings = useProcessStore((state) => state.settings);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<WindowMode>("normal");
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<VincentMessage[]>([]);
  const [conversations, setConversations] = useState<VincentConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [privacyReady, setPrivacyReady] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [noticeChecked, setNoticeChecked] = useState(false);
  const [retentionDays, setRetentionDays] = useState(VINCENT_RETENTION_DAYS);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  const streamingRef = useRef(streaming);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { streamingRef.current = streaming; }, [streaming]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, mode]);

  const refreshHistory = useCallback(async () => {
    if (!user) return;
    try {
      setConversations(await listVincentConversations());
      setHistoryReady(true);
    } catch {
      setHistoryReady(false);
      setConversations([]);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    setPrivacyLoading(true);
    setPrivacyReady(false);
    setHistoryReady(false);
    if (!user || !profile?.organization_id) {
      setPrivacyLoading(false);
      return;
    }
    const locallyAcknowledged = localStorage.getItem(noticeStorageKey(user.id)) === VINCENT_NOTICE_VERSION;
    Promise.all([loadVincentPreference(user.id), listVincentConversations()])
      .then(([preference, history]) => {
        if (!active) return;
        setAcknowledged(preference.acknowledged || locallyAcknowledged);
        setRetentionDays(preference.retentionDays);
        setConversations(history);
        setHistoryReady(true);
      })
      .catch(() => {
        if (!active) return;
        setAcknowledged(locallyAcknowledged);
        setConversations([]);
        setHistoryReady(false);
      })
      .finally(() => {
        if (!active) return;
        setPrivacyReady(true);
        setPrivacyLoading(false);
      });
    return () => { active = false; };
  }, [user, profile?.organization_id]);

  const close = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setOpen(false);
  };

  const startNew = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setMessages([]);
    setConversationId(null);
    setSaved(false);
    setInput("");
  };

  const persist = useCallback(async (nextMessages: VincentMessage[], id = conversationId) => {
    if (!user || !profile?.organization_id || !id || nextMessages.length === 0) return;
    const firstUser = nextMessages.find((message) => message.role === "user")?.content ?? "Neuer Chat";
    await saveVincentConversation({
      conversationId: id,
      title: conversationTitle(firstUser),
      messages: nextMessages,
      userId: user.id,
      organizationId: profile.organization_id,
      retentionDays,
    });
    await refreshHistory();
  }, [conversationId, profile?.organization_id, refreshHistory, retentionDays, user]);

  const saveCurrent = async () => {
    if (!messagesRef.current.length || !user || !historyReady) return;
    const id = conversationId ?? crypto.randomUUID();
    try {
      await setVincentHistoryEnabled(user.id, true);
      await persist(messagesRef.current, id);
      setConversationId(id);
      setSaved(true);
      toast({ title: "Chat gespeichert", description: `Automatische Löschung nach ${retentionDays} Tagen.` });
    } catch {
      toast({ variant: "destructive", title: "Speichern nicht möglich", description: "Die sichere Chatablage ist noch nicht verfügbar." });
    }
  };

  const send = useCallback(async (rawText: string) => {
    const trimmed = rawText.trim().slice(0, VINCENT_MAX_INPUT_LENGTH);
    if (!trimmed || streamingRef.current || !privacyReady || !acknowledged) return;
    if (containsSpecialCategoryHint(trimmed)) {
      toast({
        variant: "destructive",
        title: "Sensible Angaben erkannt",
        description: "Bitte keine Gesundheits-, Religions-, biometrischen oder vergleichbar besonders geschützten Daten eingeben.",
      });
      return;
    }
    const redacted = redactSensitiveText(trimmed);
    if (redacted.redacted) {
      toast({ title: "Personenbezug entfernt", description: "E-Mail, IBAN, VIN oder Telefonnummer wurde vor der Übertragung anonymisiert." });
    }
    const userMessage = newMessage("user", redacted.text);
    const assistantMessage = newMessage("assistant", "");
    const previous = messagesRef.current;
    const requestMessages = [...previous, userMessage];
    setMessages([...requestMessages, assistantMessage]);
    setInput("");
    setStreaming(true);
    streamingRef.current = true;
    const ac = new AbortController();
    abortRef.current = ac;
    let answer = "";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sitzung abgelaufen. Bitte erneut anmelden.");
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vincent-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: requestMessages.slice(-12).map(({ role, content }) => ({ role, content })),
          context: buildVincentContext(redacted.text),
          lang,
        }),
        signal: ac.signal,
      });
      if (!response.ok || !response.body) {
        let message = `Anfrage fehlgeschlagen (${response.status})`;
        try { message = (await response.json())?.error || message; } catch { /* no server details */ }
        throw new Error(message);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const consume = (line: string) => {
        const clean = line.trim();
        if (!clean.startsWith("data:")) return;
        const payload = clean.slice(5).trim();
        if (!payload || payload === "[DONE]") return;
        try {
          const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content ?? "";
          if (!delta) return;
          answer += delta;
          setMessages([...requestMessages, { ...assistantMessage, content: answer }]);
        } catch { /* wait for a complete event */ }
      };
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(consume);
        if (done) break;
      }
      if (buffer) consume(buffer);
      const finalMessages = [...requestMessages, { ...assistantMessage, content: answer || "Keine Antwort erhalten." }];
      setMessages(finalMessages);
      if (saved && conversationId) await persist(finalMessages, conversationId);
    } catch (error) {
      if (ac.signal.aborted) return;
      const finalMessages = [...requestMessages, {
        ...assistantMessage,
        content: `⚠️ ${error instanceof Error ? error.message : "Die Anfrage konnte nicht verarbeitet werden."}`,
      }];
      setMessages(finalMessages);
    } finally {
      setStreaming(false);
      streamingRef.current = false;
      abortRef.current = null;
    }
  }, [acknowledged, conversationId, lang, persist, privacyReady, saved]);

  useEffect(() => {
    const handler = (event: Event) => {
      const prompt = (event as CustomEvent<{ prompt?: string }>).detail?.prompt;
      setOpen(true);
      setMode("normal");
      if (prompt) setInput(prompt.slice(0, VINCENT_MAX_INPUT_LENGTH));
    };
    window.addEventListener("vincent:open", handler as EventListener);
    return () => window.removeEventListener("vincent:open", handler as EventListener);
  }, []);

  const acceptNotice = async () => {
    if (!noticeChecked || !user || !profile?.organization_id) return;
    localStorage.setItem(noticeStorageKey(user.id), VINCENT_NOTICE_VERSION);
    setAcknowledged(true);
    setNoticeChecked(false);
    if (!historyReady) return;
    try {
      await acknowledgeVincentNotice(user.id, profile.organization_id);
    } catch {
      setHistoryReady(false);
      toast({ title: "Hinweis lokal gespeichert", description: "Der Chat bleibt nutzbar; Speichern und Verlauf sind vorübergehend nicht verfügbar." });
    }
  };

  const loadConversation = async (conversation: VincentConversation) => {
    try {
      abortRef.current?.abort();
      setMessages(await loadVincentMessages(conversation.id));
      setConversationId(conversation.id);
      setSaved(true);
      setShowHistory(false);
    } catch {
      toast({ variant: "destructive", title: "Chat konnte nicht geladen werden" });
    }
  };

  const removeCurrent = async () => {
    if (!conversationId || !window.confirm("Diesen gespeicherten Chat endgültig löschen?")) return;
    await deleteVincentConversation(conversationId);
    startNew();
    await refreshHistory();
  };

  const removeAll = async () => {
    if (!window.confirm("Alle deine gespeicherten Vincent-Chats endgültig löschen?")) return;
    await deleteAllVincentConversations();
    startNew();
    await refreshHistory();
  };

  const exportCurrent = () => {
    if (!messages.length) return;
    const markdown = messages.map((message) => `## ${message.role === "user" ? "Du" : "Vincent"}\n\n${message.content}`).join("\n\n");
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `vincent-chat-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;
  if (mode === "minimized") {
    return (
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-xl border bg-card p-2 shadow-elegant">
        <Button variant="ghost" className="gap-2" onClick={() => setMode("normal")}><Sparkles className="size-4 text-primary" />Vincent</Button>
        <Button variant="ghost" size="icon" onClick={close} aria-label="Chat schließen"><X className="size-4" /></Button>
      </div>
    );
  }

  const suggestions = lang === "en" ? SUGGESTIONS_EN : SUGGESTIONS_DE;
  const company = settings.companyName || organization?.name || "dein Unternehmen";
  const contact = settings.companyEmail || profile?.email || "deine Administration";
  const panelClass = mode === "maximized"
    ? "fixed inset-2 z-40 sm:inset-4"
    : "fixed bottom-3 right-3 z-40 h-[min(82dvh,720px)] w-[min(calc(100vw-1.5rem),500px)] sm:bottom-6 sm:right-6";

  return (
    <>
      <div className={cn(panelClass, "relative flex overflow-hidden rounded-2xl border bg-card shadow-elegant animate-fade-in")}>
        {showHistory && (
          <aside className="absolute inset-y-0 left-0 z-20 flex w-72 max-w-[85%] flex-col border-r bg-card shadow-xl">
            <div className="flex items-center justify-between border-b p-3">
              <span className="text-sm font-semibold">Gespeicherte Chats</span>
              <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}><PanelLeftClose className="size-4" /></Button>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-2">
              {conversations.length === 0 && <p className="p-3 text-xs text-muted-foreground">Noch keine Chats gespeichert.</p>}
              {conversations.map((conversation) => (
                <button key={conversation.id} onClick={() => loadConversation(conversation)} className={cn(
                  "w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-muted",
                  conversation.id === conversationId && "bg-muted",
                )}>
                  <span className="block truncate font-medium">{conversation.title}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(conversation.updatedAt).toLocaleDateString("de-DE")}</span>
                </button>
              ))}
            </div>
            {conversations.length > 0 && <Button variant="ghost" className="m-2 text-destructive" onClick={removeAll}><Trash2 className="mr-2 size-4" />Alle löschen</Button>}
          </aside>
        )}

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-gradient-to-r from-primary/10 to-transparent px-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-sm"><Sparkles className="size-5" /></div>
            <div className="min-w-0 flex-1"><p className="truncate font-display font-semibold leading-tight">Vincent</p><p className="truncate text-[11px] text-muted-foreground">KI-Copilot · Antworten prüfen</p></div>
            <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => setMode("minimized")} aria-label="Minimieren"><Minus className="size-4" /></Button>
            <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => setMode(mode === "maximized" ? "normal" : "maximized")} aria-label="Größe ändern">
              {mode === "maximized" ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={close} aria-label="Schließen"><X className="size-4" /></Button>
          </header>

          <div className="flex h-11 shrink-0 items-center gap-1 border-b bg-muted/20 px-2">
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => setShowHistory((value) => !value)} disabled={!historyReady}>
              {showHistory ? <PanelLeftClose className="size-4" /> : <History className="size-4" />}<span>Verlauf</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-2" onClick={startNew}><MessageSquarePlus className="size-4" /><span>Neuer Chat</span></Button>
            <div className="flex-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" aria-label="Weitere Aktionen"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={saveCurrent} disabled={!historyReady || !messages.length || saved}><Save className="mr-2 size-4" />Chat speichern</DropdownMenuItem>
                <DropdownMenuItem onSelect={exportCurrent} disabled={!messages.length}><Download className="mr-2 size-4" />Chat exportieren</DropdownMenuItem>
                {saved && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={removeCurrent} className="text-destructive"><Trash2 className="mr-2 size-4" />Chat löschen</DropdownMenuItem></>}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {privacyLoading && <div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />Sicherheitskonfiguration wird geprüft…</div>}
            {!privacyLoading && !privacyReady && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <p className="font-semibold">Vincent ist sicherheitshalber deaktiviert</p>
                <p className="mt-1 text-muted-foreground">Bitte melde dich erneut an, um Vincent zu verwenden.</p>
              </div>
            )}
            {!privacyLoading && privacyReady && !historyReady && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Chat ohne Speicherung</p>
                <p className="mt-0.5">Verlauf und Speichern sind vorübergehend nicht verfügbar. Nachrichten bleiben nur in diesem geöffneten Fenster.</p>
              </div>
            )}
            {privacyReady && messages.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-xl border bg-muted/40 p-4 text-sm">Hi, ich bin Vincent. Ich analysiere nur die zur Frage nötigen, minimierten VINflow-Daten.</div>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Probier</p>
                  {suggestions.map((suggestion) => <button key={suggestion} onClick={() => send(suggestion)} className="w-full rounded-lg border bg-background/60 px-3 py-2 text-left text-sm hover:border-primary/50 hover:bg-primary/5">{suggestion}</button>)}
                </div>
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                {message.role === "user" ? (
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">{message.content}</div>
                ) : (
                  <div className="prose prose-sm max-w-[92%] text-sm prose-p:my-1.5 prose-ul:my-1.5">
                    {!message.content && streaming ? <span className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />Denke nach…</span> : <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>}
                  </div>
                )}
              </div>
            ))}
          </div>

          <footer className="shrink-0 border-t bg-background/60 p-3">
            <form onSubmit={(event) => { event.preventDefault(); send(input); }} className="flex items-end gap-2">
              <Textarea value={input} onChange={(event) => setInput(event.target.value)} maxLength={VINCENT_MAX_INPUT_LENGTH} onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(input); }
              }} placeholder="Keine Namen, Kontaktdaten oder sensiblen Daten eingeben" rows={1} className="min-h-[40px] max-h-32 resize-none" disabled={streaming || !privacyReady || !acknowledged} />
              <Button type="submit" size="icon" disabled={streaming || !input.trim() || !privacyReady || !acknowledged}>{streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}</Button>
            </form>
            <p className="mt-1.5 truncate text-center text-[10px] text-muted-foreground">KI kann Fehler machen · Keine sensiblen Daten eingeben</p>
          </footer>
        </section>
      </div>

      <Dialog open={privacyReady && !acknowledged} onOpenChange={(next) => { if (!next) close(); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" />Datenschutzhinweis zu Vincent</DialogTitle>
            <DialogDescription>Bitte vor der ersten Nutzung lesen. Dies ist eine Information und keine pauschale Einwilligung in unnötige Verarbeitung.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-3 overflow-y-auto text-sm text-muted-foreground">
            <p><strong className="text-foreground">Verantwortlich:</strong> {company}, Kontakt: {contact}.</p>
            <p>Vincent ist ein KI-System. Zur Beantwortung werden deine Eingabe und ausschließlich zur Frage passende, minimierte Betriebskennzahlen über das Lovable AI Gateway an einen KI-Modellanbieter übermittelt. Direkte Kundennamen, VIN, Kontakt-, Zahlungs-, Termin- und To-Do-Freitexte werden nicht in den automatisch erzeugten Kontext aufgenommen.</p>
            <p>Nutze Vincent nur für betriebliche Analysen. Gib keine personenbezogenen Kundendaten, Beschäftigtendaten, Passwörter oder besonders geschützten Daten (z. B. Gesundheits- oder Religionsangaben) ein. Vincent darf keine automatisierten Entscheidungen über Kunden oder Beschäftigte treffen; Ergebnisse müssen durch einen Menschen geprüft werden.</p>
            <p>Chats werden zunächst nur im geöffneten Fenster gehalten. Erst wenn du „Speichern“ auswählst, werden sie zugriffsgeschützt deinem Benutzerkonto zugeordnet und nach {retentionDays} Tagen automatisch gelöscht. Du kannst sie jederzeit exportieren oder sofort löschen.</p>
            <p>Je nach Modellanbieter kann eine Verarbeitung außerhalb der EU/des EWR auf Basis geeigneter Garantien stattfinden. Maßgeblich sind außerdem eure Datenschutzerklärung, der Auftragsverarbeitungsvertrag und die Anbieterbedingungen.</p>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-foreground">
              <Checkbox checked={noticeChecked} onCheckedChange={(value) => setNoticeChecked(value === true)} className="mt-0.5" />
              <span>Ich habe den Hinweis gelesen und werde keine personenbezogenen oder besonders geschützten Daten in Vincent eingeben.</span>
            </label>
          </div>
          <DialogFooter><Button variant="outline" onClick={close}>Abbrechen</Button><Button disabled={!noticeChecked} onClick={acceptNotice}>Hinweis verstanden</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
