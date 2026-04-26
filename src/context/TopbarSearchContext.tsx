import {
  createContext, ReactNode, useCallback, useContext, useEffect, useRef, useSyncExternalStore,
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

type Store = {
  current: TopbarSearchConfig | null;
  version: number;
  listeners: Set<() => void>;
};

const TopbarSearchContext = createContext<Store | undefined>(undefined);

export const TopbarSearchProvider = ({ children }: { children: ReactNode }) => {
  const storeRef = useRef<Store | null>(null);
  if (storeRef.current === null) {
    storeRef.current = { current: null, version: 0, listeners: new Set() };
  }
  return (
    <TopbarSearchContext.Provider value={storeRef.current}>
      {children}
    </TopbarSearchContext.Provider>
  );
};

const useStore = () => {
  const s = useContext(TopbarSearchContext);
  if (!s) throw new Error("TopbarSearchProvider missing");
  return s;
};

const bump = (s: Store) => {
  s.version += 1;
  s.listeners.forEach((l) => l());
};

/** Topbar hook: subscribes to the store and returns the live config. */
export const useTopbarSearchConfig = (): TopbarSearchConfig | null => {
  const store = useStore();
  const subscribe = useCallback(
    (cb: () => void) => {
      store.listeners.add(cb);
      return () => {
        store.listeners.delete(cb);
      };
    },
    [store]
  );
  // Use the version counter as the snapshot — guarantees a re-render on bump,
  // even when `store.current` keeps its identity.
  const getSnapshot = useCallback(() => store.version, [store]);
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return store.current;
};

/**
 * Page-side hook. Registers a stable proxy whose getters always read the
 * latest cfg from a ref. Calls bump() on every render so the Topbar refreshes.
 */
export const useTopbarSearch = (cfg: TopbarSearchConfig | null) => {
  const store = useStore();

  const latestRef = useRef(cfg);
  latestRef.current = cfg;

  const placeholder = cfg?.placeholder ?? "";
  const fieldsKey = cfg?.fields.map((f) => `${f.key}:${f.label}`).join("|") ?? "";
  const enabled = !!cfg;

  // Register / unregister on mount + structural changes only.
  useEffect(() => {
    if (!enabled) return;
    const proxy: TopbarSearchConfig = {
      get placeholder() { return latestRef.current?.placeholder ?? ""; },
      get fields() { return latestRef.current?.fields ?? []; },
      get value() { return latestRef.current?.value ?? ""; },
      get field() { return latestRef.current?.field ?? ""; },
      onChange: (v) => latestRef.current?.onChange(v),
      onFieldChange: (f) => latestRef.current?.onFieldChange(f),
    };
    store.current = proxy;
    bump(store);
    return () => {
      if (store.current === proxy) {
        store.current = null;
        bump(store);
      }
    };
  }, [enabled, placeholder, fieldsKey, store]);

  // Bump on every page render so controlled input reflects the latest value.
  useEffect(() => {
    if (enabled && store.current) bump(store);
  });
};
