import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useWorkshopProgressStore } from "@/store/workshopProgressStore";
import { WORKSHOP_ORDER } from "@/store/workshopStore";
import { computeAchievements } from "@/lib/workshopAchievements";

/**
 * Trophäen-Button neben dem Profilmenü — zeigt, wie viele Achievements
 * bereits freigeschaltet sind, und öffnet eine Übersicht über Fortschritt
 * und alle Achievements (freigeschaltet/gesperrt).
 */
export const AchievementsBadge = () => {
  const { user } = useAuth();
  const progress = useWorkshopProgressStore((s) => s.progress);
  const [open, setOpen] = useState(false);

  const achievements = useMemo(() => computeAchievements(progress), [progress]);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const completedChapters = WORKSHOP_ORDER.filter((k) => progress[k]?.completed).length;
  const overallPct = Math.round((completedChapters / WORKSHOP_ORDER.length) * 100);

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative size-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60",
            unlockedCount > 0 && "text-amber-500 hover:text-amber-500",
          )}
          aria-label={`Achievements — ${unlockedCount} von ${achievements.length} freigeschaltet`}
        >
          <Trophy className="size-4" />
          {unlockedCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold grid place-items-center leading-none">
              {unlockedCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 max-h-[70vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border bg-gradient-surface">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dein Workshop-Fortschritt</p>
          <div className="flex items-center gap-3 mt-2">
            <Progress value={overallPct} className="h-2 flex-1" />
            <span className="text-sm font-display font-bold">{overallPct}%</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {completedChapters} von {WORKSHOP_ORDER.length} Kapiteln abgeschlossen · {unlockedCount} von {achievements.length} Achievements
          </p>
        </div>
        <div className="p-3 overflow-y-auto grid grid-cols-2 gap-2">
          {achievements.map((a) => (
            <div
              key={a.key}
              className={cn(
                "flex flex-col items-center text-center gap-1.5 p-2.5 rounded-lg border transition-smooth",
                a.unlocked ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20 opacity-50",
              )}
              title={a.desc}
            >
              <div className={cn("size-9 rounded-full grid place-items-center shrink-0", a.unlocked ? "bg-gradient-brand" : "bg-muted")}>
                <a.icon className={cn("size-4", a.unlocked ? "text-primary-foreground" : "text-muted-foreground")} />
              </div>
              <span className="text-[10px] font-semibold leading-tight">{a.title}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
