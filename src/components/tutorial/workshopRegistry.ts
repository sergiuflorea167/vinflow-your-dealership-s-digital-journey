import {
  LayoutDashboard, Warehouse, Workflow, ShoppingCart, ListTodo,
  CalendarDays, BarChart3, Zap, Database, SlidersHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { WorkshopStep } from "./WorkshopPilot";
import { WorkshopKey, WORKSHOP_ORDER } from "@/store/workshopStore";

import { DASHBOARD_WORKSHOP_STEPS } from "./DashboardWorkshop";
import { FLEET_WORKSHOP_STEPS } from "./FleetWorkshop";
import { PROCESSES_WORKSHOP_STEPS } from "./ProcessesWorkshop";
import { PURCHASE_WORKSHOP_STEPS } from "./PurchaseWorkshop";
import { TODOS_WORKSHOP_STEPS } from "./TodosWorkshop";
import { CALENDAR_WORKSHOP_STEPS } from "./CalendarWorkshop";
import { KPI_WORKSHOP_STEPS } from "./KpiWorkshop";
import { INSIGHTS_WORKSHOP_STEPS } from "./InsightsWorkshop";
import { MASTER_WORKSHOP_STEPS } from "./MasterWorkshop";
import { SETTINGS_WORKSHOP_STEPS } from "./SettingsWorkshop";

export interface WorkshopDef {
  key: WorkshopKey;
  icon: LucideIcon;
  title: string;
  desc: string;
  route: string;
  labelPrefix: string;
  steps: WorkshopStep[];
}

/** Ein Eintrag pro Sidebar-Menüpunkt — Reihenfolge folgt WORKSHOP_ORDER. */
export const WORKSHOP_REGISTRY: Record<WorkshopKey, WorkshopDef> = {
  dashboard: {
    key: "dashboard", icon: LayoutDashboard, title: "Dashboard-Workshop",
    desc: "Tages-Überblick, Ziele, Termine, To-Dos, KPIs und Pipeline lesen.",
    route: "/workshop/dashboard", labelPrefix: "Dashboard-Workshop", steps: DASHBOARD_WORKSHOP_STEPS,
  },
  fleet: {
    key: "fleet", icon: Warehouse, title: "Bestand-Workshop",
    desc: "Filter, Sortierung, Aufnahme und Import-Funktionen im Bestand.",
    route: "/workshop/bestand", labelPrefix: "Bestand-Workshop", steps: FLEET_WORKSHOP_STEPS,
  },
  processes: {
    key: "processes", icon: Workflow, title: "Vorgänge-Workshop",
    desc: "Vom Fahrzeug bis zur Übergabe: einen kompletten Vorgang selbst anlegen und jeden Schritt durchspielen.",
    route: "/workshop/vorgaenge", labelPrefix: "Vorgänge-Workshop", steps: PROCESSES_WORKSHOP_STEPS,
  },
  purchase: {
    key: "purchase", icon: ShoppingCart, title: "Einkaufsplanung-Workshop",
    desc: "Potenzielle Einkäufe tracken, Notizen führen, in den Bestand überführen.",
    route: "/workshop/einkaufsplanung", labelPrefix: "Einkauf-Workshop", steps: PURCHASE_WORKSHOP_STEPS,
  },
  todos: {
    key: "todos", icon: ListTodo, title: "To-Dos-Workshop",
    desc: "Aufgaben filtern, anlegen und automatische Vorgangs-Aufgaben verwalten.",
    route: "/workshop/todos", labelPrefix: "To-Dos-Workshop", steps: TODOS_WORKSHOP_STEPS,
  },
  calendar: {
    key: "calendar", icon: CalendarDays, title: "Kalender-Workshop",
    desc: "Wochenansicht, Navigation und Termine per Drag & Drop.",
    route: "/workshop/kalender", labelPrefix: "Kalender-Workshop", steps: CALENDAR_WORKSHOP_STEPS,
  },
  kpis: {
    key: "kpis", icon: BarChart3, title: "KPI-Workshop",
    desc: "Kennzahlen, Zeitraum-Filter, Ziele, Pinnen und Pipeline-Übersicht meistern.",
    route: "/workshop/kpis", labelPrefix: "KPI-Workshop", steps: KPI_WORKSHOP_STEPS,
  },
  insights: {
    key: "insights", icon: Zap, title: "Insight+ Workshop",
    desc: "BI-Builder verstehen: Metrik, Stationen, Zeitraum, Filter & Breakdown.",
    route: "/workshop/insights", labelPrefix: "Insight+ Workshop", steps: INSIGHTS_WORKSHOP_STEPS,
  },
  master: {
    key: "master", icon: Database, title: "Stammdaten-Workshop",
    desc: "Kunden und Partner zentral anlegen und verwalten.",
    route: "/workshop/stammdaten", labelPrefix: "Stammdaten-Workshop", steps: MASTER_WORKSHOP_STEPS,
  },
  settings: {
    key: "settings", icon: SlidersHorizontal, title: "Konfigurations-Workshop",
    desc: "Vorgangskette, Nummernkreise, To-Do-Fokus und Layoutdesigner kennenlernen.",
    route: "/workshop/konfiguration", labelPrefix: "Konfigurations-Workshop", steps: SETTINGS_WORKSHOP_STEPS,
  },
};

export const WORKSHOP_LIST: WorkshopDef[] = WORKSHOP_ORDER.map((k) => WORKSHOP_REGISTRY[k]);
