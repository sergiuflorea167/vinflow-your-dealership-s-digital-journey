import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";

export interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

interface Props<K extends string> {
  label: string;
  sortKey: K;
  state: SortState<K>;
  onChange: (next: SortState<K>) => void;
  align?: "left" | "right" | "center";
  className?: string;
}

/**
 * Klickbarer Tabellen-Header mit Sortier-Indikator.
 * Erstes Klick → asc, zweites → desc, drittes → asc (toggle).
 */
export const SortableTh = <K extends string>({
  label, sortKey, state, onChange, align = "left", className,
}: Props<K>) => {
  const active = state.key === sortKey;
  const Icon = !active ? ArrowUpDown : state.dir === "asc" ? ArrowUp : ArrowDown;

  const handleClick = () => {
    if (!active) {
      onChange({ key: sortKey, dir: "asc" });
    } else {
      onChange({ key: sortKey, dir: state.dir === "asc" ? "desc" : "asc" });
    }
  };

  return (
    <th
      className={cn(
        "px-5 py-3 font-medium select-none",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1.5 uppercase tracking-wider text-xs transition-smooth hover:text-foreground",
          active ? "text-primary-glow" : "text-muted-foreground",
          align === "right" && "flex-row-reverse",
        )}
      >
        {label}
        <Icon className={cn("size-3", active ? "opacity-100" : "opacity-50")} />
      </button>
    </th>
  );
};
