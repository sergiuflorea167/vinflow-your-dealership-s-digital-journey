import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Loader2, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { buildVincentContext } from "@/lib/vincentContext";
import { useLang, useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "vinflow.vincent.history";

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

export const VincentWidget = () => {
  const t = useT();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setStreaming(true);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const ctx = buildVincentContext();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vincent-chat`;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next, context: ctx, lang }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith("data:")) continue;
          const payload = l.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: copy[copy.length - 1].content + delta,
                };
                return copy;
              });
            }
          } catch { /* ignore parse errors on non-data chunks */ }
        }
      }
    } catch (e: any) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content:
            (lang === "en" ? "⚠️ Error: " : "⚠️ Fehler: ") +
            (e?.message ?? "unknown"),
        };
        return copy;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const suggestions = lang === "en" ? SUGGESTIONS_EN : SUGGESTIONS_DE;

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-2 pl-4 pr-5 h-14 rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-glow hover:shadow-elegant transition-all hover:scale-[1.02]"
          aria-label="Vincent öffnen"
        >
          <span className="size-8 rounded-full bg-background/20 flex items-center justify-center">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display font-semibold tracking-tight">
            {lang === "en" ? "Ask Vincent" : "Vincent fragen"}
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[min(92vw,420px)] h-[min(78vh,640px)] flex flex-col rounded-2xl bg-card border border-border shadow-elegant overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="shrink-0 flex items-center gap-3 px-4 h-14 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
            <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground flex items-center justify-center shadow-card">
              <Sparkles className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold leading-tight">Vincent</p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {lang === "en" ? "Your VINflow AI co-pilot" : "Dein VINflow KI-Copilot"}
              </p>
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" onClick={reset} aria-label="Reset">
                <Trash2 className="size-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
              <X className="size-4" />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-xl bg-muted/40 border border-border/60 p-4">
                  <p className="text-sm text-foreground">
                    {lang === "en"
                      ? "Hi, I'm Vincent. Ask me anything about your stock, processes, KPIs or to-dos — I see your live data."
                      : "Hi, ich bin Vincent. Frag mich alles zu Bestand, Vorgängen, KPIs oder To-Dos – ich sehe deine Live-Daten."}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                    {lang === "en" ? "Try" : "Probier"}
                  </p>
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left text-sm rounded-lg px-3 py-2 bg-background/60 border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-smooth"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2.5 bg-primary text-primary-foreground text-sm whitespace-pre-wrap">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[92%] text-sm text-foreground prose prose-sm prose-invert prose-p:my-1.5 prose-headings:mt-2 prose-headings:mb-1 prose-ul:my-1.5 prose-li:my-0.5 prose-strong:text-foreground">
                    {m.content === "" && streaming ? (
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" />
                        {lang === "en" ? "Thinking…" : "Denke nach…"}
                      </span>
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="shrink-0 border-t border-border bg-background/60 p-3 flex items-end gap-2"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={lang === "en" ? "Ask about KPIs, stock, processes…" : "Frag zu KPIs, Bestand, Vorgängen…"}
              rows={1}
              className="resize-none min-h-[40px] max-h-32 bg-background"
              disabled={streaming}
            />
            <Button type="submit" size="icon" disabled={streaming || !input.trim()} aria-label="Send">
              {streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
        </div>
      )}
    </>
  );
};
