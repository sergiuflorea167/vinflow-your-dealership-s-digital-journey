import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CalendarEvent, CalendarEventType, CALENDAR_EVENT_TYPE_LABELS } from "@/data/process";

// ---------------------------------------------------------------------------
// Datum-/Zeit-Helfer
// ---------------------------------------------------------------------------

export const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const fromISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

export const startOfWeek = (d: Date) => {
  const day = d.getDay() === 0 ? 7 : d.getDay(); // Mo=1, So=7
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (day - 1));
  return monday;
};

export const TYPE_STYLES: Record<CalendarEventType, { className: string; dot: string }> = {
  appointment: { className: "bg-primary/15 text-primary-glow border-primary/30",       dot: "bg-primary" },
  todo:        { className: "bg-warning/15 text-warning border-warning/30",            dot: "bg-warning" },
  block:       { className: "bg-muted/40 text-muted-foreground border-border",         dot: "bg-muted-foreground" },
  viewing:     { className: "bg-info/15 text-info border-info/30",                     dot: "bg-info" },
  handover:    { className: "bg-success/15 text-success border-success/30",            dot: "bg-success" },
  call:        { className: "bg-accent/15 text-accent-foreground border-accent/30",    dot: "bg-accent-foreground" },
  internal:    { className: "bg-secondary text-secondary-foreground border-border",    dot: "bg-secondary-foreground" },
};

export const HOURS = Array.from({ length: 15 }, (_, i) => 6 + i); // 06–20
export const HOUR_HEIGHT = 56; // px

export const minutesFromMidnight = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export const minutesToHHMM = (mins: number) => {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(mins)));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

const SNAP_MIN = 15;
const snap = (mins: number) => Math.round(mins / SNAP_MIN) * SNAP_MIN;
export const PX_PER_MIN = HOUR_HEIGHT / 60;
export const DAY_START_MIN = HOURS[0] * 60;
export const DAY_END_MIN = (HOURS[HOURS.length - 1] + 1) * 60;

export const addDaysISO = (iso: string, delta: number) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + delta);
  return toISO(d);
};

/** Aktuelle Uhrzeit, minütlich aktualisiert — Basis für die Outlook-artige „Jetzt“-Linie. */
export const useNow = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
};

// ---------------------------------------------------------------------------
// Draggable / resizable event hook
// ---------------------------------------------------------------------------

type DragMode = "move" | "resize";

interface UseEventDragOptions {
  event: CalendarEvent;
  /** Pixel height of one minute. */
  pxPerMin: number;
  /** Optional: width of one day column in px, enables horizontal day shift. */
  dayColumnWidth?: number;
  /** First day shown (used together with dayColumnWidth). */
  weekStartISO?: string;
  /** Number of day columns shown (default 1). */
  dayCount?: number;
  onCommit: (patch: { date?: string; startTime: string; endTime: string }) => void;
}

const useEventDrag = ({
  event, pxPerMin, dayColumnWidth, weekStartISO, dayCount = 1, onCommit,
}: UseEventDragOptions) => {
  const [preview, setPreview] = useState<{ startMin: number; endMin: number; date: string } | null>(null);
  const previewRef = useRef<{ startMin: number; endMin: number; date: string } | null>(null);
  const setPreviewBoth = useCallback(
    (p: { startMin: number; endMin: number; date: string } | null) => {
      previewRef.current = p;
      setPreview(p);
    },
    [],
  );

  // Latest values kept in refs so the window listeners are stable.
  const cfgRef = useRef({ event, pxPerMin, dayColumnWidth, weekStartISO, dayCount, onCommit });
  useEffect(() => {
    cfgRef.current = { event, pxPerMin, dayColumnWidth, weekStartISO, dayCount, onCommit };
  }, [event, pxPerMin, dayColumnWidth, weekStartISO, dayCount, onCommit]);

  const stateRef = useRef<{
    mode: DragMode;
    startY: number;
    startX: number;
    origStart: number;
    origEnd: number;
    origDate: string;
    moved: boolean;
    pointerId: number;
  } | null>(null);

  const justDraggedRef = useRef(false);

  const handleMove = useCallback((e: PointerEvent) => {
    const s = stateRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    const cfg = cfgRef.current;
    const dyMin = (e.clientY - s.startY) / cfg.pxPerMin;
    const dx = e.clientX - s.startX;
    if (Math.abs(e.clientY - s.startY) > 3 || Math.abs(dx) > 3) s.moved = true;

    let newDate = s.origDate;
    if (cfg.dayColumnWidth && cfg.weekStartISO && cfg.dayCount > 1 && s.mode === "move") {
      const dayDelta = Math.round(dx / cfg.dayColumnWidth);
      const baseIdx = Math.round(
        (fromISO(s.origDate).getTime() - fromISO(cfg.weekStartISO).getTime()) / 86400000,
      );
      const targetIdx = Math.max(0, Math.min(cfg.dayCount - 1, baseIdx + dayDelta));
      newDate = addDaysISO(cfg.weekStartISO, targetIdx);
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
  }, [setPreviewBoth]);

  const handleEnd = useCallback((e: PointerEvent) => {
    const s = stateRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleEnd);
    window.removeEventListener("pointercancel", handleEnd);
    const p = previewRef.current;
    const wasMoved = s.moved;
    const cfg = cfgRef.current;
    stateRef.current = null;
    setPreviewBoth(null);
    if (!p || !wasMoved) return;
    justDraggedRef.current = true;
    window.setTimeout(() => { justDraggedRef.current = false; }, 80);
    const startTime = minutesToHHMM(p.startMin);
    const endTime = minutesToHHMM(p.endMin);
    if (
      startTime === cfg.event.startTime &&
      endTime === cfg.event.endTime &&
      p.date === cfg.event.date
    ) return;
    const patch: { date?: string; startTime: string; endTime: string } = {
      startTime,
      endTime,
    };
    if (p.date !== cfg.event.date) patch.date = p.date;
    cfg.onCommit(patch);
  }, [handleMove, setPreviewBoth]);

  useEffect(() => () => {
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleEnd);
    window.removeEventListener("pointercancel", handleEnd);
  }, [handleMove, handleEnd]);

  const startDrag = useCallback((mode: DragMode, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const cfg = cfgRef.current;
    stateRef.current = {
      mode,
      startY: e.clientY,
      startX: e.clientX,
      origStart: minutesFromMidnight(cfg.event.startTime),
      origEnd: minutesFromMidnight(cfg.event.endTime),
      origDate: cfg.event.date,
      moved: false,
      pointerId: e.pointerId,
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
  }, [handleMove, handleEnd]);

  return {
    preview,
    moveHandlers: {
      onPointerDown: (e: React.PointerEvent) => startDrag("move", e),
    },
    resizeHandlers: {
      onPointerDown: (e: React.PointerEvent) => startDrag("resize", e),
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
  dayColumnWidth?: number;
  weekStartISO?: string;
  dayCount?: number;
  /** Visual variant. */
  compact?: boolean;
  /** Extra content rendered on the right (e.g. done toggle). */
  rightSlot?: React.ReactNode;
}

const DraggableEvent = ({
  event, onClick, onCommit, dayColumnWidth, weekStartISO, dayCount, compact, rightSlot,
}: DraggableEventProps) => {
  const { preview, moveHandlers, resizeHandlers, suppressClick } = useEventDrag({
    event,
    pxPerMin: PX_PER_MIN,
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
        className="absolute left-0 right-0 -bottom-0.5 h-2.5 cursor-ns-resize hover:bg-primary/30 rounded-b-md touch-none"
        aria-label="Größe ändern"
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Jetzt-Linie (wie bei Outlook) — zeigt den aktuellen Zeitpunkt im Zeitraster
// ---------------------------------------------------------------------------

const NowLine = ({ days, hourHeight = HOUR_HEIGHT }: { days: Date[]; hourHeight?: number }) => {
  const now = useNow();
  const nowISO = toISO(now);
  const dayIdx = days.findIndex((d) => toISO(d) === nowISO);
  const pxPerMin = hourHeight / 60;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (dayIdx === -1 || nowMin < DAY_START_MIN || nowMin > DAY_END_MIN) return null;
  const top = (nowMin - DAY_START_MIN) * pxPerMin;

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
      style={{ top }}
      aria-hidden
    >
      <span className="-ml-1 size-2 shrink-0 rounded-full bg-destructive shadow-sm" />
      <span className="h-px flex-1 bg-destructive/70" />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Zeitraster (Wochen- oder Tagesansicht, je nach Anzahl der übergebenen Tage)
// ---------------------------------------------------------------------------

export interface CalendarTimeGridProps {
  /** 1 Tag = Tagesansicht, 7 Tage = Wochenansicht. */
  days: Date[];
  eventsByDay: Record<string, CalendarEvent[]>;
  onEventClick: (e: CalendarEvent) => void;
  onEventCommit: (id: string, patch: { date?: string; startTime: string; endTime: string }) => void;
  /** Klick auf den Spaltenkopf eines Tages (z. B. um einen Termin anzulegen). */
  onDayHeaderClick?: (iso: string) => void;
  /** Kompaktere Event-Blöcke (Standard: automatisch ab mehreren Tagen). */
  compact?: boolean;
  /** Kopfzeile mit Wochentag/Datum je Spalte anzeigen (Standard: an). */
  showDayHeader?: boolean;
  hourHeight?: number;
}

export const CalendarTimeGrid = ({
  days, eventsByDay, onEventClick, onEventCommit, onDayHeaderClick,
  compact, showDayHeader = true, hourHeight = HOUR_HEIGHT,
}: CalendarTimeGridProps) => {
  const dayColRef = useRef<HTMLDivElement>(null);
  const [dayColWidth, setDayColWidth] = useState(0);
  const todayISO = toISO(new Date());
  const isMultiDay = days.length > 1;
  const resolvedCompact = compact ?? isMultiDay;
  const weekStartISO = toISO(days[0]);

  useEffect(() => {
    if (!dayColRef.current) return;
    const el = dayColRef.current;
    const update = () => setDayColWidth(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const gridColsClass = isMultiDay
    ? "grid-cols-[56px_repeat(7,minmax(0,1fr))]"
    : "grid-cols-[56px_1fr]";

  return (
    <div>
      {showDayHeader && (
        <div className={cn("grid border-b border-border bg-background/60", gridColsClass)}>
          <div />
          {days.map((d) => {
            const iso = toISO(d);
            const isToday = iso === todayISO;
            const headerClass = cn(
              "px-2 py-2 text-left border-l border-border transition-smooth",
              onDayHeaderClick && "hover:bg-surface-elevated/40",
              isToday && "bg-primary/10",
            );
            const content = (
              <>
                <p className={cn("text-[10px] uppercase tracking-wider", isToday ? "text-primary-glow" : "text-muted-foreground")}>
                  {d.toLocaleDateString("de-DE", { weekday: "short" })}
                </p>
                <p className={cn("font-display font-semibold text-sm", isToday && "text-primary-glow")}>
                  {d.getDate().toString().padStart(2, "0")}.{(d.getMonth() + 1).toString().padStart(2, "0")}
                </p>
              </>
            );
            return onDayHeaderClick ? (
              <button key={iso} type="button" onClick={() => onDayHeaderClick(iso)} className={headerClass}>
                {content}
              </button>
            ) : (
              <div key={iso} className={headerClass}>{content}</div>
            );
          })}
        </div>
      )}

      <div
        className={cn("grid relative", gridColsClass)}
        style={{ height: HOURS.length * hourHeight }}
      >
        {/* Stundenraster */}
        <div className="relative border-r border-border">
          {HOURS.map((h, i) => (
            <div key={h} className="absolute left-0 right-0 text-[10px] text-muted-foreground px-1.5"
                 style={{ top: i * hourHeight }}>
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        {/* Tagesspalten */}
        {days.map((d, idx) => {
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
                     style={{ top: i * hourHeight, height: hourHeight }} />
              ))}
              {dayEvents.map((e) => (
                <DraggableEvent
                  key={e.id}
                  event={e}
                  onClick={onEventClick}
                  onCommit={onEventCommit}
                  dayColumnWidth={dayColWidth}
                  weekStartISO={weekStartISO}
                  dayCount={days.length}
                  compact={resolvedCompact}
                />
              ))}
            </div>
          );
        })}
        {/* Jetzt-Linie über die volle Rasterbreite (ohne Stundenspalte) */}
        <div className="absolute inset-0 pointer-events-none" style={{ left: 56 }}>
          <NowLine days={days} hourHeight={hourHeight} />
        </div>
      </div>
    </div>
  );
};
