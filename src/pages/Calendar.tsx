import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, X, Sparkles,
  Clock, MapPin, Layers, Pencil, Save, ListChecks, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useProcessStore } from "@/store/processStore";
import {
  CalendarEvent, CalendarEventType, CALENDAR_EVENT_TYPE_LABELS, DayTemplate,
} from "@/data/process";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fromISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

const startOfWeek = (d: Date) => {
  const day = d.getDay() === 0 ? 7 : d.getDay(); // Mo=1, So=7
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (day - 1));
  return monday;
};

const formatDateLabel = (d: Date) =>
  d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });

const TYPE_STYLES: Record<CalendarEventType, { className: string; dot: string }> = {
  appointment: { className: "bg-primary/15 text-primary-glow border-primary/30",       dot: "bg-primary" },
  todo:        { className: "bg-warning/15 text-warning border-warning/30",            dot: "bg-warning" },
  block:       { className: "bg-muted/40 text-muted-foreground border-border",         dot: "bg-muted-foreground" },
  viewing:     { className: "bg-info/15 text-info border-info/30",                     dot: "bg-info" },
  handover:    { className: "bg-success/15 text-success border-success/30",            dot: "bg-success" },
  call:        { className: "bg-accent/15 text-accent-foreground border-accent/30",    dot: "bg-accent-foreground" },
  internal:    { className: "bg-secondary text-secondary-foreground border-border",    dot: "bg-secondary-foreground" },
};

const HOURS = Array.from({ length: 15 }, (_, i) => 6 + i); // 06–20
const HOUR_HEIGHT = 56; // px

const minutesFromMidnight = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const minutesToHHMM = (mins: number) => {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(mins)));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

const SNAP_MIN = 15;
const snap = (mins: number) => Math.round(mins / SNAP_MIN) * SNAP_MIN;
const PX_PER_MIN = HOUR_HEIGHT / 60;
const DAY_START_MIN = HOURS[0] * 60;
const DAY_END_MIN = (HOURS[HOURS.length - 1] + 1) * 60;

const addDaysISO = (iso: string, delta: number) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + delta);
  return toISO(d);
};

// ---------------------------------------------------------------------------
// Draggable / resizable event hook
// ---------------------------------------------------------------------------

type DragMode = "move" | "resize";

interface UseEventDragOptions {
  event: CalendarEvent;
  /** Pixel height of one minute. */
  pxPerMin: number;
  /** Container ref the pointer is measured against (for vertical movement). */
  containerRef: React.RefObject<HTMLElement>;
  /** Optional: width of one day column in px, enables horizontal day shift. */
  dayColumnWidth?: number;
  /** First day shown (used together with dayColumnWidth). */
  weekStartISO?: string;
  /** Number of day columns shown (default 1). */
  dayCount?: number;
  onCommit: (patch: { date?: string; startTime: string; endTime: string }) => void;
}

const useEventDrag = ({
  event, pxPerMin, containerRef, dayColumnWidth, weekStartISO, dayCount = 1, onCommit,
}: UseEventDragOptions) => {
  const [preview, setPreview] = useState<{ startMin: number; endMin: number; date: string } | null>(null);
  const previewRef = useRef<{ startMin: number; endMin: number; date: string } | null>(null);
  const setPreviewBoth = (p: { startMin: number; endMin: number; date: string } | null) => {
    previewRef.current = p;
    setPreview(p);
  };
  const stateRef = useRef<{
    mode: DragMode;
    startY: number;
    startX: number;
    origStart: number;
    origEnd: number;
    origDate: string;
    moved: boolean;
  } | null>(null);

  const onPointerDown = (mode: DragMode) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    stateRef.current = {
      mode,
      startY: e.clientY,
      startX: e.clientX,
      origStart: minutesFromMidnight(event.startTime),
      origEnd: minutesFromMidnight(event.endTime),
      origDate: event.date,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = stateRef.current;
    if (!s) return;
    const dyMin = (e.clientY - s.startY) / pxPerMin;
    const dx = e.clientX - s.startX;
    if (Math.abs(e.clientY - s.startY) > 3 || Math.abs(dx) > 3) s.moved = true;

    let newDate = s.origDate;
    if (dayColumnWidth && weekStartISO && dayCount > 1 && s.mode === "move") {
      const dayDelta = Math.round(dx / dayColumnWidth);
      const baseIdx = Math.round(
        (fromISO(s.origDate).getTime() - fromISO(weekStartISO).getTime()) / 86400000,
      );
      const targetIdx = Math.max(0, Math.min(dayCount - 1, baseIdx + dayDelta));
      newDate = addDaysISO(weekStartISO, targetIdx);
    }

    if (s.mode === "move") {
      const duration = s.origEnd - s.origStart;
      let newStart = snap(s.origStart + dyMin);
      newStart = Math.max(DAY_START_MIN, Math.min(DAY_END_MIN - duration, newStart));
      setPreviewBoth({ startMin: newStart, endMin: newStart + duration, date: newDate });
    } else {
      let newEnd = snap(s.origEnd + dyMin);
      newEnd = Math.max(s.origStart + SNAP_MIN, Math.min(DAY_END_MIN, newEnd));
      setPreviewBoth({ startMin: s.origStart, endMin: newEnd, date: s.origDate });
    }
  };

  const finish = (e: React.PointerEvent) => {
    const s = stateRef.current;
    if (!s) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    const p = previewRef.current;
    stateRef.current = null;
    setPreviewBoth(null);
    if (!p || !s.moved) return;
    const startTime = minutesToHHMM(p.startMin);
    const endTime = minutesToHHMM(p.endMin);
    if (
      startTime === event.startTime &&
      endTime === event.endTime &&
      p.date === event.date
    ) return;
    onCommit({
      date: p.date !== event.date ? p.date : undefined,
      startTime,
      endTime,
    });
  };

  // Suppress click immediately after a drag.
  const justDraggedRef = useRef(false);
  useEffect(() => {
    if (preview) justDraggedRef.current = true;
    else if (justDraggedRef.current) {
      const t = setTimeout(() => { justDraggedRef.current = false; }, 50);
      return () => clearTimeout(t);
    }
  }, [preview]);

  return {
    preview,
    moveHandlers: {
      onPointerDown: onPointerDown("move"),
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
    resizeHandlers: {
      onPointerDown: onPointerDown("resize"),
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
    suppressClick: () => justDraggedRef.current,
  };
};

// ---------------------------------------------------------------------------
// Draggable Event Block
// ---------------------------------------------------------------------------

interface DraggableEventProps {
  event: CalendarEvent;
  onClick: (e: CalendarEvent) => void;
  onCommit: (id: string, patch: { date?: string; startTime: string; endTime: string }) => void;
  containerRef: React.RefObject<HTMLElement>;
  dayColumnWidth?: number;
  weekStartISO?: string;
  dayCount?: number;
  /** Visual variant. */
  compact?: boolean;
  /** Extra content rendered on the right (e.g. done toggle). */
  rightSlot?: React.ReactNode;
}

const DraggableEvent = ({
  event, onClick, onCommit, containerRef, dayColumnWidth, weekStartISO, dayCount, compact, rightSlot,
}: DraggableEventProps) => {
  const { preview, moveHandlers, resizeHandlers, suppressClick } = useEventDrag({
    event,
    pxPerMin: PX_PER_MIN,
    containerRef,
    dayColumnWidth,
    weekStartISO,
    dayCount,
    onCommit: (patch) => onCommit(event.id, patch),
  });

  const startMin = preview?.startMin ?? minutesFromMidnight(event.startTime);
  const endMin = preview?.endMin ?? minutesFromMidnight(event.endTime);
  const top = (startMin - DAY_START_MIN) * PX_PER_MIN;
  const minH = compact ? 20 : 28;
  const height = Math.max(minH, (endMin - startMin) * PX_PER_MIN - 2);
  const style = TYPE_STYLES[event.type];

  // For week view, when dragging to another day we render at the original column;
  // a translucent overlay shows the target column position.
  const dx = preview && weekStartISO && dayColumnWidth
    ? (Math.round(
        (fromISO(preview.date).getTime() - fromISO(event.date).getTime()) / 86400000,
      )) * dayColumnWidth
    : 0;

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (suppressClick()) { e.preventDefault(); e.stopPropagation(); return; }
    onClick(event);
  }, [event, onClick, suppressClick]);

  return (
    <div
      className={cn(
        "absolute rounded-md border overflow-hidden transition-shadow select-none touch-none",
        compact ? "left-1 right-1" : "left-2 right-2",
        style.className,
        event.done && "opacity-60",
        preview && "shadow-glow ring-1 ring-primary/40 z-20",
      )}
      style={{ top, height, transform: dx ? `translateX(${dx}px)` : undefined }}
    >
      {/* drag-to-move surface (covers the whole block, except the resize handle) */}
      <div
        {...moveHandlers}
        onClick={handleClick}
        className={cn(
          "h-full w-full cursor-grab active:cursor-grabbing flex items-center gap-2",
          compact ? "px-1.5 py-1" : "px-2 py-1",
        )}
      >
        {!compact && <span className={cn("size-2 rounded-full shrink-0", style.dot)} />}
        <div className="min-w-0 flex-1 pointer-events-none">
          <p className={cn(
            compact ? "text-[11px] font-medium leading-tight truncate" : "text-sm font-medium truncate",
            event.done && "line-through",
          )}>
            {event.title}
          </p>
          <p className={cn(
            compact ? "text-[10px] opacity-80 truncate leading-tight" : "text-[11px] opacity-80 truncate",
          )}>
            {minutesToHHMM(startMin)}–{minutesToHHMM(endMin)}
            {event.location && ` · ${event.location}`}
            {!compact && ` · ${CALENDAR_EVENT_TYPE_LABELS[event.type]}`}
          </p>
        </div>
        {rightSlot}
      </div>
      {/* resize handle (bottom edge) */}
      <div
        {...resizeHandlers}
        className="absolute left-0 right-0 bottom-0 h-1.5 cursor-ns-resize hover:bg-primary/30"
        aria-label="Größe ändern"
      />
    </div>
  );
};


// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const CalendarPage = () => {
  const events = useProcessStore((s) => s.calendarEvents);
  const dayTemplates = useProcessStore((s) => s.dayTemplates);
  const addCalendarEvent = useProcessStore((s) => s.addCalendarEvent);
  const updateCalendarEvent = useProcessStore((s) => s.updateCalendarEvent);
  const removeCalendarEvent = useProcessStore((s) => s.removeCalendarEvent);
  const toggleCalendarEventDone = useProcessStore((s) => s.toggleCalendarEventDone);
  const applyDayTemplate = useProcessStore((s) => s.applyDayTemplate);
  const upsertDayTemplate = useProcessStore((s) => s.upsertDayTemplate);
  const removeDayTemplate = useProcessStore((s) => s.removeDayTemplate);

  const [tab, setTab] = useState<"agenda" | "structure" | "templates">("agenda");
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

  const todayISO = toISO(new Date());

  // Refs / measurements for drag & drop on the week grid.
  const weekGridRef = useRef<HTMLDivElement>(null);
  const dayColRef = useRef<HTMLDivElement>(null);
  const [dayColWidth, setDayColWidth] = useState(0);
  useEffect(() => {
    if (!dayColRef.current) return;
    const el = dayColRef.current;
    const update = () => setDayColWidth(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleEventCommit = useCallback(
    (id: string, patch: { date?: string; startTime: string; endTime: string }) => {
      updateCalendarEvent(id, patch);
    },
    [updateCalendarEvent],
  );

  const openCreate = (defaults: { date?: string; type?: CalendarEventType } = {}) => {
    setCreateDefaults(defaults);
    setCreateOpen(true);
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
                Termine, Tagesstruktur und Vorlagen an einem Ort
              </p>
            </div>
          </div>
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

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-3">
          <TabsList data-tour="cal-tabs">
            <TabsTrigger value="agenda" className="gap-1.5">
              <CalendarDays className="size-3.5" /> Termine
            </TabsTrigger>
            <TabsTrigger value="structure" className="gap-1.5">
              <Layers className="size-3.5" /> Tagesstruktur
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5">
              <Sparkles className="size-3.5" /> Vorlagen
            </TabsTrigger>
          </TabsList>

          {/* ===================================================== Termine */}
          <TabsContent value="agenda" className="space-y-3 mt-0">
            <Card data-tour="cal-nav" className="px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0"
                  onClick={() => { const d = new Date(anchorDate); d.setDate(d.getDate() - 7); setAnchorDate(d); }}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs"
                  onClick={() => setAnchorDate(new Date())}>
                  Heute
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0"
                  onClick={() => { const d = new Date(anchorDate); d.setDate(d.getDate() + 7); setAnchorDate(d); }}>
                  <ChevronRight className="size-4" />
                </Button>
                <span className="ml-2 text-sm font-medium">
                  {weekStart.toLocaleDateString("de-DE", { day: "2-digit", month: "long" })}
                  {" – "}
                  {weekDays[6].toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
                {(Object.keys(CALENDAR_EVENT_TYPE_LABELS) as CalendarEventType[]).map((t) => (
                  <span key={t} className="inline-flex items-center gap-1">
                    <span className={cn("size-2 rounded-full", TYPE_STYLES[t].dot)} />
                    {CALENDAR_EVENT_TYPE_LABELS[t]}
                  </span>
                ))}
              </div>
            </Card>

            {/* Wochenansicht */}
            <Card data-tour="cal-week" className="overflow-hidden">
              <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b border-border bg-background/60">
                <div />
                {weekDays.map((d) => {
                  const iso = toISO(d);
                  const isToday = iso === todayISO;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => openCreate({ date: iso })}
                      className={cn(
                        "px-2 py-2 text-left border-l border-border hover:bg-surface-elevated/40 transition-smooth",
                        isToday && "bg-primary/10",
                      )}
                    >
                      <p className={cn("text-[10px] uppercase tracking-wider", isToday ? "text-primary-glow" : "text-muted-foreground")}>
                        {d.toLocaleDateString("de-DE", { weekday: "short" })}
                      </p>
                      <p className={cn("font-display font-semibold text-sm", isToday && "text-primary-glow")}>
                        {d.getDate().toString().padStart(2, "0")}.{(d.getMonth() + 1).toString().padStart(2, "0")}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div ref={weekGridRef}
                   className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] relative"
                   style={{ height: HOURS.length * HOUR_HEIGHT }}>
                {/* Hour rail */}
                <div className="relative border-r border-border">
                  {HOURS.map((h, i) => (
                    <div key={h} className="absolute left-0 right-0 text-[10px] text-muted-foreground px-1.5"
                         style={{ top: i * HOUR_HEIGHT }}>
                      {String(h).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>
                {/* Day columns */}
                {weekDays.map((d, idx) => {
                  const iso = toISO(d);
                  const dayEvents = eventsByDay[iso] ?? [];
                  return (
                    <div
                      key={iso}
                      ref={idx === 0 ? dayColRef : undefined}
                      className="relative border-l border-border"
                    >
                      {HOURS.map((h, i) => (
                        <div key={h} className="absolute left-0 right-0 border-t border-border/40"
                             style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }} />
                      ))}
                      {dayEvents.map((e) => (
                        <DraggableEvent
                          key={e.id}
                          event={e}
                          onClick={setEditEvent}
                          onCommit={handleEventCommit}
                          containerRef={weekGridRef}
                          dayColumnWidth={dayColWidth}
                          weekStartISO={toISO(weekStart)}
                          dayCount={7}
                          compact
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          {/* ===================================================== Tagesstruktur */}
          <TabsContent value="structure" className="space-y-3 mt-0">
            <DayStructureView
              date={anchorDate}
              setDate={setAnchorDate}
              templates={dayTemplates}
              onApplyTemplate={(id) => {
                applyDayTemplate(id, toISO(anchorDate));
                toast.success("Tagesstruktur übernommen.");
              }}
              events={eventsByDay[toISO(anchorDate)] ?? []}
              onCreate={() => openCreate({ date: toISO(anchorDate), type: "block" })}
              onEdit={setEditEvent}
              onToggleDone={toggleCalendarEventDone}
              onCommit={handleEventCommit}
            />
          </TabsContent>

          {/* ===================================================== Vorlagen */}
          <TabsContent value="templates" className="space-y-3 mt-0">
            <TemplatesView
              templates={dayTemplates}
              onUpsert={upsertDayTemplate}
              onRemove={removeDayTemplate}
            />
          </TabsContent>
        </Tabs>

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
// Day Structure View
// ---------------------------------------------------------------------------

const DayStructureView = ({
  date, setDate, templates, onApplyTemplate, events, onCreate, onEdit, onToggleDone, onCommit,
}: {
  date: Date;
  setDate: (d: Date) => void;
  templates: DayTemplate[];
  onApplyTemplate: (id: string) => void;
  events: CalendarEvent[];
  onCreate: () => void;
  onEdit: (e: CalendarEvent) => void;
  onToggleDone: (id: string) => void;
  onCommit: (id: string, patch: { date?: string; startTime: string; endTime: string }) => void;
}) => {
  const [selectedTpl, setSelectedTpl] = useState<string>("");
  const dayGridRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-3">
      <Card className="px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0"
            onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d); }}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDate(new Date())}>
            Heute
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0"
            onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d); }}>
            <ChevronRight className="size-4" />
          </Button>
          <span className="ml-2 text-sm font-medium">
            {date.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Select value={selectedTpl} onValueChange={setSelectedTpl}>
            <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue placeholder="Vorlage wählen" /></SelectTrigger>
            <SelectContent>
              {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={!selectedTpl}
            onClick={() => { onApplyTemplate(selectedTpl); }}>
            <Sparkles className="size-3.5" /> Übernehmen
          </Button>
          <Button size="sm" className="h-8 gap-1.5 bg-gradient-brand" onClick={onCreate}>
            <Plus className="size-3.5" /> Block
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div ref={dayGridRef}
             className="grid grid-cols-[60px_minmax(0,1fr)] relative"
             style={{ height: HOURS.length * HOUR_HEIGHT }}>
          <div className="relative border-r border-border">
            {HOURS.map((h, i) => (
              <div key={h} className="absolute left-0 right-0 text-[10px] text-muted-foreground px-1.5"
                   style={{ top: i * HOUR_HEIGHT }}>
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          <div className="relative">
            {HOURS.map((h, i) => (
              <div key={h} className="absolute left-0 right-0 border-t border-border/40"
                   style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }} />
            ))}
            {events.map((e) => (
              <DraggableEvent
                key={e.id}
                event={e}
                onClick={onEdit}
                onCommit={onCommit}
                containerRef={dayGridRef}
                rightSlot={
                  <Button variant="ghost" size="icon" className="size-6 shrink-0"
                    onPointerDown={(ev) => ev.stopPropagation()}
                    onClick={(ev) => { ev.stopPropagation(); onToggleDone(e.id); }}
                    aria-label="Erledigt umschalten">
                    <ListChecks className="size-3.5" />
                  </Button>
                }
              />
            ))}
            {events.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                Noch keine Blöcke – wähle eine Vorlage oder lege manuell einen Block an.
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Templates View
// ---------------------------------------------------------------------------

const TemplatesView = ({
  templates, onUpsert, onRemove,
}: {
  templates: DayTemplate[];
  onUpsert: (t: DayTemplate) => void;
  onRemove: (id: string) => void;
}) => {
  const [edit, setEdit] = useState<DayTemplate | null>(null);

  const newTemplate = (): DayTemplate => ({
    id: `DT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    name: "Neue Vorlage",
    description: "",
    blocks: [
      { id: "b1", title: "Block", startTime: "09:00", endTime: "10:00", type: "block" },
    ],
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" className="bg-gradient-brand gap-1.5" onClick={() => setEdit(newTemplate())}>
          <Plus className="size-3.5" /> Neue Vorlage
        </Button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {templates.map((t) => (
          <Card key={t.id} className="p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <h3 className="font-display font-semibold text-base truncate">{t.name}</h3>
                {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="size-7" onClick={() => setEdit(t)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => { onRemove(t.id); toast.success("Vorlage gelöscht."); }}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
            <ul className="space-y-1">
              {t.blocks.map((b) => (
                <li key={b.id} className="flex items-center gap-2 text-xs">
                  <span className={cn("size-1.5 rounded-full", TYPE_STYLES[b.type].dot)} />
                  <span className="font-mono text-[10px] text-muted-foreground w-[80px]">{b.startTime}–{b.endTime}</span>
                  <span className="truncate">{b.title}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Vorlage bearbeiten</DialogTitle></DialogHeader>
          {edit && (
            <TemplateForm
              key={edit.id}
              initial={edit}
              onSubmit={(t) => { onUpsert(t); toast.success("Vorlage gespeichert."); setEdit(null); }}
              onCancel={() => setEdit(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

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

      <div className="grid grid-cols-3 gap-3">
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

      <div className="grid grid-cols-2 gap-3">
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

// ---------------------------------------------------------------------------
// Template Form
// ---------------------------------------------------------------------------

const TemplateForm = ({
  initial, onSubmit, onCancel,
}: {
  initial: DayTemplate;
  onSubmit: (t: DayTemplate) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [blocks, setBlocks] = useState(initial.blocks);

  const updateBlock = (i: number, patch: Partial<DayTemplate["blocks"][number]>) =>
    setBlocks((bs) => bs.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  const addBlock = () =>
    setBlocks((bs) => [
      ...bs,
      { id: `b${bs.length + 1}-${Math.random().toString(36).slice(2, 5)}`, title: "Neuer Block", startTime: "12:00", endTime: "13:00", type: "block" },
    ]);

  const removeBlock = (i: number) => setBlocks((bs) => bs.filter((_, j) => j !== i));

  const submit = () => {
    if (!name.trim()) { toast.error("Bitte Name eingeben."); return; }
    onSubmit({ ...initial, name: name.trim(), description: description.trim() || undefined, blocks });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Beschreibung</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Blöcke</Label>
          <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={addBlock}>
            <Plus className="size-3.5" /> Block
          </Button>
        </div>
        <div className="space-y-1.5 max-h-[320px] overflow-auto pr-1">
          {blocks.map((b, i) => (
            <div key={b.id} className="grid grid-cols-[1fr_80px_80px_120px_32px] gap-1.5 items-center">
              <Input value={b.title} onChange={(e) => updateBlock(i, { title: e.target.value })} className="h-8 text-xs" />
              <Input type="time" value={b.startTime} onChange={(e) => updateBlock(i, { startTime: e.target.value })} className="h-8 text-xs" />
              <Input type="time" value={b.endTime} onChange={(e) => updateBlock(i, { endTime: e.target.value })} className="h-8 text-xs" />
              <Select value={b.type} onValueChange={(v) => updateBlock(i, { type: v as CalendarEventType })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CALENDAR_EVENT_TYPE_LABELS) as CalendarEventType[]).map((k) => (
                    <SelectItem key={k} value={k}>{CALENDAR_EVENT_TYPE_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeBlock(i)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} className="gap-1.5"><X className="size-3.5" /> Abbrechen</Button>
        <Button onClick={submit} className="bg-gradient-brand gap-1.5"><Save className="size-3.5" /> Speichern</Button>
      </DialogFooter>
    </div>
  );
};
