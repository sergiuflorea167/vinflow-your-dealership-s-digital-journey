import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type SearchFieldOption = { key: string; label: string };

export type TopbarSearchConfig = {
  placeholder: string;
  fields: SearchFieldOption[];
  value: string;
  onChange: (value: string) => void;
  field: string;
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
  if (!ctx) throw new Error("TopbarSearchProvider missing");
  return ctx;
};

export const useTopbarSearchConfig = () => useTopbarSearchContext().config;

/**
 * Registriert eine Suchleisten-Konfiguration für die Topbar.
 * Callbacks werden über Refs gehalten, damit wechselnde Inline-Funktionen
 * keinen Render-Loop auslösen.
 */
export const useTopbarSearch = (cfg: TopbarSearchConfig | null) => {
  const { setConfig } = useTopbarSearchContext();

  // Refs für aktuelle Callbacks
  const onChangeRef = useRef(cfg?.onChange);
  const onFieldChangeRef = useRef(cfg?.onFieldChange);
  onChangeRef.current = cfg?.onChange;
  onFieldChangeRef.current = cfg?.onFieldChange;

  const stableOnChange = useCallback((v: string) => onChangeRef.current?.(v), []);
  const stableOnFieldChange = useCallback((f: string) => onFieldChangeRef.current?.(f), []);

  // Nur primitive Werte und Felder-Definition als Dependencies
  const placeholder = cfg?.placeholder;
  const value = cfg?.value;
  const field = cfg?.field;
  const fieldsKey = useMemo(
    () => cfg?.fields.map((f) => `${f.key}:${f.label}`).join("|") ?? "",
    [cfg?.fields],
  );

  useEffect(() => {
    if (!cfg) {
      setConfig(null);
      return;
    }
    setConfig({
      placeholder: placeholder ?? "",
      fields: cfg.fields,
      value: value ?? "",
      field: field ?? "",
      onChange: stableOnChange,
      onFieldChange: stableOnFieldChange,
    });
    return () => setConfig(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeholder, value, field, fieldsKey, stableOnChange, stableOnFieldChange, setConfig]);
};
