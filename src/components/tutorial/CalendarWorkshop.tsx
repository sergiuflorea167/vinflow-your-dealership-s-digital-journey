import { WorkshopStep } from "./WorkshopPilot";
import {
  GraduationCap, CalendarDays, Pin, Plus, LayoutList, ChevronRight, CalendarRange, MousePointerClick, Sparkles,
} from "lucide-react";

export const CALENDAR_WORKSHOP_STEPS: WorkshopStep[] = [
  {
    title: "Kalender-Workshop",
    body: "Der Kalender zeigt dir alle Termine, To-Dos und Vorgangs-Ereignisse in Wochen- oder Tagesansicht. Wir gehen ihn jetzt Schritt für Schritt durch — inklusive aller Knöpfe.",
    icon: GraduationCap, placement: "center",
  },
  {
    selector: '[data-tour="cal-header"]',
    title: "Kopfzeile: Anpinnen & neuer Termin",
    body: "Hier oben findest du zwei wichtige Aktionen: „Anpinnen“ blendet ein Kalender-Panel ein, das dich auf jeder Seite begleitet, und „Neuer Termin“ legt einen Kalendereintrag an. Wir schauen uns beide gleich einzeln an.",
    icon: CalendarDays, placement: "bottom",
  },
  {
    selector: '[data-tour="cal-pin"]',
    awaitSelector: '[data-tour="cal-pin"]',
    title: "Anpinnen — dein Kalender immer im Blick",
    body: "Klickst du hier, öffnet sich rechts ein schmales Kalender-Panel mit der heutigen Agenda und einer „Jetzt“-Linie — und bleibt dort sichtbar, egal auf welcher Seite von VINflow du gerade arbeitest. Ein erneuter Klick (oder das Stecknadel-Symbol im Panel) löst es wieder.",
    task: "Klick auf „Anpinnen“, um das Kalender-Panel ein- und wieder auszublenden.",
    icon: Pin, placement: "left",
  },
  {
    selector: '[data-tour="cal-new"]',
    awaitSelector: '[data-tour="cal-new"] button',
    title: "Neuen Termin anlegen",
    body: "Titel, Datum, Von/Bis-Uhrzeit, Typ (Termin, To-Do, Besichtigung, Übergabe, Anruf, Intern, Block), optionaler Ort und eine Beschreibung – in wenigen Sekunden ausgefüllt.",
    task: "Klick auf „Neuer Termin“, um den Dialog zu öffnen.",
    icon: Plus, placement: "left",
  },
  {
    selector: '[data-tour="cal-view-toggle"]',
    awaitSelector: '[data-tour="cal-view-toggle"] button',
    title: "Wochen- oder Tagesansicht",
    body: "Für den vollen Überblick über die Woche bleibst du bei „Woche“. Wird es an einem Tag voll, wechselst du mit „Tag“ auf eine großzügigere Einzeltagesansicht — mit denselben Funktionen.",
    task: "Klick auf „Tag“ oder „Woche“, um die Ansicht zu wechseln.",
    icon: LayoutList, placement: "bottom",
  },
  {
    selector: '[data-tour="cal-nav"]',
    title: "Navigation & Legende",
    body: "Vor- und zurückblättern, mit „Heute“ direkt zum aktuellen Tag springen. Rechts siehst du die Farb-Legende aller Termin-Typen — so erkennst du auf einen Blick, worum es bei einem Eintrag geht.",
    icon: ChevronRight, placement: "bottom",
  },
  {
    selector: '[data-tour="cal-week"]',
    title: "Termine anlegen, verschieben, verändern",
    body: "Ein Klick auf einen leeren Zeitpunkt oder Tages-Header öffnet direkt die Termin-Erfassung mit vorausgefülltem Datum. Bestehende Termine ziehst du per Maus an eine andere Uhrzeit oder einen anderen Tag, am unteren Rand lässt sich die Dauer ziehen.",
    task: "Verschiebe oder skaliere optional einen Eintrag in der Ansicht.",
    icon: CalendarRange, placement: "top",
  },
  {
    selector: '[data-tour="cal-week"]',
    title: "Termine bearbeiten & löschen",
    body: "Ein Klick auf einen bestehenden Termin öffnet ihn zum Bearbeiten — alle Felder wie beim Anlegen, plus ein „Löschen“-Button. Stammt ein Eintrag aus einem To-Do, siehst du einen Hinweis: Änderungen wirken sich dann auch auf das verknüpfte To-Do aus.",
    icon: MousePointerClick, placement: "top",
  },
  {
    title: "Kalender gemeistert!",
    body: "Du kennst jetzt alle Kalender-Funktionen: Anpinnen, neue Termine anlegen, zwischen Wochen- und Tagesansicht wechseln, navigieren und Termine per Drag & Drop verschieben, verändern oder löschen. To-Dos und Vorgangs-Ereignisse mit Datum tauchen automatisch hier auf.",
    icon: Sparkles, placement: "center",
  },
];
