import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check, Download, Loader2, Maximize2, MessageSquarePlus, Minimize2, Minus,
  MoreHorizontal, PanelLeftClose, PanelLeftOpen, Pencil, Search, Send, ShieldCheck, Sparkles, Trash2, X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { buildVincentContext } from "@/lib/vincentContext";
import {
  acknowledgeVincentNotice, deleteAllVincentConversations, deleteVincentConversation,
  listVincentConversations, loadVincentMessages, loadVincentPreference,
  renameVincentConversation, saveVincentConversation, setVincentHistoryEnabled, type VincentConversation,
  type VincentMessage,
} from "@/lib/vincentHistory";
import {
  containsSpecialCategoryHint, conversationTitle, redactSensitiveText,
  VINCENT_MAX_INPUT_LENGTH, VINCENT_NOTICE_VERSION, VINCENT_RETENTION_DAYS,
} from "@/lib/vincentPrivacy";
import { useLang } from "@/lib/i18n";
import { useProcessStore } from "@/store/processStore";

type WindowMode = "normal" | "maximized" | "minimized";
type SaveStatus = "idle" | "saving" | "saved" | "error";

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

const conversationGroup = (updatedAt: string) => {
  const age = Date.now() - new Date(updatedAt).getTime();
  if (age < 86_400_000) return "Heute";
  if (age < 7 * 86_400_000) return "Letzte 7 Tage";
  return "Älter";
};

export const VincentWidget = () => {
  const lang = useLang();
  const { user, profile, organization } = useAuth();
  const settings = useProcessStore((state) => state.settings);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<WindowMode>("normal");
  const [showHistory, setShowHistory] = useState(true);
  const [historySearch, setHistorySearch] = useState("");
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<VincentMessage[]>([]);
  const [conversations, setConversations] = useState<VincentConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [renamingConversation, setRenamingConversation] = useState<VincentConversation | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
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
    setSaveStatus("idle");
    setInput("");
  };

  const persist = useCallback(async (nextMessages: VincentMessage[], id = conversationId) => {
    if (!user || !profile?.organization_id || !id || nextMessages.length === 0) return;
    setSaveStatus("saving");
    const firstUser = nextMessages.find((message) => message.role === "user")?.content ?? "Neuer Chat";
    const existingTitle = conversations.find((conversation) => conversation.id === id)?.title;
    try {
      await saveVincentConversation({
        conversationId: id,
        title: existingTitle ?? conversationTitle(firstUser),
        messages: nextMessages,
        userId: user.id,
        organizationId: profile.organization_id,
        retentionDays,
      });
      setConversationId(id);
      setSaveStatus("saved");
      await refreshHistory();
    } catch (error) {
      setSaveStatus("error");
      throw error;
    }
  }, [conversationId, conversations, profile?.organization_id, refreshHistory, retentionDays, user]);

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
    const nextConversationId = conversationId ?? crypto.randomUUID();
    if (!conversationId) setConversationId(nextConversationId);
    setMessages([...requestMessages, assistantMessage]);
    setInput("");
    setStreaming(true);
    streamingRef.current = true;
    if (historyReady && user) {
      void setVincentHistoryEnabled(user.id, true)
        .then(() => persist(requestMessages, nextConversationId))
        .catch(() => {
          setSaveStatus("error");
          setHistoryReady(false);
        });
    }
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
      if (historyReady) {
        try {
          await persist(finalMessages, nextConversationId);
        } catch {
          setHistoryReady(false);
        }
      }
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
  }, [acknowledged, conversationId, historyReady, lang, persist, privacyReady, user]);

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
      setSaveStatus("saved");
    } catch {
      toast({ variant: "destructive", title: "Chat konnte nicht geladen werden" });
    }
  };

  const removeConversation = async (conversation: VincentConversation) => {
    if (!window.confirm(`„${conversation.title}“ endgültig löschen?`)) return;
    try {
      await deleteVincentConversation(conversation.id);
      if (conversation.id === conversationId) startNew();
      await refreshHistory();
    } catch {
      toast({ variant: "destructive", title: "Chat konnte nicht gelöscht werden" });
    }
  };

  const openRename = (conversation: VincentConversation) => {
    setRenamingConversation(conversation);
    setRenameTitle(conversation.title);
  };

  const confirmRename = async () => {
    const title = renameTitle.trim();
    if (!renamingConversation || !title) return;
    try {
      await renameVincentConversation(renamingConversation.id, title);
      setRenamingConversation(null);
      await refreshHistory();
    } catch {
      toast({ variant: "destructive", title: "Chat konnte nicht umbenannt werden" });
    }
  };

  const removeAll = async () => {
    if (!window.confirm("Alle deine gespeicherten VINcent-Chats endgültig löschen?")) return;
    await deleteAllVincentConversations();
    startNew();
    await refreshHistory();
  };

  const exportCurrent = () => {
    if (!messages.length) return;
    const markdown = messages.map((message) => `## ${message.role === "user" ? "Du" : "VINcent"}\n\n${message.content}`).join("\n\n");
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `vincent-chat-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const currentConversation = conversations.find((conversation) => conversation.id === conversationId);
  const filteredConversations = conversations.filter((conversation) => conversation.title.toLocaleLowerCase("de").includes(historySearch.trim().toLocaleLowerCase("de")));
  const groupedConversations = filteredConversations.reduce<Record<string, VincentConversation[]>>((groups, conversation) => {
    const group = conversationGroup(conversation.updatedAt);
    (groups[group] ??= []).push(conversation);
    return groups;
  }, {});

  if (!open) return null;
  if (mode === "minimized") {
    return (
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-xl border bg-card p-2 shadow-elegant">
        <Button variant="ghost" className="gap-2" onClick={() => setMode("normal")}><Sparkles className="size-4 text-primary" />VINcent</Button>
        <Button variant="ghost" size="icon" onClick={close} aria-label="Chat schließen"><X className="size-4" /></Button>
      </div>
    );
  }

  const suggestions = lang === "en" ? SUGGESTIONS_EN : SUGGESTIONS_DE;
  const company = settings.companyName || organization?.name || "dein Unternehmen";
  const contact = settings.companyEmail || profile?.email || "deine Administration";
  const panelClass = mode === "maximized"
    ? "fixed inset-2 z-40 sm:inset-4"
    : "fixed bottom-3 right-3 z-40 h-[min(90dvh,780px)] w-[min(calc(100vw-1.5rem),980px)] sm:bottom-6 sm:right-6";

  return (
    <>
      <div data-testid="vincent-window" className={cn(panelClass, "flex overflow-hidden rounded-2xl border bg-background shadow-2xl animate-fade-in")}>
        {showHistory && <button type="button" className="absolute inset-0 z-10 bg-black/20 md:hidden" onClick={() => setShowHistory(false)} aria-label="Seitenleiste schließen" />}
        <aside className={cn(
          "absolute inset-y-0 left-0 z-20 flex w-[280px] flex-col border-r bg-muted/35 transition-transform md:relative md:z-auto md:shrink-0",
          showHistory ? "translate-x-0" : "-translate-x-full md:hidden",
        )}>
          <div className="flex h-16 items-center gap-2 px-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-sm"><Sparkles className="size-4" /></div>
            <div className="min-w-0 flex-1"><p className="font-display text-sm font-semibold">VINcent</p><p className="text-[10px] text-muted-foreground">Dein KI-Copilot</p></div>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => setShowHistory(false)} aria-label="Seitenleiste einklappen"><PanelLeftClose className="size-4" /></Button>
          </div>
          <div className="px-3 pb-3">
            <Button className="w-full justify-start gap-2 rounded-xl" onClick={startNew}><MessageSquarePlus className="size-4" />Neuer Chat</Button>
          </div>
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Chats durchsuchen" className="h-9 rounded-lg bg-background/70 pl-9 text-xs" disabled={!historyReady} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {!historyReady && <div className="mx-1 mt-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-muted-foreground"><p className="font-medium text-foreground">Verlauf nicht verfügbar</p><p className="mt-1">Chats bleiben in diesem Fenster, bis die sichere Ablage bereitsteht.</p></div>}
            {historyReady && filteredConversations.length === 0 && <div className="px-3 py-8 text-center text-xs text-muted-foreground">{historySearch ? "Keine Chats gefunden" : "Dein erster Chat erscheint hier automatisch."}</div>}
            {historyReady && ["Heute", "Letzte 7 Tage", "Älter"].map((group) => groupedConversations[group]?.length ? (
              <div key={group} className="mt-3">
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
                <div className="space-y-0.5">
                  {groupedConversations[group].map((conversation) => (
                    <div key={conversation.id} className={cn("group flex items-center rounded-lg pr-1 hover:bg-muted", conversation.id === conversationId && "bg-muted")}>
                      <button type="button" onClick={() => { void loadConversation(conversation); if (window.innerWidth < 768) setShowHistory(false); }} className="min-w-0 flex-1 px-2.5 py-2 text-left text-xs">
                        <span className="block truncate font-medium">{conversation.title}</span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100" aria-label={`Aktionen für ${conversation.title}`}><MoreHorizontal className="size-3.5" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="start" side="right">
                          <DropdownMenuItem onSelect={() => openRename(conversation)}><Pencil className="mr-2 size-4" />Umbenennen</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => exportCurrent()} disabled={conversation.id !== conversationId}><Download className="mr-2 size-4" />Exportieren</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => void removeConversation(conversation)} className="text-destructive"><Trash2 className="mr-2 size-4" />Löschen</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </div>
            ) : null)}
          </div>
          <div className="border-t p-3">
            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] text-muted-foreground"><ShieldCheck className="size-3.5 text-primary" /><span>{historyReady ? `Automatisch gespeichert · ${retentionDays} Tage` : "Sichere Ablage ausstehend"}</span></div>
            {conversations.length > 0 && <Button variant="ghost" size="sm" className="mt-1 w-full justify-start text-xs text-destructive" onClick={removeAll}><Trash2 className="mr-2 size-3.5" />Alle Chats löschen</Button>}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-background">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
            <Button variant="ghost" size="icon" className={cn("size-8 shrink-0", showHistory && "md:hidden")} onClick={() => setShowHistory((value) => !value)} aria-label="Chat-Seitenleiste"><PanelLeftOpen className="size-4" /></Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{currentConversation?.title || (messages.length ? conversationTitle(messages.find((message) => message.role === "user")?.content ?? "Neuer Chat") : "Neuer Chat")}</p>
              <p className={cn("flex items-center gap-1 text-[10px]", saveStatus === "error" || !historyReady ? "text-amber-600" : "text-muted-foreground")}>
                {saveStatus === "saving" && <Loader2 className="size-3 animate-spin" />}
                {saveStatus === "saved" && <Check className="size-3" />}
                {!historyReady ? "Nicht gespeichert" : saveStatus === "saving" ? "Wird gespeichert …" : saveStatus === "saved" ? "Automatisch gespeichert" : "Neue Unterhaltung"}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Chat-Aktionen"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={exportCurrent} disabled={!messages.length}><Download className="mr-2 size-4" />Exportieren</DropdownMenuItem>
                {currentConversation && <><DropdownMenuItem onSelect={() => openRename(currentConversation)}><Pencil className="mr-2 size-4" />Umbenennen</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => void removeConversation(currentConversation)} className="text-destructive"><Trash2 className="mr-2 size-4" />Löschen</DropdownMenuItem></>}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
            <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => setMode("minimized")} aria-label="Minimieren"><Minus className="size-4" /></Button>
            <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => setMode(mode === "maximized" ? "normal" : "maximized")} aria-label="Größe ändern">{mode === "maximized" ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</Button>
            <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={close} aria-label="Schließen"><X className="size-4" /></Button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-6 sm:px-8">
              {privacyLoading && <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />Sicherheitskonfiguration wird geprüft …</div>}
              {!privacyLoading && !privacyReady && <div className="m-auto rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><p className="font-semibold">VINcent ist nicht verfügbar</p><p className="mt-1 text-muted-foreground">Bitte melde dich erneut an.</p></div>}
              {!privacyLoading && privacyReady && messages.length === 0 && (
                <div className="my-auto py-8">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-lg"><Sparkles className="size-5" /></div>
                  <h2 className="mt-4 text-center font-display text-xl font-semibold">Wobei kann ich dir helfen?</h2>
                  <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground">Ich analysiere nur die für deine Frage nötigen, minimierten VINflow-Daten.</p>
                  {!historyReady && <div className="mx-auto mt-5 max-w-lg rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-center text-xs text-muted-foreground"><span className="font-medium text-foreground">Temporärer Chat:</span> Die sichere Ablage ist noch nicht bereit; beim Schließen geht dieser Chat verloren.</div>}
                  <div className="mt-7 grid gap-2 sm:grid-cols-2">
                    {suggestions.map((suggestion) => <button key={suggestion} onClick={() => send(suggestion)} className="rounded-xl border bg-card px-4 py-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5">{suggestion}</button>)}
                  </div>
                </div>
              )}
              {messages.length > 0 && <div className="space-y-6 pb-4">
                {messages.map((message) => (
                  <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                    {message.role === "user" ? <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-sm">{message.content}</div> : <div className="prose prose-sm w-full max-w-none text-sm prose-p:my-2 prose-ul:my-2">{!message.content && streaming ? <span className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />VINcent denkt nach …</span> : <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>}</div>}
                  </div>
                ))}
              </div>}
            </div>
          </div>

          <footer className="shrink-0 bg-background px-3 pb-3 pt-2 sm:px-6">
            <form onSubmit={(event) => { event.preventDefault(); send(input); }} className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:border-primary/40 focus-within:shadow-md">
              <Textarea value={input} onChange={(event) => setInput(event.target.value)} maxLength={VINCENT_MAX_INPUT_LENGTH} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(input); } }} placeholder="Nachricht an VINcent" rows={1} className="min-h-[40px] max-h-32 resize-none border-0 bg-transparent px-2 py-2.5 shadow-none focus-visible:ring-0" disabled={streaming || !privacyReady || !acknowledged} />
              <Button type="submit" size="icon" className="size-9 shrink-0 rounded-xl" aria-label="Nachricht senden" disabled={streaming || !input.trim() || !privacyReady || !acknowledged}>{streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}</Button>
            </form>
            <p className="mx-auto mt-1.5 max-w-3xl truncate text-center text-[10px] text-muted-foreground">VINcent kann Fehler machen · Keine personenbezogenen oder sensiblen Daten eingeben</p>
          </footer>
        </section>
      </div>

      <Dialog open={Boolean(renamingConversation)} onOpenChange={(next) => { if (!next) setRenamingConversation(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Chat umbenennen</DialogTitle><DialogDescription>Der neue Titel ist nur für dich in deiner Chatliste sichtbar.</DialogDescription></DialogHeader>
          <Input value={renameTitle} onChange={(event) => setRenameTitle(event.target.value)} maxLength={120} onKeyDown={(event) => { if (event.key === "Enter") void confirmRename(); }} autoFocus />
          <DialogFooter><Button variant="outline" onClick={() => setRenamingConversation(null)}>Abbrechen</Button><Button onClick={confirmRename} disabled={!renameTitle.trim()}>Speichern</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={privacyReady && !acknowledged} onOpenChange={(next) => { if (!next) close(); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" />Datenschutzhinweis zu VINcent</DialogTitle>
            <DialogDescription>Bitte vor der ersten Nutzung lesen. Dies ist eine Information und keine pauschale Einwilligung in unnötige Verarbeitung.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-3 overflow-y-auto text-sm text-muted-foreground">
            <p><strong className="text-foreground">Verantwortlich:</strong> {company}, Kontakt: {contact}.</p>
            <p>VINcent ist ein KI-System. Zur Beantwortung werden deine Eingabe und ausschließlich zur Frage passende, minimierte Betriebskennzahlen über eine serverseitig konfigurierte KI-Schnittstelle an den von euch ausgewählten Anbieter übermittelt. Direkte Kundennamen, VIN, Kontakt-, Zahlungs-, Termin- und To-Do-Freitexte werden nicht in den automatisch erzeugten Kontext aufgenommen.</p>
            <p>Nutze VINcent nur für betriebliche Analysen. Gib keine personenbezogenen Kundendaten, Beschäftigtendaten, Passwörter oder besonders geschützten Daten (z. B. Gesundheits- oder Religionsangaben) ein. VINcent darf keine automatisierten Entscheidungen über Kunden oder Beschäftigte treffen; Ergebnisse müssen durch einen Menschen geprüft werden.</p>
            <p>Unterhaltungen werden automatisch zugriffsgeschützt deinem Benutzerkonto zugeordnet und nach {retentionDays} Tagen gelöscht. Du kannst sie jederzeit exportieren, umbenennen oder sofort löschen. Ist die sichere Ablage vorübergehend nicht verfügbar, kennzeichnet VINcent den Chat sichtbar als nicht gespeichert.</p>
            <p>Je nach Modellanbieter kann eine Verarbeitung außerhalb der EU/des EWR auf Basis geeigneter Garantien stattfinden. Maßgeblich sind außerdem eure Datenschutzerklärung, der Auftragsverarbeitungsvertrag und die Anbieterbedingungen.</p>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-foreground">
              <Checkbox checked={noticeChecked} onCheckedChange={(value) => setNoticeChecked(value === true)} className="mt-0.5" />
              <span>Ich habe den Hinweis gelesen und werde keine personenbezogenen oder besonders geschützten Daten in VINcent eingeben.</span>
            </label>
          </div>
          <DialogFooter><Button variant="outline" onClick={close}>Abbrechen</Button><Button disabled={!noticeChecked} onClick={acceptNotice}>Hinweis verstanden</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
