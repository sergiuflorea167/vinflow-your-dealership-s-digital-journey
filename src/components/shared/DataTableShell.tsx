import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DataTableShellProps {
  children: ReactNode;
  /** Optional Footer / Hinweis unter der Tabelle */
  footer?: ReactNode;
  /** Wenn der Eltern-Container flex-col + min-h-0 ist, fülle restl. Höhe (default true). */
  fill?: boolean;
  className?: string;
}

/**
 * Einheitliche, scrollbare Tabellen-Hülle.
 * - Sticky <thead> via `[&_thead]:sticky` Selektor
 * - Kompakte Zellen via `[&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2`
 * - Einheitliche Schriftgröße `text-xs`
 * - Scrollt nur intern
 */
export const DataTableShell = ({ children, footer, fill = true, className }: DataTableShellProps) => {
  return (
    <Card
      className={cn(
        "bg-card border-border overflow-hidden flex flex-col min-h-0",
        fill && "flex-1",
        className,
      )}
    >
      <div
        className={cn(
          "overflow-auto min-h-0",
          "[&_table]:w-full [&_table]:text-xs",
          "[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-background/95 [&_thead]:backdrop-blur",
          "[&_thead_th]:px-3 [&_thead_th]:py-2 [&_thead_th]:font-medium [&_thead_th]:text-left [&_thead_th]:text-muted-foreground [&_thead_th]:uppercase [&_thead_th]:tracking-wider [&_thead_th]:text-[10px]",
          "[&_tbody_td]:px-3 [&_tbody_td]:py-2",
          "[&_tbody_tr]:border-b [&_tbody_tr]:border-border/50 [&_tbody_tr:last-child]:border-0",
          fill ? "flex-1" : "",
        )}
      >
        {children}
      </div>
      {footer && (
        <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border/50 shrink-0">
          {footer}
        </div>
      )}
    </Card>
  );
};
