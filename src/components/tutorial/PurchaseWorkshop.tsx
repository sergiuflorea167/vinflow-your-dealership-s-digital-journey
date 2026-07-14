import { WorkshopStep } from "./WorkshopPilot";
import {
  GraduationCap, ShoppingCart, BarChart3, Filter, Table2, Plus, Trophy, Package, Sparkles,
} from "lucide-react";

export const PURCHASE_WORKSHOP_STEPS: WorkshopStep[] = [
  {
    title: "Einkaufsplanung-Workshop",
    body: "Die Einkaufsplanung ist dein Trichter für potenzielle Fahrzeuge – noch bevor sie im Bestand landen. Auktionen, Privatangebote, Händler-Tipps: alles wird hier mit Eckdaten und Notizen festgehalten. Wir gehen das jetzt gemeinsam durch.",
    icon: GraduationCap, placement: "center",
  },
  {
    selector: '[data-tour="pp-header"]',
    title: "Header & Kurzbeschreibung",
    body: "Oben siehst du, worum es geht: schnelle Erfassung möglicher Einkäufe. Rechts liegt der Button, mit dem du einen neuen Einkauf erfasst.",
    icon: ShoppingCart, placement: "bottom",
  },
  {
    selector: '[data-tour="pp-kpis"]',
    title: "Status-Übersicht",
    body: "Auf einen Blick: wie viele Fahrzeuge du verfolgst, welche du gewonnen, übernommen, verloren oder verworfen hast. So weißt du, wo dein Trichter steht.",
    icon: BarChart3, placement: "bottom",
  },
  {
    selector: '[data-tour="pp-filters"]',
    awaitSelector: '[data-tour="pp-filters"] button',
    title: "Sortieren & Filtern",
    body: "Filtere nach Status (z. B. nur „Verfolgen“) oder sortiere nach Zielpreis, Termin oder Quelle. Ideal, um morgens schnell die heißen Deals zu sehen.",
    task: "Klick auf einen Status-Filter (z. B. „Verfolgen“ oder „Deal“).",
    icon: Filter, placement: "bottom",
  },
  {
    selector: '[data-tour="pp-table"]',
    title: "Deine Einkaufs-Pipeline",
    body: "Jede Zeile ist ein potenzieller Einkauf mit Quelle, Zielpreis, letzter Notiz, Termin und Status. Ein Klick auf die Zeile öffnet die Detail-Ansicht mit allen Notizen.",
    icon: Table2, placement: "top",
  },
  {
    selector: '[data-tour="pp-new"]',
    awaitSelector: '[data-tour="pp-new"] button',
    title: "Neuen Einkauf erfassen",
    body: "Über diesen Button erfasst du in unter 30 Sekunden einen neuen potenziellen Einkauf – Marke, Modell, Zielpreis, Quelle und eine erste Notiz. Mehr brauchst du am Anfang nicht.",
    task: "Klick auf „Einkauf erfassen“, um den Dialog zu öffnen.",
    icon: Plus, placement: "left",
  },
  {
    title: "Vom Deal in den Bestand",
    body: "Sobald du den Zuschlag bekommst, setzt du den Status auf „Deal“ (Trophäe). Wenn das Fahrzeug ankommt, übernimmst du es per „In Bestand“ direkt mit allen Eckdaten – kein doppeltes Eintippen.",
    icon: Trophy, placement: "center",
  },
  {
    title: "Einkaufsplanung gemeistert!",
    body: "Du weißt jetzt, wie du potenzielle Einkäufe sauber trackst, Notizen führst und sie nahtlos in den Bestand überführst. Viel Erfolg bei den nächsten Deals!",
    icon: Sparkles, placement: "center",
  },
];
