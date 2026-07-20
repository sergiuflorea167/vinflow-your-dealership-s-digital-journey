import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FlaskConical, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useWorkshopStore } from "@/store/workshopStore";
import { WORKSHOP_LIST } from "@/components/tutorial/workshopRegistry";
import { useWorkshopProgressStore } from "@/store/workshopProgressStore";
import { AchievementsBadge } from "./AchievementsBadge";

/**
 * Eigene Kopfzeile für die Workshop-Unterwebseite (/workshop/*) — ersetzt die
 * echte Sidebar/Topbar, damit für den Nutzer klar erkennbar ist: das hier ist
 * die Übungsumgebung, nicht die echte Software.
 */
export const WorkshopChrome = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeKey = useWorkshopStore((s) => s.activeKey);
  const start = useWorkshopStore((s) => s.start);
  const progress = useWorkshopProgressStore((s) => s.progress);

  const current = WORKSHOP_LIST.find(
    (w) => location.pathname === w.route || location.pathname.startsWith(`${w.route}/`),
  );

  return (
    <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="flex items-center gap-2 px-3 h-14 sm:px-6">
        <Link to="/workshop" className="flex items-center gap-2 min-w-0 shrink-0">
          <div className="size-8 rounded-lg bg-gradient-brand grid place-items-center shrink-0">
            <FlaskConical className="size-4 text-primary-foreground" />
          </div>
          <div className="hidden sm:flex flex-col leading-tight min-w-0">
            <span className="font-display font-bold text-sm tracking-tight truncate">VINflow Workshop</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">Beispieldaten · nichts wird gespeichert</span>
          </div>
        </Link>

        {current && (
          <>
            <span className="text-muted-foreground/40 hidden sm:inline">/</span>
            <span className="text-sm font-medium text-foreground truncate hidden sm:inline">{current.title}</span>
          </>
        )}

        <div className="flex-1" />

        {current && activeKey === current.key && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => start(current.key)}
          >
            <RotateCcw className="size-3.5" /> <span className="hidden sm:inline">Tour neu starten</span>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="size-3.5" /> <span className="hidden sm:inline">Zurück zum Live-System</span>
        </Button>
        <AchievementsBadge />
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto px-3 pb-2.5 pt-0.5 sm:px-6">
        {WORKSHOP_LIST.map((w) => {
          const active = current?.key === w.key;
          const completed = progress[w.key]?.completed ?? false;
          const Icon = w.icon;
          return (
            <Link
              key={w.key}
              to={w.route}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-smooth",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-glow"
                  : completed
                  ? "border-success/40 text-success hover:border-success/60"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
              )}
            >
              {completed && !active ? <CheckCircle2 className="size-3.5 shrink-0" /> : <Icon className="size-3.5 shrink-0" />}
              {w.title.replace(" Workshop", "").replace("-Workshop", "")}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
