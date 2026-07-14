import { lazy, ReactNode, Suspense, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useTutorialStore } from "@/store/tutorialStore";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { VincentLauncher } from "@/components/vincent/VincentLauncher";

const VincentWidget = lazy(() =>
  import("@/components/vincent/VincentWidget").then((module) => ({ default: module.VincentWidget })),
);
const TutorialPilot = lazy(() =>
  import("@/components/tutorial/TutorialPilot").then((module) => ({ default: module.TutorialPilot })),
);
const WorkshopRunner = lazy(() =>
  import("@/components/tutorial/WorkshopRunner").then((module) => ({ default: module.WorkshopRunner })),
);

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const { completed, active, start } = useTutorialStore();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Tour & Workshops sind für die Desktop-Bedienung konzipiert (Coach-Marks
    // zeigen auf Sidebar-Elemente, Tabellen-Interaktionen etc.) und werden auf
    // dem Handy bewusst nicht angeboten.
    if (session && !completed && !active && !isMobile) {
      const t = setTimeout(() => start(), 600);
      return () => clearTimeout(t);
    }
  }, [session, completed, active, start, isMobile]);

  return (
    <div className="flex h-dvh bg-background text-foreground overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-dvh overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-6">
          <div className="max-w-[1400px] mx-auto px-3 py-3 sm:px-6 sm:py-6">{children}</div>
        </main>
      </div>
      <VincentLauncher />
      <Suspense fallback={null}>
        <VincentWidget />
        {!isMobile && (
          <>
            <TutorialPilot />
            <WorkshopRunner />
          </>
        )}
      </Suspense>

    </div>
  );
};
