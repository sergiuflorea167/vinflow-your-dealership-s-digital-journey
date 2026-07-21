import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useWorkshopProgressStore } from "@/store/workshopProgressStore";
import { computeAchievements } from "@/lib/workshopAchievements";

/**
 * Vergleicht bei jeder Fortschrittsänderung die freigeschalteten Achievements mit dem zuletzt
 * bekannten Stand und meldet neu hinzugekommene per Toast — inkl. wofür sie vergeben wurden.
 * Die erste Berechnung nach dem Laden vom Server setzt nur die Baseline (kein Toast), damit
 * beim Login nicht sämtliche längst freigeschalteten Achievements erneut aufploppen.
 */
export function useAchievementNotifications() {
  const progress = useWorkshopProgressStore((s) => s.progress);
  const loaded = useWorkshopProgressStore((s) => s.loaded);
  const loadedForUserId = useWorkshopProgressStore((s) => s.loadedForUserId);
  const baseline = useRef<{ userId: string | null; keys: Set<string> } | null>(null);

  useEffect(() => {
    if (!loaded) return;
    const achievements = computeAchievements(progress);
    const unlockedKeys = new Set(achievements.filter((a) => a.unlocked).map((a) => a.key));

    if (!baseline.current || baseline.current.userId !== loadedForUserId) {
      baseline.current = { userId: loadedForUserId, keys: unlockedKeys };
      return;
    }

    const newlyUnlocked = achievements.filter((a) => a.unlocked && !baseline.current!.keys.has(a.key));
    baseline.current = { userId: loadedForUserId, keys: unlockedKeys };

    newlyUnlocked.forEach((a) => {
      const Icon = a.icon;
      toast.success(`Achievement freigeschaltet: ${a.title}`, {
        description: a.desc,
        icon: <Icon className="size-4" />,
        duration: 6000,
      });
    });
  }, [progress, loaded, loadedForUserId]);
}
