import { useState, useMemo } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, FileText, Lock, CheckCircle2, ArrowRight, Download, Archive, AlertCircle, SkipForward } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProcessStepper } from "@/components/process/ProcessStepper";
import { ActivityLog } from "@/components/process/ActivityLog";
import { TodoList } from "@/components/shared/TodoList";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProcessStore } from "@/store/processStore";
import {
  PROCESS_STEPS, ProcessStepKey, ProcessFields, formatCurrency, formatDate, stepIndex,
} from "@/data/process";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBelegPdf } from "@/lib/pdf";

const ProcessDetail = () => {
  const { id } = useParams<{ id: string }>();
  const process = useProcessStore((s) => s.processes.find((p) => p.id === id));
  const vehicle = useProcessStore((s) => process && s.getVehicle(process.vehicleId));
  const customer = useProcessStore((s) => process && s.getCustomer(process.customerId));
  const offer = useProcessStore((s) => process && s.getOffer(process.acceptedOfferId));
  const activities = useProcessStore((s) => s.activities.filter((a) => a.processId === process?.id));
  const companyName = useProcessStore((s) => s.settings.companyName);

  const completeStep = useProcessStore((s) => s.completeStep);
  const skipStep = useProcessStore((s) => s.skipStep);
  const updateFields = useProcessStore((s) => s.updateProcessFields);
  const toggleChk = useProcessStore((s) => s.toggleOutboundChecklistItem);
  const addChk = useProcessStore((s) => s.addOutboundChecklistItem);
  const removeChk = useProcessStore((s) => s.removeOutboundChecklistItem);
  const addCT = useProcessStore((s) => s.addProcessCustomerTodo);
  const removeCT = useProcessStore((s) => s.removeProcessCustomerTodo);

  const [selected, setSelected] = useState<ProcessStepKey | undefined>(process?.currentStep);

  const selectedKey = selected ?? process?.currentStep ?? "offer";

  if (!process || !vehicle || !customer) return <Navigate to="/vorgaenge" replace />;
  const selectedStep = PROCESS_STEPS.find((s) => s.key === selectedKey)!;
  const selectedIdx = stepIndex(selectedKey);
  const currentIdx = stepIndex(process.currentStep);
  const record = process.steps[selectedKey];
  const isCurrent = selectedIdx === currentIdx;
  const isCompleted = record.status === "completed";
  const isSkipped = record.status === "skipped";
  const isLocked = selectedIdx > currentIdx;
  const nextStep = PROCESS_STEPS[currentIdx + 1];

  const checklistDone = process.outboundChecklist.filter((c) => c.done).length;
  const checklistTotal = process.outboundChecklist.length;

  const validation = useMemo(
    () => validateStep(selectedKey, process.fields, checklistDone, checklistTotal),
    [selectedKey, process.fields, checklistDone, checklistTotal]
  );

  const handleComplete = () => {
    if (!validation.ok) { toast.error(validation.message ?? "Bitte alle Pflichtfelder ausfüllen."); return; }
    completeStep(process.id, selectedKey);
    toast.success(`${selectedStep.documentName} archiviert${nextStep ? ` · Weiter zu ${nextStep.label}` : " · Vorgang abgeschlossen"}`);
    if (nextStep) setSelected(nextStep.key);
  };

  const handleSkip = () => {
    if (!selectedStep.skippable || !isCurrent) return;
    skipStep(process.id, selectedKey);
    toast.message(`${selectedStep.label} übersprungen.`);
    if (nextStep) setSelected(nextStep.key);
  };

  const handleDownload = (key: ProcessStepKey) => {
    downloadBelegPdf({ process, vehicle, customer, offer, stepKey: key, companyName });
    toast.success("PDF heruntergeladen.");
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

        <Card className="p-6 bg-gradient-surface border-border shadow-card">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Vorgang {process.id}</p>
              <h1 className="text-3xl font-display font-bold text-foreground">{vehicle.make} {vehicle.model}</h1>
              <p className="font-mono text-xs text-muted-foreground mt-2">VIN {vehicle.vin}</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <Stat label="Kunde" value={customer.name} sub={customer.city} />
              <Stat label="Preis" value={formatCurrency(process.fields.finalPrice ?? vehicle.listPrice)} sub={`${vehicle.year} · ${vehicle.mileage.toLocaleString("de-DE")} km`} />
              <Stat label="Erstellt" value={formatDate(process.createdAt)} />
              <Stat label="Aktualisiert" value={formatDate(process.updatedAt)} />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border shadow-card">
          <ProcessStepper currentStep={process.currentStep} selectedStep={selectedKey} onSelect={setSelected} steps={process.steps} />
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 bg-card border-border shadow-card">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-muted-foreground">Schritt {selectedIdx + 1} / {PROCESS_STEPS.length}</span>
                  {isCompleted && <Badge className="bg-success text-success-foreground hover:bg-success">Abgeschlossen</Badge>}
                  {isSkipped && <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">Übersprungen</Badge>}
                  {isCurrent && !isCompleted && !isSkipped && <Badge className="bg-primary text-primary-foreground hover:bg-primary">Aktiv</Badge>}
                  {isLocked && (<Badge variant="outline" className="border-border text-muted-foreground"><Lock className="size-3 mr-1" /> Gesperrt</Badge>)}
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground">{selectedStep.label}</h2>
                <p className="text-sm text-muted-foreground mt-2">{selectedStep.description}</p>
              </div>
            </div>

            <Separator className="my-6 bg-border/60" />

            {!isLocked && (
              <StepFields
                stepKey={selectedKey}
                fields={process.fields}
                disabled={!isCurrent || isSkipped}
                onChange={(patch) => updateFields(process.id, patch)}
              />
            )}

            {/* Customer-To-Dos auf AB */}
            {selectedKey === "order_confirmation" && (
              <div className="mt-6">
                <TodoList
                  title="Kunden-To-Dos auf AB"
                  description="Diese Punkte werden auf der Auftragsbestätigung gedruckt – sichtbar für den Kunden."
                  items={process.customerTodosOC}
                  onAdd={(t) => addCT(process.id, t)}
                  onRemove={(id) => removeCT(process.id, id)}
                  placeholder="z. B. AHK montieren, Standheizung nachrüsten…"
                  disabled={!isCurrent}
                />
              </div>
            )}

            {/* Outbound checklist */}
            {selectedKey === "outbound_check" && (
              <div className="mt-6">
                <TodoList
                  title="Übergabe-Checkliste (intern)"
                  description={`${checklistDone} / ${checklistTotal} erledigt – alle müssen vor dem Abschluss abgehakt sein.`}
                  items={process.outboundChecklist}
                  onAdd={(t) => addChk(process.id, t)}
                  onRemove={(id) => removeChk(process.id, id)}
                  onToggle={(id) => toggleChk(process.id, id)}
                  showCheckbox
                  disabled={!isCurrent}
                />
              </div>
            )}

            {/* Document preview */}
            <div className="rounded-xl border border-dashed border-border bg-background/40 p-6 mt-6">
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-lg bg-primary/10 grid place-items-center border border-primary/20">
                  <FileText className="size-5 text-primary-glow" />
                </div>
                <div className="flex-1">
                  <p className="font-display font-semibold text-foreground">Kundenbeleg: {selectedStep.documentName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isSkipped ? "Schritt wurde übersprungen – kein Beleg." : "Wird beim Abschluss als PDF generiert, an den Kunden gesendet und im Vorgangs-Archiv gespeichert."}
                  </p>
                  {(isCompleted || isCurrent) && !isSkipped && (
                    <div className="flex items-center gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => handleDownload(selectedKey)} className="gap-1.5 h-8">
                        <Download className="size-3.5" /> {isCompleted ? "PDF erneut laden" : "Vorschau-PDF"}
                      </Button>
                      {isCompleted && record.completedAt && (
                        <span className="text-xs text-success inline-flex items-center gap-1">
                          <Archive className="size-3" /> Archiviert am {formatDate(record.completedAt)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 flex-wrap">
              {isLocked && (<p className="text-xs text-muted-foreground mr-auto">Vorherige Schritte zuerst abschließen.</p>)}
              {(isCompleted || isSkipped) && record.completedAt && (
                <p className="text-xs text-success mr-auto inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4" /> {isSkipped ? "Übersprungen" : "Beleg erzeugt"} am {formatDate(record.completedAt)}.
                </p>
              )}
              {isCurrent && !isCompleted && !isSkipped && (
                <>
                  {!validation.ok && (
                    <p className="text-xs text-warning mr-auto inline-flex items-center gap-2">
                      <AlertCircle className="size-4" /> {validation.message}
                    </p>
                  )}
                  {selectedStep.skippable && (
                    <Button variant="outline" onClick={handleSkip} className="gap-2">
                      <SkipForward className="size-4" /> Überspringen
                    </Button>
                  )}
                  <Button onClick={handleComplete} disabled={!validation.ok} className="bg-gradient-brand hover:opacity-90 shadow-elegant gap-2">
                    Beleg erzeugen & {nextStep ? "weiter" : "abschließen"} <ArrowRight className="size-4" />
                  </Button>
                </>
              )}
            </div>
          </Card>

          {/* Right column */}
          <div className="space-y-6">
            <Card className="p-6 bg-card border-border shadow-card">
              <h3 className="font-display font-semibold text-sm mb-4">Kunde</h3>
              <div className="space-y-3 text-sm">
                <Row label="Name" value={customer.name} />
                <Row label="E-Mail" value={customer.email} mono />
                <Row label="Telefon" value={customer.phone} mono />
                <Row label="Stadt" value={customer.city} />
              </div>
            </Card>

            <Card className="p-6 bg-card border-border shadow-card">
              <h3 className="font-display font-semibold text-sm mb-4">Beleg-Archiv</h3>
              <div className="space-y-2">
                {PROCESS_STEPS.map((s, i) => {
                  const r = process.steps[s.key];
                  const done = r.status === "completed";
                  const skipped = r.status === "skipped";
                  return (
                    <div key={s.key} className={cn(
                      "flex items-center gap-3 p-2 rounded-lg text-xs",
                      done && "bg-success/5 border border-success/20",
                      skipped && "bg-muted/30 border border-border opacity-70",
                      !done && !skipped && "opacity-50"
                    )}>
                      <div className={cn(
                        "size-6 rounded-md grid place-items-center text-[10px] font-semibold shrink-0",
                        done && "bg-success text-success-foreground",
                        skipped && "bg-muted text-muted-foreground",
                        !done && !skipped && "bg-muted text-muted-foreground"
                      )}>
                        {i + 1}
                      </div>
                      <span className="flex-1 truncate font-medium">{s.documentName}</span>
                      {done && (
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDownload(s.key)}>
                          <Download className="size-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            <ActivityLog items={activities} title="Vorgangs-Protokoll" />
          </div>
        </div>
      </div>
    </AppShell>
  );
};

// ---------- Step fields & validation ----------

const StepFields = ({ stepKey, fields, onChange, disabled }: { stepKey: ProcessStepKey; fields: ProcessFields; onChange: (patch: Partial<ProcessFields>) => void; disabled?: boolean }) => {
  if (stepKey === "offer") return null;
  if (stepKey === "down_payment") {
    return (
      <FieldGrid title="Anzahlung">
        <NumberField label="Anzahlungsbetrag (EUR) *" value={fields.downPayment?.amount} onChange={(v) => onChange({ downPayment: { ...fields.downPayment, amount: v } })} disabled={disabled} />
        <DateField label="Fälligkeit *" value={fields.downPayment?.dueDate} onChange={(v) => onChange({ downPayment: { ...fields.downPayment, dueDate: v } })} disabled={disabled} />
        <SelectField label="Zahlungsart *" value={fields.downPayment?.method ?? ""} options={["Überweisung", "Bar", "EC"]} onChange={(v) => onChange({ downPayment: { ...fields.downPayment, method: v as any } })} disabled={disabled} />
        <CheckboxField label="Zahlung eingegangen" checked={!!fields.downPayment?.received} onChange={(v) => onChange({ downPayment: { ...fields.downPayment, received: v, receivedDate: v ? new Date().toISOString().slice(0, 10) : undefined } })} disabled={disabled} />
      </FieldGrid>
    );
  }
  if (stepKey === "order_confirmation") {
    return (
      <FieldGrid title="Auftragsbestätigung">
        <DateField label="Auftragsdatum *" value={fields.orderConfirmation?.orderDate} onChange={(v) => onChange({ orderConfirmation: { ...fields.orderConfirmation, orderDate: v } })} disabled={disabled} />
        <DateField label="Liefertermin *" value={fields.orderConfirmation?.deliveryDate} onChange={(v) => onChange({ orderConfirmation: { ...fields.orderConfirmation, deliveryDate: v } })} disabled={disabled} />
        <TextField label="Zahlungsbedingungen" value={fields.orderConfirmation?.paymentTerms} onChange={(v) => onChange({ orderConfirmation: { ...fields.orderConfirmation, paymentTerms: v } })} disabled={disabled} placeholder="z. B. Restzahlung bei Übergabe" full />
      </FieldGrid>
    );
  }
  if (stepKey === "invoicing") {
    return (
      <FieldGrid title="Rechnungsdaten">
        <TextField label="Rechnungs-Nr. *" value={fields.invoicing?.invoiceNumber} onChange={(v) => onChange({ invoicing: { ...fields.invoicing, invoiceNumber: v } })} disabled={disabled} placeholder="z. B. RE-2025-0001" />
        <DateField label="Rechnungsdatum *" value={fields.invoicing?.invoiceDate} onChange={(v) => onChange({ invoicing: { ...fields.invoicing, invoiceDate: v } })} disabled={disabled} />
        <DateField label="Fällig am *" value={fields.invoicing?.dueDate} onChange={(v) => onChange({ invoicing: { ...fields.invoicing, dueDate: v } })} disabled={disabled} />
      </FieldGrid>
    );
  }
  if (stepKey === "purchase_contract") {
    return (
      <FieldGrid title="Kaufvertrag">
        <TextField label="Vertrags-Nr. *" value={fields.purchaseContract?.contractNumber} onChange={(v) => onChange({ purchaseContract: { ...fields.purchaseContract, contractNumber: v } })} disabled={disabled} placeholder="z. B. KV-2025-0001" />
        <DateField label="Vertragsdatum *" value={fields.purchaseContract?.contractDate} onChange={(v) => onChange({ purchaseContract: { ...fields.purchaseContract, contractDate: v } })} disabled={disabled} />
        <NumberField label="Gewährleistung (Monate) *" value={fields.purchaseContract?.warrantyMonths ?? 12} onChange={(v) => onChange({ purchaseContract: { ...fields.purchaseContract, warrantyMonths: v } })} disabled={disabled} />
        <TextField label="Vertragsort *" value={fields.purchaseContract?.place} onChange={(v) => onChange({ purchaseContract: { ...fields.purchaseContract, place: v } })} disabled={disabled} placeholder="z. B. München" />
      </FieldGrid>
    );
  }
  if (stepKey === "delivery_confirmation") {
    return (
      <FieldGrid title="Übergabe">
        <DateField label="Übergabedatum *" value={fields.delivery?.handoverDate} onChange={(v) => onChange({ delivery: { ...fields.delivery, handoverDate: v } })} disabled={disabled} />
        <TextField label="Übergabeort *" value={fields.delivery?.handoverLocation} onChange={(v) => onChange({ delivery: { ...fields.delivery, handoverLocation: v } })} disabled={disabled} placeholder="z. B. Filiale München" />
        <NumberField label="Kilometerstand *" value={fields.delivery?.finalMileage} onChange={(v) => onChange({ delivery: { ...fields.delivery, finalMileage: v } })} disabled={disabled} />
        <SelectField label="Tankfüllung" value={fields.delivery?.fuelLevel ?? ""} options={["voll", "3/4", "halb", "1/4", "leer"]} onChange={(v) => onChange({ delivery: { ...fields.delivery, fuelLevel: v } })} disabled={disabled} />
        <CheckboxField label="Kundenunterschrift vorhanden *" checked={!!fields.delivery?.customerSignature} onChange={(v) => onChange({ delivery: { ...fields.delivery, customerSignature: v } })} disabled={disabled} />
      </FieldGrid>
    );
  }
  return null;
};

const validateStep = (key: ProcessStepKey, f: ProcessFields, chkDone: number, chkTotal: number): { ok: boolean; message?: string } => {
  if (key === "offer") return { ok: true };
  if (key === "down_payment") {
    const d = f.downPayment;
    if (!d?.amount || !d.dueDate || !d.method) return { ok: false, message: "Anzahlungsbetrag, Fälligkeit und Zahlungsart erforderlich." };
    return { ok: true };
  }
  if (key === "order_confirmation") {
    const o = f.orderConfirmation;
    if (!o?.orderDate || !o.deliveryDate) return { ok: false, message: "Auftrags- und Liefertermin erforderlich." };
    return { ok: true };
  }
  if (key === "outbound_check") {
    if (chkDone < chkTotal) return { ok: false, message: `Noch ${chkTotal - chkDone} Checklisten-Punkte offen.` };
    return { ok: true };
  }
  if (key === "invoicing") {
    const i = f.invoicing;
    if (!i?.invoiceNumber || !i.invoiceDate || !i.dueDate) return { ok: false, message: "Rechnungs-Nr., Datum & Fälligkeit erforderlich." };
    return { ok: true };
  }
  if (key === "purchase_contract") {
    const c = f.purchaseContract;
    if (!c?.contractNumber || !c.contractDate || !c.place || !c.warrantyMonths) return { ok: false, message: "Vertrags-Nr., Datum, Ort & Gewährleistung erforderlich." };
    return { ok: true };
  }
  if (key === "delivery_confirmation") {
    const d = f.delivery;
    if (!d?.handoverDate || !d.handoverLocation || !d.finalMileage || !d.customerSignature) return { ok: false, message: "Alle Übergabe-Daten + Unterschrift erforderlich." };
    return { ok: true };
  }
  return { ok: true };
};

// ---------- Atoms ----------

const FieldGrid = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3 mb-2">
    <h3 className="font-display font-semibold text-sm text-foreground">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </div>
);

const TextField = ({ label, value, onChange, disabled, placeholder, full }: { label: string; value?: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string; full?: boolean }) => (
  <div className={cn("space-y-1.5", full && "md:col-span-2")}>
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} className="bg-background/40" />
  </div>
);

const NumberField = ({ label, value, onChange, disabled }: { label: string; value?: number; onChange: (v: number | undefined) => void; disabled?: boolean }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <Input type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} disabled={disabled} className="bg-background/40" />
  </div>
);

const DateField = ({ label, value, onChange, disabled }: { label: string; value?: string; onChange: (v: string) => void; disabled?: boolean }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <Input type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="bg-background/40" />
  </div>
);

const SelectField = ({ label, value, options, onChange, disabled }: { label: string; value: string; options: string[]; onChange: (v: string) => void; disabled?: boolean }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50">
      <option value="">— wählen —</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const CheckboxField = ({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <label className="flex items-center gap-3 p-3 rounded-md border border-input bg-background/40 cursor-pointer hover:border-primary/40 transition-smooth h-10">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} className="size-4 accent-primary" />
    <span className="text-sm">{label}</span>
  </label>
);

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div>
    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold text-foreground mt-1">{value}</p>
    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
  </div>
);

const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex items-start justify-between gap-3">
    <span className="text-xs text-muted-foreground shrink-0">{label}</span>
    <span className={cn("text-foreground text-right truncate", mono && "font-mono text-xs")}>{value}</span>
  </div>
);

export default ProcessDetail;
