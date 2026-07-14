import { WorkshopStep } from "./WorkshopPilot";
import {
  GraduationCap, BarChart3, CalendarRange, Target, Layers,
  Pin, Sparkles, RotateCcw, Workflow,
} from "lucide-react";

export const KPI_WORKSHOP_STEPS: WorkshopStep[] = [
  {
    title: "KPI-Workshop",
    body:
      "KPIs sind deine wichtigsten Kennzahlen — alles wird live aus Bestand, Vorgängen und Kosten berechnet. " +
      "In diesem Workshop lernst du, wie du den richtigen Zeitraum wählst, KPIs nach Kategorien findest, " +
      "Ziele setzt und einzelne Kennzahlen ans Dashboard pinnst, damit du sie täglich im Blick hast.",
    icon: GraduationCap, placement: "center",
  },
  {
    selector: '[data-tour="kpi-header"]',
    title: "Header & Pin-Übersicht",
    body:
      "Links siehst du Titel und Beschreibung. Rechts zeigt der Badge, wie viele KPIs aktuell ans Dashboard " +
      "gepinnt sind. Mit „Standard“ setzt du die Pin-Auswahl auf die empfohlene Konfiguration zurück.",
    icon: BarChart3, placement: "bottom",
  },
  {
    selector: '[data-tour="kpi-range"]',
    title: "Globaler Zeitraum-Filter",
    body:
      "Dieser Picker wirkt auf ALLE zeitabhängigen KPIs gleichzeitig. Wähle z. B. „Dieser Monat“, " +
      "„Quartal“, „YTD“ oder einen individuellen Zeitraum. So vergleichst du immer Äpfel mit Äpfeln — " +
      "die Karten unten rechnen sich automatisch neu.",
    task: "Stelle einen Zeitraum nach Wahl ein (z. B. „Dieser Monat“).",
    icon: CalendarRange, placement: "bottom",
  },
  {
    selector: '[data-tour="kpi-goals"]',
    title: "Ziele & Fortschritt",
    body:
      "Hier definierst du Ziele (z. B. Umsatz, verkaufte Fahrzeuge, Marge). Der Fortschritt wird " +
      "anhand des oben eingestellten Zeitraums automatisch berechnet — perfekt für Monats- oder " +
      "Quartalsziele.",
    icon: Target, placement: "top",
  },
  {
    selector: '[data-tour="kpi-tabs"]',
    title: "Kategorien — wo finde ich was?",
    body:
      "KPIs sind nach Themen sortiert: Umsatz (Top-Line), Verkauf & Marge (Profitabilität), " +
      "Pipeline (Vorgangs-Durchsatz), Kosten (Aufbereitung & Co.) und Bestand (Fahrzeuge, Aging, Mix). " +
      "Die Zahl neben jedem Reiter zeigt, wie viele KPIs er enthält.",
    task: "Klicke dich einmal durch alle Reiter, um den Umfang zu sehen.",
    icon: Layers, placement: "bottom",
  },
  {
    selector: '[data-tour="kpi-grid"]',
    title: "KPI-Karte verstehen",
    body:
      "Jede Karte zeigt einen Wert, eine kurze Beschreibung und — wenn vorhanden — einen Trend oder " +
      "Sub-Wert. Mit dem Pin-Symbol auf der Karte heftest du sie ans Dashboard. Pro KPI gibt es einen " +
      "Tooltip mit Berechnungs-Logik und Interpretations-Hinweis.",
    task: "Pinne eine KPI ans Dashboard, indem du auf das Pin-Symbol klickst.",
    icon: Pin, placement: "top",
  },
  {
    title: "Pipeline & Detail-Visualisierungen",
    body:
      "Im Reiter „Pipeline“ findest du eine Übersicht aller Prozessschritte mit der Anzahl aktiver " +
      "Vorgänge — hohe Zahlen zeigen Engpässe. In „Verkauf & Marge“ siehst du Top-Kunden, in „Kosten“ " +
      "die Kostenverteilung nach Kategorie, in „Bestand“ Fahrzeugtyp-Mix und Aktivitäts-Übersicht.",
    icon: Workflow, placement: "center",
  },
  {
    title: "Insight+ für tiefere Analysen",
    body:
      "Reichen dir die Standard-KPIs nicht? Im Pipeline-Reiter siehst du eine Karte zu Insight+ — " +
      "dem BI-Builder, mit dem du Metrik, Stationen, Zeitraum und Filter frei kombinierst. Im " +
      "nächsten Workshop „Insight+“ gehen wir das gemeinsam durch.",
    icon: Sparkles, placement: "center",
  },
  {
    title: "KPIs gemeistert!",
    body:
      "Du weißt jetzt: Zeitraum global setzen → Kategorie wählen → KPIs pinnen → Ziele definieren. " +
      "Mit „Standard“ kannst du die Pin-Auswahl jederzeit zurücksetzen — keine Sorge vorm Experimentieren.",
    icon: RotateCcw, placement: "center",
  },
];
