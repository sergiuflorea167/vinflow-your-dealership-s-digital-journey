import { ReactNode, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { VincentWidget } from "@/components/vincent/VincentWidget";
import { TutorialPilot } from "@/components/tutorial/TutorialPilot";
import { DashboardWorkshop } from "@/components/tutorial/DashboardWorkshop";
import { FleetWorkshop } from "@/components/tutorial/FleetWorkshop";
import { PurchaseWorkshop } from "@/components/tutorial/PurchaseWorkshop";
import { useTutorialStore } from "@/store/tutorialStore";
import { useWorkshopStore } from "@/store/workshopStore";
import { useFleetWorkshopStore } from "@/store/fleetWorkshopStore";
import { usePurchaseWorkshopStore } from "@/store/purchaseWorkshopStore";
import { useAuth } from "@/context/AuthContext";

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
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-6 py-6">{children}</div>
        </main>
      </div>
      <VincentWidget />
      <TutorialPilot />
      <DashboardWorkshop />
      <FleetWorkshop />
      <PurchaseWorkshop />
    </div>
  );
};
