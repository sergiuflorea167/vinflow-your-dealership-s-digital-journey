import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTutorialStore } from "@/store/tutorialStore";
import { Button } from "@/components/ui/button";
import {
  Sparkles, ArrowLeft, ArrowRight, X, Check, Car, Workflow, Search, Bot, User,
  LayoutDashboard, Database, ListChecks, ShoppingCart, BarChart3, FileSignature, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Placement = "top" | "bottom" | "left" | "right" | "center";

interface Step {
  selector?: string;
  route?: string;
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
  placement?: Placement;
}

const STEPS: Step[] = [
  {
    title: "Willkommen bei VINflow",
    body: "In 2 Minuten zeige ich dir, wie ein kompletter Vorgang läuft – vom Fahrzeug bis zur Übergabe. Du kannst die Tour jederzeit überspringen oder später erneut starten.",
    icon: Sparkles,
    placement: "center",
  },
  {
    selector: '[data-tour="nav-dashboard"]',
    route: "/",
    title: "Dein Dashboard",
    body: "Startseite mit Live-Übersicht: offene Vorgänge, fällige To-Dos, KPIs und aktuelle Aktivitäten. Hier siehst du auf einen Blick, wo du heute anpacken musst.",
    icon: LayoutDashboard,
    placement: "right",
  },
  {
    title: "So läuft ein Vorgang ab",
    body: "Jeder Verkauf durchläuft 8 Schritte: 1) Einkaufsplanung → 2) Bestand → 3) Angebot → 4) Anzahlung → 5) Auftragsbestätigung → 6) Ausgangskontrolle → 7) Rechnung → 8) Übergabe. Schritte schalten sich nacheinander frei.",
    icon: Workflow,
    placement: "center",
  },
  {
    selector: '[data-tour="nav-master"]',
    route: "/stammdaten",
    title: "1. Stammdaten anlegen",
    body: "Starte hier: Kunden, Lieferanten und Partner pflegst du einmal zentral. Diese Daten greifen alle Vorgänge automatisch ab – keine Doppeleingaben mehr.",
    icon: Database,
    placement: "right",
  },
  {
    selector: '[data-tour="master-create"]',
    title: "Neuen Kunden / Partner anlegen",
    body: "Klick auf „Neuer Partner“, wähle den Typ (Kunde, Lieferant, …) und trag Stammdaten ein. Speichern – fertig. Steht sofort in allen Vorgängen zur Verfügung.",
    icon: Plus,
    placement: "left",
  },
  {
    selector: '[data-tour="nav-fleet"]',
    route: "/bestand",
    title: "2. Fahrzeuge im Bestand",
    body: "Alle Fahrzeuge mit VIN, Fotos, Kosten und Status. Per CSV/Excel-Import bringst du bestehende Bestände in Sekunden rein.",
    icon: Car,
    placement: "right",
  },
  {
    selector: '[data-tour="fleet-intake"]',
    title: "Fahrzeug aufnehmen",
    body: "VIN eingeben – Marke, Modell und Daten werden automatisch erkannt. Fotos hochladen, Einkaufspreis & Kosten ergänzen. Damit ist das Fahrzeug verkaufsbereit.",
    icon: Plus,
    placement: "bottom",
  },
  {
    selector: '[data-tour="nav-processes"]',
    route: "/vorgaenge",
    title: "3. Vorgänge führen",
    body: "Hier startest du einen Verkaufsvorgang: Fahrzeug + Kunde verknüpfen, Angebot erstellen. Jeder abgeschlossene Schritt erzeugt automatisch einen PDF-Beleg für den Kunden.",
    icon: FileSignature,
    placement: "right",
  },
  {
    selector: '[data-tour="nav-purchasing"]',
    route: "/einkaufsplanung",
    title: "Einkaufsplanung",
    body: "Plane künftige Ankäufe: Wunschfahrzeuge, Budget, Quelle. Wird ein Fahrzeug gekauft, wandert es per Klick in den Bestand.",
    icon: ShoppingCart,
    placement: "right",
  },
  {
    selector: '[data-tour="nav-todos"]',
    route: "/todos",
    title: "To-Dos & Ausgangskontrolle",
    body: "Alle Aufgaben aus laufenden Vorgängen (Reinigung, TÜV, Aufbereitung, Zulassung …) gebündelt – nichts fällt mehr durchs Raster.",
    icon: ListChecks,
    placement: "right",
  },
  {
    selector: '[data-tour="nav-kpis"]',
    route: "/kpis",
    title: "KPIs & Insights",
    body: "Marge, Durchlaufzeiten, Conversion. Echte Zahlen statt Bauchgefühl – aus deinen eigenen Vorgängen berechnet.",
    icon: BarChart3,
    placement: "right",
  },
  {
    selector: '[data-tour="topbar-search"]',
    title: "Finde alles sofort",
    body: "Die Suche oben funktioniert auf jeder Seite – nach VIN, Kennzeichen, Kunde oder Vorgangsnummer.",
    icon: Search,
    placement: "bottom",
  },
  {
    selector: '[data-tour="vincent"]',
    title: "Vincent – dein KI-Assistent",
    body: "Frag Vincent nach Auswertungen, dem nächsten Schritt in einem Vorgang oder lass dir komplexe Vorgänge in einem Satz zusammenfassen.",
    icon: Bot,
    placement: "left",
  },
  {
    selector: '[data-tour="user-menu"]',
    title: "Profil, Team & Wiederholung",
    body: "Hier findest du deinen Einladungs-Code für Mitarbeiter, das PDF-Branding – und kannst diese Tour jederzeit über „Einführungs-Tour starten“ erneut abspielen.",
    icon: User,
    placement: "bottom",
  },
];

const PAD = 8;
const TIP_W = 340;
const TIP_GAP = 12;

export const TutorialPilot = () => {
  const { active, step, next, prev, skip, finish } = useTutorialStore();
  const navigate = useNavigate();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);
  const findTimer = useRef<number | null>(null);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Route follow
  useEffect(() => {
    if (!active || !current?.route) return;
    if (window.location.pathname !== current.route) {
      navigate(current.route);
    }
  }, [active, step, current, navigate]);

  // Locate target
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
        const r = el.getBoundingClientRect();
        setRect(r);
        setReady(true);
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
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

  // Reposition on resize/scroll
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

  // ESC to skip
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
      if (e.key === "ArrowRight" || e.key === "Enter") isLast ? finish() : next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, isLast, next, prev, skip, finish]);

  if (!active || !ready) return null;

  // Compute tooltip position
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let tipStyle: React.CSSProperties = {};

  if (!rect || current.placement === "center") {
    tipStyle = {
      top: vh / 2 - 120,
      left: vw / 2 - TIP_W / 2,
      width: TIP_W,
    };
  } else {
    const placement = current.placement ?? "bottom";
    let top = 0;
    let left = 0;
    if (placement === "bottom") {
      top = rect.bottom + TIP_GAP;
      left = rect.left + rect.width / 2 - TIP_W / 2;
    } else if (placement === "top") {
      top = rect.top - TIP_GAP - 180;
      left = rect.left + rect.width / 2 - TIP_W / 2;
    } else if (placement === "right") {
      top = rect.top + rect.height / 2 - 90;
      left = rect.right + TIP_GAP;
    } else if (placement === "left") {
      top = rect.top + rect.height / 2 - 90;
      left = rect.left - TIP_GAP - TIP_W;
    }
    // clamp
    left = Math.max(12, Math.min(left, vw - TIP_W - 12));
    top = Math.max(12, Math.min(top, vh - 200));
    tipStyle = { top, left, width: TIP_W };
  }

  const Icon = current.icon;

  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-[2px] pointer-events-auto animate-in fade-in duration-200"
        onClick={skip}
      />

      {/* Spotlight ring */}
      {rect && current.placement !== "center" && (
        <div
          className="absolute rounded-xl ring-2 ring-primary shadow-[0_0_0_9999px_hsl(var(--background)/0.55)] transition-all duration-300"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute pointer-events-auto rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={tipStyle}
      >
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className="size-9 shrink-0 rounded-lg bg-gradient-brand grid place-items-center">
            <Icon className="size-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold leading-tight font-heading">{current.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">{current.body}</p>
          </div>
          <button
            onClick={skip}
            className="size-7 -mr-1 -mt-1 rounded-md grid place-items-center text-muted-foreground hover:bg-muted/60 transition-smooth"
            aria-label="Tour beenden"
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
                  i === step ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30",
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
              <Button size="sm" className="h-7 px-3 text-xs bg-gradient-brand" onClick={next}>
                Weiter <ArrowRight className="size-3 ml-1" />
              </Button>
            ) : (
              <Button size="sm" className="h-7 px-3 text-xs bg-gradient-brand" onClick={finish}>
                <Check className="size-3 mr-1" /> Loslegen
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
