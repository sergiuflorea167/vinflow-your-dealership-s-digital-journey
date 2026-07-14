import { WorkshopStep } from "./WorkshopPilot";
import {
  GraduationCap, ListTodo, BarChart3, Filter, Table2, Plus, CheckCircle2, Sparkles,
} from "lucide-react";

export const TODOS_WORKSHOP_STEPS: WorkshopStep[] = [
  {
    title: "To-Dos-Workshop",
    body: "Die To-Do-Liste bündelt alle eigenständigen Aufgaben – plus automatisch gespiegelte Aufgaben aus Vorgängen (z. B. Auftragsbestätigung & Ausgangskontrolle). Wir schauen sie uns gemeinsam an.",
    icon: GraduationCap, placement: "center",
  },
  {
    selector: '[data-tour="tt-header"]',
    title: "Header & neues To-Do",
    body: "Oben links die Übersicht, oben rechts der Button für ein neues To-Do – schnell und unkompliziert.",
    icon: ListTodo, placement: "bottom",
  },
  {
    selector: '[data-tour="tt-kpis"]',
    title: "Status auf einen Blick",
    body: "Offen, heute fällig, überfällig, erledigt – so weißt du sofort, wo du stehst und worauf du dich heute konzentrieren musst.",
    icon: BarChart3, placement: "bottom",
  },
  {
    selector: '[data-tour="tt-filters"]',
    awaitSelector: '[data-tour="tt-filters"] button',
    title: "Filtern & sortieren",
    body: "Filter nach Bereich, Priorität oder Fälligkeit. Die Schnellfilter rechts (Offen / Heute / Überfällig / Erledigt) sind dein Daily-Driver.",
    task: "Klick auf einen Schnellfilter (z. B. „Heute“ oder „Überfällig“).",
    icon: Filter, placement: "bottom",
  },
  {
    selector: '[data-tour="tt-table"]',
    title: "Deine Aufgaben-Liste",
    body: "Jede Zeile zeigt Titel, Bereich, Priorität, Fälligkeit, Zuständigen, Bezug zu Fahrzeug/Vorgang und Status. Spalten sind sortierbar – klick auf den Spaltenkopf.",
    icon: Table2, placement: "top",
  },
  {
    selector: '[data-tour="tt-new"]',
    awaitSelector: '[data-tour="tt-new"] button',
    title: "Neues To-Do anlegen",
    body: "Mit dem Button rechts oben legst du in Sekunden ein neues To-Do an – mit Titel, Priorität, Fälligkeit und optionalem Fahrzeug-/Vorgangs-Bezug.",
    task: "Klick auf „Neues To-Do“, um den Dialog zu öffnen.",
    icon: Plus, placement: "left",
  },
  {
    title: "Aufgaben aus Vorgängen",
    body: "Vorgangs-Aufgaben (z. B. Auftragsbestätigung & Ausgangskontrolle) erscheinen hier automatisch – Häkchen setzen aktualisiert den Vorgang direkt. Keine doppelte Pflege.",
    icon: CheckCircle2, placement: "center",
  },
  {
    title: "To-Dos gemeistert!",
    body: "Du kennst jetzt Filter, Sortierung, Schnellanlage und die automatische Spiegelung aus Vorgängen. Damit verlierst du keine Aufgabe mehr aus dem Blick.",
    icon: Sparkles, placement: "center",
  },
];
