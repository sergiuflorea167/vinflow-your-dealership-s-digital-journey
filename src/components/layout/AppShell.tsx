import { ReactNode, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { VincentWidget } from "@/components/vincent/VincentWidget";
import { TutorialPilot } from "@/components/tutorial/TutorialPilot";
import { DashboardWorkshop } from "@/components/tutorial/DashboardWorkshop";
import { FleetWorkshop } from "@/components/tutorial/FleetWorkshop";
import { useTutorialStore } from "@/store/tutorialStore";
import { useWorkshopStore } from "@/store/workshopStore";
import { useFleetWorkshopStore } from "@/store/fleetWorkshopStore";
import { useAuth } from "@/context/AuthContext";

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const { completed, active, start } = useTutorialStore();
  const navigate = useNavigate();
  const dashActive = useWorkshopStore((s) => s.active);
  const wasActive = useRef(false);

  useEffect(() => {
    if (session && !completed && !active) {
      const t = setTimeout(() => start(), 600);
      return () => clearTimeout(t);
    }
  }, [session, completed, active, start]);

  // Chain: when dashboard workshop ends with chainNext = "fleet", start fleet workshop.
  useEffect(() => {
    if (wasActive.current && !dashActive) {
      const chain = useWorkshopStore.getState().chainNext;
      if (chain === "fleet") {
        useWorkshopStore.setState({ chainNext: null });
        navigate("/bestand");
        setTimeout(() => useFleetWorkshopStore.getState().start(), 200);
      }
    }
    wasActive.current = dashActive;
  }, [dashActive, navigate]);

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
    </div>
  );
};
