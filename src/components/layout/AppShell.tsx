import { ReactNode, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { VincentWidget } from "@/components/vincent/VincentWidget";
import { TutorialPilot } from "@/components/tutorial/TutorialPilot";
import { DashboardWorkshop } from "@/components/tutorial/DashboardWorkshop";
import { useTutorialStore } from "@/store/tutorialStore";
import { useAuth } from "@/context/AuthContext";

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const { completed, active, start } = useTutorialStore();

  useEffect(() => {
    if (session && !completed && !active) {
      const t = setTimeout(() => start(), 600);
      return () => clearTimeout(t);
    }
  }, [session, completed, active, start]);

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
    </div>
  );
};
