import { useState } from "react";
import { Plus, Trash2, GripVertical, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Item { id: string; title?: string; label?: string; done?: boolean; dueDate?: string }

interface Props {
  title: string;
  description?: string;
  items: Item[];
  onAdd: (text: string) => void;
  onRemove: (id: string) => void;
  onToggle?: (id: string) => void;
  /** Fälligkeitsdatum pro Eintrag setzen/entfernen (ISO YYYY-MM-DD oder undefined). */
  onChangeDueDate?: (id: string, dueDate?: string) => void;
  placeholder?: string;
  showCheckbox?: boolean;
  disabled?: boolean;
}

const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseISO = (iso?: string) => (iso ? new Date(`${iso}T00:00:00`) : undefined);

export const TodoList = ({
  title, description, items, onAdd, onRemove, onToggle, onChangeDueDate,
  placeholder = "Neuer Eintrag…", showCheckbox, disabled,
}: Props) => {
  const [draft, setDraft] = useState("");

  const submit = () => {
    const v = draft.trim();
    if (!v) return;
    onAdd(v);
    setDraft("");
  };

  const todayISO = toISO(new Date());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-sm">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{items.length}</span>
      </div>

      <div className="space-y-2">
        {items.map((it) => {
          const overdue = !!it.dueDate && !it.done && it.dueDate < todayISO;
          return (
            <div key={it.id} className={cn(
              "flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background/40",
              it.done && "opacity-60"
            )}>
              <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
              {showCheckbox && (
                <Checkbox checked={!!it.done} onCheckedChange={() => onToggle?.(it.id)} disabled={disabled} />
              )}
              <span className={cn("text-sm flex-1 min-w-0 truncate", it.done && "line-through text-muted-foreground")}>{it.title ?? it.label}</span>

              {onChangeDueDate && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      className={cn(
                        "h-7 px-2 gap-1 text-xs shrink-0",
                        it.dueDate ? "text-foreground" : "text-muted-foreground",
                        overdue && "text-destructive",
                      )}
                    >
                      <CalendarIcon className="size-3.5" />
                      {it.dueDate ? format(parseISO(it.dueDate)!, "dd.MM.yyyy") : "Fällig?"}
                      {it.dueDate && !disabled && (
                        <span
                          role="button"
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onChangeDueDate(it.id, undefined); }}
                          className="ml-1 -mr-1 inline-flex size-4 items-center justify-center rounded hover:bg-muted"
                          aria-label="Datum entfernen"
                        >
                          <X className="size-3" />
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      locale={de}
                      selected={parseISO(it.dueDate)}
                      onSelect={(d) => onChangeDueDate(it.id, d ? toISO(d) : undefined)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              )}

              {!disabled && (
                <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => onRemove(it.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border rounded-lg">Noch keine Einträge.</p>
        )}
      </div>

      {!disabled && (
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
            placeholder={placeholder}
            className="bg-background/40"
          />
          <Button onClick={submit} className="bg-gradient-brand gap-1.5 shrink-0">
            <Plus className="size-4" /> Hinzufügen
          </Button>
        </div>
      )}
    </div>
  );
};
