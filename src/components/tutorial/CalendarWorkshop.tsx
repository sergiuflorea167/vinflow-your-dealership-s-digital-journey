import { useCalendarWorkshopStore } from "@/store/calendarWorkshopStore";
import { WorkshopPilot, WorkshopStep } from "./WorkshopPilot";
import {
  GraduationCap, CalendarDays, Layers, ChevronRight, CalendarRange,
  Plus, MousePointerClick, Sparkles,
} from "lucide-react";

const STEPS: WorkshopStep[] = [
  {
    title: "Kalender-Workshop",
    body: "Der Kalender bündelt Termine, Tagesstruktur und wiederverwendbare Vorlagen. Wir gehen die drei Reiter gemeinsam durch.",
    icon: GraduationCap, placement: "center",
  },
  {
    selector: '[data-tour="cal-header"]',
    title: "Header & neuer Termin",
    body: "Oben links die Übersicht, oben rechts der Button für einen neuen Termin – mit Datum, Uhrzeit, Typ und optionalem Bezug.",
    icon: CalendarDays, placement: "bottom",
  },
  {
    selector: '[data-tour="cal-tabs"]',
    title: "Drei Sichten",
    body: "„Termine“ zeigt die Wochenansicht, „Tagesstruktur“ den einzelnen Tag mit Blöcken, „Vorlagen“ deine wiederverwendbaren Tagespläne.",
    icon: Layers, placement: "bottom",
  },
  {
    selector: '[data-tour="cal-nav"]',
    title: "Navigation",
    body: "Vor- und zurückblättern, mit „Heute“ direkt zur aktuellen Woche springen. Rechts siehst du die Legende der Termin-Typen.",
    icon: ChevronRight, placement: "bottom",
  },
  {
    selector: '[data-tour="cal-week"]',
    title: "Wochenansicht – drag & drop",
    body: "Termine ziehst du per Maus an eine andere Uhrzeit oder einen anderen Tag. Am unteren Rand eines Eintrags lässt sich die Dauer ziehen.",
    task: "Verschiebe oder skaliere optional einen Eintrag in der Wochenansicht.",
    icon: CalendarRange, placement: "top",
  },
  {
    selector: '[data-tour="cal-new"]',
    awaitSelector: '[data-tour="cal-new"] button',
    title: "Neuen Termin anlegen",
    body: "Schnell-Erfassung mit Titel, Datum, Zeit, Typ (Termin, To-Do, Block, Besichtigung, Übergabe …) und optionalem Ort.",
    task: "Klick auf „Neuer Termin“, um den Dialog zu öffnen.",
    icon: Plus, placement: "left",
  },
  {
    title: "Tagesstruktur & Vorlagen",
    body: "Im Reiter „Tagesstruktur“ kannst du Blöcke (Fokuszeit, Kundenkontakt, …) auf einen Tag legen – per Vorlage oder manuell. Vorlagen pflegst du im dritten Reiter und überträgst sie mit einem Klick auf jeden Tag.",
    icon: MousePointerClick, placement: "center",
  },
  {
    title: "Kalender gemeistert!",
    body: "Du kennst jetzt Wochenansicht, Tagesstruktur und Vorlagen. Termine sind verschiebbar, To-Dos und Vorgänge tauchen automatisch hier auf.",
    icon: Sparkles, placement: "center",
  },
];

export const CalendarWorkshop = () => {
  const { active, step, next, prev, stop } = useCalendarWorkshopStore();
  return (
    <WorkshopPilot
      active={active}
      step={step}
      steps={STEPS}
      rootRoute="/kalender"
      labelPrefix="Kalender-Workshop"
      next={next}
      prev={prev}
      stop={stop}
    />
  );
};
