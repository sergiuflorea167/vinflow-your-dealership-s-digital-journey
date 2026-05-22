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
const normalizeTheme = (value: string | null): ThemeId => {
  if (value === "dark") return "midnight";
  return value && THEMES.some((t) => t.id === value) ? (value as ThemeId) : "slate";
};

const THEME_VARIABLES: Record<ThemeId, Record<string, string>> = {
  slate: {
    background: "215 18% 86%", foreground: "222 28% 20%", card: "214 22% 93%", "card-foreground": "222 28% 20%", popover: "214 22% 93%", "popover-foreground": "222 28% 20%", "surface-elevated": "214 18% 88%", "surface-muted": "215 16% 84%", primary: "215 74% 46%", "primary-foreground": "0 0% 100%", "primary-glow": "212 78% 56%", secondary: "215 16% 82%", "secondary-foreground": "222 28% 20%", muted: "215 16% 84%", "muted-foreground": "215 22% 24%", accent: "215 74% 46%", "accent-foreground": "0 0% 100%", destructive: "0 65% 48%", "destructive-foreground": "0 0% 100%", success: "152 55% 36%", "success-foreground": "0 0% 100%", warning: "32 90% 48%", "warning-foreground": "0 0% 100%", info: "199 80% 42%", "info-foreground": "0 0% 100%", border: "215 14% 74%", input: "215 14% 74%", ring: "215 74% 46%", "sidebar-background": "215 18% 80%", "sidebar-foreground": "222 28% 22%", "sidebar-primary": "215 74% 46%", "sidebar-primary-foreground": "0 0% 100%", "sidebar-accent": "215 16% 75%", "sidebar-accent-foreground": "222 28% 20%", "sidebar-border": "215 14% 70%", "sidebar-ring": "215 74% 46%",
  },
  midnight: {
    background: "230 35% 7%", foreground: "220 20% 92%", card: "230 30% 11%", "card-foreground": "220 20% 92%", popover: "230 30% 11%", "popover-foreground": "220 20% 92%", "surface-elevated": "230 28% 14%", "surface-muted": "230 24% 16%", primary: "243 75% 62%", "primary-foreground": "0 0% 100%", "primary-glow": "235 85% 70%", secondary: "230 24% 18%", "secondary-foreground": "220 20% 92%", muted: "230 22% 16%", "muted-foreground": "220 14% 65%", accent: "243 75% 62%", "accent-foreground": "0 0% 100%", destructive: "0 70% 55%", "destructive-foreground": "0 0% 100%", success: "152 60% 42%", "success-foreground": "0 0% 100%", warning: "32 90% 55%", "warning-foreground": "0 0% 100%", info: "199 85% 55%", "info-foreground": "0 0% 100%", border: "230 22% 20%", input: "230 22% 20%", ring: "243 75% 62%", "sidebar-background": "232 32% 9%", "sidebar-foreground": "220 18% 88%", "sidebar-primary": "243 75% 62%", "sidebar-primary-foreground": "0 0% 100%", "sidebar-accent": "230 26% 16%", "sidebar-accent-foreground": "220 18% 92%", "sidebar-border": "230 22% 18%", "sidebar-ring": "243 75% 62%",
  },
  cloud: {
    background: "220 17% 98%", foreground: "222 30% 14%", card: "0 0% 100%", "card-foreground": "222 30% 14%", popover: "0 0% 100%", "popover-foreground": "222 30% 14%", "surface-elevated": "0 0% 100%", "surface-muted": "214 22% 95%", primary: "217 91% 60%", "primary-foreground": "0 0% 100%", "primary-glow": "213 94% 68%", secondary: "214 22% 95%", "secondary-foreground": "222 30% 14%", muted: "214 22% 95%", "muted-foreground": "215 22% 26%", accent: "217 91% 60%", "accent-foreground": "0 0% 100%", destructive: "0 72% 51%", "destructive-foreground": "0 0% 100%", success: "152 60% 40%", "success-foreground": "0 0% 100%", warning: "32 95% 50%", "warning-foreground": "0 0% 100%", info: "199 85% 48%", "info-foreground": "0 0% 100%", border: "214 22% 90%", input: "214 22% 90%", ring: "217 91% 60%", "sidebar-background": "214 22% 96%", "sidebar-foreground": "222 30% 18%", "sidebar-primary": "217 91% 60%", "sidebar-primary-foreground": "0 0% 100%", "sidebar-accent": "214 22% 92%", "sidebar-accent-foreground": "222 30% 14%", "sidebar-border": "214 22% 88%", "sidebar-ring": "217 91% 60%",
  },
  sand: {
    background: "36 25% 90%", foreground: "28 22% 18%", card: "36 30% 94%", "card-foreground": "28 22% 18%", popover: "36 30% 94%", "popover-foreground": "28 22% 18%", "surface-elevated": "36 28% 92%", "surface-muted": "35 20% 86%", primary: "215 70% 48%", "primary-foreground": "0 0% 100%", "primary-glow": "212 78% 58%", secondary: "35 22% 84%", "secondary-foreground": "28 22% 18%", muted: "35 22% 86%", "muted-foreground": "28 22% 22%", accent: "215 70% 48%", "accent-foreground": "0 0% 100%", destructive: "0 65% 48%", "destructive-foreground": "0 0% 100%", success: "152 50% 36%", "success-foreground": "0 0% 100%", warning: "32 90% 46%", "warning-foreground": "0 0% 100%", info: "199 75% 42%", "info-foreground": "0 0% 100%", border: "34 18% 76%", input: "34 18% 76%", ring: "215 70% 48%", "sidebar-background": "36 22% 84%", "sidebar-foreground": "28 22% 20%", "sidebar-primary": "215 70% 48%", "sidebar-primary-foreground": "0 0% 100%", "sidebar-accent": "35 20% 78%", "sidebar-accent-foreground": "28 22% 18%", "sidebar-border": "34 18% 72%", "sidebar-ring": "215 70% 48%",
  },
};

const THEME_APPEARANCE: Record<ThemeId, Record<string, string>> = {
  slate: {
    "gradient-brand": "linear-gradient(135deg, hsl(215 74% 46%), hsl(212 78% 56%))",
    "gradient-surface": "linear-gradient(180deg, hsl(214 22% 93%), hsl(215 18% 86%))",
    "gradient-glow": "radial-gradient(circle at 50% 0%, hsl(215 74% 46% / 0.08), transparent 60%)",
    "shadow-elegant": "0 10px 34px -14px hsl(215 74% 46% / 0.18)",
    "shadow-card": "0 1px 3px 0 hsl(222 28% 20% / 0.10), 0 1px 2px -1px hsl(222 28% 20% / 0.07)",
    "shadow-glow": "0 0 22px hsl(212 78% 56% / 0.18)",
  },
  midnight: {
    "gradient-brand": "linear-gradient(135deg, hsl(243 75% 62%), hsl(235 85% 70%))",
    "gradient-surface": "linear-gradient(180deg, hsl(230 30% 11%), hsl(230 35% 7%))",
    "gradient-glow": "radial-gradient(circle at 50% 0%, hsl(243 75% 62% / 0.18), transparent 60%)",
    "shadow-elegant": "0 14px 40px -14px hsl(243 75% 62% / 0.35)",
    "shadow-card": "0 1px 3px 0 hsl(0 0% 0% / 0.45), 0 1px 2px -1px hsl(0 0% 0% / 0.30)",
    "shadow-glow": "0 0 28px hsl(235 85% 70% / 0.30)",
  },
  cloud: {
    "gradient-brand": "linear-gradient(135deg, hsl(217 91% 60%), hsl(213 94% 68%))",
    "gradient-surface": "linear-gradient(180deg, hsl(0 0% 100%), hsl(220 17% 98%))",
    "gradient-glow": "radial-gradient(circle at 50% 0%, hsl(217 91% 60% / 0.10), transparent 60%)",
    "shadow-elegant": "0 10px 34px -14px hsl(217 91% 60% / 0.25)",
    "shadow-card": "0 1px 3px 0 hsl(222 30% 14% / 0.08), 0 1px 2px -1px hsl(222 30% 14% / 0.05)",
    "shadow-glow": "0 0 22px hsl(213 94% 68% / 0.20)",
  },
  sand: {
    "gradient-brand": "linear-gradient(135deg, hsl(215 70% 48%), hsl(212 78% 58%))",
    "gradient-surface": "linear-gradient(180deg, hsl(36 30% 94%), hsl(36 25% 90%))",
    "gradient-glow": "radial-gradient(circle at 50% 0%, hsl(215 70% 48% / 0.10), transparent 60%)",
    "shadow-elegant": "0 10px 34px -14px hsl(215 70% 48% / 0.20)",
    "shadow-card": "0 1px 3px 0 hsl(28 22% 18% / 0.10), 0 1px 2px -1px hsl(28 22% 18% / 0.07)",
    "shadow-glow": "0 0 22px hsl(212 78% 58% / 0.18)",
  },
};

type Ctx = { theme: ThemeId; setTheme: (t: ThemeId) => void };
const ThemeContext = createContext<Ctx | null>(null);

const applyTheme = (id: ThemeId) => {
  const root = document.documentElement;
  ALL_CLASSES.forEach((c) => root.classList.remove(c));
  root.classList.remove("dark");
  root.classList.add(`theme-${id}`);
  Object.entries({ ...THEME_VARIABLES[id], ...THEME_APPEARANCE[id] }).forEach(([name, value]) => {
    root.style.setProperty(`--${name}`, value);
  });
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "slate";
    return normalizeTheme(localStorage.getItem(STORAGE_KEY));
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
