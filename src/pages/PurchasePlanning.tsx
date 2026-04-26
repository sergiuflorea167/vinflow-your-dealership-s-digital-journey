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
import { formatCurrency, formatDate, PurchasePlanStatus, VEHICLE_TYPE_LABELS, VehicleType, FuelType, Transmission } from "@/data/process";
import { Plus, Search, Truck, CheckCircle2, Clock, Package, Ban } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [filter, setFilter] = useState<"all" | PurchasePlanStatus>("all");
  const [sortKey, setSortKey] = useState<PlanSortKey>("expected_asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [receiveDialog, setReceiveDialog] = useState<{ planId: string } | null>(null);

  const filtered = useMemo(() => {
    const list = plans.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return p.make.toLowerCase().includes(q) || p.model.toLowerCase().includes(q) || p.supplier.toLowerCase().includes(q);
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
  }, [plans, query, filter, sortKey]);

  const planForReceive = receiveDialog ? plans.find((p) => p.id === receiveDialog.planId) : undefined;

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Einkaufsplanung</h1>
            <p className="text-sm text-muted-foreground mt-1">Plane Fahrzeugankäufe – beim Eintreffen wandern sie automatisch in die Flotte.</p>
          </div>
          <NewPlanDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={(p) => { addPlan(p); toast.success("Einkauf geplant."); setDialogOpen(false); }} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["open", "ordered", "received", "cancelled"] as PurchasePlanStatus[]).map((status) => {
            const count = plans.filter((p) => p.status === status).length;
            const { label, icon: Icon, className } = STATUS_META[status];
            return (
              <Card key={status} className="p-4 flex items-center gap-4">
                <div className={cn("size-10 rounded-lg grid place-items-center", className)}>
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="font-display text-2xl font-bold">{count}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Marke, Modell, Lieferant…" className="pl-9" />
            </div>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as PlanSortKey)}>
              <SelectTrigger className="w-[200px]">
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
          </div>
          <div className="flex gap-2 flex-wrap">
            {([
              { key: "all", label: "Alle" },
              { key: "open", label: "Offen" },
              { key: "ordered", label: "Bestellt" },
              { key: "received", label: "Eingetroffen" },
              { key: "cancelled", label: "Storniert" },
            ] as const).map((f) => (
              <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}>
                {f.label}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Plan-Nr.</th>
                  <th className="px-5 py-3 font-medium">Fahrzeug</th>
                  <th className="px-5 py-3 font-medium">Typ</th>
                  <th className="px-5 py-3 font-medium">Lieferant</th>
                  <th className="px-5 py-3 font-medium text-right">Zielpreis</th>
                  <th className="px-5 py-3 font-medium">Erwartet</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const meta = STATUS_META[p.status];
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-surface-elevated/40 transition-smooth">
                      <td className="px-5 py-4 font-display font-semibold">{p.id}</td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">{p.make} {p.model}</p>
                        <p className="text-xs text-muted-foreground">{p.year}{p.vin ? ` · VIN ${p.vin}` : ""}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{VEHICLE_TYPE_LABELS[p.type]}</td>
                      <td className="px-5 py-4 text-foreground">{p.supplier}</td>
                      <td className="px-5 py-4 text-right font-semibold">{formatCurrency(p.targetPrice)}</td>
                      <td className="px-5 py-4 text-muted-foreground text-xs">{formatDate(p.expectedAt)}</td>
                      <td className="px-5 py-4"><Badge className={meta.className}>{meta.label}</Badge></td>
                      <td className="px-5 py-4 text-right">
                        {p.status === "open" && (
                          <Button size="sm" variant="outline" onClick={() => { updateStatus(p.id, "ordered"); toast.success("Als bestellt markiert."); }}>Bestellen</Button>
                        )}
                        {p.status === "ordered" && (
                          <Button size="sm" className="bg-gradient-brand gap-1.5" onClick={() => setReceiveDialog({ planId: p.id })}>
                            <Package className="size-3.5" /> Eingetroffen
                          </Button>
                        )}
                        {p.status === "received" && (
                          <span className="text-xs text-success inline-flex items-center gap-1.5">
                            <CheckCircle2 className="size-3.5" /> In Flotte
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-muted-foreground text-sm">Keine Einkaufspläne gefunden.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <ReceiveDialog
        open={!!receiveDialog}
        onOpenChange={(o) => !o && setReceiveDialog(null)}
        planMake={planForReceive?.make ?? ""}
        planModel={planForReceive?.model ?? ""}
        planYear={planForReceive?.year ?? new Date().getFullYear()}
        planType={planForReceive?.type ?? "limousine"}
        planPrice={planForReceive?.targetPrice ?? 0}
        locations={locations}
        onSubmit={(data) => {
          if (!receiveDialog) return;
          convert(receiveDialog.planId, data);
          toast.success("Fahrzeug in die Flotte aufgenommen.");
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

const ReceiveDialog = ({ open, onOpenChange, planMake, planModel, planYear, planType, planPrice, locations, onSubmit }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  planMake: string; planModel: string; planYear: number; planType: VehicleType; planPrice: number;
  locations: string[];
  onSubmit: (data: any) => void;
}) => {
  const [vin, setVin] = useState("");
  const [color, setColor] = useState("");
  const [mileage, setMileage] = useState(0);
  const [fuel, setFuel] = useState<FuelType>("Benzin");
  const [transmission, setTransmission] = useState<Transmission>("Automatik");
  const [hp, setHp] = useState(150);
  const [firstReg, setFirstReg] = useState("");
  const [hu, setHu] = useState("");
  const [purchasePrice, setPurchasePrice] = useState(planPrice);
  const [listPrice, setListPrice] = useState(Math.round(planPrice * 1.2));
  const [location, setLocation] = useState(locations[0] ?? "Hof A · Platz 01");

  const valid = vin.length >= 11 && color && mileage >= 0 && firstReg && purchasePrice > 0 && listPrice > 0 && location;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{planMake} {planModel} in Flotte aufnehmen</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2 max-h-[65vh] overflow-y-auto pr-1">
          <FormField label="VIN (17-stellig) *" full>
            <Input value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} placeholder="WBA8E9G50GNT12345" maxLength={17} className="font-mono" />
          </FormField>
          <FormField label="Farbe *"><Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="z. B. Mineralweiß" /></FormField>
          <FormField label="Kilometer *"><Input type="number" value={mileage || ""} onChange={(e) => setMileage(Number(e.target.value))} /></FormField>
          <FormField label="Kraftstoff *">
            <select value={fuel} onChange={(e) => setFuel(e.target.value as FuelType)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
              {(["Benzin","Diesel","Hybrid","Elektro","Plug-in-Hybrid","Gas"] as FuelType[]).map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </FormField>
          <FormField label="Getriebe *">
            <select value={transmission} onChange={(e) => setTransmission(e.target.value as Transmission)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
              {(["Schaltgetriebe","Automatik","DKG","CVT"] as Transmission[]).map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </FormField>
          <FormField label="Leistung (PS) *"><Input type="number" value={hp || ""} onChange={(e) => setHp(Number(e.target.value))} /></FormField>
          <FormField label="Erstzulassung *"><Input type="date" value={firstReg} onChange={(e) => setFirstReg(e.target.value)} /></FormField>
          <FormField label="HU/TÜV gültig bis"><Input type="date" value={hu} onChange={(e) => setHu(e.target.value)} /></FormField>
          <FormField label="Einkaufspreis brutto (EUR) *"><Input type="number" value={purchasePrice || ""} onChange={(e) => setPurchasePrice(Number(e.target.value))} /></FormField>
          <FormField label="Listenpreis brutto (EUR) *"><Input type="number" value={listPrice || ""} onChange={(e) => setListPrice(Number(e.target.value))} /></FormField>
          <FormField label="Stellplatz *" full>
            <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button
            disabled={!valid}
            className="bg-gradient-brand"
            onClick={() => onSubmit({
              vin, type: planType, make: planMake, model: planModel, year: planYear,
              color, mileage, fuel, transmission, power_hp: hp, power_kw: Math.round(hp * 0.7355),
              firstRegistration: firstReg, hu: hu || undefined,
              listPrice, purchasePrice,
              arrivedAt: new Date().toISOString(),
              location: { name: location, kind: "lot" as const, since: new Date().toISOString() },
            })}>
            In Flotte aufnehmen
          </Button>
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
