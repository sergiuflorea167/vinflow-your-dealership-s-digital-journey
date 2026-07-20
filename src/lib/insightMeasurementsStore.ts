// Persistiert Insight+ Auswertungen (localStorage) und hält den BI-Builder
// (src/components/insights/InsightPlusBuilder.tsx) und VINcents Text-Befehle
// (src/lib/vincentInsightCommands.ts) synchron: Legt VINcent eine Karte an, während
// die Insight+ Seite bereits offen ist, erscheint sie dort ohne manuelles Neuladen.

import { STORAGE_KEY, TEMPLATES, type Measurement } from "@/lib/insightEngine";

export const INSIGHT_MEASUREMENTS_EVENT = "insightplus:measurements-changed";

const defaultMeasurements = (): Measurement[] => [
  TEMPLATES[2].build(),
  TEMPLATES[3].build(),
  TEMPLATES[0].build(),
  TEMPLATES[6].build(),
];

export const loadMeasurements = (): Measurement[] => {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Measurement[];
    }
  } catch {
    // ignore corrupted storage
  }
  return defaultMeasurements();
};

export const saveMeasurements = (list: Measurement[]): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore quota errors
  }
};

/**
 * Fügt eine Auswertung außerhalb der Insight+ Seite hinzu (z. B. aus VINcent) und
 * benachrichtigt eine ggf. bereits gemountete InsightPlusBuilder-Instanz.
 */
export const addMeasurementExternally = (measurement: Measurement): Measurement[] => {
  const next = [...loadMeasurements(), measurement];
  saveMeasurements(next);
  window.dispatchEvent(new CustomEvent(INSIGHT_MEASUREMENTS_EVENT));
  return next;
};
