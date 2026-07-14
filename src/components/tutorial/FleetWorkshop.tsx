import { WorkshopStep } from "./WorkshopPilot";
import {
  GraduationCap, Car, BarChart3, Filter, Table2, Megaphone, Plus, FileSpreadsheet, Sparkles,
} from "lucide-react";

export const FLEET_WORKSHOP_STEPS: WorkshopStep[] = [
  {
    title: "Bestand-Workshop",
    body: "Der Bestand ist deine Schaltzentrale für alle Fahrzeuge – VIN-genau, mit Standort, Kosten und Marge. Wir gehen ihn jetzt Schritt für Schritt durch. Du darfst selbst klicken.",
    icon: GraduationCap, placement: "center",
  },
  {
    selector: '[data-tour="fleet-kpis"]',
    title: "KPI-Strip",
    body: "Auf einen Blick: wie viele Fahrzeuge im Bestand, reserviert, verkauft – und wie viele aktiv inseriert sind. Rot bedeutet: nicht inseriert, da liegt Geld auf der Straße.",
    icon: BarChart3, placement: "bottom",
  },
  {
    selector: '[data-tour="fleet-filters"]',
    awaitSelector: '[data-tour="fleet-filters"] button',
    title: "Filter & Status",
    body: "Filtere nach Fahrzeugtyp, Inserats-Status oder Verkaufs-Status. So findest du z. B. „alle SUV im Bestand, die noch nicht online sind“ in 2 Klicks.",
    task: "Klick auf einen der Status-Filter (Bestand, Reserviert, Verkauft).",
    icon: Filter, placement: "bottom",
  },
  {
    selector: '[data-tour="fleet-table"]',
    awaitSelector: '[data-tour="fleet-table"] thead button',
    title: "Sortierbare Tabelle",
    body: "Jede Spalte ist sortierbar (Klick auf den Header). Marge¹ rechnet automatisch: Listenpreis − (Einkauf + Kosten brutto). Lange Standzeiten färben sich gelb.",
    task: "Sortiere die Tabelle nach einer Spalte (z. B. „Marge“ oder „Tage“).",
    icon: Table2, placement: "top",
  },
  {
    selector: '[data-tour="fleet-table"]',
    title: "Inseriert-Schalter",
    body: "In der Spalte „Inseriert“ markierst du per Switch, ob ein Fahrzeug aktiv online ist (mobile.de / AutoScout24 / eigene Website). Schalter aus → automatisches To-Do „Inserat erstellen“.",
    icon: Megaphone, placement: "top",
  },
  {
    selector: '[data-tour="fleet-intake"]',
    awaitSelector: '[data-tour="fleet-intake"]',
    title: "Fahrzeug aufnehmen",
    body: "Über diesen Button startest du eine VIN-basierte Aufnahme. Marke, Modell, Technik werden automatisch ergänzt – du musst nur noch Preis und Fotos pflegen.",
    task: "Klick auf „Fahrzeug aufnehmen“, um den Dialog zu öffnen.",
    icon: Plus, placement: "bottom",
  },
  {
    selector: '[data-tour="fleet-io"]',
    title: "Import & Export",
    body: "Bringe bestehende Bestände per Excel/CSV in Sekunden rein – oder ziehe deinen aktuellen Bestand als Excel für Banken, Versicherungen oder Steuerberater raus.",
    icon: FileSpreadsheet, placement: "bottom",
  },
  {
    title: "Bestand gemeistert!",
    body: "Damit kennst du alles, was du im Bestand täglich brauchst. Wenn du ein Fahrzeug verkaufen willst: Zeile anklicken → Vorgang starten.",
    icon: Sparkles, placement: "center",
  },
];
