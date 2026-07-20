import { NavLink } from "react-router-dom";
import { MobileNavMenu } from "./MobileNavMenu";

/**
 * Schlanke mobile Kopfzeile — ersetzt die alte Topbar auf kleinen Bildschirmen.
 * Zeigt nur Logo und das Menü-Icon; alles andere (Profil, Sprache, Achievements,
 * Workshop …) liegt jetzt im Konto-Menü am Ende des aufklappbaren Nav-Sheets.
 */
export const MobileHeader = () => (
  <header className="md:hidden flex items-center gap-2 h-14 px-3 shrink-0 border-b border-border/60 bg-card/60 backdrop-blur-md">
    <MobileNavMenu />
    <NavLink to="/" className="flex items-center gap-2 min-w-0">
      <img src="/favicon.png" alt="VINflow Logo" className="size-7 object-contain shrink-0" />
      <span className="font-display font-bold text-sm text-foreground tracking-tight truncate">VINflow</span>
    </NavLink>
  </header>
);
