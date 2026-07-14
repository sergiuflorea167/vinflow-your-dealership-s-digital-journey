import { WorkshopStep } from "./WorkshopPilot";
import {
  GraduationCap, SettingsIcon, Workflow, Hash, Gauge, LayoutTemplate, Sparkles,
} from "lucide-react";

export const SETTINGS_WORKSHOP_STEPS: WorkshopStep[] = [
  {
    title: "Konfigurations-Workshop",
    body: "Hier stellst du VINflow auf deinen Betrieb ein: welche Belege ein Vorgang durchläuft, wie Belegnummern aussehen, worauf sich dein persönlicher To-Do-Fokus richtet und wie deine PDFs aussehen. Wir schauen uns alle vier Bereiche an — nichts wird dabei automatisch geändert.",
    icon: GraduationCap, placement: "center",
  },
  {
    selector: '[data-tour="cfg-header"]',
    title: "Vier Bereiche",
    body: "Alle Systemeinstellungen sind hier gebündelt und wirken sofort für alle Nutzer deiner Organisation.",
    icon: SettingsIcon, placement: "bottom",
  },
  {
    selector: '[data-tour="cfg-tabs"]',
    title: "Die vier Reiter",
    body: "Vorgangskette, Nummernkreise, To-Do-Fokus und Layoutdesigner — jeder Reiter regelt einen eigenen Bereich, unabhängig von den anderen.",
    icon: Workflow, placement: "bottom",
  },
  {
    selector: '[data-tour="cfg-process"]',
    title: "Vorgangskette konfigurieren",
    body: "Wähle, welche Belege ein Verkauf durchläuft — z. B. ob Anzahlung oder Auftragsbestätigung genutzt werden. Deaktivierte Belege werden bei neuen Vorgängen automatisch übersprungen. Mit „Standard“ setzt du jederzeit alles zurück.",
    icon: Workflow, placement: "top",
  },
  {
    title: "Nummernkreise",
    body: "Lege Präfix, Startnummer und Ziffernanzahl für Rechnungen, Anzahlungen, Auftragsbestätigungen und Kaufverträge fest — z. B. „RE-2026-0001“. So passen deine Belegnummern zu deiner bestehenden Buchhaltung.",
    icon: Hash, placement: "center",
  },
  {
    title: "To-Do-Fokus",
    body: "Bestimme, welcher Zeitraum standardmäßig für deinen persönlichen Erledigungs-Fortschritt bei den To-Dos verwendet wird — Tag, Woche, Monat oder alle. Auf der To-Do-Seite selbst kannst du das jederzeit spontan umschalten.",
    icon: Gauge, placement: "center",
  },
  {
    title: "Layoutdesigner",
    body: "Passe Logo, Akzentfarbe, Kopf- und Fußzeile sowie Tabellenaufbau deiner PDF-Belege frei an — mit Live-Vorschau auf der rechten Seite. Änderungen werden erst mit „Speichern“ übernommen, du kannst also gefahrlos ausprobieren.",
    icon: LayoutTemplate, placement: "center",
  },
  {
    title: "Konfiguration gemeistert!",
    body: "Du kennst jetzt alle vier Bereiche. Am wichtigsten für den Start: einmal die Vorgangskette auf deinen Prozess abstimmen — der Rest lässt sich jederzeit später anpassen.",
    icon: Sparkles, placement: "center",
  },
];
