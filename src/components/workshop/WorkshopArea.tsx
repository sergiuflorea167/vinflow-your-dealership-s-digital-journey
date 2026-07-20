import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { WorkshopModeContext } from "@/context/WorkshopModeContext";
import { useWorkshopStore } from "@/store/workshopStore";

/**
 * Wurzel-Element für die gesamte Workshop-Unterwebseite (/workshop/*).
 * Setzt WorkshopModeContext für den ganzen Unterbaum (AppShell zeigt dadurch
 * die Workshop-Chrome statt der echten Sidebar/Topbar) und stellt sicher,
 * dass beim Verlassen der Unterwebseite kein Mock-Modus im Live-System hängen bleibt.
 */
export const WorkshopArea = () => {
  useEffect(() => {
    return () => {
      useWorkshopStore.getState().stop();
    };
  }, []);

  return (
    <WorkshopModeContext.Provider value={true}>
      <Outlet />
    </WorkshopModeContext.Provider>
  );
};
