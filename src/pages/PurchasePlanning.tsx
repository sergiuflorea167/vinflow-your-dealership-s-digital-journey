import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProcessStore } from "@/store/processStore";
import {
  formatCurrency, formatDate, formatDateTime,
  PurchasePlanStatus, PurchasePlanSource, PURCHASE_PLAN_SOURCE_LABELS,
  VEHICLE_TYPE_LABELS, VehicleType,
} from "@/data/process";
import {
  Plus, Eye, CheckCircle2, Clock, Package, Ban, Trophy, XCircle,
  ExternalLink, MessageSquarePlus, MoreHorizontal, Trash2, Gavel, Tag, Store, Lightbulb, Circle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { VehicleIntakeDialog } from "@/components/fleet/VehicleIntakeDialog";
import { useTopbarSearch } from "@/context/TopbarSearchContext";
import { DataTableShell } from "@/components/shared/DataTableShell";

type PlanSortKey = "created_desc" | "created_asc" | "expected_asc" | "price_asc" | "price_desc" | "supplier";

const STATUS_META: Record<PurchasePlanStatus, { label: string; className: string; icon: LucideIcon; hint: string }> = {
  tracking: { label: "Verfolgen", className: "bg-info/15 text-info border-info/30", icon: Clock, hint: "Aktive Verhandlung / Auktion läuft" },
  won:      { label: "Deal abgeschlossen", className: "bg-warning/15 text-warning border-warning/30", icon: Trophy, hint: "Zuschlag erhalten – noch nicht im Bestand" },
  received: { label: "Im Bestand", className: "bg-success/15 text-success border-success/30", icon: CheckCircle2, hint: "In den Bestand übernommen" },
  lost:     { label: "Verloren", className: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle, hint: "Zuschlag verpasst / Verkäufer abgesprungen" },
  cancelled:{ label: "Verworfen", className: "bg-muted text-muted-foreground border-border", icon: Ban, hint: "Manuell verworfen" },
};

const SOURCE_ICONS: Record<PurchasePlanSource, LucideIcon> = {
  auction: Gavel,
  private_listing: Tag,
  dealer: Store,
  tip: Lightbulb,
  other: Circle,
};

const PurchasePlanning = () => {
  const plans = useProcessStore((s) => s.purchasePlans);
  const addPlan = useProcessStore((s) => s.addPurchasePlan);
  const updateStatus = useProcessStore((s) => s.updatePurchasePlanStatus);
  const addNote = useProcessStore((s) => s.addPurchasePlanNote);
  const removeNote = useProcessStore((s) => s.removePurchasePlanNote);
  const removePlan = useProcessStore((s) => s.removePurchasePlan);
  const convert = useProcessStore((s) => s.convertPlanToVehicle);
  const locations = useProcessStore((s) => s.settings.locations);

  const [query, setQuery] = useState("");
  const [searchField, setSearchField] = useState<"all" | "make" | "model" | "supplier">("all");
  const [filter, setFilter] = useState<"all" | PurchasePlanStatus>("all");
  const [sortKey, setSortKey] = useState<PlanSortKey>("created_desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailPlanId, setDetailPlanId] = useState<string | null>(null);
  const [receiveDialog, setReceiveDialog] = useState<{ planId: string } | null>(null);

  const topbarSearch = useMemo(() => ({
    placeholder: "Einkaufsplanung durchsuchen…",
    value: query,
    onChange: setQuery,
    field: searchField,
    onFieldChange: (f: string) => setSearchField(f as typeof searchField),
    fields: [
      { key: "all",      label: "Alle Felder" },
      { key: "make",     label: "Marke" },
      { key: "model",    label: "Modell" },
      { key: "supplier", label: "Quelle" },
    ],
  }), [query, searchField]);

  useTopbarSearch(topbarSearch);

  const filtered = useMemo(() => {
    const list = plans.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      const fields: Record<typeof searchField, string> = {
        all: `${p.make} ${p.model} ${p.supplier}`,
        make: p.make,
        model: p.model,
        supplier: p.supplier,
      };
      return fields[searchField].toLowerCase().includes(q);
    });
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "created_desc": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "created_asc":  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "expected_asc": {
          const aT = a.expectedAt ? new Date(a.expectedAt).getTime() : Infinity;
          const bT = b.expectedAt ? new Date(b.expectedAt).getTime() : Infinity;
          return aT - bT;
        }
        case "price_asc":  return a.targetPrice - b.targetPrice;
        case "price_desc": return b.targetPrice - a.targetPrice;
        case "supplier":   return a.supplier.localeCompare(b.supplier);
      }
    });
  }, [plans, query, searchField, filter, sortKey]);

  const detailPlan = detailPlanId ? plans.find((p) => p.id === detailPlanId) : undefined;
  const planForReceive = receiveDialog ? plans.find((p) => p.id === receiveDialog.planId) : undefined;

  return (
    <AppShell>
      <div className="space-y-3 animate-fade-in">
        <div className="flex flex-col gap-3 shrink-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4" data-tour="pp-header">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Einkaufsplanung</h1>
            <p className="text-xs text-muted-foreground">Schnelle Erfassung potenzieller Einkäufe – Eckdaten + Notizen mit Zeitstempel. Sobald der Deal steht: in den Bestand übernehmen.</p>
          </div>
          <div data-tour="pp-new">
            <NewPlanDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={(p) => { addPlan(p); toast.success("Einkauf erfasst."); setDialogOpen(false); }} />
          </div>
        </div>


        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 shrink-0" data-tour="pp-kpis">
          {(["tracking", "won", "received", "lost", "cancelled"] as PurchasePlanStatus[]).map((status) => {
            const count = plans.filter((p) => p.status === status).length;
            const { label, icon: Icon, className } = STATUS_META[status];
            return (
              <Card key={status} className="px-3 py-2 flex items-center gap-3">
                <div className={cn("size-8 rounded-md grid place-items-center shrink-0", className)}>
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none">{label}</p>
                  <p className="font-display text-lg font-bold leading-tight">{count}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="px-3 py-2 flex flex-col gap-2 shrink-0 sm:flex-row sm:flex-wrap sm:items-center" data-tour="pp-filters">
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as PlanSortKey)}>
            <SelectTrigger className="w-full text-xs sm:h-8 sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Zuletzt erfasst</SelectItem>
              <SelectItem value="created_asc">Älteste zuerst</SelectItem>
              <SelectItem value="expected_asc">Termin ↑ (am nächsten)</SelectItem>
              <SelectItem value="price_desc">Zielpreis ↓</SelectItem>
              <SelectItem value="price_asc">Zielpreis ↑</SelectItem>
              <SelectItem value="supplier">Quelle A-Z</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {([
              { key: "all",       label: "Alle" },
              { key: "tracking",  label: "Verfolgen" },
              { key: "won",       label: "Deal" },
              { key: "received",  label: "Im Bestand" },
              { key: "lost",      label: "Verloren" },
              { key: "cancelled", label: "Verworfen" },
            ] as const).map((f) => (
              <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} className="text-xs sm:h-8" onClick={() => setFilter(f.key)}>
                {f.label}
              </Button>
            ))}
          </div>
        </Card>

        <div data-tour="pp-table">
        <DataTableShell footer={<>{filtered.length} Einträge</>}>
          <table>
            <thead>
              <tr>
                <th>Fahrzeug</th>
                <th>Quelle</th>
                <th className="text-right">Zielpreis</th>
                <th>Letzte Notiz</th>
                <th>Termin</th>
                <th>Status</th>
                <th className="text-right">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const meta = STATUS_META[p.status];
                const SourceIcon = SOURCE_ICONS[p.source];
                const noteEntries = p.noteEntries ?? [];
                const lastNote = noteEntries[noteEntries.length - 1];
                return (
                  <tr key={p.id} className="hover:bg-surface-elevated/40 transition-smooth cursor-pointer" onClick={() => setDetailPlanId(p.id)}>
                    <td>
                      <p className="font-medium text-foreground leading-tight">{p.make} {p.model}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{p.year} · {VEHICLE_TYPE_LABELS[p.type]} · {p.id}</p>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-xs">
                        <SourceIcon className="size-3.5 text-muted-foreground" />
                        <div>
                          <p className="text-foreground leading-tight">{PURCHASE_PLAN_SOURCE_LABELS[p.source]}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">{p.supplier}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right font-semibold whitespace-nowrap">{formatCurrency(p.targetPrice)}</td>
                    <td className="max-w-[280px]">
                      {lastNote ? (
                        <>
                          <p className="text-xs text-foreground line-clamp-1">{lastNote.text}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">{formatDateTime(lastNote.createdAt)} · {noteEntries.length} Notiz{noteEntries.length !== 1 ? "en" : ""}</p>
                        </>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">– keine Notiz –</span>
                      )}
                    </td>
                    <td className="text-muted-foreground whitespace-nowrap text-xs">{p.expectedAt ? formatDate(p.expectedAt) : "–"}</td>
                    <td><Badge className={cn(meta.className, "text-[10px] px-1.5 py-0")}>{meta.label}</Badge></td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1">
                        {p.status === "won" && (
                          <Button size="sm" className="bg-gradient-brand gap-1.5 h-7 text-xs" onClick={() => setReceiveDialog({ planId: p.id })}>
                            <Package className="size-3.5" /> In Bestand
                          </Button>
                        )}
                        {(p.status === "tracking") && (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { updateStatus(p.id, "won"); toast.success("Deal abgeschlossen."); }}>
                            <Trophy className="size-3" /> Deal
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetailPlanId(p.id)}>
                          <Eye className="size-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <MoreHorizontal className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {p.status !== "tracking" && p.status !== "received" && (
                              <DropdownMenuItem onClick={() => { updateStatus(p.id, "tracking"); toast.success("Wird wieder verfolgt."); }}>
                                <Clock className="size-3.5 mr-2" /> Wieder verfolgen
                              </DropdownMenuItem>
                            )}
                            {p.status !== "lost" && p.status !== "received" && (
                              <DropdownMenuItem onClick={() => { updateStatus(p.id, "lost"); toast.info("Als verloren markiert."); }}>
                                <XCircle className="size-3.5 mr-2" /> Als verloren markieren
                              </DropdownMenuItem>
                            )}
                            {p.status !== "cancelled" && p.status !== "received" && (
                              <DropdownMenuItem onClick={() => { updateStatus(p.id, "cancelled"); toast.info("Verworfen."); }}>
                                <Ban className="size-3.5 mr-2" /> Verwerfen
                              </DropdownMenuItem>
                            )}
                            {p.status !== "received" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { removePlan(p.id); toast.success("Eintrag gelöscht."); }}>
                                  <Trash2 className="size-3.5 mr-2" /> Löschen
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-12 text-center text-muted-foreground">Keine Einträge gefunden.</td></tr>
              )}
            </tbody>
          </table>
        </DataTableShell>
        </div>
      </div>


      <PlanDetailSheet
        plan={detailPlan}
        onOpenChange={(o) => !o && setDetailPlanId(null)}
        onAddNote={(text) => detailPlan && addNote(detailPlan.id, text)}
        onRemoveNote={(noteId) => detailPlan && removeNote(detailPlan.id, noteId)}
        onMarkWon={() => { if (detailPlan) { updateStatus(detailPlan.id, "won"); toast.success("Deal abgeschlossen."); } }}
        onConvert={() => { if (detailPlan) { setDetailPlanId(null); setReceiveDialog({ planId: detailPlan.id }); } }}
        onMarkLost={() => { if (detailPlan) { updateStatus(detailPlan.id, "lost"); toast.info("Als verloren markiert."); } }}
      />

      <VehicleIntakeDialog
        open={!!receiveDialog}
        onOpenChange={(o) => !o && setReceiveDialog(null)}
        locations={locations}
        title={planForReceive ? `${planForReceive.make} ${planForReceive.model} in den Bestand aufnehmen` : undefined}
        preset={planForReceive ? {
          make: planForReceive.make,
          model: planForReceive.model,
          year: planForReceive.year,
          type: planForReceive.type,
          targetPrice: planForReceive.targetPrice,
        } : undefined}
        onSubmit={(data) => {
          if (!receiveDialog) return;
          convert(receiveDialog.planId, data);
          toast.success("Fahrzeug in den Bestand aufgenommen.");
          setReceiveDialog(null);
        }}
      />
    </AppShell>
  );
};

// =============================================================
// Schlanker Erfassungs-Dialog
// =============================================================
const NewPlanDialog = ({ open, onOpenChange, onSubmit }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (p: {
    type: VehicleType; make: string; model: string; year: number;
    targetPrice: number; source: PurchasePlanSource; supplier: string;
    sourceUrl?: string; expectedAt?: string; initialNote?: string;
  }) => void;
}) => {
  const [form, setForm] = useState({
    type: "limousine" as VehicleType,
    make: "",
    model: "",
    year: new Date().getFullYear(),
    targetPrice: 0,
    source: "auction" as PurchasePlanSource,
    supplier: "",
    sourceUrl: "",
    expectedAt: "",
    initialNote: "",
  });
  const valid = form.make.trim() && form.model.trim();

  const reset = () => setForm({
    type: "limousine", make: "", model: "", year: new Date().getFullYear(),
    targetPrice: 0, source: "auction", supplier: "", sourceUrl: "", expectedAt: "", initialNote: "",
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-brand hover:opacity-90 shadow-elegant gap-2">
          <Plus className="size-4" /> Einkauf erfassen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schnell-Erfassung Einkauf</DialogTitle>
          <p className="text-xs text-muted-foreground">Nur die Eckdaten – Details kommen später beim Bestandseingang.</p>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
          <FormField label="Marke *"><Input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="z. B. BMW" autoFocus /></FormField>
          <FormField label="Modell *"><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="z. B. X3 xDrive30d" /></FormField>
          <FormField label="Quelle">
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as PurchasePlanSource })} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
              {Object.entries(PURCHASE_PLAN_SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormField>
          <FormField label="Fahrzeugtyp">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as VehicleType })} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
              {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormField>
          <FormField label="Baujahr"><Input type="number" value={form.year || ""} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></FormField>
          <FormField label="Zielpreis brutto (EUR)"><Input type="number" value={form.targetPrice || ""} onChange={(e) => setForm({ ...form, targetPrice: Number(e.target.value) })} placeholder="z. B. 45000" /></FormField>
          <FormField label="Anbieter / Plattform" full>
            <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="z. B. BCA Hamburg, Privat – Müller, mobile.de" />
          </FormField>
          <FormField label="Link zum Inserat" full>
            <Input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://…" />
          </FormField>
          <FormField label="Termin / Auktionsdatum">
            <Input type="date" value={form.expectedAt} onChange={(e) => setForm({ ...form, expectedAt: e.target.value })} />
          </FormField>
          <div />
          <FormField label="Erste Notiz" full>
            <Textarea
              value={form.initialNote}
              onChange={(e) => setForm({ ...form, initialNote: e.target.value })}
              placeholder="z. B. Verkäufer kontaktiert, Probefahrt am Samstag…"
              rows={2}
              className="text-sm resize-none"
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button
            disabled={!valid}
            className="bg-gradient-brand"
            onClick={() => onSubmit({
              type: form.type,
              make: form.make.trim(),
              model: form.model.trim(),
              year: form.year || new Date().getFullYear(),
              targetPrice: form.targetPrice || 0,
              source: form.source,
              supplier: form.supplier.trim() || "–",
              sourceUrl: form.sourceUrl.trim() || undefined,
              expectedAt: form.expectedAt || undefined,
              initialNote: form.initialNote.trim() || undefined,
            })}
          >
            Erfassen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// =============================================================
// Detail-Sheet mit Notizen-Stream
// =============================================================
const PlanDetailSheet = ({
  plan, onOpenChange, onAddNote, onRemoveNote, onMarkWon, onConvert, onMarkLost,
}: {
  plan: ReturnType<typeof useProcessStore.getState>["purchasePlans"][number] | undefined;
  onOpenChange: (o: boolean) => void;
  onAddNote: (text: string) => void;
  onRemoveNote: (noteId: string) => void;
  onMarkWon: () => void;
  onConvert: () => void;
  onMarkLost: () => void;
}) => {
  const [note, setNote] = useState("");

  if (!plan) {
    return (
      <Sheet open={false} onOpenChange={onOpenChange}>
        <SheetContent />
      </Sheet>
    );
  }

  const meta = STATUS_META[plan.status];
  const SourceIcon = SOURCE_ICONS[plan.source];
  const sortedNotes = [...plan.noteEntries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const submitNote = () => {
    if (!note.trim()) return;
    onAddNote(note);
    setNote("");
  };

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="font-display">{plan.make} {plan.model}</SheetTitle>
              <SheetDescription className="text-xs">
                {plan.year} · {VEHICLE_TYPE_LABELS[plan.type]} · {plan.id}
              </SheetDescription>
            </div>
            <Badge className={cn(meta.className, "text-[10px] px-2 py-0.5 shrink-0")}>{meta.label}</Badge>
          </div>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-2 py-3 text-xs border-b">
          <InfoRow icon={SourceIcon} label={PURCHASE_PLAN_SOURCE_LABELS[plan.source]} value={plan.supplier} />
          <InfoRow label="Zielpreis" value={formatCurrency(plan.targetPrice)} bold />
          {plan.expectedAt && <InfoRow label="Termin" value={formatDate(plan.expectedAt)} />}
          <InfoRow label="Erfasst" value={formatDate(plan.createdAt)} />
          {plan.sourceUrl && (
            <a href={plan.sourceUrl} target="_blank" rel="noreferrer" className="col-span-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
              <ExternalLink className="size-3" /> Inserat / Auktion öffnen
            </a>
          )}
        </div>

        {/* Aktionen */}
        {plan.status !== "received" && (
          <div className="flex flex-wrap gap-2 py-3 border-b">
            {plan.status === "tracking" && (
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={onMarkWon}>
                <Trophy className="size-3.5" /> Deal abgeschlossen
              </Button>
            )}
            {plan.status === "won" && (
              <Button size="sm" className="bg-gradient-brand h-8 text-xs gap-1.5" onClick={onConvert}>
                <Package className="size-3.5" /> In den Bestand übernehmen
              </Button>
            )}
            {plan.status !== "lost" && (
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 text-muted-foreground" onClick={onMarkLost}>
                <XCircle className="size-3.5" /> Verloren
              </Button>
            )}
          </div>
        )}

        {/* Notizen-Stream */}
        <div className="flex-1 flex flex-col min-h-0 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notizen ({plan.noteEntries.length})</h3>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {sortedNotes.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-6 text-center">Noch keine Notizen. Ergänze unten den ersten Eintrag.</p>
            )}
            {sortedNotes.map((n) => (
              <div key={n.id} className="rounded-md border border-border bg-surface-elevated/40 px-3 py-2 group">
                <p className="text-sm text-foreground whitespace-pre-wrap">{n.text}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px] text-muted-foreground">{formatDateTime(n.createdAt)} · {n.createdBy}</p>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onRemoveNote(n.id)}>
                    <Trash2 className="size-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {plan.status !== "received" && (
            <div className="border-t pt-3 mt-2 space-y-2">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Neue Notiz mit Zeitstempel…"
                rows={2}
                className="text-sm resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    submitNote();
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">⌘/Ctrl + Enter zum Speichern</p>
                <Button size="sm" className="h-8 text-xs gap-1.5" disabled={!note.trim()} onClick={submitNote}>
                  <MessageSquarePlus className="size-3.5" /> Notiz hinzufügen
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

const InfoRow = ({ icon: Icon, label, value, bold }: { icon?: LucideIcon; label: string; value: string; bold?: boolean }) => (
  <div>
    <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
      {Icon && <Icon className="size-3" />} {label}
    </p>
    <p className={cn("text-foreground", bold && "font-semibold")}>{value}</p>
  </div>
);

const FormField = ({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) => (
  <div className={cn("space-y-1.5", full && "sm:col-span-2")}>
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {children}
  </div>
);

export default PurchasePlanning;
