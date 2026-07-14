import { WorkshopStep } from "./WorkshopPilot";
import {
  GraduationCap, Target, LayoutDashboard, CalendarDays, CalendarCheck2,
  BarChart3, Workflow, FolderKanban, Sparkles,
} from "lucide-react";

export const DASHBOARD_WORKSHOP_STEPS: WorkshopStep[] = [
  {
    title: "Dashboard-Workshop",
    body: "Wir gehen dein Dashboard jetzt aktiv durch. Bei jedem Schritt darfst du selbst etwas anklicken oder ausprobieren – wie im Live-Betrieb. Mit „Weiter“ überspringst du jede Aufgabe.",
    icon: GraduationCap, placement: "center",
  },
  {
    selector: '[data-tour="dash-hero"]',
    title: "Dein Tages-Überblick",
    body: "Oben siehst du drei Zahlen: aktive Vorgänge, heute fällige To-Dos und heutige Termine. Das ist dein Puls für den Tag.",
    icon: LayoutDashboard, placement: "bottom",
  },
  {
    selector: '[data-tour="dash-goals"]',
    title: "Tagesziele setzen",
    body: "Hier setzt du dir 1–3 konkrete Tagesziele. Bewährt: klein, machbar, abhakbar.",
    task: "Lege ein neues Tagesziel an oder hake ein bestehendes ab.",
    icon: Target, placement: "bottom",
  },
  {
    selector: '[data-tour="dash-events"]',
    title: "Heutige Termine",
    body: "Probefahrten, Übergaben, Anrufe – farbig nach Typ. Über „Kalender öffnen“ kommst du zur Wochenansicht.",
    icon: CalendarDays, placement: "top",
  },
  {
    selector: '[data-tour="dash-todos"]',
    awaitSelector: '[data-tour="dash-todos"] button[role="checkbox"]',
    title: "To-Do abhaken",
    body: "Aufgaben sortiert nach Priorität (rot/gelb/blau). Die Checkbox links hakt sofort ab.",
    task: "Hake ein heute fälliges To-Do per Checkbox ab.",
    icon: CalendarCheck2, placement: "top",
  },
  {
    selector: '[data-tour="dash-kpis"]',
    title: "Deine KPIs",
    body: "Genau die Kennzahlen, die DU sehen willst. Über „KPIs verwalten“ pinnst du jederzeit neue an.",
    task: "Wirf einen Blick auf deine angepinnten KPIs.",
    icon: BarChart3, placement: "top",
  },
  {
    selector: '[data-tour="dash-pipeline"]',
    title: "Pipeline-Übersicht",
    body: "Hier siehst du, in welchem der 8 Vorgangsschritte gerade wie viele Vorgänge stecken. Engpässe erkennst du an hohen Zahlen.",
    task: "Finde den Schritt mit den meisten offenen Vorgängen.",
    icon: Workflow, placement: "top",
  },
  {
    selector: '[data-tour="dash-active"]',
    title: "Aktive Vorgänge",
    body: "Deine letzten 6 laufenden Vorgänge. Ein Klick auf eine Karte führt direkt in den Vorgang.",
    task: "Schau dir die Karten an.",
    icon: FolderKanban, placement: "top",
  },
  {
    title: "Geschafft!",
    body: "Du kennst jetzt alle Bereiche deines Dashboards. Der Workshop ist jederzeit erneut startbar. Viel Erfolg!",
    icon: Sparkles, placement: "center",
  },
];
