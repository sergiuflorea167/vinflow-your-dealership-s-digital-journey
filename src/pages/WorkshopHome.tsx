import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Bot, ArrowRight, CheckCircle2 } from "lucide-react";
import { WORKSHOP_LIST } from "@/components/tutorial/workshopRegistry";
import { useWorkshopStore, WORKSHOP_ORDER } from "@/store/workshopStore";
import { useWorkshopProgressStore } from "@/store/workshopProgressStore";
import { cn } from "@/lib/utils";

const WorkshopHome = () => {
  const navigate = useNavigate();
  const progress = useWorkshopProgressStore((s) => s.progress);

  const completedChapters = WORKSHOP_ORDER.filter((k) => progress[k]?.completed).length;
  const overallPct = Math.round((completedChapters / WORKSHOP_ORDER.length) * 100);

  const startAll = () => {
    const first = WORKSHOP_ORDER[0];
    const firstDef = WORKSHOP_LIST[0];
    navigate(firstDef.route);
    setTimeout(() => useWorkshopStore.getState().start(first, { runAll: true }), 80);
  };

  return (
    <AppShell>
      <div className="space-y-8 animate-fade-in">
        <div className="max-w-3xl">
          <Badge variant="outline" className="border-primary/30 text-primary-glow mb-3 gap-1.5">
            <Sparkles className="size-3" /> Workshop
          </Badge>
          <h1 className="text-3xl lg:text-4xl font-display font-bold tracking-tight">
            Lerne VINflow in deinem eigenen Tempo
          </h1>
          <p className="text-muted-foreground mt-2">
            Jedes Kapitel entspricht einem Menüpunkt der echten Software — mit Beispieldaten zum Ausprobieren.
            Nichts, was du hier klickst oder ausfüllst, wird in deiner echten Datenbank gespeichert. Du kannst
            jederzeit über „Zurück zum Live-System" oben aussteigen.
          </p>
        </div>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm font-semibold">Dein Fortschritt</p>
            <p className="text-xs text-muted-foreground">
              {completedChapters} von {WORKSHOP_ORDER.length} Kapiteln abgeschlossen
            </p>
          </div>
          <div className="flex items-center gap-3 mt-2.5">
            <Progress value={overallPct} className="h-2.5 flex-1" />
            <span className="text-sm font-display font-bold shrink-0">{overallPct}%</span>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="size-11 rounded-xl bg-gradient-brand grid place-items-center shrink-0">
            <Bot className="size-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Nicht sicher, wo du anfangen sollst?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Frag VINcent unten rechts einfach in eigenen Worten, z. B. „Wie füge ich ein Fahrzeug hinzu?" oder
              „Wie verkaufe ich ein Auto über die Vorgänge?" — er erklärt es kurz und schickt dich direkt ins
              passende Kapitel.
            </p>
          </div>
        </Card>

        <button
          onClick={startAll}
          className="w-full text-left flex items-center gap-4 p-5 rounded-xl border border-primary/50 bg-primary/5 hover:bg-primary/10 transition-smooth"
        >
          <div className="size-12 rounded-xl bg-primary text-primary-foreground grid place-items-center shrink-0 shadow-glow">
            <Sparkles className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold">Kompletter Rundgang</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Alle {WORKSHOP_LIST.length} Kapitel nacheinander — die vollständige Einführung durch die ganze Software.
            </p>
          </div>
          <ArrowRight className="size-5 text-primary shrink-0" />
        </button>

        <div>
          <h2 className="font-display text-lg font-semibold mb-3">Alle Kapitel</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {WORKSHOP_LIST.map(({ key, icon: Icon, title, desc, route, steps }) => {
              const chapterProgress = progress[key];
              const completed = chapterProgress?.completed ?? false;
              const stepsCompleted = Math.min(chapterProgress?.stepsCompleted ?? 0, steps.length);
              const pct = completed ? 100 : Math.round((stepsCompleted / steps.length) * 100);
              const started = stepsCompleted > 0;
              return (
                <button
                  key={key}
                  onClick={() => navigate(route)}
                  className={cn(
                    "text-left flex flex-col gap-3 p-4 rounded-xl border bg-card hover:shadow-card transition-smooth",
                    completed ? "border-success/40" : "border-border hover:border-primary/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn(
                      "size-10 rounded-lg grid place-items-center shrink-0",
                      completed ? "bg-success/15 text-success" : "bg-secondary text-primary",
                    )}>
                      {completed ? <CheckCircle2 className="size-5" /> : <Icon className="size-5" />}
                    </div>
                    {completed && (
                      <Badge variant="outline" className="border-success/40 text-success text-[10px] px-1.5 py-0 gap-1 shrink-0">
                        <CheckCircle2 className="size-3" /> Abgeschlossen
                      </Badge>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={pct} className={cn("h-1.5 flex-1", completed && "[&>div]:bg-success")} />
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">{stepsCompleted}/{steps.length}</span>
                  </div>
                  <Button size="sm" variant="outline" className="mt-auto w-fit gap-1.5 text-xs">
                    {completed ? "Nochmal ansehen" : started ? "Weiter" : "Kapitel starten"} <ArrowRight className="size-3.5" />
                  </Button>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default WorkshopHome;
