import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  /**
   * Wenn true, füllt der Inhalt exakt den verfügbaren Viewport (Header bleibt fix,
   * der Content selbst scrollt nicht – ideal für Listen mit interner Scroll-Tabelle).
   * Default false → Seite scrollt normal vertikal.
   */
  fullHeight?: boolean;
}

export const AppShell = ({ children, fullHeight = false }: AppShellProps) => {
  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Topbar />
        <main
          className={cn(
            "flex-1 min-h-0",
            fullHeight ? "overflow-hidden" : "overflow-y-auto",
          )}
        >
          <div
            className={cn(
              "max-w-[1400px] mx-auto px-6 py-6",
              fullHeight ? "h-full flex flex-col min-h-0" : "min-h-full",
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
