import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, X,
  Save, Info, Pin, PinOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useProcessStore } from "@/store/processStore";
import {
  CalendarEvent, CalendarEventType, CALENDAR_EVENT_TYPE_LABELS,
} from "@/data/process";
import { useWorkshopStore } from "@/store/workshopStore";
import { WORKSHOP_DEMO } from "@/data/workshopDemo";
import { withWorkshopGuard } from "@/lib/workshopGuard";
import { useCalendarPanelStore } from "@/store/calendarPanelStore";
import {
  CalendarTimeGrid, TYPE_STYLES, toISO, startOfWeek,
} from "@/components/calendar/calendarGrid";

type CalendarView = "week" | "day";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const CalendarPage = () => {
  const workshopActive = useWorkshopStore((s) => s.activeKey === "calendar");
  const realEvents = useProcessStore((s) => s.calendarEvents);
  const realAddCalendarEvent = useProcessStore((s) => s.addCalendarEvent);
  const realUpdateCalendarEvent = useProcessStore((s) => s.updateCalendarEvent);
  const realRemoveCalendarEvent = useProcessStore((s) => s.removeCalendarEvent);

  const events = workshopActive ? WORKSHOP_DEMO.calendarEvents : realEvents;
  const addCalendarEvent = withWorkshopGuard(workshopActive, realAddCalendarEvent);
  const updateCalendarEvent = withWorkshopGuard(workshopActive, realUpdateCalendarEvent);
  const removeCalendarEvent = withWorkshopGuard(workshopActive, realRemoveCalendarEvent);

  const pinned = useCalendarPanelStore((s) => s.pinned);
  const realTogglePinned = useCalendarPanelStore((s) => s.togglePinned);
  // Anpinnen wirkt seitenübergreifend (persistiertes UI-Preference) — im Workshop
  // bewusst blockiert, damit nichts vom Workshop im Live-System hängen bleibt.
  const togglePinned = withWorkshopGuard(workshopActive, realTogglePinned);

  const [view, setView] = useState<CalendarView>("week");
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<{ date?: string; type?: CalendarEventType }>({});

  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    }),
    [weekStart],
  );
  const days = view === "day" ? [anchorDate] : weekDays;

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      (map[e.date] ||= []).push(e);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    );
    return map;
  }, [events]);

  const handleEventCommit = (id: string, patch: { date?: string; startTime: string; endTime: string }) => {
    updateCalendarEvent(id, patch);
  };

  const openCreate = (defaults: { date?: string; type?: CalendarEventType } = {}) => {
    setCreateDefaults(defaults);
    setCreateOpen(true);
  };

  const step = (delta: number) => {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() + delta * (view === "day" ? 1 : 7));
    setAnchorDate(d);
  };

  return (
    <AppShell>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div data-tour="cal-header" className="flex items-center justify-between gap-4 shrink-0 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-brand grid place-items-center shadow-glow">
              <CalendarDays className="size-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">Kalender</h1>
              <p className="text-xs text-muted-foreground">
                Termine und To-Dos in Wochen- oder Tagesansicht verwalten
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={togglePinned}
              aria-pressed={pinned}
              data-tour="cal-pin"
            >
              {pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
              {pinned ? "Angepinnt" : "Anpinnen"}
            </Button>
            <div data-tour="cal-new">
              <Button
                size="sm"
                className="bg-gradient-brand hover:opacity-90 shadow-elegant gap-2"
                onClick={() => openCreate({ date: toISO(anchorDate) })}
              >
                <Plus className="size-4" /> Neuer Termin
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
            <Card data-tour="cal-nav" className="px-3 py-2 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:flex-wrap">
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon" className="p-0 sm:h-8 sm:w-8" onClick={() => step(-1)}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="outline" size="sm" className="text-xs sm:h-8"
                  onClick={() => setAnchorDate(new Date())}>
                  Heute
                </Button>
                <Button variant="outline" size="icon" className="p-0 sm:h-8 sm:w-8" onClick={() => step(1)}>
                  <ChevronRight className="size-4" />
                </Button>
                <span className="ml-2 min-w-0 flex-1 text-sm font-medium leading-tight">
                  {view === "day"
                    ? anchorDate.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
                    : (
                      <>
                        {weekStart.toLocaleDateString("de-DE", { day: "2-digit", month: "long" })}
                        {" – "}
                        {weekDays[6].toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                      </>
                    )}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 rounded-lg border border-border p-0.5" data-tour="cal-view-toggle">
                  <Button
                    variant={view === "week" ? "default" : "ghost"}
                    size="sm"
                    className={cn("h-7 px-2.5 text-xs", view === "week" && "bg-gradient-brand")}
                    onClick={() => setView("week")}
                  >
                    Woche
                  </Button>
                  <Button
                    variant={view === "day" ? "default" : "ghost"}
                    size="sm"
                    className={cn("h-7 px-2.5 text-xs", view === "day" && "bg-gradient-brand")}
                    onClick={() => setView("day")}
                  >
                    Tag
                  </Button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[10px] text-muted-foreground sm:flex-wrap sm:overflow-visible sm:pb-0">
                  {(Object.keys(CALENDAR_EVENT_TYPE_LABELS) as CalendarEventType[]).map((t) => (
                    <span key={t} className="inline-flex items-center gap-1">
                      <span className={cn("size-2 rounded-full", TYPE_STYLES[t].dot)} />
                      {CALENDAR_EVENT_TYPE_LABELS[t]}
                    </span>
                  ))}
                </div>
              </div>
            </Card>

            {/* Wochen-/Tagesansicht */}
            <Card data-tour="cal-week" className="overflow-hidden">
              <div className="overflow-x-auto overscroll-x-contain">
                <div className={view === "week" ? "min-w-[760px]" : "min-w-[280px]"}>
                  <CalendarTimeGrid
                    days={days}
                    eventsByDay={eventsByDay}
                    onEventClick={setEditEvent}
                    onEventCommit={handleEventCommit}
                    onDayHeaderClick={(iso) => openCreate({ date: iso })}
                  />
                </div>
              </div>
            </Card>
        </div>

        <Card className="p-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
          <p>
            Google-Kalender-Sync ist vorbereitet, aber noch nicht aktiv. Sobald der lokale Kalender
            stabil läuft, kann er per Klick mit deinem Google-Konto verbunden werden.
          </p>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Neuer Kalendereintrag</DialogTitle></DialogHeader>
          <EventForm
            initial={{
              date: createDefaults.date ?? toISO(anchorDate),
              type: createDefaults.type ?? "appointment",
            }}
            submitLabel="Anlegen"
            onSubmit={(data) => {
              addCalendarEvent(data);
              toast.success("Termin angelegt.");
              setCreateOpen(false);
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editEvent} onOpenChange={(o) => !o && setEditEvent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Eintrag bearbeiten</DialogTitle></DialogHeader>
          {editEvent && (
            <EventForm
              key={editEvent.id}
              initial={editEvent}
              submitLabel="Speichern"
              isLinkedToTodo={!!editEvent.todoId}
              onSubmit={(data) => {
                updateCalendarEvent(editEvent.id, data);
                toast.success("Eintrag aktualisiert.");
                setEditEvent(null);
              }}
              onCancel={() => setEditEvent(null)}
              onDelete={() => {
                removeCalendarEvent(editEvent.id);
                toast.success("Eintrag gelöscht.");
                setEditEvent(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default CalendarPage;

// ---------------------------------------------------------------------------
// Event Form
// ---------------------------------------------------------------------------

type EventFormData = Omit<CalendarEvent, "id" | "createdAt" | "createdBy">;

const EventForm = ({
  initial, submitLabel, onSubmit, onCancel, onDelete, isLinkedToTodo,
}: {
  initial: Partial<EventFormData>;
  submitLabel: string;
  onSubmit: (data: EventFormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isLinkedToTodo?: boolean;
}) => {
  const [title, setTitle] = useState(initial.title ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [date, setDate] = useState(initial.date ?? toISO(new Date()));
  const [startTime, setStartTime] = useState(initial.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(initial.endTime ?? "10:00");
  const [type, setType] = useState<CalendarEventType>(initial.type ?? "appointment");
  const [location, setLocation] = useState(initial.location ?? "");

  const submit = () => {
    if (!title.trim()) { toast.error("Bitte einen Titel eingeben."); return; }
    if (endTime <= startTime) { toast.error("Endzeit muss nach Startzeit liegen."); return; }
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      date,
      startTime,
      endTime,
      type,
      location: location.trim() || undefined,
      vehicleId: initial.vehicleId,
      processId: initial.processId,
      customerId: initial.customerId,
      todoId: initial.todoId,
      done: initial.done,
    });
  };

  return (
    <div className="space-y-4">
      {isLinkedToTodo && (
        <div className="flex items-start gap-2 text-xs p-2 rounded-md border border-warning/30 bg-warning/10 text-warning">
          <Info className="size-3.5 mt-0.5 shrink-0" />
          <p>Dieser Eintrag ist mit einem To-Do verknüpft. Änderungen wirken sich auch auf das To-Do aus.</p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Titel *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Worum geht es?" autoFocus />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Datum</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Von</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Bis</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Typ</Label>
          <Select value={type} onValueChange={(v) => setType(v as CalendarEventType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(CALENDAR_EVENT_TYPE_LABELS) as CalendarEventType[]).map((k) => (
                <SelectItem key={k} value={k}>{CALENDAR_EVENT_TYPE_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Ort</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="z. B. Showroom" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Beschreibung</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Optional" />
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        {onDelete ? (
          <Button variant="outline" onClick={onDelete}
            className="gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10">
            <Trash2 className="size-3.5" /> Löschen
          </Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="gap-1.5"><X className="size-3.5" /> Abbrechen</Button>
          <Button onClick={submit} className="bg-gradient-brand gap-1.5"><Save className="size-3.5" /> {submitLabel}</Button>
        </div>
      </DialogFooter>
    </div>
  );
};
