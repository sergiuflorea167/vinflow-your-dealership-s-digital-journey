import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useProcessStore } from "@/store/processStore";
import { Sparkles, ListTodo, CalendarDays, Activity, TrendingUp } from "lucide-react";
import { useLang, useT } from "@/lib/i18n";

const greetingFor = (h: number, t: (k: string) => string) => {
  if (h < 5)  return t("greeting.evening");
  if (h < 11) return t("greeting.morning");
  if (h < 18) return t("greeting.day");
  return t("greeting.evening");
};

const formatDateLong = (d: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  }).format(d);

const formatTime = (d: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);

interface Props {
  activeCount: number;
  todoCount: number;
  eventCount: number;
}

export const DashboardHero = ({ activeCount, todoCount, eventCount }: Props) => {
  const settings = useProcessStore((s) => s.settings);
  const t = useT();
  const lang = useLang();
  const locale = lang === "en" ? "en-GB" : "de-DE";

  const firstName =
    (settings.firstName && settings.firstName.trim()) ||
    (settings.userName && settings.userName.split(" ")[0]) ||
    "Sergiu";

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(tick);
  }, []);

  const greeting = greetingFor(now.getHours(), t);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-surface">
      {/* Decorative glow blobs */}
      <div className="pointer-events-none absolute -top-32 -right-24 size-80 rounded-full bg-primary/25 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 size-72 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,hsl(var(--primary)/0.15),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
           style={{ backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />

      <div className="relative p-5 lg:p-6">
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5 items-center">
          {/* Left: Greeting */}
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.16em] text-primary-glow">
              <Sparkles className="size-3" />
              <span>{formatDateLong(now, locale)} · {formatTime(now, locale)}</span>
            </div>

            <h1 className="font-display font-bold tracking-tight leading-[1.05] text-foreground text-2xl lg:text-3xl">
              <span className="text-muted-foreground/90 font-semibold">{greeting}, </span>
              <span>{firstName}.</span>
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              {activeCount === 0
                ? (lang === "en"
                    ? "No open processes – time for strategy and purchasing."
                    : "Keine offenen Vorgänge – Zeit für Strategie und Einkauf.")
                : lang === "en" ? (
                  <>
                    You have{" "}
                    <span className="text-foreground font-semibold">{activeCount} active process{activeCount === 1 ? "" : "es"}</span>
                    , <span className="text-foreground font-semibold">{todoCount} to-do{todoCount === 1 ? "" : "s"}</span> due today
                    and <span className="text-foreground font-semibold">{eventCount} appointment{eventCount === 1 ? "" : "s"}</span> in the calendar.
                  </>
                ) : (
                  <>
                    Du hast{" "}
                    <span className="text-foreground font-semibold">{activeCount} aktive Vorgäng{activeCount === 1 ? "" : "e"}</span>
                    , <span className="text-foreground font-semibold">{todoCount} To-Do{todoCount === 1 ? "" : "s"}</span> heute fällig
                    und <span className="text-foreground font-semibold">{eventCount} Termin{eventCount === 1 ? "" : "e"}</span> im Kalender.
                  </>
                )
              }
            </p>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <Badge variant="outline" className="border-primary/30 text-primary-glow bg-primary/5 text-[10px] py-0">
                <TrendingUp className="size-3 mr-1" />
                {settings.role || "Team"}
              </Badge>
              <Badge variant="outline" className="border-border/60 text-muted-foreground text-[10px] py-0">
                {settings.companyName}
              </Badge>
            </div>
          </div>

          {/* Right: Quick stats panel */}
          <div className="grid grid-cols-3 lg:grid-cols-3 gap-2">
            <HeroStat icon={<Activity className="size-3.5" />}     label={lang === "en" ? "Active"   : "Aktiv"}   value={activeCount} accent="primary" />
            <HeroStat icon={<ListTodo className="size-3.5" />}     label={lang === "en" ? "To-Dos"   : "To-Dos"}  value={todoCount}   accent="warning" />
            <HeroStat icon={<CalendarDays className="size-3.5" />} label={lang === "en" ? "Events"   : "Termine"} value={eventCount}  accent="info" />
          </div>
        </div>
      </div>
    </section>
  );
};

const accentClass = {
  primary: "from-primary/20 to-primary/5 border-primary/30 text-primary-glow",
  warning: "from-warning/20 to-warning/5 border-warning/30 text-warning",
  info:    "from-info/20 to-info/5 border-info/30 text-info",
} as const;

const HeroStat = ({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: number; accent: keyof typeof accentClass }) => (
  <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-br backdrop-blur-sm px-3 py-2 ${accentClass[accent]}`}>
    <div className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider opacity-90">
      {icon}<span className="truncate">{label}</span>
    </div>
    <div className="text-2xl font-display font-bold mt-0.5 text-foreground tabular-nums">
      {value}
    </div>
  </div>
);
