import { useNavigate } from "react-router-dom";
import { useWorkshopStore, WORKSHOP_ORDER } from "@/store/workshopStore";
import { WorkshopPilot } from "./WorkshopPilot";
import { WORKSHOP_REGISTRY } from "./workshopRegistry";

/** Rendert den aktuell aktiven Workshop (falls einer läuft) und verkettet bei "Kompletter Workshop"
 * automatisch zum nächsten Menüpunkt in WORKSHOP_ORDER, sobald einer fertig ist. */
export const WorkshopRunner = () => {
  const navigate = useNavigate();
  const activeKey = useWorkshopStore((s) => s.activeKey);
  const step = useWorkshopStore((s) => s.step);
  const runAll = useWorkshopStore((s) => s.runAll);
  const next = useWorkshopStore((s) => s.next);
  const prev = useWorkshopStore((s) => s.prev);
  const stop = useWorkshopStore((s) => s.stop);
  const start = useWorkshopStore((s) => s.start);

  if (!activeKey) return null;
  const def = WORKSHOP_REGISTRY[activeKey];

  const handleFinish = () => {
    if (runAll) {
      const idx = WORKSHOP_ORDER.indexOf(activeKey);
      const nextKey = WORKSHOP_ORDER[idx + 1];
      if (nextKey) {
        navigate(WORKSHOP_REGISTRY[nextKey].route);
        start(nextKey, { runAll: true });
        return;
      }
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
