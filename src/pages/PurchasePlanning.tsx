import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProcessStore } from "@/store/processStore";
import { formatCurrency, formatDate, PurchasePlanStatus, VEHICLE_TYPE_LABELS, VehicleType } from "@/data/process";
import { Plus, Truck, CheckCircle2, Clock, Package, Ban } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { VehicleIntakeDialog } from "@/components/fleet/VehicleIntakeDialog";
import { useTopbarSearch } from "@/context/TopbarSearchContext";
import { DataTableShell } from "@/components/shared/DataTableShell";

type PlanSortKey = "expected_asc" | "expected_desc" | "created_desc" | "price_asc" | "price_desc" | "supplier";

const STATUS_META: Record<PurchasePlanStatus, { label: string; className: string; icon: any }> = {
  open: { label: "Offen", className: "bg-info/15 text-info border-info/30", icon: Clock },
  ordered: { label: "Bestellt", className: "bg-warning/15 text-warning border-warning/30", icon: Truck },
  received: { label: "Eingetroffen", className: "bg-success/15 text-success border-success/30", icon: CheckCircle2 },
  cancelled: { label: "Storniert", className: "bg-muted text-muted-foreground border-border", icon: Ban },
};

const PurchasePlanning = () => {
  const plans = useProcessStore((s) => s.purchasePlans);
  const addPlan = useProcessStore((s) => s.addPurchasePlan);
  const updateStatus = useProcessStore((s) => s.updatePurchasePlanStatus);
  const convert = useProcessStore((s) => s.convertPlanToVehicle);
  const locations = useProcessStore((s) => s.settings.locations);

  const [query, setQuery] = useState("");
  const [searchField, setSearchField] = useState<"all" | "make" | "model" | "supplier">("all");
  const [filter, setFilter] = useState<"all" | PurchasePlanStatus>("all");
  const [sortKey, setSortKey] = useState<PlanSortKey>("expected_asc");
  const [dialogOpen, setDialogOpen] = useState(false);
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
      { key: "supplier", label: "Lieferant" },
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
        case "expected_asc": return new Date(a.expectedAt).getTime() - new Date(b.expectedAt).getTime();
        case "expected_desc": return new Date(b.expectedAt).getTime() - new Date(a.expectedAt).getTime();
        case "created_desc": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "price_asc": return a.targetPrice - b.targetPrice;
        case "price_desc": return b.targetPrice - a.targetPrice;
        case "supplier": return a.supplier.localeCompare(b.supplier);
      }
    });
  }, [plans, query, searchField, filter, sortKey]);

  const planForReceive = receiveDialog ? plans.find((p) => p.id === receiveDialog.planId) : undefined;

  return (
    <AppShell>
      <div className="flex flex-col min-h-0 flex-1 gap-4 animate-fade-in">
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Einkaufsplanung</h1>
            <p className="text-xs text-muted-foreground">Plane Fahrzeugankäufe – beim Eintreffen wandern sie automatisch in den Bestand.</p>
          </div>
          <NewPlanDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={(p) => { addPlan(p); toast.success("Einkauf geplant."); setDialogOpen(false); }} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0">
          {(["open", "ordered", "received", "cancelled"] as PurchasePlanStatus[]).map((status) => {
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

        <Card className="px-3 py-2 flex items-center gap-2 flex-wrap shrink-0">
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as PlanSortKey)}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expected_asc">Erwartet ↑ (am nächsten)</SelectItem>
              <SelectItem value="expected_desc">Erwartet ↓</SelectItem>
              <SelectItem value="created_desc">Zuletzt geplant</SelectItem>
              <SelectItem value="price_desc">Zielpreis ↓</SelectItem>
              <SelectItem value="price_asc">Zielpreis ↑</SelectItem>
              <SelectItem value="supplier">Lieferant A-Z</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1.5 flex-wrap">
            {([
              { key: "all", label: "Alle" },
              { key: "open", label: "Offen" },
              { key: "ordered", label: "Bestellt" },
              { key: "received", label: "Eingetroffen" },
              { key: "cancelled", label: "Storniert" },
            ] as const).map((f) => (
              <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} className="h-8 text-xs" onClick={() => setFilter(f.key)}>
                {f.label}
              </Button>
            ))}
          </div>
        </Card>

        <DataTableShell footer={<>{filtered.length} Einträge</>}>
          <table>
            <thead>
              <tr>
                <th>Plan-Nr.</th>
                <th>Fahrzeug</th>
                <th>Typ</th>
                <th>Lieferant</th>
                <th className="text-right">Zielpreis</th>
                <th>Erwartet</th>
                <th>Status</th>
                <th className="text-right">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const meta = STATUS_META[p.status];
                return (
                  <tr key={p.id} className="hover:bg-surface-elevated/40 transition-smooth">
                    <td className="font-display font-semibold">{p.id}</td>
                    <td>
                      <p className="font-medium text-foreground leading-tight">{p.make} {p.model}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{p.year}{p.vin ? ` · VIN ${p.vin}` : ""}</p>
                    </td>
                    <td className="text-muted-foreground">{VEHICLE_TYPE_LABELS[p.type]}</td>
                    <td className="text-foreground">{p.supplier}</td>
                    <td className="text-right font-semibold whitespace-nowrap">{formatCurrency(p.targetPrice)}</td>
                    <td className="text-muted-foreground whitespace-nowrap">{formatDate(p.expectedAt)}</td>
                    <td><Badge className={cn(meta.className, "text-[10px] px-1.5 py-0")}>{meta.label}</Badge></td>
                    <td className="text-right">
                      {p.status === "open" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { updateStatus(p.id, "ordered"); toast.success("Als bestellt markiert."); }}>Bestellen</Button>
                      )}
                      {p.status === "ordered" && (
                        <Button size="sm" className="bg-gradient-brand gap-1.5 h-7 text-xs" onClick={() => setReceiveDialog({ planId: p.id })}>
                          <Package className="size-3.5" /> Eingetroffen
                        </Button>
                      )}
                      {p.status === "received" && (
                        <span className="text-[10px] text-success inline-flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> Im Bestand
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">Keine Einkaufspläne gefunden.</td></tr>
              )}
            </tbody>
          </table>
        </DataTableShell>
      </div>

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

const NewPlanDialog = ({ open, onOpenChange, onSubmit }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (p: { type: VehicleType; make: string; model: string; year: number; targetPrice: number; supplier: string; expectedAt: string; notes?: string }) => void;
}) => {
  const [form, setForm] = useState({ type: "limousine" as VehicleType, make: "", model: "", year: new Date().getFullYear(), targetPrice: 0, supplier: "", expectedAt: "" });
  const valid = form.make && form.model && form.year && form.targetPrice > 0 && form.supplier && form.expectedAt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-brand hover:opacity-90 shadow-elegant gap-2">
          <Plus className="size-4" /> Neuer Einkauf
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Neuen Einkauf planen</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <FormField label="Fahrzeugtyp *" full>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as VehicleType })} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
              {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormField>
          <FormField label="Marke *"><Input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="z. B. BMW" /></FormField>
          <FormField label="Modell *"><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="z. B. X3 xDrive30d" /></FormField>
          <FormField label="Baujahr *"><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></FormField>
          <FormField label="Zielpreis (EUR) *"><Input type="number" value={form.targetPrice || ""} onChange={(e) => setForm({ ...form, targetPrice: Number(e.target.value) })} /></FormField>
          <FormField label="Lieferant *" full><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="z. B. BMW Auktion München" /></FormField>
          <FormField label="Erwartet am *" full><Input type="date" value={form.expectedAt} onChange={(e) => setForm({ ...form, expectedAt: e.target.value })} /></FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button disabled={!valid} className="bg-gradient-brand" onClick={() => onSubmit(form)}>Plan anlegen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const FormField = ({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) => (
  <div className={cn("space-y-1.5", full && "col-span-2")}>
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {children}
  </div>
);

export default PurchasePlanning;
