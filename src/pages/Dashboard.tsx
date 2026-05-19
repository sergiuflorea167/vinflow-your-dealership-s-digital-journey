import { Link, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ProcessCard } from "@/components/process/ProcessCard";
import { GoalsPanel } from "@/components/dashboard/GoalsPanel";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { PinnedKpiGrid } from "@/components/dashboard/PinnedKpiGrid";
import { useProcessStore } from "@/store/processStore";
import { PROCESS_STEPS, TodoPriority, CALENDAR_EVENT_TYPE_LABELS, CalendarEventType } from "@/data/process";
import { ArrowUpRight, Settings2, CalendarCheck2, Car, CalendarDays, Clock, MapPin, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useWorkshopStore } from "@/store/workshopStore";

const EVENT_DOT: Record<CalendarEventType, string> = {
  appointment: "bg-primary",
  todo: "bg-warning",
  block: "bg-muted-foreground",
  viewing: "bg-info",
  handover: "bg-success",
  call: "bg-accent-foreground",
  internal: "bg-secondary-foreground",
};

const PRIORITY_DOT: Record<TodoPriority, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-info",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const t = useT();
  const processes = useProcessStore((s) => s.processes);
  const todos = useProcessStore((s) => s.todos);
  const vehicles = useProcessStore((s) => s.vehicles);
  const calendarEvents = useProcessStore((s) => s.calendarEvents);
  const toggleTodo = useProcessStore((s) => s.toggleTodo);

  const byStep = useMemo(
    () =>
      PROCESS_STEPS.map((step) => ({
        step,
        count: processes.filter((p) => p.currentStep === step.key && p.steps[step.key].status !== "completed").length,
      })),
    [processes],
  );

  const LAST_STEP_KEY = PROCESS_STEPS[PROCESS_STEPS.length - 1].key;
  const activeProcesses = useMemo(
    () => processes.filter((p) => p.steps?.[LAST_STEP_KEY]?.status !== "completed"),
    [processes, LAST_STEP_KEY],
  );

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayTodos = useMemo(
    () =>
      todos
        .filter((t) => !t.done && t.dueDate === todayISO)
        .sort((a, b) => {
          const w = { high: 0, medium: 1, low: 2 } as const;
          return w[a.priority] - w[b.priority];
        }),
    [todos, todayISO],
  );
  const todayEvents = useMemo(
    () => calendarEvents.filter((e) => e.date === todayISO).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [calendarEvents, todayISO],
  );
  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles]);

  const startWorkshop = useWorkshopStore((s) => s.start);

  return (
    <AppShell>
      <div className="space-y-8 animate-fade-in">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={startWorkshop}
            className="border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <GraduationCap className="size-4 mr-1.5" />
            Dashboard-Workshop starten
          </Button>
        </div>

        <div data-tour="dash-hero">
          <DashboardHero
            activeCount={activeProcesses.length}
            todoCount={todayTodos.length}
            eventCount={todayEvents.length}
          />
        </div>

        {/* Morgen-Motivation */}
        <div data-tour="dash-goals">
          <GoalsPanel />
        </div>

        {/* Heutige Termine */}
        <Card className="p-6 bg-card border-border shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-primary/15 text-primary-glow flex items-center justify-center">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-display font-semibold">{t("dash.todayAppointments")}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {todayEvents.length === 0
                    ? t("dash.todayAppointments.none")
                    : (todayEvents.length === 1
                        ? t("dash.todayAppointments.count.one")
                        : t("dash.todayAppointments.count")
                      ).replace("{n}", String(todayEvents.length))}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/kalender">{t("dash.toCalendar")}</Link>
            </Button>
          </div>
          {todayEvents.length > 0 && (
            <ul className="divide-y divide-border/60">
              {todayEvents.slice(0, 6).map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <span className={cn("size-2 rounded-full shrink-0", EVENT_DOT[e.type])} />
                  <span className="font-mono text-xs text-muted-foreground w-[88px] shrink-0">
                    {e.startTime}–{e.endTime}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate("/kalender")}
                    className={cn(
                      "flex-1 text-left text-sm text-foreground truncate hover:text-primary-glow transition-smooth",
                      e.done && "line-through opacity-60",
                    )}
                  >
                    {e.title}
                  </button>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 hidden md:inline-flex">
                    {CALENDAR_EVENT_TYPE_LABELS[e.type]}
                  </Badge>
                  {e.location && (
                    <span className="hidden lg:inline-flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[160px]">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">{e.location}</span>
                    </span>
                  )}
                </li>
              ))}
              {todayEvents.length > 6 && (
                <li className="pt-2 text-xs text-muted-foreground">
                  +{todayEvents.length - 6} {t("dash.moreOthers")} –{" "}
                  <Link to="/kalender" className="text-primary-glow hover:underline">
                    {t("dash.moreInCalendar")}
                  </Link>
                </li>
              )}
            </ul>
          )}
        </Card>

        {/* Heute fällige To-Dos */}
        <Card className="p-6 bg-card border-border shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-warning/15 text-warning flex items-center justify-center">
                <CalendarCheck2 className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-display font-semibold">{t("dash.todayDue")}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {todayTodos.length === 0
                    ? t("dash.todayDue.none")
                    : (todayTodos.length === 1
                        ? t("dash.todayDue.count.one")
                        : t("dash.todayDue.count")
                      ).replace("{n}", String(todayTodos.length))}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/todos">{t("dash.allTodos")}</Link>
            </Button>
          </div>

          {todayTodos.length > 0 && (
            <ul className="divide-y divide-border/60">
              {todayTodos.slice(0, 6).map((todo) => {
                const veh = todo.vehicleId ? vehicleMap[todo.vehicleId] : undefined;
                return (
                  <li key={todo.id} className="flex items-center gap-3 py-2.5 group">
                    <Checkbox
                      checked={todo.done}
                      onCheckedChange={() => toggleTodo(todo.id)}
                      aria-label={t("dash.markDone")}
                    />
                    <span className={cn("size-2 rounded-full shrink-0", PRIORITY_DOT[todo.priority])} />
                    <button
                      type="button"
                      onClick={() => navigate("/todos")}
                      className="flex-1 text-left text-sm text-foreground truncate hover:text-primary-glow transition-smooth"
                    >
                      {todo.title}
                    </button>
                    {veh && (
                      <button
                        type="button"
                        onClick={() => navigate(`/bestand/${veh.id}`)}
                        className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary-glow truncate max-w-[180px]"
                      >
                        <Car className="size-3 shrink-0" />
                        <span className="truncate">
                          {veh.make} {veh.model}
                        </span>
                      </button>
                    )}
                    {todo.assignee && (
                      <span className="hidden lg:inline text-xs text-muted-foreground truncate max-w-[120px]">
                        {todo.assignee}
                      </span>
                    )}
                  </li>
                );
              })}
              {todayTodos.length > 6 && (
                <li className="pt-2 text-xs text-muted-foreground">
                  +{todayTodos.length - 6} {t("dash.moreOthers")} –{" "}
                  <Link to="/todos" className="text-primary-glow hover:underline">
                    {t("dash.moreInList")}
                  </Link>
                </li>
              )}
            </ul>
          )}
        </Card>

        {/* Frei konfigurierbare KPIs */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-display font-semibold">{t("dash.yourKpis")}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("dash.yourKpis.sub")}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/kpis">
                <Settings2 className="size-4 mr-1.5" /> {t("dash.manageKpis")}
              </Link>
            </Button>
          </div>
          <PinnedKpiGrid />
        </div>

        <Card className="p-6 bg-card border-border shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-display font-semibold">{t("dash.pipeline")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("dash.pipeline.sub")}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
            {byStep.map(({ step, count }, i) => (
              <div
                key={step.key}
                className="rounded-xl border border-border bg-background/40 p-4 hover:border-primary/40 transition-smooth"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-2xl font-display font-bold text-foreground">{count}</span>
                </div>
                <p className="text-xs font-semibold text-foreground leading-tight">{step.shortLabel}</p>
                <p className="text-[10px] text-muted-foreground mt-1 truncate">{step.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-display font-semibold">{t("dash.activeProcesses")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("dash.activeProcesses.sub")}</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/vorgaenge">{t("common.showAll")}</Link>
            </Button>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeProcesses.slice(0, 6).map((p) => (
              <ProcessCard key={p.id} process={p} />
            ))}
            {activeProcesses.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full">
                {t("dash.activeProcesses.empty")}
              </p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default Dashboard;
