import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Item { id: string; title?: string; label?: string; done?: boolean }

interface Props {
  title: string;
  description?: string;
  items: Item[];
  onAdd: (text: string) => void;
  onRemove: (id: string) => void;
  onToggle?: (id: string) => void;
  placeholder?: string;
  showCheckbox?: boolean;
  disabled?: boolean;
}

export const TodoList = ({ title, description, items, onAdd, onRemove, onToggle, placeholder = "Neuer Eintrag…", showCheckbox, disabled }: Props) => {
  const [draft, setDraft] = useState("");

  const submit = () => {
    const v = draft.trim();
    if (!v) return;
    onAdd(v);
    setDraft("");
  };

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
        {items.map((it) => (
          <div key={it.id} className={cn(
            "flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background/40",
            it.done && "opacity-60"
          )}>
            <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
            {showCheckbox && (
              <Checkbox checked={!!it.done} onCheckedChange={() => onToggle?.(it.id)} disabled={disabled} />
            )}
            <span className={cn("text-sm flex-1", it.done && "line-through text-muted-foreground")}>{it.title ?? it.label}</span>
            {!disabled && (
              <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => onRemove(it.id)}>
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        ))}
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
