import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, FileText, Upload, AlertCircle, CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";
import { parseImportFile, downloadTemplate, ImportResult } from "@/lib/fleetIO";
import { VehicleIntakePayload } from "@/components/fleet/VehicleIntakeDialog";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultLocation: string;
  onImport: (rows: VehicleIntakePayload[]) => void;
}

export const FleetImportDialog = ({ open, onOpenChange, defaultLocation, onImport }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);

  const reset = () => {
    setResult(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    try {
      const res = await parseImportFile(file, defaultLocation);
      setResult(res);
    } catch (e: any) {
      toast.error("Datei konnte nicht gelesen werden: " + (e?.message ?? "unbekannt"));
      reset();
    } finally {
      setParsing(false);
    }
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
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>Bestand importieren</DialogTitle>
          <DialogDescription>
            CSV oder Excel-Datei (.xlsx) mit Fahrzeugdaten hochladen. Spaltenüberschriften müssen mit der Vorlage übereinstimmen.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!result ? (
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

              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Vorlage herunterladen:</span>
                <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => downloadTemplate("xlsx")}>
                  <FileSpreadsheet className="size-3.5" /> Excel
                </Button>
                <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => downloadTemplate("csv")}>
                  <FileText className="size-3.5" /> CSV
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-medium">{fileName}</p>
                  <p className="text-xs text-muted-foreground">{result.rows.length} Zeilen erkannt</p>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-success/15 text-success border-success/30 gap-1">
                    <CheckCircle2 className="size-3" /> {result.validCount} gültig
                  </Badge>
                  {result.errorCount > 0 && (
                    <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1">
                      <AlertCircle className="size-3" /> {result.errorCount} Fehler
                    </Badge>
                  )}
                  <Button size="sm" variant="ghost" onClick={reset}>Andere Datei</Button>
                </div>
              </div>

              <Card className="overflow-hidden">
                <div className="max-h-[45vh] overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-background/95 backdrop-blur z-10">
                      <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">VIN</th>
                        <th className="px-3 py-2">Fahrzeug</th>
                        <th className="px-3 py-2 text-right">VK</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((r) => (
                        <tr key={r.rowNumber} className="border-b border-border/50">
                          <td className="px-3 py-2 text-muted-foreground">{r.rowNumber}</td>
                          <td className="px-3 py-2 font-mono">{r.payload?.vin ?? "—"}</td>
                          <td className="px-3 py-2">
                            {r.payload ? `${r.payload.make} ${r.payload.model}` : "—"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {r.payload ? `${r.payload.listPrice.toLocaleString("de-DE")} €` : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {r.errors.length > 0 ? (
                              <span className="text-destructive text-[11px]">{r.errors.join(", ")}</span>
                            ) : (
                              <span className="text-success text-[11px]">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
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
