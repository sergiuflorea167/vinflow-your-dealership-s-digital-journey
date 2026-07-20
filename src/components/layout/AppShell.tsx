import { lazy, ReactNode, Suspense, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { MobileHeader } from "./MobileHeader";
import { PageSearchBar } from "./PageSearchBar";
import { useTutorialStore } from "@/store/tutorialStore";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { VincentLauncher } from "@/components/vincent/VincentLauncher";
import { useCalendarPanelStore } from "@/store/calendarPanelStore";
import { useWorkshopMode } from "@/context/WorkshopModeContext";
import { WorkshopChrome } from "@/components/workshop/WorkshopChrome";

const VincentWidget = lazy(() =>
  import("@/components/vincent/VincentWidget").then((module) => ({ default: module.VincentWidget })),
);
const TutorialPilot = lazy(() =>
  import("@/components/tutorial/TutorialPilot").then((module) => ({ default: module.TutorialPilot })),
);
const WorkshopRunner = lazy(() =>
  import("@/components/tutorial/WorkshopRunner").then((module) => ({ default: module.WorkshopRunner })),
);
const PinnedCalendarPanel = lazy(() =>
  import("@/components/calendar/PinnedCalendarPanel").then((module) => ({ default: module.PinnedCalendarPanel })),
);

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const { completed, active, start } = useTutorialStore();
  const isMobile = useIsMobile();
  const calendarPinned = useCalendarPanelStore((s) => s.pinned);
  const inWorkshop = useWorkshopMode();

  useEffect(() => {
    // Tour & Workshops sind für die Desktop-Bedienung konzipiert (Coach-Marks
    // zeigen auf Sidebar-Elemente, Tabellen-Interaktionen etc.) und werden auf
    // dem Handy bewusst nicht angeboten. Die Workshop-Unterwebseite hat ihre
    // eigene Führung, daher startet die Live-System-Ersteinführung dort nie.
    if (session && !completed && !active && !isMobile && !inWorkshop) {
      const t = setTimeout(() => start(), 600);
      return () => clearTimeout(t);
    }
  }, [session, completed, active, start, isMobile, inWorkshop]);

  if (inWorkshop) {
    return (
      <div className="flex flex-col h-dvh bg-background text-foreground overflow-hidden">
        <WorkshopChrome />
        <main className="flex-1 overflow-y-auto pb-6">
          <div className="max-w-[1400px] mx-auto px-3 py-3 sm:px-6 sm:py-6">{children}</div>
        </main>
        <VincentLauncher />
        <Suspense fallback={null}>
          <VincentWidget />
          {!isMobile && <WorkshopRunner />}
        </Suspense>
      </div>
    );
  }

  return (
    <div className="flex h-dvh bg-background text-foreground overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-dvh overflow-hidden">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto pb-6">
          <div className="max-w-[1400px] mx-auto px-3 py-3 sm:px-6 sm:py-6">
            <PageSearchBar />
            {children}
          </div>
        </main>
      </div>
      {!isMobile && calendarPinned && (
        <Suspense fallback={null}>
          <PinnedCalendarPanel />
        </Suspense>
      )}
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
