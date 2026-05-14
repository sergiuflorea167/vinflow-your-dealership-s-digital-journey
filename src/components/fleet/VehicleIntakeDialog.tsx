import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FuelType, Transmission, VehicleType, VEHICLE_TYPE_LABELS, Vehicle } from "@/data/process";
import { ScanLine, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VehicleIntakePayload {
  vin: string;
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  color: string;
  mileage: number;
  fuel: FuelType;
  transmission: Transmission;
  power_hp: number;
  power_kw: number;
  firstRegistration: string;
  hu?: string;
  listPrice: number;
  purchasePrice: number;
  arrivedAt: string;
  location: Vehicle["location"];
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  locations: string[];
  /** Optional preset values (e.g. when converting a purchase plan). */
  preset?: Partial<{
    make: string; model: string; year: number; type: VehicleType; targetPrice: number;
  }>;
  /** Custom dialog title (default: "Fahrzeug aufnehmen"). */
  title?: string;
  onSubmit: (data: VehicleIntakePayload) => void;
}

export const VehicleIntakeDialog = ({ open, onOpenChange, locations, preset, title, onSubmit }: Props) => {
  const [type, setType] = useState<VehicleType>(preset?.type ?? "limousine");
  const [make, setMake] = useState(preset?.make ?? "");
  const [model, setModel] = useState(preset?.model ?? "");
  const [year, setYear] = useState<number>(preset?.year ?? new Date().getFullYear());
  const [vin, setVin] = useState("");
  const [color, setColor] = useState("");
  const [mileage, setMileage] = useState(0);
  const [fuel, setFuel] = useState<FuelType>("Benzin");
  const [transmission, setTransmission] = useState<Transmission>("Automatik");
  const [hp, setHp] = useState(150);
  const [firstReg, setFirstReg] = useState("");
  const [hu, setHu] = useState("");
  const [purchasePrice, setPurchasePrice] = useState(preset?.targetPrice ?? 0);
  const [listPrice, setListPrice] = useState(preset?.targetPrice ? Math.round(preset.targetPrice * 1.2) : 0);
  const [location, setLocation] = useState(locations[0] ?? "Hof A · Platz 01");

  // Reset fields whenever the dialog is (re-)opened, so presets apply correctly.
  useEffect(() => {
    if (!open) return;
    setType(preset?.type ?? "limousine");
    setMake(preset?.make ?? "");
    setModel(preset?.model ?? "");
    setYear(preset?.year ?? new Date().getFullYear());
    setVin("");
    setColor("");
    setMileage(0);
    setFuel("Benzin");
    setTransmission("Automatik");
    setHp(150);
    setFirstReg("");
    setHu("");
    setPurchasePrice(preset?.targetPrice ?? 0);
    setListPrice(preset?.targetPrice ? Math.round(preset.targetPrice * 1.2) : 0);
    setLocation(locations[0] ?? "Hof A · Platz 01");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const valid =
    make.trim().length > 0 &&
    model.trim().length > 0 &&
    year > 1950 &&
    vin.length >= 11 &&
    color.trim().length > 0 &&
    mileage >= 0 &&
    firstReg &&
    purchasePrice > 0 &&
    listPrice > 0 &&
    location;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title ?? "Fahrzeug in den Bestand aufnehmen"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2 max-h-[65vh] overflow-y-auto pr-1">
          <FormField label="Fahrzeugtyp *" full>
            <select value={type} onChange={(e) => setType(e.target.value as VehicleType)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
              {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormField>
          <FormField label="Marke *"><Input value={make} onChange={(e) => setMake(e.target.value)} placeholder="z. B. BMW" /></FormField>
          <FormField label="Modell *"><Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="z. B. X3 xDrive30d" /></FormField>
          <FormField label="Baujahr *"><Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></FormField>
          <FormField label="VIN (17-stellig) *">
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
              vin, type, make, model, year,
              color, mileage, fuel, transmission,
              power_hp: hp, power_kw: Math.round(hp * 0.7355),
              firstRegistration: firstReg,
              hu: hu || undefined,
              listPrice, purchasePrice,
              arrivedAt: new Date().toISOString(),
              location: { name: location, kind: "lot", since: new Date().toISOString() },
            })}>
            In Bestand aufnehmen
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
