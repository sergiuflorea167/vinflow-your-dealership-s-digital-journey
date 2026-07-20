import { createContext, useContext } from "react";

/**
 * true, wenn die aktuelle Seite innerhalb der eigenständigen Workshop-Unterwebseite
 * (/workshop/*) gerendert wird. AppShell liest das, um statt der echten Sidebar/Topbar
 * die Workshop-Chrome zu zeigen — die Seiten selbst (Fleet, ProcessList, …) bleiben unverändert.
 */
export const WorkshopModeContext = createContext(false);

export const useWorkshopMode = () => useContext(WorkshopModeContext);
