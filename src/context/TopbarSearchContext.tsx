import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

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

export const useTopbarSearch = (cfg: TopbarSearchConfig | null) => {
  const { setConfig } = useTopbarSearchContext();

  useEffect(() => {
    setConfig(cfg);
    return () => setConfig(null);
  }, [cfg, setConfig]);
};
