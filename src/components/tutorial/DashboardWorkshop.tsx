import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useWorkshopStore } from "@/store/workshopStore";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, ArrowLeft, ArrowRight, X, Check, MousePointerClick,
  LayoutDashboard, Target, CalendarDays, CalendarCheck2, BarChart3, Workflow, FolderKanban, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Placement = "top" | "bottom" | "left" | "right" | "center";

interface Step {
  selector?: string;
  title: string;
  body: string;
  task?: string;            // konkrete Aufgabe für den Nutzer
  interactive?: boolean;    // wenn true: Klick auf Spotlight = weiter
  icon: React.ComponentType<{ className?: string }>;
  placement?: Placement;
}

const STEPS: Step[] = [
  {
    title: "Dashboard-Workshop",
    body: "Wir gehen jetzt gemeinsam dein Dashboard durch – Abschnitt für Abschnitt. Bei jedem Schritt darfst du selbst klicken. Keine Sorge, nichts wird gespeichert oder geändert.",
    icon: GraduationCap,
    placement: "center",
  },
  {
    selector: '[data-tour="dash-hero"]',
    title: "Dein Tages-Überblick",
    body: "Oben siehst du drei Zahlen: aktive Vorgänge, heute fällige To-Dos und heutige Termine. Das ist dein Puls für den Tag.",
    task: "Klick auf den hervorgehobenen Bereich, um weiterzugehen.",
    interactive: true,
    icon: LayoutDashboard,
    placement: "bottom",
  },
  {
    selector: '[data-tour="dash-goals"]',
    title: "Tagesziele",
    body: "Hier setzt du dir kleine Tagesziele. Bewährt: 1–3 konkrete Punkte. Sobald du sie abhakst, bekommst du sofort Feedback.",
    task: "Klick auf den Bereich der Tagesziele.",
    interactive: true,
    icon: Target,
    placement: "bottom",
  },
  {
    selector: '[data-tour="dash-events"]',
    title: "Heutige Termine",
    body: "Alle Termine von heute – Probefahrten, Übergaben, Anrufe. Farbpunkte zeigen den Termintyp. Über „Kalender öffnen“ kommst du in die Wochen-/Monatsansicht.",
    task: "Klick die Termin-Karte an.",
    interactive: true,
    icon: CalendarDays,
    placement: "top",
  },
  {
    selector: '[data-tour="dash-todos"]',
    title: "Heute fällige To-Dos",
    body: "Aufgaben, die heute dran sind – sortiert nach Priorität (rot/gelb/blau). Die Checkbox links hakt sofort ab.",
    task: "Klick auf die To-Do-Karte.",
    interactive: true,
    icon: CalendarCheck2,
    placement: "top",
  },
  {
    selector: '[data-tour="dash-kpis"]',
    title: "Deine KPIs",
    body: "Die Kennzahlen, die DU sehen willst. Über „KPIs verwalten“ kannst du jederzeit neue anpinnen oder entfernen.",
    task: "Klick in den KPI-Bereich.",
    interactive: true,
    icon: BarChart3,
    placement: "top",
  },
  {
    selector: '[data-tour="dash-pipeline"]',
    title: "Pipeline-Übersicht",
    body: "Hier siehst du, in welchem der 8 Vorgangsschritte gerade wie viele Vorgänge stecken. Engpässe erkennst du sofort.",
    task: "Klick auf die Pipeline.",
    interactive: true,
    icon: Workflow,
    placement: "top",
  },
  {
    selector: '[data-tour="dash-active"]',
    title: "Aktive Vorgänge",
    body: "Die letzten 6 laufenden Vorgänge mit Live-Status. Klick auf eine Karte – dort steuerst du den kompletten Verkaufsprozess.",
    task: "Klick auf den Vorgangs-Bereich.",
    interactive: true,
    icon: FolderKanban,
    placement: "top",
  },
  {
    title: "Geschafft!",
    body: "Du kennst jetzt alle Bereiche deines Dashboards. Den Workshop kannst du oben rechts jederzeit erneut starten. Viel Erfolg!",
    icon: Sparkles,
    placement: "center",
  },
];

const PAD = 10;
const TIP_W = 360;
const TIP_GAP = 14;

export const DashboardWorkshop = () => {
  const { active, step, next, prev, stop } = useWorkshopStore();
  const navigate = useNavigate();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);
  const findTimer = useRef<number | null>(null);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Auf Dashboard navigieren beim Start
  useEffect(() => {
    if (active && window.location.pathname !== "/") navigate("/");
  }, [active, navigate]);

  // Ziel finden
  useLayoutEffect(() => {
    if (!active) return;
    setReady(false);
    if (!current?.selector) {
      setRect(null);
      setReady(true);
      return;
    }
    const tryFind = (attempts = 0) => {
      const el = document.querySelector(current.selector!) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // kurz warten bis Scroll fertig
        window.setTimeout(() => {
          const r = el.getBoundingClientRect();
          setRect(r);
          setReady(true);
        }, 280);
      } else if (attempts < 20) {
        findTimer.current = window.setTimeout(() => tryFind(attempts + 1), 100);
      } else {
        setRect(null);
        setReady(true);
      }
    };
    tryFind();
    return () => {
      if (findTimer.current) window.clearTimeout(findTimer.current);
    };
  }, [active, step, current]);

  // Reposition
  useEffect(() => {
    if (!active || !current?.selector) return;
    const update = () => {
      const el = document.querySelector(current.selector!) as HTMLElement | null;
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, current]);

  // Keyboard
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
      if (e.key === "ArrowRight" || e.key === "Enter") isLast ? stop() : next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, isLast, next, prev, stop]);

  if (!active || !ready) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let tipStyle: React.CSSProperties = {};

  if (!rect || current.placement === "center") {
    tipStyle = { top: vh / 2 - 140, left: vw / 2 - TIP_W / 2, width: TIP_W };
  } else {
    const placement = current.placement ?? "bottom";
    let top = 0;
    let left = 0;
    if (placement === "bottom") {
      top = rect.bottom + TIP_GAP;
      left = rect.left + rect.width / 2 - TIP_W / 2;
    } else if (placement === "top") {
      top = rect.top - TIP_GAP - 230;
      left = rect.left + rect.width / 2 - TIP_W / 2;
    } else if (placement === "right") {
      top = rect.top + rect.height / 2 - 110;
      left = rect.right + TIP_GAP;
    } else if (placement === "left") {
      top = rect.top + rect.height / 2 - 110;
      left = rect.left - TIP_GAP - TIP_W;
    }
    left = Math.max(12, Math.min(left, vw - TIP_W - 12));
    top = Math.max(12, Math.min(top, vh - 240));
    tipStyle = { top, left, width: TIP_W };
  }

  const Icon = current.icon;
  const handleSpotlight = () => {
    if (current.interactive && !isLast) next();
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] pointer-events-none">
      {/* Backdrop schließt nicht versehentlich */}
      <div className="absolute inset-0 bg-background/75 backdrop-blur-[2px] pointer-events-auto animate-in fade-in duration-200" />

      {/* Spotlight */}
      {rect && current.placement !== "center" && (
        <button
          type="button"
          onClick={handleSpotlight}
          className={cn(
            "absolute rounded-xl ring-2 ring-primary shadow-[0_0_0_9999px_hsl(var(--background)/0.65)] transition-all duration-300",
            current.interactive
              ? "cursor-pointer ring-primary animate-pulse pointer-events-auto hover:ring-primary-glow"
              : "pointer-events-none",
          )}
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
          aria-label={current.interactive ? "Weiter" : undefined}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute pointer-events-auto rounded-2xl border-2 border-primary/40 bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={tipStyle}
      >
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className="size-10 shrink-0 rounded-lg bg-gradient-brand grid place-items-center">
            <Icon className="size-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-primary">
                Workshop · Schritt {step + 1}/{STEPS.length}
              </span>
            </div>
            <h3 className="text-base font-semibold leading-tight font-heading">{current.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">{current.body}</p>
            {current.task && current.interactive && (
              <div className="mt-3 flex items-center gap-2 px-2.5 py-2 rounded-md bg-primary/10 border border-primary/20">
                <MousePointerClick className="size-3.5 text-primary shrink-0 animate-pulse" />
                <span className="text-[11px] font-medium text-primary">{current.task}</span>
              </div>
            )}
          </div>
          <button
            onClick={stop}
            className="size-7 -mr-1 -mt-1 rounded-md grid place-items-center text-muted-foreground hover:bg-muted/60 transition-smooth"
            aria-label="Workshop beenden"
          >
            <X className="size-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t border-border">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step ? "w-5 bg-primary" : i < step ? "w-1.5 bg-primary/60" : "w-1.5 bg-muted-foreground/30",
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {step > 0 && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={prev}>
                <ArrowLeft className="size-3 mr-1" /> Zurück
              </Button>
            )}
            {!isLast ? (
              <Button
                size="sm"
                className="h-7 px-3 text-xs bg-gradient-brand"
                onClick={next}
                variant={current.interactive ? "ghost" : "default"}
              >
                {current.interactive ? "Überspringen" : "Weiter"} <ArrowRight className="size-3 ml-1" />
              </Button>
            ) : (
              <Button size="sm" className="h-7 px-3 text-xs bg-gradient-brand" onClick={stop}>
                <Check className="size-3 mr-1" /> Fertig
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
