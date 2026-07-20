import { useWorkshopMode } from "@/context/WorkshopModeContext";
import { withWorkshopPrefix } from "@/lib/workshopPath";

/** const wp = useWorkshopPath(); ... <Link to={wp(`/bestand/${id}`)}> — bleibt in der Workshop-Unterwebseite, wenn man dort gerade ist. */
export const useWorkshopPath = () => {
  const inWorkshop = useWorkshopMode();
  return (path: string) => withWorkshopPrefix(path, inWorkshop);
};
