import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useProcessStore } from "@/store/processStore";
import { CalendarEvent } from "@/data/process";
import { useCalendarPanelStore } from "@/store/calendarPanelStore";
import { TYPE_STYLES, toISO, minutesFromMidnight, useNow } from "./calendarGrid";

const NowMarker = () => (
  <div className="flex items-center gap-2 px-0.5 py-0.5" aria-hidden>
    <span className="h-px flex-1 bg-destructive/70" />
    <span className="text-[9px] font-semibold uppercase tracking-wider text-destructive shrink-0">Jetzt</span>
    <span className="h-px flex-1 bg-destructive/70" />
  </div>
);

const EventRow = ({ event }: { event: CalendarEvent }) => {
  const style = TYPE_STYLES[event.type];
  return (
    <Link
      to="/kalender"
      className={cn(
        "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs transition-smooth hover:opacity-90",
        style.className,
        event.done && "opacity-60",
      )}
    >
      <span className={cn("mt-1 size-1.5 rounded-full shrink-0", style.dot)} />
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium truncate", event.done && "line-through")}>{event.title}</p>
        <p className="opacity-80 truncate">
          {event.startTime}–{event.endTime}
          {event.location && ` · ${event.location}`}
        </p>
      </div>
    </Link>
  );
};

/**
 * Angepinntes Kalender-Panel am rechten Bildschirmrand — bleibt über
 * Seitenwechsel hinweg sichtbar, damit man immer im Blick hat, was ansteht.
 * Zeigt eine Tagesagenda mit einer live aktualisierten „Jetzt"-Markierung.
 */
export const PinnedCalendarPanel = () => {
  const setPinned = useCalendarPanelStore((s) => s.setPinned);
  const events = useProcessStore((s) => s.calendarEvents);
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const now = useNow();

  const iso = toISO(anchorDate);
  const isToday = iso === toISO(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const dayEvents = useMemo(
    () => events
      .filter((e) => e.date === iso)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [events, iso],
  );

  const step = (delta: number) => {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() + delta);
    setAnchorDate(d);
  };

  const nowInsertIdx = isToday
    ? (() => {
        const idx = dayEvents.findIndex((e) => minutesFromMidnight(e.startTime) > nowMin);
        return idx === -1 ? dayEvents.length : idx;
      })()
    : -1;

  const rows: React.ReactNode[] = [];
  dayEvents.forEach((e, i) => {
    if (i === nowInsertIdx) rows.push(<NowMarker key="now-marker" />);
    rows.push(<EventRow key={e.id} event={e} />);
  });
  if (nowInsertIdx === dayEvents.length) rows.push(<NowMarker key="now-marker" />);

  return (
    <aside className="hidden lg:flex w-80 shrink-0 flex-col border-l border-sidebar-border bg-sidebar h-dvh sticky top-0">
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="size-4 text-muted-foreground shrink-0" />
          <span className="font-display font-semibold text-sm truncate">Kalender</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button asChild variant="ghost" size="icon" className="size-7 text-sidebar-foreground/70 hover:text-sidebar-accent-foreground">
            <Link to="/kalender" aria-label="Neuer Termin">
              <Plus className="size-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
            onClick={() => setPinned(false)}
            aria-label="Kalender-Panel lösen"
          >
            <PinOff className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 border-b border-sidebar-border shrink-0">
        <Button variant="outline" size="icon" className="size-7" onClick={() => step(-1)} aria-label="Vorheriger Tag">
          <ChevronLeft className="size-3.5" />
        </Button>
        <div className="text-center min-w-0">
          <p className={cn("text-xs font-semibold truncate", isToday && "text-primary-glow")}>
            {anchorDate.toLocaleDateString("de-DE", { weekday: "long" })}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {anchorDate.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <Button variant="outline" size="icon" className="size-7" onClick={() => step(1)} aria-label="Nächster Tag">
          <ChevronRight className="size-3.5" />
        </Button>
      </div>

      {!isToday && (
        <div className="px-4 pt-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-full px-2 text-[11px] text-muted-foreground"
            onClick={() => setAnchorDate(new Date())}
          >
            Zu heute springen
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {dayEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Keine Termine an diesem Tag.</p>
        ) : (
          <div className="flex flex-col gap-1.5">{rows}</div>
        )}
      </div>

      <div className="px-3 py-2.5 border-t border-sidebar-border shrink-0">
        <Button asChild variant="outline" size="sm" className="w-full text-xs gap-1.5">
          <Link to="/kalender">
            <CalendarDays className="size-3.5" /> Kalender öffnen
          </Link>
        </Button>
      </div>
    </aside>
  );
};
