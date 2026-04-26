import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type SearchFieldOption = {
  /** Stable key, used as <Select> value. Use "all" for the default "search everything" option. */
  key: string;
  /** Label shown in the dropdown (e.g. "VIN", "Kunde"). */
  label: string;
};

export type TopbarSearchConfig = {
  /** Placeholder shown in the input. */
  placeholder: string;
  /** Available fields to scope the search to. First entry is treated as default. */
  fields: SearchFieldOption[];
  /** Current search query (controlled by the page). */
  value: string;
  /** Update the page's search query. */
  onChange: (value: string) => void;
  /** Currently selected field key. */
  field: string;
  /** Update the page's selected field. */
  onFieldChange: (field: string) => void;
};

type Ctx = {
  config: TopbarSearchConfig | null;
  setConfig: (cfg: TopbarSearchConfig | null) => void;
};

const TopbarSearchContext = createContext<Ctx | undefined>(undefined);

export const TopbarSearchProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<TopbarSearchConfig | null>(null);
  const value = useMemo(() => ({ config, setConfig }), [config]);
  return <TopbarSearchContext.Provider value={value}>{children}</TopbarSearchContext.Provider>;
};

export const useTopbarSearchContext = () => {
  const ctx = useContext(TopbarSearchContext);
  if (!ctx) throw new Error("useTopbarSearchContext must be used inside TopbarSearchProvider");
  return ctx;
};

/**
 * Page-side hook: registers a search configuration for the topbar.
 * Automatically clears it on unmount, so navigating away resets the topbar.
 */
export const useTopbarSearch = (cfg: TopbarSearchConfig | null) => {
  const { setConfig } = useTopbarSearchContext();

  // Stabilize values that are referenced inside the effect.
  const placeholder = cfg?.placeholder;
  const value = cfg?.value;
  const field = cfg?.field;
  const onChange = cfg?.onChange;
  const onFieldChange = cfg?.onFieldChange;
  const fieldsKey = cfg?.fields.map((f) => `${f.key}:${f.label}`).join("|");

  useEffect(() => {
    if (!cfg) {
      setConfig(null);
      return () => setConfig(null);
    }
    setConfig(cfg);
    return () => setConfig(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeholder, value, field, onChange, onFieldChange, fieldsKey]);
};
