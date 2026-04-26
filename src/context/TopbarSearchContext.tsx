import {
  createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";

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
  /** Stable: read the current config (or null). */
  getConfig: () => TopbarSearchConfig | null;
  /** Subscribe for re-renders when the config snapshot changes. */
  subscribe: (cb: () => void) => () => void;
  /** Register/unregister a config from a page. Returns an unregister fn. */
  register: (cfg: TopbarSearchConfig) => () => void;
  /** Bumped on every register/update so consumers can re-render. */
  version: number;
};

const TopbarSearchContext = createContext<Ctx | undefined>(undefined);

export const TopbarSearchProvider = ({ children }: { children: ReactNode }) => {
  const configRef = useRef<TopbarSearchConfig | null>(null);
  const listenersRef = useRef(new Set<() => void>());
  const [version, setVersion] = useState(0);

  const notify = useCallback(() => {
    setVersion((v) => v + 1);
    listenersRef.current.forEach((l) => l());
  }, []);

  const getConfig = useCallback(() => configRef.current, []);
  const subscribe = useCallback((cb: () => void) => {
    listenersRef.current.add(cb);
    return () => listenersRef.current.delete(cb) as unknown as void;
  }, []);

  const register = useCallback(
    (cfg: TopbarSearchConfig) => {
      configRef.current = cfg;
      notify();
      return () => {
        if (configRef.current === cfg) {
          configRef.current = null;
          notify();
        }
      };
    },
    [notify]
  );

  const value = useMemo<Ctx>(
    () => ({ getConfig, subscribe, register, version }),
    [getConfig, subscribe, register, version]
  );

  return <TopbarSearchContext.Provider value={value}>{children}</TopbarSearchContext.Provider>;
};

export const useTopbarSearchContext = () => {
  const ctx = useContext(TopbarSearchContext);
  if (!ctx) throw new Error("useTopbarSearchContext must be used inside TopbarSearchProvider");
  return ctx;
};

/**
 * Page-side hook. Registers a search config once on mount and keeps the live
 * values + callbacks in a mutable ref so updates do NOT cause re-registrations
 * (which would loop the Topbar/Page).
 */
export const useTopbarSearch = (cfg: TopbarSearchConfig | null) => {
  const { register } = useTopbarSearchContext();

  // Always-fresh ref to the latest cfg (updated every render, no effect needed).
  const latestRef = useRef(cfg);
  latestRef.current = cfg;

  // Identity that should trigger re-registration: only structural changes.
  const fieldsKey = cfg?.fields.map((f) => `${f.key}:${f.label}`).join("|") ?? "";
  const placeholder = cfg?.placeholder ?? "";
  const enabled = !!cfg;

  useEffect(() => {
    if (!enabled) return;
    // Stable proxy object — methods/values delegate to the latest ref.
    const proxy: TopbarSearchConfig = {
      get placeholder() { return latestRef.current?.placeholder ?? ""; },
      get fields() { return latestRef.current?.fields ?? []; },
      get value() { return latestRef.current?.value ?? ""; },
      get field() { return latestRef.current?.field ?? ""; },
      onChange: (v) => latestRef.current?.onChange(v),
      onFieldChange: (f) => latestRef.current?.onFieldChange(f),
    };
    return register(proxy);
  }, [enabled, placeholder, fieldsKey, register]);
};
