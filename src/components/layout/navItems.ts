import {
  LayoutDashboard, Workflow, Car, ShoppingCart, ListChecks,
  BarChart3, Settings as SettingsIcon, Database, Sparkles, CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = { to: string; labelKey: string; icon: LucideIcon };
export type NavGroup = { labelKey: string; items: NavItem[] };

export const overview: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
];

export const groups: NavGroup[] = [
  {
    labelKey: "nav.group.daily",
    items: [
      { to: "/bestand",         labelKey: "nav.fleet",      icon: Car },
      { to: "/vorgaenge",       labelKey: "nav.processes",  icon: Workflow },
      { to: "/einkaufsplanung", labelKey: "nav.purchasing", icon: ShoppingCart },
      { to: "/todos",           labelKey: "nav.todos",      icon: ListChecks },
      { to: "/kalender",        labelKey: "nav.calendar",   icon: CalendarDays },
    ],
  },
  {
    labelKey: "nav.group.analytics",
    items: [
      { to: "/kpis",     labelKey: "nav.kpis",     icon: BarChart3 },
      { to: "/insights", labelKey: "nav.insights", icon: Sparkles },
    ],
  },
  {
    labelKey: "nav.group.master",
    items: [
      { to: "/stammdaten", labelKey: "nav.master", icon: Database },
    ],
  },
];

export const settingsItem: NavItem = { to: "/konfiguration", labelKey: "nav.settings", icon: SettingsIcon };

/** Alle Nav-Punkte in einer flachen Liste, für das mobile Menü. */
export const allNavItems: NavItem[] = [
  ...overview,
  ...groups.flatMap((g) => g.items),
  settingsItem,
];

export const tourMap: Record<string, string> = {
  "/": "nav-dashboard",
  "/bestand": "nav-fleet",
  "/vorgaenge": "nav-processes",
  "/einkaufsplanung": "nav-purchasing",
  "/todos": "nav-todos",
  "/kalender": "nav-calendar",
  "/kpis": "nav-kpis",
  "/insights": "nav-insights",
  "/stammdaten": "nav-master",
  "/konfiguration": "nav-settings",
};
