import { useInsightsWorkshopStore } from "@/store/insightsWorkshopStore";
import { WorkshopPilot, WorkshopStep } from "./WorkshopPilot";
import {
  GraduationCap, Sparkles, Zap, Layers, Timer, Euro,
  Filter, BarChart3, Copy, CalendarRange,
} from "lucide-react";

const STEPS: WorkshopStep[] = [
  {
    title: "Insight+ Workshop",
    body:
      "Insight+ ist dein freier BI-Builder: Du kombinierst eine Metrik (z. B. Durchlaufzeit, Marge, " +
      "Conversion) mit Stationen im Prozess, einem Zeitraum und Filtern — und bekommst sofort ein " +
      "Ergebnis inkl. Vorperioden-Vergleich, Top-Liste und optionalem Breakdown. " +
      "Wir gehen Schritt für Schritt durch alle Bausteine.",
    icon: GraduationCap, placement: "center",
  },
  {
    selector: '[data-tour="insight-header"]',
    title: "Was ist Insight+?",
    body:
      "Anders als die festen KPI-Karten kannst du hier alles selbst zusammenstellen. Beispiele: " +
      "„Wie lange dauert es vom Bestand bis zur Auftragsbestätigung?“, „Wie hoch ist die Marge nur " +
      "bei Diesel-SUVs?“, „Wie viele Fahrzeuge erreichen Schritt X im laufenden Quartal?“.",
    icon: Sparkles, placement: "bottom",
  },
  {
    selector: '[data-tour="insight-templates"]',
    title: "Schnell-Vorlagen — der einfachste Einstieg",
    body:
      "Ein Klick auf eine Vorlage erzeugt direkt eine fertige Auswertung unten. Perfekt, um zu sehen, " +
      "wie eine sinnvolle Konfiguration aussieht. Du kannst jede Vorlagenkarte später duplizieren und " +
      "anpassen — du musst also nicht bei Null anfangen.",
    task: "Klicke eine Vorlage an — eine neue Karte erscheint im Bereich „Deine Auswertungen“.",
    icon: Zap, placement: "bottom",
  },
  {
    selector: '[data-tour="insight-builder"]',
    title: "Eigene Auswertung bauen — Aufklappen",
    body:
      "Hinter diesem Header liegt der vollständige Builder. Er ist in 4 Schritte gegliedert: " +
      "1) Metrik wählen, 2) Stationen, 3) Zeitraum, 4) Filter & Aufschlüsselung. " +
      "Klicke ihn auf, damit wir die Schritte zusammen durchgehen.",
    task: "Klicke „Eigene Auswertung bauen“ um den Builder zu öffnen.",
    icon: Layers, placement: "top",
  },
  {
    title: "Schritt 1 — Metrik",
    body:
      "Metriken sind in 4 Gruppen sortiert: Zeit & Conversion (Durchlauf, Standzeit, Conversion-Quote), " +
      "Geld & Marge (Umsatz, Marge, GP %, Kosten, Rabatte), Volumen (Anzahl, Ø Preise) und " +
      "Bestands-Qualität (Ø KM, Ø Alter). Halte die Maus über eine Kachel — der Tooltip erklärt sie.",
    icon: Timer, placement: "center",
  },
  {
    title: "Schritt 2 — Stationen",
    body:
      "„Stationen“ sind Punkte im Fahrzeug-Lifecycle: Einkaufsplanung → Bestand → Inseriert → " +
      "die 6 Vorgangs-Schritte. Bei Durchlaufzeit und Conversion brauchst du zwei (Von/Bis), bei den " +
      "meisten anderen Metriken nur eine Ziel-Station.",
    icon: Euro, placement: "center",
  },
  {
    title: "Schritt 3 — Zeitraum",
    body:
      "Wähle einen Zeitraum (Woche, Monat, Quartal, YTD, letzte 30/90/365 Tage oder individuell). " +
      "Insight+ berechnet automatisch die gleichlange Vorperiode und zeigt dir den Trend (▲ / ▼) " +
      "direkt auf der Ergebniskarte.",
    icon: CalendarRange, placement: "center",
  },
  {
    title: "Schritt 4 — Filter & Aufschlüsselung",
    body:
      "Schränke die Datenbasis ein: Fahrzeugtyp, Marke, Status, Kraftstoff, Listenpreis, KM-Stand, " +
      "Baujahr. Mit „Aufschlüsselung nach“ teilst du das Ergebnis zusätzlich in Gruppen (Marke, Typ, " +
      "Status, Kraftstoff oder Monat) — du siehst dann mehrere Mini-Balken pro Gruppe.",
    icon: Filter, placement: "center",
  },
  {
    selector: '[data-tour="insight-results"]',
    title: "Ergebnisse lesen",
    body:
      "Jede Karte zeigt: den Hauptwert groß, Vorperioden-Vergleich (Trend), Anzahl einbezogener " +
      "Fahrzeuge, ggf. Median/Min/Max, Top-Fahrzeuge und — falls aktiviert — den Breakdown als " +
      "Mini-Balken. Über die Karten-Aktionen kannst du eine Auswertung duplizieren oder entfernen.",
    icon: BarChart3, placement: "top",
  },
  {
    title: "Tipp: Duplizieren & variieren",
    body:
      "Der schnellste Workflow: Eine Vorlage als Start nehmen, die Karte duplizieren und nur EINE " +
      "Dimension ändern (z. B. nur den Zeitraum, oder nur den Filter „Marke“). So baust du mit wenigen " +
      "Klicks ein komplettes Vergleichs-Dashboard.",
    icon: Copy, placement: "center",
  },
  {
    title: "Insight+ gemeistert!",
    body:
      "Du kennst jetzt Vorlagen, den 4-Schritte-Builder und das Lesen der Ergebniskarten inkl. " +
      "Vorperioden-Vergleich. Ein guter Einstieg: 2–3 Vorlagen anlegen, eine davon duplizieren und " +
      "die Filter variieren — dann hast du dein erstes eigenes Mini-BI-Dashboard.",
    icon: Sparkles, placement: "center",
  },
];

export const InsightsWorkshop = () => {
  const { active, step, next, prev, stop } = useInsightsWorkshopStore();
  return (
    <WorkshopPilot
      active={active}
      step={step}
      steps={STEPS}
      rootRoute="/insights"
      labelPrefix="Insight+ Workshop"
      next={next}
      prev={prev}
      stop={stop}
    />
  );
};
