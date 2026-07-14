import { WorkshopStep } from "./WorkshopPilot";
import { WORKSHOP_PROCESS_DEMO_VEHICLE_ID, WORKSHOP_PROCESS_DEMO_PROCESS_ID } from "@/data/workshopDemo";
import {
  GraduationCap, Workflow, Layers, Filter, Table2, Archive, FileSignature, FileText, Sparkles,
  Car, Banknote, FileCheck2, ClipboardCheck, Receipt, ScrollText, KeyRound, FolderArchive, Link2,
  ClipboardList, PartyPopper, Zap,
} from "lucide-react";

const VEHICLE_ROUTE = `/bestand/${WORKSHOP_PROCESS_DEMO_VEHICLE_ID}`;
const PROCESS_ROUTE = `/vorgaenge/${WORKSHOP_PROCESS_DEMO_PROCESS_ID}`;

export const PROCESSES_WORKSHOP_STEPS: WorkshopStep[] = [
  // ---------- Teil 1: Überblick über die Vorgänge-Liste ----------
  {
    title: "Vorgänge-Workshop",
    body: "Ein Vorgang entsteht, sobald ein Kunde ein Fahrzeug kauft — von der ersten Anfrage bis zur Übergabe. Hier bündelst du Angebote, aktive Vorgänge, das Archiv und alle erzeugten Belege. Wir schauen uns zuerst die Übersicht an — und legen danach gemeinsam einen kompletten Vorgang an, Schritt für Schritt bis zum Abschluss.",
    icon: GraduationCap, placement: "center",
  },
  {
    selector: '[data-tour="proc-header"]',
    title: "Vier Bereiche, ein Überblick",
    body: "Oben siehst du, wie viele Vorgänge in jedem Bereich stecken. Ein Klick auf eine Vorgangs-Nummer öffnet jederzeit die volle Detail-Ansicht mit allen Schritten.",
    icon: Workflow, placement: "bottom",
  },
  {
    selector: '[data-tour="proc-tabs"]',
    title: "Die vier Reiter",
    body: "„Aktive Vorgänge\" zeigt laufende Verkäufe, „Archivierte Vorgänge\" die abgeschlossenen, „Angebote\" alle versendeten Preisangebote und „Belege-Archiv\" jedes erzeugte PDF-Dokument.",
    icon: Layers, placement: "bottom",
  },
  {
    selector: '[data-tour="proc-filters"]',
    awaitSelector: '[data-tour="proc-filters"] button',
    title: "Sortieren & nach Schritt filtern",
    body: "Sortiere nach Preis, Kunde oder Aktualisierung — und filtere per Klick auf einen Schritt (z. B. „Rechnung\"), um genau zu sehen, wo ein Vorgang gerade steht.",
    task: "Klick auf einen der Filter-Chips, um nur einen Schritt zu sehen.",
    icon: Filter, placement: "bottom",
  },
  {
    selector: '[data-tour="proc-table"]',
    title: "Deine aktiven Vorgänge",
    body: "Jede Zeile zeigt Fahrzeug, Kunde, aktuellen Schritt und Preis. Ein Klick auf die Vorgangs-Nummer führt dich direkt zur Detail-Ansicht, wo du den nächsten Schritt abschließt.",
    icon: Table2, placement: "top",
  },
  {
    title: "Archivierte Vorgänge",
    body: "Sobald der letzte Schritt eines Vorgangs abgeschlossen ist, wandert er automatisch ins Archiv — dein Verkauf ist damit vollständig dokumentiert und bleibt jederzeit auffindbar.",
    icon: Archive, placement: "center",
  },
  {
    title: "Angebote verwalten",
    body: "Im Reiter „Angebote\" siehst du Entwürfe, versendete, angenommene und abgelehnte Angebote inklusive Ablaufdatum. Ein angenommenes Angebot startet mit einem Klick automatisch einen neuen Vorgang — genau das bauen wir jetzt gemeinsam nach.",
    icon: FileSignature, placement: "center",
  },
  {
    title: "Belege-Archiv",
    body: "Jedes erzeugte Dokument — Angebot, Auftragsbestätigung, Rechnung, Kaufvertrag — landet hier gesammelt und lässt sich jederzeit erneut als PDF herunterladen.",
    icon: FileText, placement: "center",
  },

  // ---------- Teil 2: Übergang zum Fahrzeug — Vorgang starten ----------
  {
    title: "Jetzt bauen wir einen Vorgang von Anfang bis Ende",
    body: "Jeder Vorgang beginnt bei einem konkreten Fahrzeug im Bestand. Wir öffnen jetzt ein Demo-Fahrzeug (VW Passat Variant) — hier nichts, was du im echten Bestand siehst, sondern eine sichere Spielwiese. Wir gehen von hier alle sieben Schritte bis zur Übergabe durch, genau wie in der Praxis.",
    icon: Car, placement: "center",
    route: VEHICLE_ROUTE,
  },
  {
    selector: '[data-tour="veh-detail-cta"]',
    title: "Zwei Wege zum Vorgang",
    body: "Oben rechts siehst du Preis und Marge des Fahrzeugs, darunter zwei Aktionen: „Angebot\" erstellt zunächst nur ein Preisangebot, das der Kunde noch annehmen muss (Reiter „Angebote\"). „Direkt verkaufen\" ist der Express-Weg, wenn ihr euch mündlich schon einig seid — er überspringt den Angebots-Schritt und startet den Vorgang sofort bei „Anzahlung\".",
    icon: FileSignature, placement: "bottom",
    route: VEHICLE_ROUTE,
  },
  {
    selector: '[data-tour="veh-detail-cta"]',
    awaitSelector: '[data-tour="veh-detail-direct-sale"]',
    title: "Direkter Verkauf",
    body: "Für unseren Durchlauf nehmen wir den Express-Weg. Das ist der Klick, den du machst, sobald ein Kunde vor Ort zusagt.",
    task: "Klicke auf „Direkt verkaufen\".",
    icon: Zap, placement: "bottom",
    route: VEHICLE_ROUTE,
  },
  {
    selector: '[data-tour="veh-detail-direct-submit"]',
    awaitSelector: '[data-tour="veh-detail-direct-submit"]',
    title: "Kunde & Preis festlegen",
    body: "Wähle einen beliebigen Kunden (im Workshop übernehmen wir danach ohnehin unseren Demo-Kunden) und bestätige oder ändere den Preis. Der Button aktiviert sich erst, sobald beides ausgefüllt ist — genau wie im echten Vorgang.",
    task: "Kunde wählen, Preis prüfen, dann „Vorgang starten\" klicken.",
    icon: Car, placement: "right",
    route: VEHICLE_ROUTE,
  },

  // ---------- Teil 3: Der neue Vorgang — Schritt für Schritt ----------
  {
    selector: '[data-tour="proc-detail-stepper"]',
    title: "Dein Vorgang ist da",
    body: "VF-WORKSHOP-DEMO ist erstellt. „Angebot\" ist bereits grün (übersprungen, weil wir direkt verkauft haben), „Anzahlung\" ist jetzt aktiv. Diese Leiste zeigt dir immer, wo ein Vorgang gerade steht — abgeschlossene Schritte sind grün, der aktuelle blau, spätere gesperrt, bis die vorherigen fertig sind.",
    icon: Workflow, placement: "bottom",
    route: PROCESS_ROUTE,
  },

  // Schritt 1 von 6 (ab hier, da Angebot bereits erledigt): Anzahlung
  {
    selector: '[data-tour="proc-detail-fields"]',
    title: "Schritt „Anzahlung\" — was ein Berater hier prüft",
    body: "Die Anzahlung ist überspringbar, aber wir füllen sie aus, um den vollen Ablauf zu zeigen. Pflicht sind: Anzahlungsbetrag, Zahlungsbedingung & -art. Wichtig: Weiter unten legst du im selben Schritt schon die Zahlungsbedingung & -art für die spätere Restzahlung fest — das spart dir Arbeit bei der Auftragsbestätigung. Erst wenn „Zahlung eingegangen\" angehakt ist, gilt der Schritt als abschlussbereit.",
    task: "Trage einen Anzahlungsbetrag ein, wähle Zahlungsbedingung & -art (Anzahlung UND Restzahlung), hake „Zahlung eingegangen\" an.",
    icon: Banknote, placement: "left",
    route: PROCESS_ROUTE,
  },
  {
    selector: '[data-tour="proc-detail-actions"]',
    awaitSelector: '[data-tour="proc-detail-book"]',
    title: "Buchen fixiert die Angaben",
    body: "„Buchen\" sperrt die Felder — ab jetzt kannst du nur noch über „Buchung lösen\" etwas ändern. Der Button ist erst klickbar, wenn wirklich alle Pflichtfelder korrekt gefüllt sind. Das ist bewusst so streng: Ein gebuchter Beleg soll nicht mehr aus Versehen verändert werden.",
    task: "Klicke „Buchen\".",
    icon: ClipboardCheck, placement: "left",
    route: PROCESS_ROUTE,
  },
  {
    selector: '[data-tour="proc-detail-actions"]',
    awaitSelector: '[data-tour="proc-detail-complete"]',
    title: "Beleg erzeugen & weiter",
    body: "Jetzt wird die Anzahlungsrechnung archiviert (im Belege-Archiv abrufbar) und der Vorgang springt automatisch zum nächsten Schritt — „Auftragsbestätigung\".",
    task: "Klicke „Beleg erzeugen & weiter\".",
    icon: Receipt, placement: "left",
    route: PROCESS_ROUTE,
  },

  // Schritt 2: Auftragsbestätigung
  {
    selector: '[data-tour="proc-detail-fields"]',
    title: "Schritt: Auftragsbestätigung",
    body: "AB-Nummer und Auftragsdatum vergibt VINflow automatisch. Zahlungsbedingung & -art der Restzahlung hast du bereits bei der Anzahlung festgelegt — hier siehst du sie nur noch dokumentiert. Was jetzt wirklich fehlt: der Liefertermin, den du dem Kunden zusagst.",
    task: "Trage einen Liefertermin ein (z. B. in zwei Wochen).",
    icon: FileCheck2, placement: "left",
    route: PROCESS_ROUTE,
  },
  {
    selector: '[data-tour="proc-detail-actions"]',
    awaitSelector: '[data-tour="proc-detail-book"]',
    title: "Auch hier: erst buchen …",
    body: "Genau wie eben — „Buchen\" fixiert AB-Nummer, Auftrags- und Liefertermin.",
    task: "Klicke „Buchen\".",
    icon: ClipboardCheck, placement: "left",
    route: PROCESS_ROUTE,
  },
  {
    selector: '[data-tour="proc-detail-actions"]',
    awaitSelector: '[data-tour="proc-detail-complete"]',
    title: "… dann Beleg erzeugen",
    body: "Die Auftragsbestätigung wird archiviert und an den Kunden gesendet — der Vorgang springt zur „Ausgangskontrolle\".",
    task: "Klicke „Beleg erzeugen & weiter\".",
    icon: Receipt, placement: "left",
    route: PROCESS_ROUTE,
  },

  // Schritt 3: Ausgangskontrolle
  {
    selector: '[data-tour="proc-detail-checklist"]',
    title: "Schritt „Ausgangskontrolle\" — die interne Checkliste",
    body: "Kein Beleg für den Kunden, sondern eine interne Checkliste: Aufbereitung, Schlüssel, vollständige Dokumente, bestätigter Übergabe-Termin. Diese Punkte tauchen automatisch auch unter „To-Dos\" auf — praktisch, wenn Werkstatt und Verkauf getrennt arbeiten. Erst wenn alle Punkte abgehakt sind, lässt sich der Schritt buchen.",
    task: "Hake alle vier Punkte der Checkliste ab.",
    icon: ClipboardList, placement: "left",
    route: PROCESS_ROUTE,
  },
  {
    selector: '[data-tour="proc-detail-actions"]',
    awaitSelector: '[data-tour="proc-detail-book"]',
    title: "Buchen",
    body: "Sobald alle Checklisten-Punkte erledigt sind, ist „Buchen\" klickbar.",
    task: "Klicke „Buchen\".",
    icon: ClipboardCheck, placement: "left",
    route: PROCESS_ROUTE,
  },
  {
    selector: '[data-tour="proc-detail-actions"]',
    awaitSelector: '[data-tour="proc-detail-complete"]',
    title: "Beleg erzeugen & weiter",
    body: "Das Ausgangsprotokoll wird archiviert — weiter geht's mit der Rechnungsstellung.",
    task: "Klicke „Beleg erzeugen & weiter\".",
    icon: Receipt, placement: "left",
    route: PROCESS_ROUTE,
  },

  // Schritt 4: Rechnungsstellung
  {
    selector: '[data-tour="proc-detail-fields"]',
    title: "Schritt: Rechnungsstellung",
    body: "Rechnungsnummer und -datum sind automatisch vergeben, Zahlungsbedingung & -art wurden aus der Auftragsbestätigung übernommen. Bei Firmenkunden (Anrede „Firma\") aktiviert VINflow hier automatisch die E-Rechnung nach § 14 UStG. Übrig bleibt nur eine Bestätigung: Ist die Zahlung eingegangen?",
    task: "Hake „Zahlung eingegangen\" an.",
    icon: Receipt, placement: "left",
    route: PROCESS_ROUTE,
  },
  {
    selector: '[data-tour="proc-detail-actions"]',
    awaitSelector: '[data-tour="proc-detail-book"]',
    title: "Buchen",
    body: "Rechnung fixieren.",
    task: "Klicke „Buchen\".",
    icon: ClipboardCheck, placement: "left",
    route: PROCESS_ROUTE,
  },
  {
    selector: '[data-tour="proc-detail-actions"]',
    awaitSelector: '[data-tour="proc-detail-complete"]',
    title: "Beleg erzeugen & weiter",
    body: "Die Rechnung wird archiviert — weiter geht's mit dem Kaufvertrag.",
    task: "Klicke „Beleg erzeugen & weiter\".",
    icon: Receipt, placement: "left",
    route: PROCESS_ROUTE,
  },

  // Schritt 5: Kaufvertrag
  {
    selector: '[data-tour="proc-detail-fields"]',
    title: "Schritt „Kaufvertrag\" — der rechtlich wichtigste Schritt",
    body: "Vertragsnummer, -datum, Ort und Käufertyp (B2C/B2B) sind schon ausgefüllt. Konsultiere hier deinen inneren Berater: Bei Privatkunden (B2C) gilt gesetzlich 24 Monate Sachmängelhaftung — eine Verkürzung auf 12 Monate ist nur mit einer ausdrücklichen, gesonderten Checkbox-Zustimmung zulässig. Weiter unten kannst du bei Bedarf Unfall/Mängel, eine Garantie, Finanzierung, ein Übergabeprotokoll oder einen Exportverkauf aktivieren — nur einschalten, was wirklich zutrifft, sonst bleibt der Vertrag schlank.",
    task: "Wirf einen Blick auf die Vertragsdaten (alles Pflichtfeld ist schon gültig), dann geht's weiter.",
    icon: ScrollText, placement: "left",
    route: PROCESS_ROUTE,
  },
  {
    selector: '[data-tour="proc-detail-actions"]',
    awaitSelector: '[data-tour="proc-detail-book"]',
    title: "Buchen",
    body: "Kaufvertrag fixieren.",
    task: "Klicke „Buchen\".",
    icon: ClipboardCheck, placement: "left",
    route: PROCESS_ROUTE,
  },
  {
    selector: '[data-tour="proc-detail-actions"]',
    awaitSelector: '[data-tour="proc-detail-complete"]',
    title: "Beleg erzeugen & weiter",
    body: "Der Kaufvertrag wird archiviert — letzter Schritt: die Übergabe.",
    task: "Klicke „Beleg erzeugen & weiter\".",
    icon: Receipt, placement: "left",
    route: PROCESS_ROUTE,
  },

  // Schritt 6: Abhol-/Lieferbestätigung
  {
    selector: '[data-tour="proc-detail-fields"]',
    title: "Letzter Schritt: Übergabe",
    body: "Übergabedatum, -ort, Kilometerstand und die Kundenunterschrift sind Pflicht — die Tankfüllung ist optional. Sobald du diesen Schritt abschließt, markiert VINflow das Fahrzeug automatisch als „verkauft\" und der komplette Vorgang wandert ins Archiv.",
    task: "Trage Übergabedatum, -ort und Kilometerstand ein, hake „Kundenunterschrift vorhanden\" an.",
    icon: KeyRound, placement: "left",
    route: PROCESS_ROUTE,
  },
  {
    selector: '[data-tour="proc-detail-actions"]',
    awaitSelector: '[data-tour="proc-detail-book"]',
    title: "Buchen",
    body: "Übergabedaten fixieren.",
    task: "Klicke „Buchen\".",
    icon: ClipboardCheck, placement: "left",
    route: PROCESS_ROUTE,
  },
  {
    selector: '[data-tour="proc-detail-actions"]',
    awaitSelector: '[data-tour="proc-detail-complete"]',
    title: "Vorgang abschließen",
    body: "Das Übergabeprotokoll wird archiviert, das Fahrzeug auf „verkauft\" gesetzt — dein Vorgang ist komplett durchlaufen, von der ersten Anfrage bis zur Übergabe.",
    task: "Klicke „Beleg erzeugen & abschließen\".",
    icon: Sparkles, placement: "left",
    route: PROCESS_ROUTE,
  },

  // ---------- Teil 4: Was noch dazugehört ----------
  {
    selector: '[data-tour="proc-detail-documents"]',
    title: "Dokumentenablage",
    body: "Zusätzlich zu den automatisch erzeugten Belegen kannst du hier jederzeit weitere Unterlagen ablegen — Fotos vom Zustand, HU-Berichte, Finanzierungsunterlagen — und einzeln fürs Kundenportal freigeben.",
    icon: FolderArchive, placement: "left",
    route: PROCESS_ROUTE,
  },
  {
    selector: '[data-tour="proc-detail-portal"]',
    title: "Kunden-Portal",
    body: "Ein Klick erzeugt einen sicheren, persönlichen Link, den du per E-Mail oder WhatsApp verschickst. Der Kunde sieht darüber jederzeit den Status seines Vorgangs, alle freigegebenen Belege und kann fehlende Unterlagen sogar selbst hochladen — ganz ohne Login. Das erspart dir viele Rückfragen.",
    icon: Link2, placement: "left",
    route: PROCESS_ROUTE,
  },
  {
    selector: '[data-tour="proc-detail-activity"]',
    title: "Vorgangs-Protokoll",
    body: "Jede Aktion — Buchung, Belegerzeugung, Feldänderung — wird hier automatisch protokolliert. Praktisch, wenn du später nachvollziehen willst, wer wann was gemacht hat, oder wenn ein Kollege den Vorgang übernimmt.",
    icon: ClipboardList, placement: "left",
    route: PROCESS_ROUTE,
  },

  {
    title: "Vorgänge gemeistert!",
    body: "Du hast jetzt einen kompletten Vorgang selbst durchgespielt: Fahrzeug öffnen, Verkaufsweg wählen, alle sieben Schritte mit ihren Pflichtfeldern buchen und abschließen, dazu Dokumente, Kundenportal und Protokoll. Genau diese Reihenfolge — inklusive der rechtlichen Stolperfallen beim Kaufvertrag — würde dir sonst ein Berater zeigen. Bei einem echten Vorgang startest du genauso: im Bestand ein Fahrzeug öffnen, Angebot oder Direktverkauf wählen, Schritt für Schritt abarbeiten.",
    icon: PartyPopper, placement: "center",
  },
];
