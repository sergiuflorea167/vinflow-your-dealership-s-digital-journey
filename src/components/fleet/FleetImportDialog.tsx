import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, FileText, Upload, AlertCircle, CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";
import {
  parseImportFile,
  buildImportResult,
  downloadTemplate,
  ImportResult,
  ParsedFile,
  FIELD_DEFS,
  FIELD_GROUP_LABELS,
  FieldDef,
  DEFAULT_EXPORT_KEYS,
} from "@/lib/fleetIO";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { VehicleIntakePayload } from "@/components/fleet/VehicleIntakeDialog";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultLocation: string;
  onImport: (rows: VehicleIntakePayload[]) => void;
}

const IMPORTABLE_FIELDS = FIELD_DEFS.filter((f) => !!f.set);

export const FleetImportDialog = ({ open, onOpenChange, defaultLocation, onImport }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);

  const reset = () => {
    setParsed(null);
    setMapping({});
    setResult(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    try {
      const res = await parseImportFile(file, defaultLocation);
      setParsed(res.parsed);
      setMapping(res.mapping);
      setResult({ rows: res.rows, validCount: res.validCount, errorCount: res.errorCount });
    } catch (e: any) {
      toast.error("Datei konnte nicht gelesen werden: " + (e?.message ?? "unbekannt"));
      reset();
    } finally {
      setParsing(false);
    }
  };

  const updateMapping = (sourceHeader: string, fieldKey: string | null) => {
    if (!parsed) return;
    const next = { ...mapping, [sourceHeader]: fieldKey };
    setMapping(next);
    setResult(buildImportResult(parsed, next, defaultLocation));
  };

  const confirm = () => {
    if (!result) return;
    const valid = result.rows.filter((r) => r.payload).map((r) => r.payload!);
    if (valid.length === 0) {
      toast.error("Keine gültigen Zeilen zum Import.");
      return;
    }
    onImport(valid);
    toast.success(`${valid.length} Fahrzeug${valid.length === 1 ? "" : "e"} importiert.`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>Bestand importieren</DialogTitle>
          <DialogDescription>
            CSV oder Excel (.xlsx) hochladen. Spalten werden automatisch erkannt — du kannst
            jede Zuordnung manuell anpassen oder Spalten ignorieren.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!parsed ? (
            <>
              <Card className="p-6 border-dashed flex flex-col items-center justify-center gap-3 text-center">
                <Upload className="size-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Datei zum Import auswählen</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unterstützt: .csv, .xlsx, .xls
                  </p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                <Button onClick={() => inputRef.current?.click()} disabled={parsing}>
                  {parsing ? "Lese Datei…" : "Datei wählen"}
                </Button>
              </Card>

              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="text-muted-foreground">Vorlage herunterladen:</span>
                <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => downloadTemplate("xlsx", DEFAULT_EXPORT_KEYS)}>
                  <FileSpreadsheet className="size-3.5" /> Excel
                </Button>
                <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => downloadTemplate("csv", DEFAULT_EXPORT_KEYS)}>
                  <FileText className="size-3.5" /> CSV
                </Button>
                <span className="text-muted-foreground ml-2">
                  Pflichtfelder: <span className="text-foreground">Marke, Modell</span>. Fehlt eine VIN, wird automatisch ein Platzhalter erzeugt (du kannst die VIN später nachtragen). Zweizeilige Header (EK/VK-Gruppen) werden automatisch erkannt.
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-sm">
                  <p className="font-medium">{fileName}</p>
                  <p className="text-xs text-muted-foreground">{parsed.rawRows.length} Zeilen · {parsed.headers.length} Spalten erkannt</p>
                </div>
                <div className="flex gap-2 items-center">
                  {result && (
                    <>
                      <Badge className="bg-success/15 text-success border-success/30 gap-1">
                        <CheckCircle2 className="size-3" /> {result.validCount} gültig
                      </Badge>
                      {result.errorCount > 0 && (
                        <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1">
                          <AlertCircle className="size-3" /> {result.errorCount} Fehler
                        </Badge>
                      )}
                    </>
                  )}
                  <Button size="sm" variant="ghost" onClick={reset}>Andere Datei</Button>
                </div>
              </div>

              {/* Mapping-Tabelle */}
              <Card className="overflow-hidden">
                <div className="px-3 py-2 border-b border-border bg-surface-elevated/40">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Spalten-Zuordnung
                  </p>
                </div>
                <div className="max-h-[28vh] overflow-auto divide-y divide-border/50">
                  {parsed.headers.map((h) => (
                    <div key={h} className="flex items-center gap-3 px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{h}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          Beispiel: {String(parsed.rawRows[0]?.[h] ?? "—").slice(0, 60) || "—"}
                        </p>
                      </div>
                      <div className="text-muted-foreground text-xs">→</div>
                      <div className="w-64 shrink-0">
                        <Select
                          value={mapping[h] ?? "__none__"}
                          onValueChange={(v) => updateMapping(h, v === "__none__" ? null : v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            <SelectItem value="__none__">
                              <span className="text-muted-foreground">— Ignorieren —</span>
                            </SelectItem>
                            {(Object.keys(FIELD_GROUP_LABELS) as FieldDef["group"][]).map((group) => {
                              const fields = IMPORTABLE_FIELDS.filter((f) => f.group === group);
                              if (fields.length === 0) return null;
                              return (
                                <div key={group}>
                                  <p className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                                    {FIELD_GROUP_LABELS[group]}
                                  </p>
                                  {fields.map((f) => (
                                    <SelectItem key={f.key} value={f.key}>{f.header}</SelectItem>
                                  ))}
                                </div>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Vorschau */}
              {result && (
                <Card className="overflow-hidden">
                  <div className="px-3 py-2 border-b border-border bg-surface-elevated/40">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Vorschau ({result.rows.length} Zeilen)
                    </p>
                  </div>
                  <div className="max-h-[30vh] overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-background/95 backdrop-blur z-10">
                        <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">VIN</th>
                          <th className="px-3 py-2">Fahrzeug</th>
                          <th className="px-3 py-2 text-right">VK</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Kaufdatum</th>
                          <th className="px-3 py-2">Verkauft am</th>
                          <th className="px-3 py-2">Hinweis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((r) => (
                          <tr key={r.rowNumber} className="border-b border-border/50">
                            <td className="px-3 py-2 text-muted-foreground">{r.rowNumber}</td>
                            <td className="px-3 py-2 font-mono">{r.payload?.vin ?? "—"}</td>
                            <td className="px-3 py-2">{r.payload ? `${r.payload.make} ${r.payload.model}` : "—"}</td>
                            <td className="px-3 py-2 text-right">{r.payload ? `${r.payload.listPrice.toLocaleString("de-DE")} €` : "—"}</td>
                            <td className="px-3 py-2">{r.payload?.status ?? "—"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{r.payload?.arrivedAt ? r.payload.arrivedAt.slice(0, 10) : "—"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{r.payload?.soldAt ? r.payload.soldAt.slice(0, 10) : "—"}</td>
                            <td className="px-3 py-2">
                              {r.errors.length > 0
                                ? <span className="text-destructive text-[11px]">{r.errors.join(", ")}</span>
                                : <span className="text-success text-[11px]">OK</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button
            onClick={confirm}
            disabled={!result || result.validCount === 0}
            className="bg-gradient-brand gap-1.5"
          >
            <Download className="size-4" />
            {result ? `${result.validCount} Fahrzeuge importieren` : "Importieren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
