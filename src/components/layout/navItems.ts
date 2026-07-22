import {
  LayoutDashboard, Workflow, Car, ShoppingCart, ListChecks,
  BarChart3, Settings as SettingsIcon, Database, Sparkles, CalendarDays, FileSignature,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = { to: string; labelKey: string; icon: LucideIcon };
export type NavGroup = { labelKey: string; icon: LucideIcon; items: NavItem[] };
export type NavEntry =
  | { kind: "item"; item: NavItem }
  | { kind: "group"; group: NavGroup };

const navItem = (item: NavItem): NavEntry => ({ kind: "item", item });
const navGroup = (group: NavGroup): NavEntry => ({ kind: "group", group });

/**
 * Reihenfolge der Hauptmenüpunkte, so wie sie in der Sidebar erscheinen:
 * Dashboard, Bestand, Tagesgeschäft (Untermenü), Auswertung (Untermenü),
 * Kalender, Stammdaten.
 */
export const navEntries: NavEntry[] = [
  navItem({ to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard }),
  navItem({ to: "/bestand", labelKey: "nav.fleet", icon: Car }),
  navGroup({
    labelKey: "nav.group.daily",
    icon: Workflow,
    items: [
      { to: "/einkaufsplanung", labelKey: "nav.purchasing", icon: ShoppingCart },
      { to: "/angebote",        labelKey: "nav.offers",     icon: FileSignature },
      { to: "/vorgaenge",       labelKey: "nav.processes",  icon: Workflow },
      { to: "/todos",           labelKey: "nav.todos",      icon: ListChecks },
    ],
  }),
  navGroup({
    labelKey: "nav.group.analytics",
    icon: BarChart3,
    items: [
      { to: "/kpis",     labelKey: "nav.kpis",     icon: BarChart3 },
      { to: "/insights", labelKey: "nav.insights", icon: Sparkles },
    ],
  }),
  navItem({ to: "/kalender", labelKey: "nav.calendar", icon: CalendarDays }),
  navItem({ to: "/stammdaten", labelKey: "nav.master", icon: Database }),
];

export const settingsItem: NavItem = { to: "/konfiguration", labelKey: "nav.settings", icon: SettingsIcon };

/** Alle Nav-Punkte in einer flachen Liste, für das mobile Menü. */
export const allNavItems: NavItem[] = [
  ...navEntries.flatMap((e) => (e.kind === "item" ? [e.item] : e.group.items)),
  settingsItem,
];

export const tourMap: Record<string, string> = {
  "/": "nav-dashboard",
  "/bestand": "nav-fleet",
  "/vorgaenge": "nav-processes",
  "/angebote": "nav-offers",
  "/einkaufsplanung": "nav-purchasing",
  "/todos": "nav-todos",
  "/kalender": "nav-calendar",
  "/kpis": "nav-kpis",
  "/insights": "nav-insights",
  "/stammdaten": "nav-master",
  "/konfiguration": "nav-settings",
};
