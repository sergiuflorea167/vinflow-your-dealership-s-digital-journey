import { useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, FileText, Lock, CheckCircle2, ArrowRight, Download, Archive } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProcessStepper } from "@/components/process/ProcessStepper";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useProcessStore } from "@/store/processStore";
import { PROCESS_STEPS, ProcessStepKey, formatCurrency, formatDate, stepIndex } from "@/data/process";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ProcessDetail = () => {
  const { id } = useParams<{ id: string }>();
  const process = useProcessStore((s) => s.processes.find((p) => p.id === id));
  const completeStep = useProcessStore((s) => s.completeStep);
  const toggleChecklist = useProcessStore((s) => s.toggleChecklistItem);

  const [selected, setSelected] = useState<ProcessStepKey | undefined>(process?.currentStep);

  if (!process) return <Navigate to="/vorgaenge" replace />;

  const selectedKey = selected ?? process.currentStep;
  const selectedStep = PROCESS_STEPS.find((s) => s.key === selectedKey)!;
  const selectedIdx = stepIndex(selectedKey);
  const currentIdx = stepIndex(process.currentStep);
  const record = process.steps[selectedKey];
  const isCurrent = selectedIdx === currentIdx;
  const isCompleted = selectedIdx < currentIdx;
  const isLocked = selectedIdx > currentIdx;
  const nextStep = PROCESS_STEPS[currentIdx + 1];

  const checklistDone = process.checklist.filter((c) => c.done).length;
  const checklistTotal = process.checklist.length;
  const canCompleteOutbound = selectedKey !== "outbound_check" || checklistDone === checklistTotal;

  const handleComplete = () => {
    if (!canCompleteOutbound) {
      toast.error("Bitte alle Checklisten-Punkte abhaken.");
      return;
    }
    completeStep(process.id, selectedKey);
    toast.success(`${selectedStep.documentName} archiviert · ${nextStep ? `Weiter zu ${nextStep.label}` : "Vorgang abgeschlossen"}`);
    if (nextStep) setSelected(nextStep.key);
  };

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4">
          <Link to="/vorgaenge" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-smooth">
            <ArrowLeft className="size-4" /> Alle Vorgänge
          </Link>
          <Badge variant="outline" className="border-primary/30 text-primary-glow">
            Aktiver Schritt: {PROCESS_STEPS[currentIdx].shortLabel}
          </Badge>
        </div>

        {/* Header */}
        <Card className="p-6 bg-gradient-surface border-border shadow-card">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Vorgang {process.id}</p>
              <h1 className="text-3xl font-display font-bold text-foreground">
                {process.vehicle.make} {process.vehicle.model}
              </h1>
              <p className="font-mono text-xs text-muted-foreground mt-2">VIN {process.vehicle.vin}</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <Stat label="Kunde" value={process.customer.name} sub={process.customer.city} />
              <Stat label="Preis" value={formatCurrency(process.vehicle.price)} sub={`${process.vehicle.year} · ${process.vehicle.mileage.toLocaleString("de-DE")} km`} />
              <Stat label="Erstellt" value={formatDate(process.createdAt)} />
              <Stat label="Aktualisiert" value={formatDate(process.updatedAt)} />
            </div>
          </div>
        </Card>

        {/* Stepper */}
        <Card className="p-6 bg-card border-border shadow-card">
          <ProcessStepper currentStep={process.currentStep} selectedStep={selectedKey} onSelect={setSelected} />
        </Card>

        {/* Step Detail */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 bg-card border-border shadow-card">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    Schritt {selectedIdx + 1} / {PROCESS_STEPS.length}
                  </span>
                  {isCompleted && <Badge className="bg-success text-success-foreground hover:bg-success">Abgeschlossen</Badge>}
                  {isCurrent && <Badge className="bg-primary text-primary-foreground hover:bg-primary">Aktiv</Badge>}
                  {isLocked && (
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      <Lock className="size-3 mr-1" /> Gesperrt
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground">{selectedStep.label}</h2>
                <p className="text-sm text-muted-foreground mt-2">{selectedStep.description}</p>
              </div>
            </div>

            <Separator className="my-6 bg-border/60" />

            {selectedKey === "outbound_check" && isCurrent && (
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-sm">Übergabe-Checkliste</h3>
                  <span className="text-xs text-muted-foreground">
                    {checklistDone} / {checklistTotal} erledigt
                  </span>
                </div>
                <div className="space-y-2">
                  {process.checklist.map((item) => (
                    <label
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background/40 cursor-pointer transition-smooth hover:border-primary/40",
                        item.done && "opacity-60"
                      )}
                    >
                      <Checkbox checked={item.done} onCheckedChange={() => toggleChecklist(process.id, item.id)} />
                      <span className={cn("text-sm flex-1", item.done && "line-through text-muted-foreground")}>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Document preview */}
            <div className="rounded-xl border border-dashed border-border bg-background/40 p-6">
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-lg bg-primary/10 grid place-items-center border border-primary/20">
                  <FileText className="size-5 text-primary-glow" />
                </div>
                <div className="flex-1">
                  <p className="font-display font-semibold text-foreground">Kundenbeleg: {selectedStep.documentName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Wird beim Abschluss als PDF generiert, an den Kunden gesendet und im Vorgangs-Archiv gespeichert.
                  </p>
                  {record?.documentArchived && (
                    <div className="flex items-center gap-2 mt-3 text-xs text-success">
                      <Archive className="size-3" />
                      <span>Archiviert am {formatDate(record.completedAt!)}</span>
                      <Button size="sm" variant="ghost" className="h-6 ml-2 text-xs gap-1">
                        <Download className="size-3" /> PDF
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="flex items-center justify-end gap-3 mt-6">
              {isLocked && (
                <p className="text-xs text-muted-foreground mr-auto">
                  Vorherige Schritte zuerst abschließen, um diesen freizuschalten.
                </p>
              )}
              {isCompleted && (
                <p className="text-xs text-success mr-auto inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4" /> Beleg wurde am {formatDate(record.completedAt!)} erzeugt.
                </p>
              )}
              {isCurrent && (
                <Button
                  onClick={handleComplete}
                  disabled={!canCompleteOutbound}
                  className="bg-gradient-brand hover:opacity-90 shadow-elegant gap-2"
                >
                  Beleg erzeugen & {nextStep ? "weiter" : "abschließen"}
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </Card>

          {/* Side: Customer + Archive */}
          <div className="space-y-6">
            <Card className="p-6 bg-card border-border shadow-card">
              <h3 className="font-display font-semibold text-sm mb-4">Kunde</h3>
              <div className="space-y-3 text-sm">
                <Row label="Name" value={process.customer.name} />
                <Row label="E-Mail" value={process.customer.email} mono />
                <Row label="Telefon" value={process.customer.phone} mono />
                <Row label="Stadt" value={process.customer.city} />
              </div>
            </Card>

            <Card className="p-6 bg-card border-border shadow-card">
              <h3 className="font-display font-semibold text-sm mb-4">Beleg-Archiv</h3>
              <div className="space-y-2">
                {PROCESS_STEPS.map((s, i) => {
                  const r = process.steps[s.key];
                  const done = r.status === "completed";
                  return (
                    <div
                      key={s.key}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg text-xs",
                        done ? "bg-success/5 border border-success/20" : "opacity-50"
                      )}
                    >
                      <div className={cn(
                        "size-6 rounded-md grid place-items-center text-[10px] font-semibold",
                        done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {i + 1}
                      </div>
                      <span className="flex-1 truncate font-medium">{s.documentName}</span>
                      {done && (
                        <Button size="icon" variant="ghost" className="h-6 w-6">
                          <Download className="size-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div>
    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold text-foreground mt-1">{value}</p>
    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
  </div>
);

const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span className={cn("text-foreground text-right", mono && "font-mono text-xs")}>{value}</span>
  </div>
);

export default ProcessDetail;
