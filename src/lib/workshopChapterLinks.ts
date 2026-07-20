/**
 * Statische Liste der Workshop-Kapitel (eigene Unterwebseite unter /workshop/*).
 * Wird von VINcent genutzt, um bei "Wie geht X?"-Fragen auf das passende
 * Kapitel zu verweisen — unabhängig vom vollen Registry-Bundle (Icons, Texte),
 * damit der VINcent-Bundle schlank bleibt.
 */
export interface WorkshopChapterLink {
  key: string;
  label: string;
  url: string;
}

export const WORKSHOP_CHAPTER_LINKS: WorkshopChapterLink[] = [
  { key: "dashboard", label: "Dashboard-Workshop", url: "/workshop/dashboard" },
  { key: "fleet", label: "Bestand-Workshop", url: "/workshop/bestand" },
  { key: "processes", label: "Vorgänge-Workshop", url: "/workshop/vorgaenge" },
  { key: "purchase", label: "Einkaufsplanung-Workshop", url: "/workshop/einkaufsplanung" },
  { key: "todos", label: "To-Dos-Workshop", url: "/workshop/todos" },
  { key: "calendar", label: "Kalender-Workshop", url: "/workshop/kalender" },
  { key: "kpis", label: "KPI-Workshop", url: "/workshop/kpis" },
  { key: "insights", label: "Insight+ Workshop", url: "/workshop/insights" },
  { key: "master", label: "Stammdaten-Workshop", url: "/workshop/stammdaten" },
  { key: "settings", label: "Konfigurations-Workshop", url: "/workshop/konfiguration" },
];
