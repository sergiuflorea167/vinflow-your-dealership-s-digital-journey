import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Lang = "de" | "en";

interface LanguageState {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      lang: "de",
      setLang: (lang) => set({ lang }),
    }),
    { name: "vinflow-language-v1" }
  )
);
