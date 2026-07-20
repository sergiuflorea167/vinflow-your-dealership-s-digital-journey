import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTutorialStore } from "@/store/tutorialStore";
import { Button } from "@/components/ui/button";
import {
  Sparkles, ArrowLeft, ArrowRight, X, Check, Car, Workflow, Search, Bot, User,
  LayoutDashboard, Database, ListChecks, ShoppingCart, BarChart3, FileSignature, Plus,
  Handshake, ShieldCheck, Receipt, CreditCard, FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { findVisibleTourTarget } from "@/lib/tourTarget";
import { VincentFace } from "@/components/vincent/VincentFace";

type Placement = "top" | "bottom" | "left" | "right" | "center";
type IconType = React.ComponentType<{ className?: string }>;

interface Step {
  selector?: string;
  route?: string;
  chapter: string;
  title: string;
  body: string;
  icon: IconType;
  placement?: Placement;
  /** Kleine Konzept-Grafik für die erklärenden Zwischenschritte (kein Coach-Mark). */
  visual?: IconType;
  /** Erklärschritte brauchen etwas mehr Breite für ihre Grafik. */
  wide?: boolean;
}

// ---------------------------------------------------------------------------
// Kleine Erklär-Grafiken für die Konzept-Folien (kein Fachjargon, nur Bilder).
// ---------------------------------------------------------------------------

const Badge = ({ icon: Icon, label, highlight }: { icon: IconType; label: string; highlight?: boolean }) => (
  <div className="flex flex-col items-center gap-1.5">
    <div
      className={cn(
        "size-11 rounded-xl grid place-items-center shrink-0",
        highlight ? "bg-gradient-brand" : "bg-secondary",
      )}
    >
      <Icon className={cn("size-5", highlight ? "text-primary-foreground" : "text-foreground/80")} />
    </div>
    <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{label}</span>
  </div>
);

const ConceptTrio = () => (
  <div className="flex items-center justify-center gap-2.5 py-3">
    <Badge icon={User} label="Kunde" />
    <Plus className="size-4 text-muted-foreground/60 shrink-0" />
    <Badge icon={Car} label="Fahrzeug" />
    <ArrowRight className="size-4 text-muted-foreground/60 shrink-0" />
    <Badge icon={Workflow} label="Vorgang" highlight />
  </div>
);

const CORE_STATIONS: { icon: IconType; label: string }[] = [
  { icon: ShoppingCart, label: "Einkaufsplanung" },
  { icon: Car, label: "Bestand" },
  { icon: Receipt, label: "Rechnung" },
  { icon: FileSignature, label: "Kaufvertrag" },
];

const OPTIONAL_STEPS: { icon: IconType; label: string }[] = [
  { icon: CreditCard, label: "Anzahlung" },
  { icon: FileCheck, label: "Auftrags-bestätigung" },
  { icon: ShieldCheck, label: "Kontrolle" },
  { icon: Handshake, label: "Lieferung" },
];

const ProcessRoad = () => (
  <div className="py-2">
    <div className="flex items-start justify-center gap-1">
      {CORE_STATIONS.map((p, i) => (
        <div key={p.label} className="flex items-start">
          <div className="flex flex-col items-center gap-1.5 w-[64px]">
            <div className="relative size-9 rounded-lg bg-secondary grid place-items-center shrink-0">
              <span className="absolute -top-1.5 -left-1.5 size-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold grid place-items-center">
                {i + 1}
              </span>
              <p.icon className="size-4 text-foreground/80" />
            </div>
            <span className="text-[9px] font-medium text-muted-foreground text-center leading-tight">{p.label}</span>
          </div>
          {i < CORE_STATIONS.length - 1 && (
            <ArrowRight className="size-3 text-muted-foreground/40 shrink-0 mt-3" />
          )}
        </div>
      ))}
    </div>
    <div className="mt-3 pt-3 border-t border-dashed border-border">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70 text-center mb-1.5">
        + optional dazwischen wählbar
      </p>
      <div className="flex items-start justify-center gap-3">
        {OPTIONAL_STEPS.map((p) => (
          <div key={p.label} className="flex flex-col items-center gap-1 w-14">
            <div className="size-7 rounded-md bg-muted grid place-items-center shrink-0">
              <p.icon className="size-3.5 text-muted-foreground" />
            </div>
            <span className="text-[8px] text-muted-foreground text-center leading-tight">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Tour-Inhalte
// ---------------------------------------------------------------------------

const STEPS: Step[] = [
  {
    chapter: "Willkommen",
    title: "Hallo, ich bin VINcent!",
    body: "Ich bin dein persönlicher Assistent hier bei VINflow – und ich zeige dir jetzt in ein paar Minuten alles, was du wissen musst. Kein Vorwissen nötig, versprochen. Du kannst jederzeit mit Esc oder dem X aussteigen, ich bin danach immer über mein Symbol unten rechts für dich da.",
    icon: Sparkles,
    placement: "center",
  },
  {
    chapter: "So funktioniert's",
    title: "Lass mich dir zeigen, wie alles zusammenhängt",
    body: "Bei mir dreht sich alles um 3 Dinge: Ein Kunde plus ein Fahrzeug ergibt einen „Vorgang“ – so nenne ich hier einen Verkauf. Sobald du beide miteinander verknüpfst, übernehme ich für dich den Überblick.",
    icon: Workflow,
    visual: ConceptTrio,
    wide: true,
    placement: "center",
  },
  {
    chapter: "So funktioniert's",
    title: "So begleite ich ein Auto durch VINflow",
    body: "Jedes Fahrzeug von dir fährt bei mir Station für Station: von der Einkaufsplanung über den Bestand bis zu Rechnung und Kaufvertrag. Dazwischen kannst du optionale Belege wie Anzahlung, Auftragsbestätigung, Ausgangskontrolle oder Lieferung einblenden – ganz einfach über „Konfiguration“.",
    icon: Workflow,
    visual: ProcessRoad,
    wide: true,
    placement: "center",
  },
  {
    chapter: "Dein Rundgang",
    selector: '[data-tour="nav-dashboard"]',
    route: "/",
    title: "Das ist deine Startseite",
    body: "Hier landest du ab jetzt immer zuerst. Ich zeige dir hier jeden Tag, was zu tun ist, welche Vorgänge laufen und wie dein Geschäft steht – alles auf einen Blick.",
    icon: LayoutDashboard,
    placement: "right",
  },
  {
    chapter: "Dein Rundgang",
    selector: '[data-tour="nav-master"]',
    route: "/stammdaten",
    title: "Station 1: Kunden & Partner",
    body: "Trag hier einmal deine Kunden, Lieferanten und Partner ein. Diese Daten merke ich mir – sie stehen dir danach überall im Programm zur Verfügung, du musst nie wieder etwas doppelt eintippen.",
    icon: Database,
    placement: "right",
  },
  {
    chapter: "Dein Rundgang",
    selector: '[data-tour="master-create"]',
    title: "So legst du jemanden neu an",
    body: "Klick auf „Neuer Partner“, wähle den Typ (z. B. Kunde oder Lieferant) und füll die Felder aus. Speichern – fertig. Ab sofort kannst du diese Person in jedem Vorgang auswählen.",
    icon: Plus,
    placement: "left",
  },
  {
    chapter: "Dein Rundgang",
    selector: '[data-tour="nav-fleet"]',
    route: "/bestand",
    title: "Station 2: Deine Fahrzeuge",
    body: "Hier liegt dein kompletter Fahrzeugbestand: mit Fotos, Kosten und aktuellem Status. Bestehende Listen bringst du per Excel-Import in Sekunden rein, statt sie neu einzutippen.",
    icon: Car,
    placement: "right",
  },
  {
    chapter: "Dein Rundgang",
    selector: '[data-tour="fleet-intake"]',
    title: "Ein Fahrzeug neu aufnehmen",
    body: "Gib nur die Fahrgestellnummer (VIN) ein – Marke, Modell und technische Daten fülle ich automatisch für dich aus. Foto hochladen, Preis eintragen – fertig ist das Fahrzeug für den Verkauf bereit.",
    icon: Plus,
    placement: "bottom",
  },
  {
    chapter: "Dein Rundgang",
    selector: '[data-tour="nav-processes"]',
    route: "/vorgaenge",
    title: "Station 3: Verkaufen",
    body: "Hier verknüpfst du ein Fahrzeug mit einem Kunden – das startet den Vorgang. Ich führe dich danach durch Angebot, Vertrag und Kontrolle bis zur Rechnung und erstelle dabei jedes Dokument automatisch.",
    icon: FileSignature,
    placement: "right",
  },
  {
    chapter: "Dein Rundgang",
    selector: '[data-tour="nav-purchasing"]',
    route: "/einkaufsplanung",
    title: "Künftige Einkäufe planen",
    body: "Noch bevor du ein Auto tatsächlich kaufst, kannst du es hier als Wunsch eintragen – mit Budget und Quelle. Schlägst du zu, wandert es mit einem Klick direkt in deinen Bestand.",
    icon: ShoppingCart,
    placement: "right",
  },
  {
    chapter: "Dein Rundgang",
    selector: '[data-tour="nav-todos"]',
    route: "/todos",
    title: "Ich vergesse nichts für dich",
    body: "Reinigung, TÜV, Aufbereitung, Zulassung – alle offenen Aufgaben aus deinen laufenden Vorgängen sammle ich automatisch hier. Ein Blick genügt, um zu wissen, was heute liegen bleibt.",
    icon: ListChecks,
    placement: "right",
  },
  {
    chapter: "Dein Rundgang",
    selector: '[data-tour="nav-kpis"]',
    route: "/kpis",
    title: "Wie läuft dein Geschäft wirklich?",
    body: "Marge, Durchlaufzeit, wie viele Anfragen zu Verkäufen werden – das rechne ich automatisch aus deinen echten Vorgängen aus. Kein Excel, kein Kopfrechnen.",
    icon: BarChart3,
    placement: "right",
  },
  {
    chapter: "Dein Rundgang",
    selector: '[data-tour="topbar-search"]',
    title: "Alles sofort finden",
    body: "Diese Suche funktioniert auf jeder Seite. Tipp einfach eine VIN, ein Kennzeichen, einen Kundennamen oder eine Vorgangsnummer ein – oder frag einfach mich, oft geht das noch schneller.",
    icon: Search,
    placement: "bottom",
  },
  {
    chapter: "Dein Rundgang",
    selector: '[data-tour="vincent"]',
    title: "Und genau hier findest du mich",
    body: "Das bin übrigens ich, unten rechts auf jeder Seite. Frag mich jederzeit in normalen Worten, z. B. „Was ist der nächste Schritt bei Vorgang 12?“ oder „Wie viel Marge hatte ich letzten Monat?“. Ich kenne deine Daten und antworte mit den exakt berechneten Zahlen, nicht mit einer Schätzung. Nach einer solchen Antwort schlage ich dir meist auch gleich vor, sie als Insight+ Karte zu speichern — du kannst mir aber auch direkt sagen „Erstelle mir dafür eine Insight+ Karte“, dann lege ich sie sofort an.",
    icon: Bot,
    placement: "left",
  },
  {
    chapter: "Dein Rundgang",
    selector: '[data-tour="user-menu"]',
    title: "Mein letzter Tipp",
    body: "Unten links in der Menüleiste findest du dein Konto-Menü: Profil, Team-Einladungscode, Firmenlogo für Belege, Sprache & Ansicht, deine Achievements – und den Workshop, eine eigene Übungsumgebung mit Beispieldaten für jedes Kapitel. Über „Einführungs-Tour starten“ hole ich dich dort auch jederzeit wieder ab.",
    icon: User,
    placement: "right",
  },
  {
    chapter: "Bereit",
    title: "Und los geht's!",
    body: "Das war's von mir – du kennst jetzt die wichtigsten Wege durch VINflow. Unsicher, wo du anfangen sollst? Öffne unten links dein Konto-Menü und starte den „Workshop“ – dort lernst du jeden Bereich Schritt für Schritt mit Beispieldaten, ganz ohne Risiko für deine echten Daten. Und falls du unterwegs nicht weiterweißt: Ich bin über den Button unten rechts jederzeit für dich da.",
    icon: Check,
    placement: "center",
  },
];

const PAD = 8;
const TIP_W = 340;
const TIP_W_WIDE = 430;
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
      const el = findVisibleTourTarget(current.selector!);
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
      const el = findVisibleTourTarget(current.selector!);
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
      if (e.key === "ArrowRight" || e.key === "Enter") {
        if (isLast) finish(); else next();
      }
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, isLast, next, prev, skip, finish]);

  if (!active || !ready) return null;

  // Compute tooltip position
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const baseW = current.wide ? TIP_W_WIDE : TIP_W;
  const tipW = Math.min(baseW, vw - 24);
  let tipStyle: React.CSSProperties = {};

  if (!rect || current.placement === "center") {
    tipStyle = {
      top: vh / 2 - 140,
      left: vw / 2 - tipW / 2,
      width: tipW,
    };
  } else {
    const placement = current.placement ?? "bottom";
    let top = 0;
    let left = 0;
    if (placement === "bottom") {
      top = rect.bottom + TIP_GAP;
      left = rect.left + rect.width / 2 - tipW / 2;
    } else if (placement === "top") {
      top = rect.top - TIP_GAP - 180;
      left = rect.left + rect.width / 2 - tipW / 2;
    } else if (placement === "right") {
      top = rect.top + rect.height / 2 - 90;
      left = rect.right + TIP_GAP;
    } else if (placement === "left") {
      top = rect.top + rect.height / 2 - 90;
      left = rect.left - TIP_GAP - tipW;
    }
    // clamp
    left = Math.max(12, Math.min(left, vw - tipW - 12));
    top = Math.max(12, Math.min(top, vh - 200));
    tipStyle = { top, left, width: tipW };
  }

  const Icon = current.icon;
  const Visual = current.visual;
  const overlayBg = "hsl(var(--background) / 0.6)";
  const cutout = rect && current.placement !== "center";
  const t = cutout ? Math.max(0, rect.top - PAD) : 0;
  const l = cutout ? Math.max(0, rect.left - PAD) : 0;
  const w = cutout ? rect.width + PAD * 2 : 0;
  const h = cutout ? rect.height + PAD * 2 : 0;

  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Dimmed backdrop — cut out around the highlighted element so it stays fully sharp and visible */}
      {cutout ? (
        <>
          <div
            className="absolute left-0 right-0 top-0 pointer-events-auto"
            style={{ height: t, background: overlayBg }}
            onClick={skip}
          />
          <div
            className="absolute left-0 bottom-0 right-0 pointer-events-auto"
            style={{ top: t + h, background: overlayBg }}
            onClick={skip}
          />
          <div
            className="absolute pointer-events-auto"
            style={{ top: t, left: 0, width: l, height: h, background: overlayBg }}
            onClick={skip}
          />
          <div
            className="absolute pointer-events-auto"
            style={{ top: t, left: l + w, right: 0, height: h, background: overlayBg }}
            onClick={skip}
          />
          <div
            className="absolute rounded-xl ring-2 ring-primary pointer-events-none transition-[top,left,width,height] duration-200 ease-out"
            style={{
              top: t, left: l, width: w, height: h,
              boxShadow: "0 0 0 2px hsl(var(--primary) / 0.35), 0 0 24px 3px hsl(var(--primary) / 0.35)",
            }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0 pointer-events-auto"
          style={{ background: overlayBg }}
          onClick={skip}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute pointer-events-auto rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
        style={tipStyle}
      >
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className="relative shrink-0">
            <VincentFace className="size-11 drop-shadow-[0_3px_8px_hsl(var(--primary)/0.35)]" />
            <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-card border border-border grid place-items-center shadow-sm">
              <Icon className="size-3 text-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground">VINcent</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-semibold leading-none">
                Assistent
              </span>
              <span className="min-w-0 flex-1 truncate text-[9px] font-mono uppercase tracking-wider text-muted-foreground/50">
                · {current.chapter}
              </span>
            </div>
            <h3 className="text-sm font-semibold leading-tight font-heading mt-1">{current.title}</h3>
            {Visual && <Visual />}
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
                <Check className="size-3 mr-1" /> Los geht's!
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
