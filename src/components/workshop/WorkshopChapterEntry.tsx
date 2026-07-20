import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkshopStore, type WorkshopKey } from "@/store/workshopStore";

interface Props {
  chapterKey: WorkshopKey;
  children: ReactNode;
  /**
   * Nur für Seiten, die selbst kein sinnvoller Tour-Einstieg sind, weil sie Teil
   * eines mehrseitigen Kapitel-Flows sind (z. B. Fahrzeug-/Vorgangs-Detail im
   * Vorgänge-Workshop). Bei einem Kaltstart (Direktaufruf, Reload) landet man
   * dann sauber am Kapitel-Anfang statt mitten im Flow eine unpassende Folie zu sehen.
   */
  fallbackRoute?: string;
}

/**
 * Startet den Workshop für ein Kapitel, sobald man es betritt — aber nur, wenn
 * er nicht schon für genau dieses Kapitel läuft. So bleibt der Tour-Fortschritt
 * (step) erhalten, wenn die geführte Tour selbst innerhalb des Kapitels auf eine
 * weitere Seite navigiert (z. B. Vorgänge-Workshop: Liste → Fahrzeug → Vorgang).
 */
export const WorkshopChapterEntry = ({ chapterKey, children, fallbackRoute }: Props) => {
  const navigate = useNavigate();

  useEffect(() => {
    const store = useWorkshopStore.getState();
    if (store.activeKey !== chapterKey) {
      if (fallbackRoute) {
        navigate(fallbackRoute, { replace: true });
        return;
      }
      store.start(chapterKey);
    }
  }, [chapterKey, fallbackRoute, navigate]);

  return <>{children}</>;
};
