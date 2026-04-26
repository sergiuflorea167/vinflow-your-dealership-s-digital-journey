// Kompakter, globaler Zeitraum-Picker für die KPI-Seite & das Dashboard.
import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  KpiRangePreset,
  buildPresetRange,
  useKpiRange,
} from "@/context/KpiRangeContext";

const PRESETS: { key: KpiRangePreset; label: string }[] = [
  { key: "week",    label: "Woche" },
  { key: "month",   label: "Monat" },
  { key: "quarter", label: "Quartal" },
  { key: "ytd",     label: "YTD" },
  { key: "12m",     label: "12 Monate" },
  { key: "all",     label: "Gesamt" },
];

export const KpiRangePicker = ({ className }: { className?: string }) => {
  const { range, setPreset, setCustom } = useKpiRange();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ from?: Date; to?: Date }>({
    from: range.from,
    to: range.to,
  });

  return (
    <div
      className={cn(
        "flex items-center gap-2 flex-wrap rounded-xl border border-border bg-card/60 p-1.5",
        className
      )}
    >
      <div className="flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        <span className="hidden sm:inline">Zeitraum</span>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {PRESETS.map((p) => {
          const active = range.preset === p.key;
          return (
            <Button
              key={p.key}
              size="sm"
              variant={active ? "default" : "ghost"}
              className={cn(
                "h-7 px-2.5 text-xs",
                active && "bg-primary text-primary-foreground shadow-glow"
              )}
              onClick={() => setPreset(p.key)}
            >
              {p.label}
            </Button>
          );
        })}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant={range.preset === "custom" ? "default" : "ghost"}
              className={cn(
                "h-7 px-2.5 text-xs gap-1.5",
                range.preset === "custom" &&
                  "bg-primary text-primary-foreground shadow-glow"
              )}
            >
              <CalendarIcon className="size-3.5" />
              {range.preset === "custom"
                ? `${format(range.from, "dd.MM.yy")} – ${format(range.to, "dd.MM.yy")}`
                : "Benutzerdefiniert"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3 space-y-3" align="end">
            <div className="text-xs text-muted-foreground">
              Wähle Start- und Enddatum
            </div>
            <Calendar
              mode="range"
              defaultMonth={draft.from ?? range.from}
              selected={{ from: draft.from, to: draft.to }}
              onSelect={(r) => setDraft({ from: r?.from, to: r?.to })}
              numberOfMonths={2}
              locale={de}
              className={cn("p-0 pointer-events-auto")}
            />
            <div className="flex items-center justify-between gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => {
                  const r = buildPresetRange("ytd");
                  setDraft({ from: r.from, to: r.to });
                }}
              >
                Zurücksetzen
              </Button>
              <Button
                size="sm"
                className="bg-gradient-brand text-xs"
                disabled={!draft.from || !draft.to}
                onClick={() => {
                  if (draft.from && draft.to) {
                    setCustom(draft.from, draft.to);
                    setOpen(false);
                  }
                }}
              >
                Anwenden
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="px-2 text-[11px] text-muted-foreground border-l border-border ml-1">
        {range.label}
      </div>
    </div>
  );
};
