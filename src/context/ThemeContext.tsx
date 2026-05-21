import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState, ReactNode } from "react";

export type ThemeId = "slate" | "midnight" | "cloud" | "sand";

export const THEMES: { id: ThemeId; label: string; description: string; swatch: string[] }[] = [
  { id: "slate", label: "Soft Slate", description: "Gedämpftes Grau-Blau, augenfreundlich", swatch: ["#d4dae1", "#eef1f4", "#1f56b8", "#3b82f6"] },
  { id: "midnight", label: "Midnight Indigo", description: "Klassisch dunkel mit Indigo-Akzent", swatch: ["#0d1024", "#181c34", "#4f46e5", "#7c83f5"] },
  { id: "cloud", label: "Cloud White", description: "Helles SaaS, sehr luftig", swatch: ["#fafbfc", "#ffffff", "#3b82f6", "#60a5fa"] },
  { id: "sand", label: "Warm Sand", description: "Warmes Beige mit kühlem Blau", swatch: ["#e6dccb", "#f1ebdc", "#2563c2", "#3b82f6"] },
];

const STORAGE_KEY = "vinflow.theme";
const ALL_CLASSES = THEMES.map((t) => `theme-${t.id}`);

type Ctx = { theme: ThemeId; setTheme: (t: ThemeId) => void };
const ThemeContext = createContext<Ctx | null>(null);

const applyTheme = (id: ThemeId) => {
  const root = document.documentElement;
  ALL_CLASSES.forEach((c) => root.classList.remove(c));
  root.classList.remove("dark");
  root.classList.add(`theme-${id}`);
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "slate";
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    return saved && THEMES.some((t) => t.id === saved) ? saved : "slate";
  });

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemeId) => {
    applyTheme(nextTheme);
    localStorage.setItem(STORAGE_KEY, nextTheme);
    setThemeState(nextTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
