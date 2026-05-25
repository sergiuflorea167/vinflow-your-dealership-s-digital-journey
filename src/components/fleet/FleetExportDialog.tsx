import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, FileSpreadsheet, FileText, RotateCcw } from "lucide-react";
import {
  FIELD_DEFS,
  FIELD_GROUP_LABELS,
  DEFAULT_EXPORT_KEYS,
  FieldDef,
} from "@/lib/fleetIO";

const STORAGE_KEY = "vinflow-export-columns-v1";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  totalCount: number;
  /** Wird mit den ausgewählten/geordneten Keys + Format aufgerufen. */
  onExport: (columnKeys: string[], format: "xlsx" | "csv") => void;
  /** Optional: Vorlage statt Daten herunterladen. */
  onDownloadTemplate?: (columnKeys: string[], format: "xlsx" | "csv") => void;
}

const loadInitial = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_EXPORT_KEYS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
      const valid = parsed.filter((k) => FIELD_DEFS.some((f) => f.key === k));
      if (valid.length > 0) return valid;
    }
  } catch {}
  return DEFAULT_EXPORT_KEYS;
};

export const FleetExportDialog = ({ open, onOpenChange, totalCount, onExport, onDownloadTemplate }: Props) => {
  const [selected, setSelected] = useState<string[]>(loadInitial);

  useEffect(() => {
    if (open) setSelected(loadInitial());
  }, [open]);

  const save = (next: string[]) => {
    setSelected(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const toggle = (key: string) => {
    if (selected.includes(key)) save(selected.filter((k) => k !== key));
    else save([...selected, key]);
  };

  const move = (key: string, dir: -1 | 1) => {
    const idx = selected.indexOf(key);
    if (idx < 0) return;
    const next = [...selected];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    save(next);
  };

  const reset = () => save(DEFAULT_EXPORT_KEYS);
  const selectAll = () => save(FIELD_DEFS.map((f) => f.key));
  const selectNone = () => save([]);

  const grouped = useMemo(() => {
    const out: Record<string, FieldDef[]> = {};
    FIELD_DEFS.forEach((f) => {
      if (!out[f.group]) out[f.group] = [];
      out[f.group].push(f);
    });
    return out;
  }, []);

  const triggerExport = (format: "xlsx" | "csv") => {
    if (selected.length === 0) return;
    onExport(selected, format);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>Export konfigurieren</DialogTitle>
          <DialogDescription>
            Wähle die Spalten und ihre Reihenfolge. Die Konfiguration wird gespeichert
            und beim nächsten Export wiederverwendet. Gilt auch für die Importvorlage.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden min-h-0">
          {/* Links: verfügbare Felder gruppiert */}
          <div className="border-r border-border flex flex-col min-h-0">
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Verfügbare Felder</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAll}>Alle</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectNone}>Keine</Button>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {Object.entries(grouped).map(([group, fields]) => (
                  <div key={group}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                      {FIELD_GROUP_LABELS[group as FieldDef["group"]]}
                    </p>
                    <div className="space-y-1">
                      {fields.map((f) => (
                        <label
                          key={f.key}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-elevated/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={selected.includes(f.key)}
                            onCheckedChange={() => toggle(f.key)}
                          />
                          <span className="text-sm flex-1">{f.header}</span>
                          {!f.set && <Badge variant="outline" className="text-[9px] h-4 px-1.5">nur Export</Badge>}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Rechts: ausgewählte Reihenfolge */}
          <div className="flex flex-col min-h-0">
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Reihenfolge ({selected.length})
              </span>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={reset}>
                <RotateCcw className="size-3" /> Standard
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1">
                {selected.length === 0 ? (
                  <Card className="p-6 text-center text-xs text-muted-foreground">
                    Keine Spalten ausgewählt. Wähle links mind. eine Spalte.
                  </Card>
                ) : (
                  selected.map((key, i) => {
                    const f = FIELD_DEFS.find((x) => x.key === key);
                    if (!f) return null;
                    return (
                      <div key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-surface-elevated/30 border border-border/50">
                        <span className="text-[10px] text-muted-foreground w-5 text-right tabular-nums">{i + 1}</span>
                        <span className="text-sm flex-1 truncate">{f.header}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === 0} onClick={() => move(key, -1)}>
                          <ArrowUp className="size-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === selected.length - 1} onClick={() => move(key, 1)}>
                          <ArrowDown className="size-3" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border flex-wrap gap-2 sm:justify-between">
          <div className="flex gap-2">
            {onDownloadTemplate && (
              <>
                <Button variant="outline" size="sm" className="gap-1.5"
                  onClick={() => { onDownloadTemplate(selected, "xlsx"); }}
                  disabled={selected.length === 0}>
                  <FileSpreadsheet className="size-4" /> Vorlage (Excel)
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5"
                  onClick={() => { onDownloadTemplate(selected, "csv"); }}
                  disabled={selected.length === 0}>
                  <FileText className="size-4" /> Vorlage (CSV)
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button variant="outline" className="gap-1.5" onClick={() => triggerExport("csv")} disabled={selected.length === 0}>
              <FileText className="size-4" /> CSV ({totalCount})
            </Button>
            <Button className="bg-gradient-brand gap-1.5" onClick={() => triggerExport("xlsx")} disabled={selected.length === 0}>
              <FileSpreadsheet className="size-4" /> Excel ({totalCount})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
