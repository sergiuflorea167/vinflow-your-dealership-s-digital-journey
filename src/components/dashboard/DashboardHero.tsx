import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProcessStore } from "@/store/processStore";
import { ArrowUpRight, Sparkles, ListTodo, CalendarDays, Activity } from "lucide-react";

const greetingFor = (h: number) => {
  if (h < 5)  return "Gute Nacht";
  if (h < 11) return "Guten Morgen";
  if (h < 14) return "Hallo";
  if (h < 18) return "Guten Tag";
  if (h < 23) return "Guten Abend";
  return "Gute Nacht";
};

const formatDateLong = (d: Date) =>
  new Intl.DateTimeFormat("de-DE", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  }).format(d);

const formatTime = (d: Date) =>
  new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(d);

interface Props {
  activeCount: number;
  todoCount: number;
  eventCount: number;
}

export const DashboardHero = ({ activeCount, todoCount, eventCount }: Props) => {
  const settings = useProcessStore((s) => s.settings);
  const firstName =
    settings.firstName?.trim() ||
    settings.userName?.split(" ")[0] ||
    "Sergiu";

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const greeting = greetingFor(now.getHours());

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-surface">
      {/* Decorative glow blobs */}
      <div className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-20 size-96 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.12),transparent_60%)]" />

      <div className="relative p-8 lg:p-10">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-8">
          {/* Left: Greeting */}
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-primary-glow">
              <Sparkles className="size-3.5" />
              <span>{formatDateLong(now)} · {formatTime(now)}</span>
            </div>

            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-display font-bold tracking-tight text-foreground leading-[1.05]">
              {greeting},{" "}
              <span className="bg-gradient-brand bg-clip-text text-transparent">
                {firstName}
              </span>
              .
            </h1>

            <p className="text-base lg:text-lg text-muted-foreground leading-relaxed">
              {activeCount === 0
                ? "Keine offenen Vorgänge – Zeit für Strategie und Einkauf."
                : `Du hast ${activeCount} aktive Vorgäng${activeCount === 1 ? "" : "e"}, ${todoCount} To-Do${todoCount === 1 ? "" : "s"} fällig heute und ${eventCount} Termin${eventCount === 1 ? "" : "e"} im Kalender.`}
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="outline" className="border-primary/30 text-primary-glow bg-primary/5">
                VINflow · {settings.role || "Team"}
              </Badge>
              <Badge variant="outline" className="border-border/60 text-muted-foreground">
                {settings.companyName}
              </Badge>
            </div>
          </div>

          {/* Right: Quick stats + CTAs */}
          <div className="flex flex-col gap-4 xl:items-end">
            <div className="grid grid-cols-3 gap-3 w-full xl:w-auto">
              <HeroStat icon={<Activity className="size-4" />}    label="Aktiv"   value={activeCount} accent="primary" />
              <HeroStat icon={<ListTodo className="size-4" />}    label="To-Dos"  value={todoCount}   accent="warning" />
              <HeroStat icon={<CalendarDays className="size-4" />} label="Termine" value={eventCount}  accent="info" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="border-border/60" asChild>
                <Link to="/einkaufsplanung">
                  Einkauf <ArrowUpRight className="size-4 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" className="border-border/60" asChild>
                <Link to="/bestand">
                  Bestand <ArrowUpRight className="size-4 ml-2" />
                </Link>
              </Button>
              <Button className="bg-gradient-brand hover:opacity-90 shadow-elegant" asChild>
                <Link to="/vorgaenge">Alle Vorgänge</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const accentClass = {
  primary: "bg-primary/10 text-primary-glow border-primary/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  info:    "bg-info/10 text-info border-info/20",
} as const;

const HeroStat = ({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: number; accent: keyof typeof accentClass }) => (
  <div className={`rounded-xl border px-3 py-2.5 backdrop-blur-sm min-w-[88px] ${accentClass[accent]}`}>
    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider opacity-80">
      {icon}<span>{label}</span>
    </div>
    <div className="text-2xl font-display font-bold mt-1 text-foreground">{value}</div>
  </div>
);
