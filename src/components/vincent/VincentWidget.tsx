import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check, Download, Loader2, Maximize2, MessageSquarePlus, Minimize2, Minus,
  Mic, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Pencil, Search, Send, ShieldCheck, Trash2, X,
} from "lucide-react";
import { VincentFace } from "./VincentFace";
import ReactMarkdown, { type Components } from "react-markdown";
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
import { linkifyVincentAnswer } from "@/lib/vincentLinks";
import { parseVincentTodoCommand, todoQuestionForMissing, type VincentTodoDraft } from "@/lib/vincentTodoCommands";
import {
  acknowledgeVincentNotice, deleteAllVincentConversations, deleteVincentConversation,
  listVincentConversations, loadVincentMessages, loadVincentPreference,
  renameVincentConversation, saveVincentConversation, setVincentHistoryEnabled, type VincentConversation,
  type VincentMessage,
} from "@/lib/vincentHistory";
import {
  deleteAllLocalVincentConversations, deleteLocalVincentConversation,
  listLocalVincentConversations, loadLocalVincentMessages,
  renameLocalVincentConversation, saveLocalVincentConversation,
} from "@/lib/vincentLocalHistory";
import {
  containsSpecialCategoryHint, conversationTitle, redactSensitiveText,
  getVincentClientTimezone, VINCENT_MAX_INPUT_LENGTH, VINCENT_RETENTION_DAYS,
} from "@/lib/vincentPrivacy";
import { useLang } from "@/lib/i18n";
import { useProcessStore } from "@/store/processStore";
import { useVincentUIStore } from "@/store/vincentUIStore";

type WindowMode = "normal" | "maximized" | "minimized";
type SaveStatus = "idle" | "saving" | "saved" | "error";
type HistoryStorage = "remote" | "local";
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};
type RecordingState = "idle" | "recording" | "transcribing";
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

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

const markdownComponents: Components = {
  a: ({ href, children, ...props }) => {
    const isInternal = typeof href === "string" && href.startsWith("/");
    return (
      <a
        {...props}
        href={href}
        className="font-medium text-primary-glow underline underline-offset-2 hover:text-primary"
        target={isInternal ? undefined : "_blank"}
        rel={isInternal ? undefined : "noreferrer"}
      >
        {children}
      </a>
    );
  },
};

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
  const addTodo = useProcessStore((state) => state.addTodo);
  const vehicles = useProcessStore((state) => state.vehicles);
  const processes = useProcessStore((state) => state.processes);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<WindowMode>("normal");
  const [showHistory, setShowHistory] = useState(() => typeof window === "undefined" || window.innerWidth >= 768);
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
  const [historyStorage, setHistoryStorage] = useState<HistoryStorage>("remote");
  const [acknowledged, setAcknowledged] = useState(false);
  const [noticeChecked, setNoticeChecked] = useState(false);
  const [privacyNoticeOpen, setPrivacyNoticeOpen] = useState(false);
  const [pendingTodoDraft, setPendingTodoDraft] = useState<VincentTodoDraft | null>(null);
  const [retentionDays, setRetentionDays] = useState(VINCENT_RETENTION_DAYS);
  const [listening, setListening] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const speechRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const messagesRef = useRef(messages);
  const streamingRef = useRef(streaming);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { streamingRef.current = streaming; }, [streaming]);
  useEffect(() => { useVincentUIStore.setState({ open }); }, [open]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, mode]);
  useEffect(() => {
    if (!open || mode === "minimized" || !privacyReady || !acknowledged) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, [acknowledged, mode, open, privacyReady]);
  useEffect(() => {
    return () => {
      speechRef.current?.stop();
      mediaRecorderRef.current?.stop();
      audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const refreshHistory = useCallback(async () => {
    if (!user) return;
    if (historyStorage === "local") {
      setConversations(listLocalVincentConversations(user.id));
      setHistoryReady(true);
      return;
    }
    try {
      setConversations(await listVincentConversations());
      setHistoryReady(true);
    } catch {
      setHistoryStorage("local");
      setConversations(listLocalVincentConversations(user.id));
      setHistoryReady(true);
    }
  }, [historyStorage, user]);

  useEffect(() => {
    let active = true;
    setPrivacyLoading(true);
    setPrivacyReady(false);
    setHistoryReady(false);
    if (!user || !profile?.organization_id) {
      setPrivacyLoading(false);
      return;
    }
    void (async () => {
      try {
        const preference = await loadVincentPreference(user.id);
        if (!active) return;
        setAcknowledged(preference.acknowledged);
        if (!preference.acknowledged) setOpen(true);
        setRetentionDays(preference.retentionDays);
        setPrivacyReady(true);
      } catch {
        if (!active) return;
        setAcknowledged(false);
        setPrivacyReady(false);
      } finally {
        if (active) setPrivacyLoading(false);
      }

      try {
        const history = await listVincentConversations();
        if (!active) return;
        setConversations(history);
        setHistoryStorage("remote");
        setHistoryReady(true);
      } catch {
        if (!active) return;
        setHistoryStorage("local");
        setConversations(listLocalVincentConversations(user.id));
        setHistoryReady(true);
      }
    })();
    return () => { active = false; };
  }, [user, profile?.organization_id]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleMidnightReset = () => {
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 0, 0);
      timer = setTimeout(() => {
        setAcknowledged(false);
        setNoticeChecked(false);
        setOpen(true);
        setMode("normal");
        scheduleMidnightReset();
      }, Math.max(1_000, nextMidnight.getTime() - Date.now()));
    };
    scheduleMidnightReset();
    return () => clearTimeout(timer);
  }, []);

  const close = useCallback(() => {
    abortRef.current?.abort();
    speechRef.current?.stop();
    mediaRecorderRef.current?.stop();
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    setStreaming(false);
    setListening(false);
    setRecordingState("idle");
    setOpen(false);
  }, []);

  const startNew = () => {
    abortRef.current?.abort();
    speechRef.current?.stop();
    mediaRecorderRef.current?.stop();
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    setStreaming(false);
    setListening(false);
    setRecordingState("idle");
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
      const title = existingTitle ?? conversationTitle(firstUser);
      if (historyStorage === "local") {
        saveLocalVincentConversation({ conversationId: id, title, messages: nextMessages, userId: user.id, retentionDays });
      } else {
        try {
          await saveVincentConversation({
            conversationId: id, title, messages: nextMessages, userId: user.id,
            organizationId: profile.organization_id, retentionDays,
          });
        } catch {
          saveLocalVincentConversation({ conversationId: id, title, messages: nextMessages, userId: user.id, retentionDays });
          setHistoryStorage("local");
          setConversations(listLocalVincentConversations(user.id));
        }
      }
      setConversationId(id);
      setSaveStatus("saved");
      await refreshHistory();
    } catch (error) {
      setSaveStatus("error");
      throw error;
    }
  }, [conversationId, conversations, historyStorage, profile?.organization_id, refreshHistory, retentionDays, user]);

  const requestPrivacyConfirmation = useCallback(() => {
    setOpen(true);
    setMode("normal");
    setPrivacyNoticeOpen(true);
    toast({
      title: "Datenschutzhinweis erforderlich",
      description: privacyLoading
        ? "VINcent prüft die Freigabe noch. Bitte kurz warten."
        : "Bitte bestätige den heutigen Hinweis, danach kannst du VINcent nutzen.",
    });
  }, [privacyLoading]);

  const send = useCallback(async (rawText: string) => {
    const trimmed = rawText.trim().slice(0, VINCENT_MAX_INPUT_LENGTH);
    if (!trimmed || streamingRef.current) return;
    if (!privacyReady) {
      requestPrivacyConfirmation();
      return;
    }
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
    const shouldPersist = historyReady && Boolean(user);

    const todoCommand = parseVincentTodoCommand(redacted.text, { pending: pendingTodoDraft, vehicles, processes });
    if (todoCommand) {
      const assistantContent = (() => {
        if (todoCommand.missing.length > 0) {
          setPendingTodoDraft(todoCommand.draft);
          return todoQuestionForMissing(todoCommand.missing);
        }
        const todo = addTodo({
          title: todoCommand.draft.title!,
          description: todoCommand.draft.description,
          priority: todoCommand.draft.priority ?? "medium",
          scope: todoCommand.draft.scope ?? "general",
          dueDate: todoCommand.draft.noDueDate ? undefined : todoCommand.draft.dueDate,
          assignee: todoCommand.draft.assignee,
          vehicleId: todoCommand.draft.vehicleId,
          processId: todoCommand.draft.processId,
          tags: ["VINcent"],
        });
        setPendingTodoDraft(null);
        const due = todo.dueDate ? ` · fällig ${todo.dueDate}` : "";
        const priority = todo.priority === "high" ? " · hohe Priorität" : todo.priority === "low" ? " · niedrige Priorität" : "";
        return `Erledigt — ich habe das To-Do [${todo.title}](/todos?todo=${encodeURIComponent(todo.id)}) erstellt${due}${priority}.`;
      })();
      const finalMessages = [...requestMessages, { ...assistantMessage, content: assistantContent }];
      setMessages(finalMessages);
      setInput("");
      if (shouldPersist && user) {
        try {
          if (historyStorage === "remote") {
            try { await setVincentHistoryEnabled(user.id, true); } catch { /* persist switches to local storage */ }
          }
          await persist(requestMessages, nextConversationId);
          await persist(finalMessages, nextConversationId);
        } catch {
          setSaveStatus("error");
        }
      }
      return;
    }

    setMessages([...requestMessages, assistantMessage]);
    setInput("");
    setStreaming(true);
    streamingRef.current = true;
    if (shouldPersist && user) {
      try {
        if (historyStorage === "remote") {
          try { await setVincentHistoryEnabled(user.id, true); } catch { /* persist switches to local storage */ }
        }
        // Die Nutzernachricht muss gespeichert sein, bevor die KI-Anfrage startet.
        // So bleibt der Chat auch bei Abbruch, Neuladen oder einer fehlerhaften KI-Antwort erhalten.
        await persist(requestMessages, nextConversationId);
      } catch {
        setSaveStatus("error");
      }
    }

    const persistFinalMessages = async (finalMessages: VincentMessage[]) => {
      if (!shouldPersist) return;
      try {
        await persist(finalMessages, nextConversationId);
        setHistoryReady(true);
      } catch {
        setHistoryReady(false);
      }
    };

    const ac = new AbortController();
    abortRef.current = ac;
    let answer = "";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sitzung abgelaufen. Bitte erneut anmelden.");
      const vincentContext = buildVincentContext(redacted.text);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vincent-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: requestMessages.slice(-12).map(({ role, content }) => ({ role, content })),
          context: vincentContext,
          lang,
          timezone: getVincentClientTimezone(),
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
      const finalAnswer = answer ? linkifyVincentAnswer(answer, vincentContext) : "Keine Antwort erhalten.";
      const finalMessages = [...requestMessages, { ...assistantMessage, content: finalAnswer }];
      setMessages(finalMessages);
      await persistFinalMessages(finalMessages);
    } catch (error) {
      if (ac.signal.aborted) return;
      const finalMessages = [...requestMessages, {
        ...assistantMessage,
        content: `⚠️ ${error instanceof Error ? error.message : "Die Anfrage konnte nicht verarbeitet werden."}`,
      }];
      setMessages(finalMessages);
      await persistFinalMessages(finalMessages);
    } finally {
      setStreaming(false);
      streamingRef.current = false;
      abortRef.current = null;
    }
  }, [addTodo, conversationId, historyReady, historyStorage, lang, pendingTodoDraft, persist, privacyReady, processes, requestPrivacyConfirmation, user, vehicles]);

  const transcribeAudio = useCallback(async (audio: Blob) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Sitzung abgelaufen. Bitte erneut anmelden.");
    const formData = new FormData();
    formData.append("audio", audio, `vincent-${Date.now()}.webm`);
    formData.append("lang", lang === "en" ? "en" : "de");
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vincent-transcribe`, {
      method: "POST",
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error || "Sprache konnte nicht erkannt werden.");
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, VINCENT_MAX_INPUT_LENGTH) : "";
    if (!text) throw new Error("Ich konnte keine Sprache erkennen.");
    return text;
  }, [lang]);

  const stopRecorder = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;
  }, []);

  const startRecordedVoiceInput = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast({ variant: "destructive", title: "Mikrofon nicht verfuegbar", description: "Dieser Browser unterstuetzt keine reine Audioaufnahme. Bitte tippe deine Frage ein." });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast({
        variant: "destructive",
        title: "Mikrofon nicht verfügbar",
        description: "Bitte erlaube den Mikrofonzugriff oder tippe deine Frage ein.",
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        stopRecorder();
        setListening(false);
        setRecordingState("idle");
        toast({ variant: "destructive", title: "Aufnahme fehlgeschlagen", description: "Bitte prüfe den Mikrofonzugriff." });
      };
      recorder.onstop = () => {
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        audioStreamRef.current?.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
        if (!chunks.length) {
          setListening(false);
          setRecordingState("idle");
          return;
        }
        const audio = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        setRecordingState("transcribing");
        void transcribeAudio(audio)
          .then((text) => {
            setInput(text);
            return send(text);
          })
          .catch((error) => {
            toast({
              variant: "destructive",
              title: "Spracheingabe nicht erkannt",
              description: error instanceof Error ? error.message : "Bitte versuche es erneut oder tippe deine Frage ein.",
            });
          })
          .finally(() => {
            setListening(false);
            setRecordingState("idle");
            mediaRecorderRef.current = null;
          });
      };
      recorder.start();
      setListening(true);
      setRecordingState("recording");
    } catch {
      stopRecorder();
      setListening(false);
      setRecordingState("idle");
      toast({
        variant: "destructive",
        title: "Mikrofon nicht freigegeben",
        description: "Bitte pruefe in Safari die Mikrofon-Erlaubnis fuer diese Website und lade die Seite neu.",
      });
    }
  }, [send, stopRecorder, transcribeAudio]);

  const startVoiceInput = useCallback(() => {
    if (!privacyReady || !acknowledged) {
      requestPrivacyConfirmation();
      return;
    }
    if (listening || recordingState !== "idle") {
      speechRef.current?.stop();
      stopRecorder();
      setListening(false);
      setRecordingState("idle");
      return;
    }

    const browserWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      void startRecordedVoiceInput();
      return;
    }

    const recognition = new Recognition();
    speechRef.current = recognition;
    recognition.lang = lang === "en" ? "en-US" : "de-DE";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onend = () => {
      setListening(false);
      setRecordingState("idle");
    };
    recognition.onerror = () => {
      setListening(false);
      setRecordingState("idle");
      toast({
        variant: "destructive",
        title: "Spracheingabe gestoppt",
        description: "VINcent konnte dich nicht klar verstehen. Bitte versuche es erneut.",
      });
    };
    recognition.onresult = (event) => {
      let transcript = "";
      let finalTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0].transcript;
        transcript += text;
        if (event.results[index].isFinal) finalTranscript += text;
      }
      const cleanTranscript = transcript.trim().slice(0, VINCENT_MAX_INPUT_LENGTH);
      if (cleanTranscript) setInput(cleanTranscript);
      const cleanFinal = finalTranscript.trim().slice(0, VINCENT_MAX_INPUT_LENGTH);
      if (cleanFinal) {
        recognition.stop();
        setListening(false);
        setRecordingState("idle");
        void send(cleanFinal);
      }
    };

    try {
      recognition.start();
      setListening(true);
      setRecordingState("recording");
    } catch {
      setListening(false);
      setRecordingState("idle");
      void startRecordedVoiceInput();
    }
  }, [acknowledged, lang, listening, privacyReady, recordingState, requestPrivacyConfirmation, send, startRecordedVoiceInput, stopRecorder]);

  useEffect(() => {
    const openHandler = (event: Event) => {
      const prompt = (event as CustomEvent<{ prompt?: string }>).detail?.prompt;
      setOpen(true);
      setMode("normal");
      setShowHistory(window.innerWidth >= 768);
      if (prompt) setInput(prompt.slice(0, VINCENT_MAX_INPUT_LENGTH));
    };
    const closeHandler = () => close();
    window.addEventListener("vincent:open", openHandler as EventListener);
    window.addEventListener("vincent:close", closeHandler);
    return () => {
      window.removeEventListener("vincent:open", openHandler as EventListener);
      window.removeEventListener("vincent:close", closeHandler);
    };
  }, [close]);

  const acceptNotice = async () => {
    if (!noticeChecked || !user || !profile?.organization_id) return;
    try {
      await acknowledgeVincentNotice();
      setAcknowledged(true);
      setNoticeChecked(false);
      setPrivacyNoticeOpen(false);
    } catch {
      setAcknowledged(false);
      toast({
        variant: "destructive",
        title: "Bestätigung nicht gespeichert",
        description: "VINcent bleibt gesperrt, bis die tägliche Bestätigung im Backend protokolliert werden konnte.",
      });
    }
  };

  const loadConversation = async (conversation: VincentConversation) => {
    try {
      abortRef.current?.abort();
      setMessages(historyStorage === "local" && user
        ? loadLocalVincentMessages(user.id, conversation.id)
        : await loadVincentMessages(conversation.id));
      setConversationId(conversation.id);
      setSaveStatus("saved");
    } catch {
      toast({ variant: "destructive", title: "Chat konnte nicht geladen werden" });
    }
  };

  const removeConversation = async (conversation: VincentConversation) => {
    if (!window.confirm(`„${conversation.title}“ endgültig löschen?`)) return;
    try {
      if (historyStorage === "local" && user) deleteLocalVincentConversation(user.id, conversation.id);
      else await deleteVincentConversation(conversation.id);
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
      if (historyStorage === "local" && user) renameLocalVincentConversation(user.id, renamingConversation.id, title);
      else await renameVincentConversation(renamingConversation.id, title);
      setRenamingConversation(null);
      await refreshHistory();
    } catch {
      toast({ variant: "destructive", title: "Chat konnte nicht umbenannt werden" });
    }
  };

  const removeAll = async () => {
    if (!window.confirm("Alle deine gespeicherten VINcent-Chats endgültig löschen?")) return;
    if (historyStorage === "local" && user) deleteAllLocalVincentConversations(user.id);
    else await deleteAllVincentConversations();
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
      <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-3 z-[130] flex items-center gap-2 rounded-xl border bg-card p-2 shadow-elegant sm:bottom-5 sm:right-5">
        <Button variant="ghost" className="gap-2" onClick={() => setMode("normal")}><VincentFace className="size-5" />VINcent</Button>
        <Button variant="ghost" size="icon" onClick={close} aria-label="Chat schließen"><X className="size-4" /></Button>
      </div>
    );
  }

  const suggestions = lang === "en" ? SUGGESTIONS_EN : SUGGESTIONS_DE;
  const company = settings.companyName || organization?.name || "dein Unternehmen";
  const contact = settings.companyEmail || profile?.email || "deine Administration";
  const voiceBusy = listening || recordingState !== "idle";
  const voiceLabel = recordingState === "transcribing"
    ? "Sprache wird verarbeitet"
    : listening
      ? "Zuhören beenden"
      : "Mit VINcent sprechen";
  const panelClass = mode === "maximized"
    ? "fixed inset-0 z-[130] h-dvh w-screen sm:inset-4 sm:h-auto sm:w-auto"
    : "fixed inset-0 z-[130] h-dvh w-screen sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(90dvh,780px)] sm:w-[min(calc(100vw-1.5rem),980px)]";

  return (
    <>
      <div data-testid="vincent-window" className={cn(panelClass, "flex overflow-hidden border-0 bg-background shadow-2xl animate-fade-in sm:rounded-2xl sm:border")}>
        {showHistory && <button type="button" className="absolute inset-0 z-10 bg-black/20 md:hidden" onClick={() => setShowHistory(false)} aria-label="Seitenleiste schließen" />}
        <aside className={cn(
          "absolute inset-y-0 left-0 z-20 flex w-[min(86vw,320px)] flex-col border-r bg-muted/95 transition-transform backdrop-blur md:relative md:z-auto md:w-[280px] md:shrink-0 md:bg-muted/35 md:backdrop-blur-0",
          showHistory ? "translate-x-0" : "-translate-x-full md:hidden",
        )}>
          <div className="flex h-16 items-center gap-2 px-3">
            <VincentFace className="size-9 shrink-0" />
            <div className="min-w-0 flex-1"><p className="font-display text-sm font-semibold">VINcent</p><p className="text-[10px] text-muted-foreground">Dein KI-Copilot</p></div>
            <Button variant="ghost" size="icon" className="size-10 sm:size-8" onClick={() => setShowHistory(false)} aria-label="Seitenleiste einklappen"><PanelLeftClose className="size-4" /></Button>
          </div>
          <div className="px-3 pb-3">
            <Button className="w-full justify-start gap-2 rounded-xl" onClick={startNew}><MessageSquarePlus className="size-4" />Neuer Chat</Button>
          </div>
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Chats durchsuchen" className="h-9 rounded-lg bg-background/70 pl-9 text-xs" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {!historyReady && <div className="mx-1 mt-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-muted-foreground"><p className="font-medium text-foreground">Verlauf nicht verfügbar</p><p className="mt-1">Chats bleiben in diesem Fenster, bis die Ablage bereitsteht.</p></div>}
            {historyReady && filteredConversations.length === 0 && <div className="px-3 py-8 text-center text-xs text-muted-foreground">{historySearch ? "Keine Chats gefunden" : "Dein erster Chat erscheint hier automatisch."}</div>}
            {historyReady && ["Heute", "Letzte 7 Tage", "Älter"].map((group) => groupedConversations[group]?.length ? (
              <div key={group} className="mt-3">
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
                <div className="space-y-0.5">
                  {groupedConversations[group].map((conversation) => (
                    <div key={conversation.id} className={cn("group flex items-center rounded-lg pr-1 hover:bg-muted", conversation.id === conversationId && "bg-muted")}>
                      <button type="button" onClick={() => { void loadConversation(conversation); if (window.innerWidth < 768) setShowHistory(false); }} className="min-h-11 min-w-0 flex-1 px-2.5 py-2 text-left text-xs sm:min-h-0">
                        <span className="block truncate font-medium">{conversation.title}</span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-10 shrink-0 opacity-100 data-[state=open]:opacity-100 sm:size-7 sm:opacity-0 sm:group-hover:opacity-100" aria-label={`Aktionen für ${conversation.title}`}><MoreHorizontal className="size-3.5" /></Button></DropdownMenuTrigger>
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
            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] text-muted-foreground"><ShieldCheck className="size-3.5 text-primary" /><span>{historyReady ? historyStorage === "local" ? "Automatisch gespeichert · Dieser Browser" : `Automatisch gespeichert · ${retentionDays} Tage` : "Ablage ausstehend"}</span></div>
            {conversations.length > 0 && <Button variant="ghost" size="sm" className="mt-1 w-full justify-start text-xs text-destructive" onClick={removeAll}><Trash2 className="mr-2 size-3.5" />Alle Chats löschen</Button>}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-background">
          <header className="flex min-h-16 shrink-0 items-center gap-1 border-b px-2 sm:gap-2 sm:px-4">
            <Button variant="ghost" size="icon" className={cn("size-10 shrink-0 sm:size-8", showHistory && "md:hidden")} onClick={() => setShowHistory((value) => !value)} aria-label="Chat-Seitenleiste"><PanelLeftOpen className="size-4" /></Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{currentConversation?.title || (messages.length ? conversationTitle(messages.find((message) => message.role === "user")?.content ?? "Neuer Chat") : "Neuer Chat")}</p>
              <p className={cn("flex items-center gap-1 text-[10px]", saveStatus === "saved" ? "text-emerald-600" : saveStatus === "error" || !historyReady ? "text-amber-600" : "text-muted-foreground")}>
                {saveStatus === "saving" && <Loader2 className="size-3 animate-spin" />}
                {saveStatus === "saved" && <Check className="size-3" />}
                {!historyReady ? "Nicht gespeichert" : saveStatus === "saving" ? "Wird gespeichert …" : saveStatus === "saved" ? "Automatisch gespeichert" : "Neue Unterhaltung"}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="size-10 shrink-0 sm:size-8" onClick={() => setPrivacyNoticeOpen(true)} aria-label="Datenschutz anzeigen" title="Datenschutz"><ShieldCheck className="size-4" /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-10 shrink-0 sm:size-8" aria-label="Chat-Aktionen"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={exportCurrent} disabled={!messages.length}><Download className="mr-2 size-4" />Exportieren</DropdownMenuItem>
                {currentConversation && <><DropdownMenuItem onSelect={() => openRename(currentConversation)}><Pencil className="mr-2 size-4" />Umbenennen</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => void removeConversation(currentConversation)} className="text-destructive"><Trash2 className="mr-2 size-4" />Löschen</DropdownMenuItem></>}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
            <Button variant="ghost" size="icon" className="hidden size-8 shrink-0 sm:inline-flex" onClick={() => setMode("minimized")} aria-label="Minimieren"><Minus className="size-4" /></Button>
            <Button variant="ghost" size="icon" className="hidden size-8 shrink-0 sm:inline-flex" onClick={() => setMode(mode === "maximized" ? "normal" : "maximized")} aria-label="Größe ändern">{mode === "maximized" ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</Button>
            <Button variant="ghost" size="icon" className="size-10 shrink-0 sm:size-8" onClick={close} aria-label="Schließen"><X className="size-4" /></Button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-3 py-4 sm:px-8 sm:py-6">
              {privacyLoading && <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />Sicherheitskonfiguration wird geprüft …</div>}
              {!privacyLoading && !privacyReady && <div className="m-auto rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><p className="font-semibold">VINcent ist nicht verfügbar</p><p className="mt-1 text-muted-foreground">Bitte melde dich erneut an.</p></div>}
              {!privacyLoading && privacyReady && messages.length === 0 && (
                <div className="my-auto py-8">
                  <VincentFace className="mx-auto size-14" />
                  <h2 className="mt-4 text-center font-display text-xl font-semibold">Wobei kann ich dir helfen?</h2>
                  <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground">Ich analysiere nur die für deine Frage nötigen, minimierten VINflow-Daten.</p>
                  {!historyReady && <div className="mx-auto mt-5 max-w-lg rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-center text-xs text-muted-foreground"><span className="font-medium text-foreground">Temporärer Chat:</span> Die Ablage ist noch nicht bereit; beim Schließen geht dieser Chat verloren.</div>}
                  {!acknowledged && <div className="mx-auto mt-5 max-w-lg rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-center text-sm"><p className="font-medium">Vor der Nutzung ist der heutige Datenschutzhinweis erforderlich.</p><Button className="mt-3 w-full sm:w-auto" onClick={requestPrivacyConfirmation}>Hinweis oeffnen</Button></div>}
                  <div className="mt-7 grid gap-2 sm:grid-cols-2">
                    {suggestions.map((suggestion) => <button key={suggestion} onClick={() => send(suggestion)} className="min-h-12 rounded-xl border bg-card px-4 py-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5">{suggestion}</button>)}
                  </div>
                </div>
              )}
              {messages.length > 0 && <div className="space-y-6 pb-4">
                {messages.map((message) => (
                  <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                    {message.role === "user" ? <div className="max-w-[92%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-sm sm:max-w-[85%]">{message.content}</div> : <div className="prose prose-sm w-full max-w-none break-words text-sm prose-p:my-2 prose-ul:my-2">{!message.content && streaming ? <span className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />VINcent denkt nach …</span> : <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{message.content}</ReactMarkdown>}</div>}
                  </div>
                ))}
              </div>}
            </div>
          </div>

          <footer className="shrink-0 bg-background px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 sm:px-6 sm:pb-3">
            <form onSubmit={(event) => { event.preventDefault(); send(input); }} className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:border-primary/40 focus-within:shadow-md">
              <Textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} maxLength={VINCENT_MAX_INPUT_LENGTH} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(input); } }} placeholder="Nachricht an VINcent" rows={1} className="min-h-11 min-w-0 max-h-32 resize-none border-0 bg-transparent px-2 py-2.5 shadow-none focus-visible:ring-0" disabled={streaming || !privacyReady} />
              <Button type="button" variant={voiceBusy ? "default" : "ghost"} size="icon" className={cn("size-11 shrink-0 rounded-xl sm:size-9", listening && "animate-pulse")} aria-label={voiceLabel} title={voiceLabel} onClick={startVoiceInput} disabled={streaming}>
                {voiceBusy ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
              </Button>
              <Button type="button" size="icon" className="size-11 shrink-0 rounded-xl sm:size-9" aria-label="Nachricht senden" onClick={() => { void send(input); }} disabled={streaming || !input.trim()}>{streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}</Button>
            </form>
            <p className="mx-auto mt-1.5 max-w-3xl text-center text-[10px] leading-tight text-muted-foreground">{recordingState === "transcribing" ? "VINcent verarbeitet deine Sprache" : listening ? "VINcent hört zu. Tippe erneut auf das Mikrofon, um zu senden." : "VINcent kann Fehler machen · Keine personenbezogenen oder sensiblen Daten eingeben"}</p>
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

      <Dialog open={privacyReady && (!acknowledged || privacyNoticeOpen)} onOpenChange={(next) => {
        setPrivacyNoticeOpen(next);
        if (!next && !acknowledged) close();
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" />Datenschutzhinweis zu VINcent</DialogTitle>
            <DialogDescription>Bitte vor der heutigen Nutzung lesen und bestätigen. Dies ist eine Information und keine pauschale Einwilligung in unnötige Verarbeitung.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-3 overflow-y-auto text-sm text-muted-foreground">
            <p><strong className="text-foreground">Verantwortlich:</strong> {company}, Kontakt: {contact}.</p>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-foreground">
              <p className="font-semibold">Welche To-Do-Daten VINcent erhält</p>
              <p className="mt-1 text-muted-foreground">Bei jeder Anfrage wird deine vollständige To-Do-Liste an den konfigurierten KI-Anbieter übermittelt. Dazu gehören Titel, Beschreibung, Priorität, Status, Fälligkeit und Uhrzeit, Kategorie, Tags, zuständige und erstellende Person sowie ein verknüpftes Fahrzeug mit Marke, Modell und Baujahr. So kann VINcent dir konkret sagen, was als Nächstes zu erledigen ist.</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-foreground">
              <p className="font-semibold">Welche Fahrzeugdaten VINcent erhält</p>
              <p className="mt-1 text-muted-foreground">Nennst du in deiner Frage ein konkretes Fahrzeug (z. B. Marke, Modell, optional Baujahr), erhält VINcent dessen vollständige technische Fahrzeugakte: Typ, Baujahr, Zustand, Technik (Kraftstoff, Getriebe, Leistung, Verbrauch), Ausstattung, Farbe/Innenraum, Laufleistung, Historie (HU, Scheckheft, Unfallfreiheit), Preis- und Kostendaten, Standort sowie hinterlegte Notizen (automatisch von E-Mail, IBAN und Telefonnummern bereinigt). <strong className="text-foreground">Fahrgestellnummer (VIN) und Kennzeichen werden bewusst nie übermittelt</strong>, da sie in Verbindung mit euren eigenen Kunden- und Vorgangsdaten eine Person identifizierbar machen können; diese Angaben bleiben ausschließlich in VINflow und sind direkt in der Fahrzeugakte einsehbar.</p>
            </div>
            <p>Zusätzlich werden deine Eingabe und die für deine Frage passenden weiteren Betriebsdaten über die serverseitig konfigurierte KI-Schnittstelle verarbeitet. Direkte Kundennamen, Kontakt- und Zahlungsdaten aus anderen VINflow-Bereichen werden nicht automatisch in den Kontext aufgenommen. <strong className="text-foreground">Stehen solche Angaben jedoch in einem To-Do-Titel, einer To-Do-Beschreibung oder einer Fahrzeugnotiz, können sie mitübermittelt werden.</strong> E-Mail-Adressen, IBAN, VIN und Telefonnummern werden nach technischen Mustern entfernt; Namen und sonstiger Freitext lassen sich nicht zuverlässig automatisch erkennen.</p>
            <p>Nutze VINcent nur für betriebliche Analysen. Gib keine personenbezogenen Kundendaten, Beschäftigtendaten, Passwörter oder besonders geschützten Daten (z. B. Gesundheits- oder Religionsangaben) ein. VINcent darf keine automatisierten Entscheidungen über Kunden oder Beschäftigte treffen; Ergebnisse müssen durch einen Menschen geprüft werden.</p>
            <p>{historyStorage === "local" ? "Unterhaltungen werden automatisch in diesem Browser gespeichert und nach der eingestellten Frist entfernt. Sie stehen auf anderen Geräten nicht zur Verfügung und können jederzeit exportiert, umbenannt oder gelöscht werden." : `Unterhaltungen werden automatisch zugriffsgeschützt deinem Benutzerkonto zugeordnet und nach ${retentionDays} Tagen gelöscht. Du kannst sie jederzeit exportieren, umbenennen oder sofort löschen.`}</p>
            <p><strong className="text-foreground">Tägliche Bestätigung:</strong> Dieser Hinweis muss jeden Kalendertag ab 00:00 Uhr erneut bestätigt werden. Die Bestätigung wird mit Benutzer, Organisation, Hinweisversion, lokalem Datum, Zeitzone und serverseitigem Zeitstempel im Backend protokolliert. Ohne erfolgreiche Protokollierung bleibt VINcent gesperrt.</p>
            <p>Je nach Modellanbieter kann eine Verarbeitung außerhalb der EU/des EWR auf Basis geeigneter Garantien stattfinden. Maßgeblich sind außerdem eure Datenschutzerklärung, der Auftragsverarbeitungsvertrag und die Anbieterbedingungen.</p>
            {!acknowledged && <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-foreground">
              <Checkbox checked={noticeChecked} onCheckedChange={(value) => setNoticeChecked(value === true)} className="mt-0.5" />
              <span>Ich habe verstanden, dass meine vollständige To-Do-Liste sowie – bei Fragen zu einem konkreten Fahrzeug – dessen vollständige Fahrzeugdaten (ohne VIN und Kennzeichen) bei jeder Anfrage an den KI-Anbieter übermittelt werden und darin enthaltene personenbezogene Angaben mitübertragen werden können. Ich werde keine besonders geschützten Daten in VINcent, To-Dos oder Fahrzeugnotizen eingeben.</span>
            </label>}
          </div>
          <DialogFooter>{acknowledged
            ? <Button onClick={() => setPrivacyNoticeOpen(false)}>Schließen</Button>
            : <><Button variant="outline" onClick={close}>Abbrechen</Button><Button disabled={!noticeChecked} onClick={acceptNotice}>Hinweis verstanden</Button></>
          }</DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
