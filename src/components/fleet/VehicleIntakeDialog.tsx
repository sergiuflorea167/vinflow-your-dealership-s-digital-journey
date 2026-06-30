import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FuelType, Transmission, VehicleType, VEHICLE_TYPE_LABELS, Vehicle, VehicleStatus } from "@/data/process";
import { ScanLine, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProcessStore } from "@/store/processStore";

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
  /** true = Regelbesteuerung (19% MwSt.), false = Differenzbesteuerung (§ 25a UStG). */
  vatReportable: boolean;
  arrivedAt: string;
  location: Vehicle["location"];
  /** Optional — beim Import setzbar. */
  status?: VehicleStatus;
  soldAt?: string;
  listed?: { active: boolean; listedAt?: string };
  hsn?: string;
  tsn?: string;
  notes?: string;
}

interface VinDecodeResponse {
  error?: string;
  make?: string;
  model?: string;
  year?: number;
  type?: VehicleType;
  fuel?: FuelType;
  transmission?: Transmission;
  power_hp?: number;
  color?: string;
  hsn?: string;
  tsn?: string;
  displacement_l?: number;
  features?: string[];
  confidence?: number;
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
  const [newLocation, setNewLocation] = useState("");
  const addLocation = useProcessStore((s) => s.addSettingsLocation);
  const [features, setFeatures] = useState<string[]>([]);
  // Differenzbesteuerung ist Standard für Gebrauchtfahrzeuge.
  const [vatReportable, setVatReportable] = useState<boolean>(false);
  const [hsn, setHsn] = useState("");
  const [tsn, setTsn] = useState("");
  const [displacement, setDisplacement] = useState<number | "">("");
  const [scanning, setScanning] = useState(false);

  const scanVin = async () => {
    const v = vin.trim().toUpperCase();
    if (v.length < 11) {
      toast.error("Bitte zuerst eine gültige VIN eingeben (mind. 11 Zeichen).");
      return;
    }
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("vin-decode", { body: { vin: v } });
      if (error) throw error;
      const d = (data ?? {}) as VinDecodeResponse;
      if (d.error) throw new Error(d.error);
      if (d.make) setMake(d.make);
      if (d.model) setModel(d.model);
      if (d.year) setYear(Number(d.year));
      if (d.type) setType(d.type);
      if (d.fuel) setFuel(d.fuel);
      if (d.transmission) setTransmission(d.transmission);
      if (d.power_hp) setHp(Number(d.power_hp));
      if (d.color && !color) setColor(d.color);
      if (d.hsn) setHsn(String(d.hsn));
      if (d.tsn) setTsn(String(d.tsn));
      if (d.displacement_l) setDisplacement(Number(d.displacement_l));
      if (Array.isArray(d.features)) setFeatures(d.features);
      const conf = typeof d.confidence === "number" ? Math.round(d.confidence * 100) : null;
      const src = "freevindecoder.eu";
      toast.success(
        `VIN gescannt via ${src}${conf !== null ? ` · ${conf}% Sicherheit` : ""}. Bitte prüfen.`,
      );
    } catch (error: unknown) {
      toast.error("VIN-Scan fehlgeschlagen: " + (error instanceof Error ? error.message : "unbekannt"));
    } finally {
      setScanning(false);
    }
  };

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
    setFeatures([]);
    setHsn("");
    setTsn("");
    setDisplacement("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Nur das Nötigste ist Pflicht – Rest kann später ergänzt werden.
  const resolvedLocation = location === "__new__" ? newLocation.trim() : location;
  const valid =
    make.trim().length > 0 &&
    model.trim().length > 0 &&
    vin.length >= 11 &&
    !!resolvedLocation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title ?? "Fahrzeug in den Bestand aufnehmen"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2 max-h-[65vh] overflow-y-auto pr-1">
          <FormField label="VIN (17-stellig) *" full>
            <div className="flex gap-2">
              <Input value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} placeholder="WBA8E9G50GNT12345" maxLength={17} className="font-mono flex-1" />
              <Button
                type="button"
                variant="outline"
                onClick={scanVin}
                disabled={scanning || vin.trim().length < 11}
                className="shrink-0 gap-2 border-primary/40 hover:border-primary hover:bg-primary/10"
              >
                {scanning ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
                {scanning ? "Scanne…" : "VIN scannen"}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <Sparkles className="size-3" /> Füllt Marke, Modell, Baujahr, Motor & Ausstattung automatisch.
            </p>
          </FormField>
          <FormField label="Marke *"><Input value={make} onChange={(e) => setMake(e.target.value)} placeholder="z. B. BMW" /></FormField>
          <FormField label="Modell *"><Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="z. B. X3 xDrive30d" /></FormField>
          <FormField label="Stellplatz *" full>
            <select
              value={location}
              onChange={(e) => {
                const v = e.target.value;
                setLocation(v);
                if (v !== "__new__") setNewLocation("");
              }}
              className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm"
            >
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
              <option value="__new__">+ Neuen Stellplatz anlegen…</option>
            </select>
            {location === "__new__" && (
              <Input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="z. B. Hof B · Platz 04"
                className="mt-2"
                autoFocus
              />
            )}
          </FormField>

          <div className="col-span-2 mt-2 mb-1 text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
            Optional · kann später ergänzt werden
          </div>

          <FormField label="Fahrzeugtyp" full>
            <select value={type} onChange={(e) => setType(e.target.value as VehicleType)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
              {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormField>
          <FormField label="Baujahr"><Input type="number" value={year || ""} onChange={(e) => setYear(Number(e.target.value))} /></FormField>
          <FormField label="Farbe"><Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="z. B. Mineralweiß" /></FormField>
          <FormField label="Kilometer"><Input type="number" value={mileage || ""} onChange={(e) => setMileage(Number(e.target.value))} /></FormField>
          <FormField label="Kraftstoff">
            <select value={fuel} onChange={(e) => setFuel(e.target.value as FuelType)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
              {(["Benzin","Diesel","Hybrid","Elektro","Plug-in-Hybrid","Gas"] as FuelType[]).map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </FormField>
          <FormField label="Getriebe">
            <select value={transmission} onChange={(e) => setTransmission(e.target.value as Transmission)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
              {(["Schaltgetriebe","Automatik","DKG","CVT"] as Transmission[]).map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </FormField>
          <FormField label="Leistung (PS)"><Input type="number" value={hp || ""} onChange={(e) => setHp(Number(e.target.value))} /></FormField>
          <FormField label="Hubraum (L)"><Input type="number" step="0.1" value={displacement} onChange={(e) => setDisplacement(e.target.value === "" ? "" : Number(e.target.value))} placeholder="z. B. 2.0" /></FormField>
          <FormField label="Erstzulassung"><Input type="date" value={firstReg} onChange={(e) => setFirstReg(e.target.value)} /></FormField>
          <FormField label="HU/TÜV gültig bis"><Input type="date" value={hu} onChange={(e) => setHu(e.target.value)} /></FormField>
          <FormField label="HSN (KBA)"><Input value={hsn} onChange={(e) => setHsn(e.target.value)} placeholder="z. B. 0588" maxLength={4} className="font-mono" /></FormField>
          <FormField label="TSN (KBA)"><Input value={tsn} onChange={(e) => setTsn(e.target.value.toUpperCase())} placeholder="z. B. AYU" maxLength={3} className="font-mono" /></FormField>
          <FormField label="Einkaufspreis brutto (EUR)"><Input type="number" value={purchasePrice || ""} onChange={(e) => setPurchasePrice(Number(e.target.value))} /></FormField>
          <FormField label="Listenpreis brutto (EUR)"><Input type="number" value={listPrice || ""} onChange={(e) => setListPrice(Number(e.target.value))} /></FormField>
          <FormField label="Besteuerung" full>
            <select
              value={vatReportable ? "regular" : "margin"}
              onChange={(e) => setVatReportable(e.target.value === "regular")}
              className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm"
            >
              <option value="margin">Differenzbesteuerung (§ 25a UStG) — Gebrauchtfahrzeug</option>
              <option value="regular">Regelbesteuerung (19% MwSt. ausweisbar)</option>
            </select>
          </FormField>
          {features.length > 0 && (
            <FormField label="Erkannte Ausstattung & Merkmale" full>
              <div className="flex flex-wrap gap-1.5 rounded-md border border-primary/30 bg-primary/5 p-2.5">
                {features.map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-background/60 border border-border px-2 py-0.5 text-[11px]"
                  >
                    <Sparkles className="size-2.5 text-primary" /> {f}
                  </span>
                ))}
              </div>
            </FormField>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button
            disabled={!valid}
            className="bg-gradient-brand"
            onClick={() => {
              if (location === "__new__") addLocation(resolvedLocation);
              onSubmit({
                vin, type, make, model, year,
                color, mileage, fuel, transmission,
                power_hp: hp, power_kw: Math.round(hp * 0.7355),
                firstRegistration: firstReg,
                hu: hu || undefined,
                listPrice, purchasePrice, vatReportable,
                arrivedAt: new Date().toISOString(),
                location: { name: resolvedLocation, kind: "lot", since: new Date().toISOString() },
              });
            }}>
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
