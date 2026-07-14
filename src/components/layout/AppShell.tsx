import { lazy, ReactNode, Suspense, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useTutorialStore } from "@/store/tutorialStore";
import { useWorkshopStore } from "@/store/workshopStore";
import { useFleetWorkshopStore } from "@/store/fleetWorkshopStore";
import { usePurchaseWorkshopStore } from "@/store/purchaseWorkshopStore";
import { useAuth } from "@/context/AuthContext";

const VincentWidget = lazy(() =>
  import("@/components/vincent/VincentWidget").then((module) => ({ default: module.VincentWidget })),
);
const TutorialPilot = lazy(() =>
  import("@/components/tutorial/TutorialPilot").then((module) => ({ default: module.TutorialPilot })),
);
const DashboardWorkshop = lazy(() =>
  import("@/components/tutorial/DashboardWorkshop").then((module) => ({ default: module.DashboardWorkshop })),
);
const FleetWorkshop = lazy(() =>
  import("@/components/tutorial/FleetWorkshop").then((module) => ({ default: module.FleetWorkshop })),
);
const PurchaseWorkshop = lazy(() =>
  import("@/components/tutorial/PurchaseWorkshop").then((module) => ({ default: module.PurchaseWorkshop })),
);
const TodosWorkshop = lazy(() =>
  import("@/components/tutorial/TodosWorkshop").then((module) => ({ default: module.TodosWorkshop })),
);
const CalendarWorkshop = lazy(() =>
  import("@/components/tutorial/CalendarWorkshop").then((module) => ({ default: module.CalendarWorkshop })),
);
const KpiWorkshop = lazy(() =>
  import("@/components/tutorial/KpiWorkshop").then((module) => ({ default: module.KpiWorkshop })),
);
const InsightsWorkshop = lazy(() =>
  import("@/components/tutorial/InsightsWorkshop").then((module) => ({ default: module.InsightsWorkshop })),
);

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const { completed, active, start } = useTutorialStore();
  const navigate = useNavigate();
  const dashActive = useWorkshopStore((s) => s.active);
  const fleetActive = useFleetWorkshopStore((s) => s.active);
  const dashWasActive = useRef(false);
  const fleetWasActive = useRef(false);

  useEffect(() => {
    if (session && !completed && !active) {
      const t = setTimeout(() => start(), 600);
      return () => clearTimeout(t);
    }
  }, [session, completed, active, start]);

  // Chain: dashboard -> fleet (and optionally onward to purchase)
  useEffect(() => {
    if (dashWasActive.current && !dashActive) {
      const chain = useWorkshopStore.getState().chainNext;
      if (chain === "fleet") {
        useWorkshopStore.setState({ chainNext: null });
        navigate("/bestand");
        setTimeout(() => useFleetWorkshopStore.getState().start({ chainNext: "purchase" }), 200);
      } else if (chain === "purchase") {
        useWorkshopStore.setState({ chainNext: null });
        navigate("/einkaufsplanung");
        setTimeout(() => usePurchaseWorkshopStore.getState().start(), 200);
      }
    }
    dashWasActive.current = dashActive;
  }, [dashActive, navigate]);

  // Chain: fleet -> purchase
  useEffect(() => {
    if (fleetWasActive.current && !fleetActive) {
      const chain = useFleetWorkshopStore.getState().chainNext;
      if (chain === "purchase") {
        useFleetWorkshopStore.setState({ chainNext: null });
        navigate("/einkaufsplanung");
        setTimeout(() => usePurchaseWorkshopStore.getState().start(), 200);
      }
    }
    fleetWasActive.current = fleetActive;
  }, [fleetActive, navigate]);

  return (
    <div className="flex h-dvh bg-background text-foreground overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-dvh overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="max-w-[1400px] mx-auto px-3 py-3 sm:px-6 sm:py-6">{children}</div>
        </main>
      </div>
      <Suspense fallback={null}>
        <VincentWidget />
        <TutorialPilot />
        <DashboardWorkshop />
        <FleetWorkshop />
        <PurchaseWorkshop />
        <TodosWorkshop />
        <CalendarWorkshop />
        <KpiWorkshop />
        <InsightsWorkshop />
      </Suspense>

    </div>
  );
};
