import { WorkshopStep } from "./WorkshopPilot";
import {
  GraduationCap, Database, Users, Handshake, Plus, Pencil, Sparkles,
} from "lucide-react";

export const MASTER_WORKSHOP_STEPS: WorkshopStep[] = [
  {
    title: "Stammdaten-Workshop",
    body: "Stammdaten sind die Basis von VINflow: Kunden und Partner, die du einmal anlegst und danach überall im Programm wiederverwendest — ohne etwas doppelt einzutippen. Wir schauen uns beide Bereiche an.",
    icon: GraduationCap, placement: "center",
  },
  {
    selector: '[data-tour="master-header"]',
    title: "Zentrale Datenbasis",
    body: "Hier liegen alle Kunden und externen Partner deines Betriebs — zugänglich für jeden Vorgang, jedes Angebot und jeden Beleg.",
    icon: Database, placement: "bottom",
  },
  {
    selector: '[data-tour="master-tabs"]',
    title: "Zwei Bereiche",
    body: "„Kunden“ zeigt eine Kurzliste mit Angebots- und Vorgangszahl — die volle Kundenverwaltung liegt unter „Vollständige Kundenverwaltung“. „Partner“ sind externe Dienstleister wie Aufbereiter, Werkstatt oder Transport.",
    icon: Handshake, placement: "bottom",
  },
  {
    selector: '[data-tour="master-customers"]',
    title: "Kunden-Kurzliste",
    body: "Auf einen Blick: Kontaktdaten, Anzahl Angebote und laufende Vorgänge pro Kunde. Für Details, neue Kunden oder Bearbeitung geht's über den Button oben rechts zur vollständigen Verwaltung.",
    icon: Users, placement: "top",
  },
  {
    selector: '[data-tour="master-tab-partners"]',
    awaitSelector: '[data-tour="master-tab-partners"]',
    title: "Wechsle zu „Partner“",
    body: "Partner sind externe Dienstleister, die du in Vorgängen verknüpfst — z. B. wer ein Fahrzeug aufbereitet oder zum Kunden transportiert.",
    task: "Klick auf den Reiter „Partner“.",
    icon: Handshake, placement: "bottom",
  },
  {
    selector: '[data-tour="master-partners"]',
    title: "Deine Partner-Liste",
    body: "Typ, Ansprechpartner, Kontakt und Adresse auf einen Blick. Filtere nach Typ (z. B. nur Aufbereiter) oder durchsuche die Liste per Freitext.",
    icon: Handshake, placement: "top",
  },
  {
    selector: '[data-tour="master-create"]',
    awaitSelector: '[data-tour="master-create"]',
    title: "Neuen Partner anlegen",
    body: "Name und Typ genügen zum Start — Kontaktdaten und Adresse kannst du jederzeit ergänzen. Einmal angelegt, steht der Partner in jedem Vorgang zur Auswahl.",
    task: "Klick auf „Neuer Partner“, um das Formular zu sehen.",
    icon: Plus, placement: "left",
  },
  {
    title: "Bearbeiten & löschen",
    body: "Über den Stift-Button änderst du Angaben jederzeit, über den Papierkorb entfernst du einen Partner, den du nicht mehr brauchst.",
    icon: Pencil, placement: "center",
  },
  {
    title: "Stammdaten gemeistert!",
    body: "Kunden und Partner sind jetzt einmal zentral gepflegt — jeder Vorgang, jedes Angebot und jeder Beleg greift automatisch darauf zurück.",
    icon: Sparkles, placement: "center",
  },
];
