// Globaler Zeitraum-Filter für KPI-Berechnungen.
// Zentral, sodass nicht jede einzelne KPI-Karte einen eigenen Picker braucht.

import { createContext, useContext, useMemo, useState, ReactNode } from "react";

export type KpiRangePreset =
  | "week"
  | "month"
  | "quarter"
  | "ytd"
  | "year"
  | "12m"
  | "all"
  | "custom";

export interface KpiRange {
  from: Date;
  to: Date;
  preset: KpiRangePreset;
  label: string;
}

interface KpiRangeContextValue {
  range: KpiRange;
  setPreset: (p: KpiRangePreset) => void;
  setCustom: (from: Date, to: Date) => void;
}

const KpiRangeCtx = createContext<KpiRangeContextValue | null>(null);

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

export const buildPresetRange = (preset: KpiRangePreset): KpiRange => {
  const now = new Date();
  const to = endOfDay(now);
  let from: Date;
  let label: string;

  switch (preset) {
    case "week": {
      const d = new Date(now);
      const day = (d.getDay() + 6) % 7; // Mo = 0
      d.setDate(d.getDate() - day);
      from = startOfDay(d);
      label = "Diese Woche";
      break;
    }
    case "month":
      from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      label = "Dieser Monat";
      break;
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      from = startOfDay(new Date(now.getFullYear(), q * 3, 1));
      label = `Q${q + 1} ${now.getFullYear()}`;
      break;
    }
    case "ytd":
      from = startOfDay(new Date(now.getFullYear(), 0, 1));
      label = `${now.getFullYear()} (YTD)`;
      break;
    case "year":
      from = startOfDay(new Date(now.getFullYear(), 0, 1));
      label = `${now.getFullYear()}`;
      break;
    case "12m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 12);
      from = startOfDay(d);
      label = "Letzte 12 Monate";
      break;
    }
    case "all":
      from = new Date(2000, 0, 1);
      label = "Gesamter Zeitraum";
      break;
    case "custom":
      from = startOfDay(new Date(now.getFullYear(), 0, 1));
      label = "Benutzerdefiniert";
      break;
  }

  return { from, to, preset, label };
};

export const KpiRangeProvider = ({ children }: { children: ReactNode }) => {
  const [range, setRange] = useState<KpiRange>(() => buildPresetRange("ytd"));

  const value = useMemo<KpiRangeContextValue>(
    () => ({
      range,
      setPreset: (p) => setRange(buildPresetRange(p)),
      setCustom: (from, to) =>
        setRange({
          from: startOfDay(from),
          to: endOfDay(to),
          preset: "custom",
          label: "Benutzerdefiniert",
        }),
    }),
    [range]
  );

  return <KpiRangeCtx.Provider value={value}>{children}</KpiRangeCtx.Provider>;
};

export const useKpiRange = (): KpiRangeContextValue => {
  const ctx = useContext(KpiRangeCtx);
  if (!ctx) {
    // Fallback: liefert YTD, ohne Provider muss nichts crashen
    return {
      range: buildPresetRange("ytd"),
      setPreset: () => {},
      setCustom: () => {},
    };
  }
  return ctx;
};
