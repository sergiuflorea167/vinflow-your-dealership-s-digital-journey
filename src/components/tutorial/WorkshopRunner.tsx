import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { useWorkshopStore, WORKSHOP_ORDER } from "@/store/workshopStore";
import { useWorkshopProgressStore } from "@/store/workshopProgressStore";
import { WorkshopPilot } from "./WorkshopPilot";
import { WORKSHOP_REGISTRY } from "./workshopRegistry";

/** Rendert den aktuell aktiven Workshop (falls einer läuft), verkettet bei "Kompletter Workshop"
 * automatisch zum nächsten Menüpunkt in WORKSHOP_ORDER, sobald einer fertig ist, und schreibt den
 * Fortschritt (Gamification: Fortschrittsbalken + Achievements) für das jeweilige Kapitel mit. */
export const WorkshopRunner = () => {
  const navigate = useNavigate();
  const activeKey = useWorkshopStore((s) => s.activeKey);
  const step = useWorkshopStore((s) => s.step);
  const runAll = useWorkshopStore((s) => s.runAll);
  const next = useWorkshopStore((s) => s.next);
  const prev = useWorkshopStore((s) => s.prev);
  const stop = useWorkshopStore((s) => s.stop);
  const start = useWorkshopStore((s) => s.start);
  const recordStep = useWorkshopProgressStore((s) => s.recordStep);
  const markCompleted = useWorkshopProgressStore((s) => s.markCompleted);

  const def = activeKey ? WORKSHOP_REGISTRY[activeKey] : null;

  useEffect(() => {
    if (!activeKey || !def) return;
    recordStep(activeKey, step, def.steps.length);
  }, [activeKey, step, def, recordStep]);

  if (!activeKey || !def) return null;

  const handleFinish = () => {
    const alreadyCompleted = useWorkshopProgressStore.getState().progress[activeKey]?.completed;
    markCompleted(activeKey, def.steps.length);

    const idx = WORKSHOP_ORDER.indexOf(activeKey);
    const nextKey = runAll ? WORKSHOP_ORDER[idx + 1] : undefined;

    if (!alreadyCompleted) {
      toast.success(`${def.title} abgeschlossen!`, {
        description: nextKey
          ? `Weiter geht's mit "${WORKSHOP_REGISTRY[nextKey].title}".`
          : "Deinen Fortschritt und alle Achievements siehst du oben über die Trophäe.",
        icon: <PartyPopper className="size-4" />,
        duration: 5000,
      });
    }

    if (runAll && nextKey) {
      navigate(WORKSHOP_REGISTRY[nextKey].route);
      start(nextKey, { runAll: true });
      return;
    }
    stop();
  };

  return (
    <WorkshopPilot
      key={activeKey}
      active
      step={step}
      steps={def.steps}
      rootRoute={def.route}
      labelPrefix={def.labelPrefix}
      next={next}
      prev={prev}
      stop={stop}
      onFinish={handleFinish}
    />
  );
};
