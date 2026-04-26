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
  listeners: Set<() => void>;
};

const createStore = (): Store => ({ current: null, listeners: new Set() });

const TopbarSearchContext = createContext<Store | undefined>(undefined);

export const TopbarSearchProvider = ({ children }: { children: ReactNode }) => {
  // Stable ref-like store — never changes identity, so the Provider value is stable
  // and consumers only re-render via useSyncExternalStore subscriptions.
  const storeRef = useRef<Store | null>(null);
  if (storeRef.current === null) storeRef.current = createStore();
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

const notify = (s: Store) => s.listeners.forEach((l) => l());

/** Topbar uses this to subscribe to config changes. */
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
  const getSnapshot = useCallback(() => store.current, [store]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

/**
 * Page-side hook. Registers a stable proxy whose getters always read the latest
 * cfg from a ref — so per-keystroke updates do NOT re-register or re-render
 * unrelated parts.
 */
export const useTopbarSearch = (cfg: TopbarSearchConfig | null) => {
  const store = useStore();

  const latestRef = useRef(cfg);
  latestRef.current = cfg;

  const placeholder = cfg?.placeholder ?? "";
  const fieldsKey = cfg?.fields.map((f) => `${f.key}:${f.label}`).join("|") ?? "";
  const enabled = !!cfg;

  useEffect(() => {
    if (!enabled) return;
    const makeProxy = (): TopbarSearchConfig => ({
      get placeholder() { return latestRef.current?.placeholder ?? ""; },
      get fields() { return latestRef.current?.fields ?? []; },
      get value() { return latestRef.current?.value ?? ""; },
      get field() { return latestRef.current?.field ?? ""; },
      onChange: (v) => latestRef.current?.onChange(v),
      onFieldChange: (f) => latestRef.current?.onFieldChange(f),
    });
    const proxy = makeProxy();
    store.current = proxy;
    notify(store);
    return () => {
      if (store.current === proxy) {
        store.current = null;
        notify(store);
      }
    };
  }, [enabled, placeholder, fieldsKey, store]);

  // On every page render, replace the snapshot with a fresh wrapper so
  // useSyncExternalStore in the Topbar picks up the new `value`/`field`.
  useEffect(() => {
    if (!enabled || !store.current) return;
    store.current = {
      get placeholder() { return latestRef.current?.placeholder ?? ""; },
      get fields() { return latestRef.current?.fields ?? []; },
      get value() { return latestRef.current?.value ?? ""; },
      get field() { return latestRef.current?.field ?? ""; },
      onChange: (v) => latestRef.current?.onChange(v),
      onFieldChange: (f) => latestRef.current?.onFieldChange(f),
    };
    notify(store);
  });
};
