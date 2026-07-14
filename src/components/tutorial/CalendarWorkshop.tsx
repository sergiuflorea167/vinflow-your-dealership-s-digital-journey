import { WorkshopStep } from "./WorkshopPilot";
import {
  GraduationCap, CalendarDays, ChevronRight, CalendarRange, Plus, Sparkles,
} from "lucide-react";

export const CALENDAR_WORKSHOP_STEPS: WorkshopStep[] = [
  {
    title: "Kalender-Workshop",
    body: "Der Kalender zeigt dir alle Termine, To-Dos und Vorgangs-Ereignisse in einer übersichtlichen Wochenansicht. Wir gehen ihn jetzt Schritt für Schritt durch.",
    icon: GraduationCap, placement: "center",
  },
  {
    selector: '[data-tour="cal-header"]',
    title: "Header & neuer Termin",
    body: "Oben links die Übersicht, oben rechts der Button für einen neuen Termin – mit Datum, Uhrzeit, Typ und optionalem Ort.",
    icon: CalendarDays, placement: "bottom",
  },
  {
    selector: '[data-tour="cal-nav"]',
    title: "Navigation & Legende",
    body: "Vor- und zurückblättern, mit „Heute“ direkt zur aktuellen Woche springen. Rechts siehst du die Farb-Legende der Termin-Typen (Termin, To-Do, Besichtigung, Übergabe, Anruf, Intern).",
    icon: ChevronRight, placement: "bottom",
  },
  {
    selector: '[data-tour="cal-week"]',
    title: "Wochenansicht – drag & drop",
    body: "Termine ziehst du per Maus an eine andere Uhrzeit oder einen anderen Tag. Am unteren Rand eines Eintrags lässt sich die Dauer ziehen. Ein Klick auf einen leeren Tag öffnet direkt die Termin-Erfassung für dieses Datum.",
    task: "Verschiebe oder skaliere optional einen Eintrag in der Wochenansicht.",
    icon: CalendarRange, placement: "top",
  },
  {
    selector: '[data-tour="cal-new"]',
    awaitSelector: '[data-tour="cal-new"] button',
    title: "Neuen Termin anlegen",
    body: "Schnell-Erfassung mit Titel, Datum, Zeit, Typ (Termin, To-Do, Besichtigung, Übergabe, Anruf, Intern) und optionalem Ort.",
    task: "Klick auf „Neuer Termin“, um den Dialog zu öffnen.",
    icon: Plus, placement: "left",
  },
  {
    title: "Kalender gemeistert!",
    body: "Du kennst jetzt Navigation, Legende und die Wochenansicht mit Drag & Drop. To-Dos und Vorgangs-Ereignisse mit Datum tauchen automatisch hier auf.",
    icon: Sparkles, placement: "center",
  },
];
