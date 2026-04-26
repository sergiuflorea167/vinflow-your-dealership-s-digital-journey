import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, Navigate, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useProcessStore } from "@/store/processStore";
import {
  formatCurrency, formatDate, OfferStatus,
  Vehicle, VehicleType, VEHICLE_TYPE_LABELS,
  FuelType, Transmission, DriveType, EmissionClass, VehicleCondition,
  VehicleLocation, LocationKind,
} from "@/data/process";
import {
  ArrowLeft, Car, CheckCircle2, Edit2, FileText, Mail, MapPin, Plus, Send,
  Sparkles, X, Save, History, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---- Helpers / Constants ------------------------------------------------

const STATUS_META: Record<OfferStatus, { label: string; className: string }> = {
  draft:    { label: "Entwurf",     className: "bg-muted text-muted-foreground border-border" },
  sent:     { label: "Gesendet",    className: "bg-info/15 text-info border-info/30" },
  accepted: { label: "Angenommen",  className: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Abgelehnt",   className: "bg-destructive/15 text-destructive border-destructive/30" },
  expired:  { label: "Abgelaufen",  className: "bg-muted text-muted-foreground border-border" },
};

const LOCATION_KIND_LABELS: Record<LocationKind, string> = {
  lot: "Hofplatz",
  showroom: "Showroom",
  workshop: "Werkstatt",
  detailer: "Aufbereiter",
  transit: "Transport",
  customer: "Beim Kunden",
  other: "Sonstiges",
};

const FUELS: FuelType[] = ["Benzin", "Diesel", "Hybrid", "Elektro", "Plug-in-Hybrid", "Gas"];
const TRANSMISSIONS: Transmission[] = ["Schaltgetriebe", "Automatik", "DKG", "CVT"];
const DRIVES: DriveType[] = ["Frontantrieb", "Heckantrieb", "Allradantrieb"];
const EMISSIONS: EmissionClass[] = ["Euro 4", "Euro 5", "Euro 6", "Euro 6d", "Euro 6d-TEMP", "Elektro"];
const CONDITIONS: VehicleCondition[] = ["Neu", "Gebraucht", "Jahreswagen", "Vorführwagen", "Tageszulassung", "Oldtimer"];

// =========================================================================

const VehicleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const vehicle = useProcessStore((s) => s.vehicles.find((v) => v.id === id));
  const allOffers = useProcessStore((s) => s.offers);
  const offers = useMemo(() => allOffers.filter((o) => o.vehicleId === (id ?? "")), [allOffers, id]);
  const customers = useProcessStore((s) => s.customers);
  const getCustomer = useProcessStore((s) => s.getCustomer);
  const process = useProcessStore((s) => s.processes.find((p) => p.vehicleId === id));
  const locations = useProcessStore((s) => s.settings.locations);

  const addOffer = useProcessStore((s) => s.addOffer);
  const updateOfferStatus = useProcessStore((s) => s.updateOfferStatus);
  const acceptOffer = useProcessStore((s) => s.acceptOffer);
  const updateVehicle = useProcessStore((s) => s.updateVehicle);
  const changeVehicleLocation = useProcessStore((s) => s.changeVehicleLocation);
  const startProcessForVehicle = useProcessStore((s) => s.startProcessForVehicle);

  const [offerDialog, setOfferDialog] = useState(false);
  const [directDialog, setDirectDialog] = useState(false);
  const [locationDialog, setLocationDialog] = useState(false);

  if (!vehicle) return <Navigate to="/bestand" replace />;

  const acceptedOffer = offers.find((o) => o.status === "accepted");
  const canAcceptMore = !acceptedOffer && !process;

  // ---- Save helper for inline-edit sections -----------------------------
  const handleSaveSection = (patch: Partial<Vehicle>) => {
    updateVehicle(vehicle.id, patch);
    toast.success("Fahrzeugdaten aktualisiert.");
  };

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in">
        <RouterLink to="/bestand" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Zurück zum Bestand
        </RouterLink>

        {/* ---------- Header ---------- */}
        <Card className="p-6 bg-gradient-surface border-border shadow-card">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-2xl bg-gradient-brand grid place-items-center shadow-glow">
                <Car className="size-8 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Fahrzeug {vehicle.id}</p>
                <h1 className="text-3xl font-display font-bold">
                  {vehicle.make} {vehicle.model}
                </h1>
                {vehicle.modelDetail && (
                  <p className="text-sm text-muted-foreground">{vehicle.modelDetail}</p>
                )}
                <p className="font-mono text-xs text-muted-foreground mt-1">VIN {vehicle.vin}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Listenpreis</p>
              <p className="text-3xl font-display font-bold text-primary-glow">{formatCurrency(vehicle.listPrice)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                EK: {formatCurrency(vehicle.purchasePrice)}
              </p>
            </div>
          </div>
        </Card>

        {/* ---------- Standort ---------- */}
        <Card className="p-5 bg-card border-border shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="size-10 rounded-lg bg-info/15 grid place-items-center shrink-0">
                <MapPin className="size-5 text-info" />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Aktueller Standort</p>
                <p className="font-display font-semibold text-foreground text-lg truncate">{vehicle.location.name}</p>
                <p className="text-xs text-muted-foreground">
                  {LOCATION_KIND_LABELS[vehicle.location.kind]} · seit {formatDate(vehicle.location.since)}
                  {vehicle.location.note ? ` · ${vehicle.location.note}` : ""}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setLocationDialog(true)} className="gap-1.5 shrink-0">
              <Edit2 className="size-3.5" /> Standort ändern
            </Button>
          </div>

          {vehicle.locationHistory.length > 0 && (
            <details className="mt-4 group">
              <summary className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1.5 hover:text-foreground transition-smooth">
                <History className="size-3.5" /> Standort-Historie ({vehicle.locationHistory.length})
              </summary>
              <ul className="mt-3 space-y-1.5 pl-5 text-xs">
                {vehicle.locationHistory.map((h, i) => (
                  <li key={i} className="text-muted-foreground">
                    <span className="text-foreground font-medium">{h.name}</span>
                    {" · "}{LOCATION_KIND_LABELS[h.kind]} · seit {formatDate(h.since)}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>

        {/* ---------- Vorgang (falls vorhanden) ---------- */}
        {process && (
          <Card className="p-5 bg-success/5 border-success/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-success" />
              <div>
                <p className="font-display font-semibold text-foreground">Vorgang läuft: {process.id}</p>
                <p className="text-xs text-muted-foreground">Aktueller Schritt: {process.currentStep}</p>
              </div>
            </div>
            <Button asChild className="bg-gradient-brand">
              <RouterLink to={`/vorgaenge/${process.id}`}>Vorgang öffnen</RouterLink>
            </Button>
          </Card>
        )}

        {/* ---------- Daten-Sektionen mit Inline-Edit ---------- */}
        <Section
          title="Identifikation"
          rows={[
            { label: "Fahrzeugtyp", value: VEHICLE_TYPE_LABELS[vehicle.type] },
            { label: "Marke", value: vehicle.make },
            { label: "Modell", value: vehicle.model },
            { label: "Modell-Details", value: vehicle.modelDetail },
            { label: "Baujahr", value: vehicle.year },
            { label: "Zustand", value: vehicle.condition },
            { label: "VIN", value: vehicle.vin, mono: true },
            { label: "HSN", value: vehicle.hsn, mono: true },
            { label: "TSN", value: vehicle.tsn, mono: true },
            { label: "Kennzeichen", value: vehicle.licensePlate, mono: true },
            { label: "Vorbesitzer", value: vehicle.previousOwners },
          ]}
          renderEditor={(close) => (
            <IdentificationEditor vehicle={vehicle} onSave={(p) => { handleSaveSection(p); close(); }} onCancel={close} />
          )}
        />

        <Section
          title="Technik & Antrieb"
          rows={[
            { label: "Kraftstoff", value: vehicle.fuel },
            { label: "Getriebe", value: vehicle.transmission },
            { label: "Antrieb", value: vehicle.drive },
            { label: "Leistung", value: `${vehicle.power_kw} kW · ${vehicle.power_hp} PS` },
            { label: "Hubraum", value: vehicle.displacement_ccm ? `${vehicle.displacement_ccm} ccm` : undefined },
            { label: "Zylinder", value: vehicle.cylinders },
            { label: "Schadstoffklasse", value: vehicle.emissionClass },
            { label: "CO₂", value: vehicle.co2_g_km ? `${vehicle.co2_g_km} g/km` : undefined },
            { label: "Verbrauch", value: vehicle.consumption_l_100km ? `${vehicle.consumption_l_100km} l/100km` : undefined },
            { label: "Batterie", value: vehicle.batteryCapacity_kwh ? `${vehicle.batteryCapacity_kwh} kWh` : undefined },
            { label: "Reichweite", value: vehicle.range_km ? `${vehicle.range_km} km` : undefined },
          ]}
          renderEditor={(close) => (
            <TechEditor vehicle={vehicle} onSave={(p) => { handleSaveSection(p); close(); }} onCancel={close} />
          )}
        />

        <Section
          title="Innen & Außen"
          rows={[
            { label: "Außenfarbe", value: vehicle.color },
            { label: "Lackcode", value: vehicle.paintCode, mono: true },
            { label: "Metallic", value: vehicle.metallic === undefined ? undefined : (vehicle.metallic ? "Ja" : "Nein") },
            { label: "Innenfarbe", value: vehicle.interiorColor },
            { label: "Polster", value: vehicle.interiorMaterial },
            { label: "Türen", value: vehicle.doors },
            { label: "Sitze", value: vehicle.seats },
          ]}
          renderEditor={(close) => (
            <AppearanceEditor vehicle={vehicle} onSave={(p) => { handleSaveSection(p); close(); }} onCancel={close} />
          )}
        />

        <Section
          title="Zulassung & Historie"
          rows={[
            { label: "Kilometerstand", value: `${vehicle.mileage.toLocaleString("de-DE")} km` },
            { label: "Erstzulassung", value: vehicle.firstRegistration ? formatDate(vehicle.firstRegistration) : undefined },
            { label: "HU/TÜV bis", value: vehicle.hu ? formatDate(vehicle.hu) : undefined },
            { label: "Scheckheft", value: vehicle.serviceBookComplete === undefined ? undefined : (vehicle.serviceBookComplete ? "Komplett" : "Unvollständig") },
            { label: "Unfallfrei", value: vehicle.accidentFree === undefined ? undefined : (vehicle.accidentFree ? "Ja" : "Nein") },
            { label: "Nichtraucher", value: vehicle.nonSmoker === undefined ? undefined : (vehicle.nonSmoker ? "Ja" : "Nein") },
          ]}
          renderEditor={(close) => (
            <RegistrationEditor vehicle={vehicle} onSave={(p) => { handleSaveSection(p); close(); }} onCancel={close} />
          )}
        />

        <Section
          title="Preis & Status"
          rows={[
            { label: "Listenpreis (brutto)", value: formatCurrency(vehicle.listPrice) },
            { label: "Einkaufspreis (brutto)", value: formatCurrency(vehicle.purchasePrice) },
            { label: "MwSt. ausweisbar", value: vehicle.vatReportable === undefined ? undefined : (vehicle.vatReportable ? "Ja" : "Nein") },
            { label: "Status", value: vehicle.status },
            { label: "Im Bestand seit", value: vehicle.arrivedAt ? formatDate(vehicle.arrivedAt) : undefined },
            { label: "Notizen", value: vehicle.notes, full: true },
          ]}
          renderEditor={(close) => (
            <PriceEditor vehicle={vehicle} onSave={(p) => { handleSaveSection(p); close(); }} onCancel={close} />
          )}
        />

        <Section
          title="Ausstattung"
          rows={
            vehicle.features && vehicle.features.length > 0
              ? [{ label: "", value: <FeatureChips features={vehicle.features} />, full: true, raw: true }]
              : [{ label: "", value: "Keine Ausstattungsmerkmale erfasst.", full: true }]
          }
          renderEditor={(close) => (
            <FeaturesEditor vehicle={vehicle} onSave={(p) => { handleSaveSection(p); close(); }} onCancel={close} />
          )}
        />

        {/* ---------- Angebote ---------- */}
        <Card className="p-6 bg-card border-border shadow-card">
          <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-display font-semibold">Angebote &amp; Verkauf</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {offers.length} Angebot{offers.length !== 1 ? "e" : ""}
                {!process && " · oder direkt zum Vorgang springen, wenn der Kunde mündlich zugesagt hat."}
              </p>
            </div>
            {!process && (
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => setOfferDialog(true)} variant="outline" className="gap-2">
                  <Plus className="size-4" /> Neues Angebot
                </Button>
                <Button onClick={() => setDirectDialog(true)} className="bg-gradient-brand gap-2">
                  <Zap className="size-4" /> Direkt verkaufen
                </Button>
              </div>
            )}
          </div>

          {offers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              Noch keine Angebote für dieses Fahrzeug.
            </div>
          ) : (
            <div className="space-y-3">
              {offers.map((offer) => {
                const cust = getCustomer(offer.customerId);
                const meta = STATUS_META[offer.status];
                return (
                  <div key={offer.id} className={cn(
                    "rounded-xl border p-4 transition-smooth",
                    offer.status === "accepted" ? "bg-success/5 border-success/30" : "bg-background/40 border-border hover:border-primary/40"
                  )}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-10 rounded-lg bg-secondary grid place-items-center text-secondary-foreground font-display font-bold text-sm shrink-0">
                          {cust?.name.split(" ").map((n) => n[0]).slice(0, 2).join("") ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-display font-semibold text-foreground truncate">{cust?.name ?? "Unbekannt"}</p>
                            <Badge className={meta.className}>{meta.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{offer.id} · gültig bis {formatDate(offer.validUntil)}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-display text-xl font-bold text-foreground">{formatCurrency(offer.price)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">erstellt {formatDate(offer.createdAt)}</p>
                      </div>
                    </div>

                    {offer.status === "sent" && canAcceptMore && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        <Button size="sm" variant="outline" onClick={() => { updateOfferStatus(offer.id, "rejected"); toast.message("Angebot abgelehnt."); }} className="gap-1.5">
                          <X className="size-3.5" /> Ablehnen
                        </Button>
                        <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground gap-1.5"
                          onClick={() => {
                            const proc = acceptOffer(offer.id);
                            toast.success(`Angebot angenommen · Vorgang ${proc?.id} gestartet.`);
                            if (proc) navigate(`/vorgaenge/${proc.id}`);
                          }}>
                          <CheckCircle2 className="size-3.5" /> Annehmen → Vorgang
                        </Button>
                      </div>
                    )}
                    {offer.status === "draft" && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        <Button size="sm" variant="outline" onClick={() => { updateOfferStatus(offer.id, "sent"); toast.success("Angebot versendet."); }} className="gap-1.5">
                          <Send className="size-3.5" /> Senden
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ---------- Dialoge ---------- */}
      <Dialog open={offerDialog} onOpenChange={setOfferDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neues Angebot erstellen</DialogTitle></DialogHeader>
          <NewOfferForm
            defaultPrice={vehicle.listPrice}
            customers={customers}
            onSubmit={(data) => {
              addOffer({ ...data, vehicleId: vehicle.id, status: "sent" });
              toast.success("Angebot erstellt und versendet.");
              setOfferDialog(false);
            }}
            onCancel={() => setOfferDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={directDialog} onOpenChange={setDirectDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Direkter Verkauf · Vorgang sofort starten</DialogTitle></DialogHeader>
          <DirectSaleForm
            defaultPrice={vehicle.listPrice}
            customers={customers}
            onSubmit={(data) => {
              const proc = startProcessForVehicle({ vehicleId: vehicle.id, ...data });
              if (proc) {
                toast.success(`Vorgang ${proc.id} gestartet · Angebot übersprungen.`);
                navigate(`/vorgaenge/${proc.id}`);
              }
              setDirectDialog(false);
            }}
            onCancel={() => setDirectDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={locationDialog} onOpenChange={setLocationDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Standort ändern</DialogTitle></DialogHeader>
          <LocationForm
            locations={locations}
            currentName={vehicle.location.name}
            onSubmit={(loc) => {
              changeVehicleLocation(vehicle.id, loc);
              toast.success(`Standort: ${loc.name}`);
              setLocationDialog(false);
            }}
            onCancel={() => setLocationDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

// =========================================================================
// Section component — read-only by default, edit symbol toggles editor
// =========================================================================

type Row = { label: string; value?: React.ReactNode; mono?: boolean; full?: boolean; raw?: boolean };

const Section = ({
  title,
  rows,
  renderEditor,
}: {
  title: string;
  rows: Row[];
  renderEditor: (close: () => void) => React.ReactNode;
}) => {
  const [editing, setEditing] = useState(false);

  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-display font-semibold">{title}</h2>
        {!editing ? (
          <Button variant="ghost" size="icon" className="size-8" aria-label={`${title} bearbeiten`} onClick={() => setEditing(true)}>
            <Edit2 className="size-3.5 text-muted-foreground" />
          </Button>
        ) : (
          <Badge variant="outline" className="border-primary/40 text-primary-glow">Bearbeitungsmodus</Badge>
        )}
      </div>

      {!editing ? (
        <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
          {rows.map((r, i) => (
            <div key={i} className={cn("flex flex-col", r.full && "md:col-span-2 lg:col-span-3")}>
              {r.label && (
                <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{r.label}</dt>
              )}
              <dd className={cn("text-sm text-foreground mt-0.5 break-words", r.mono && "font-mono text-xs")}>
                {r.value === undefined || r.value === null || r.value === ""
                  ? <span className="text-muted-foreground italic">—</span>
                  : (r.raw ? r.value : <>{r.value}</>)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        renderEditor(() => setEditing(false))
      )}
    </Card>
  );
};

// =========================================================================
// Section editors — small controlled forms scoped per section
// =========================================================================

const Field = ({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) => (
  <div className={cn("space-y-1.5", full && "md:col-span-2 lg:col-span-3")}>
    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</Label>
    {children}
  </div>
);

const Selectbox = <T extends string>({
  value, onChange, options,
}: { value: T | undefined; onChange: (v: T) => void; options: readonly T[] }) => (
  <select
    value={value ?? ""}
    onChange={(e) => onChange(e.target.value as T)}
    className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
  >
    <option value="">— bitte wählen —</option>
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

const FormActions = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
  <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-border">
    <Button variant="outline" onClick={onCancel} className="gap-1.5"><X className="size-3.5" /> Abbrechen</Button>
    <Button onClick={onSave} className="bg-gradient-brand gap-1.5"><Save className="size-3.5" /> Speichern</Button>
  </div>
);

// ---- Identification ----------------------------------------------------

const IdentificationEditor = ({ vehicle, onSave, onCancel }: { vehicle: Vehicle; onSave: (p: Partial<Vehicle>) => void; onCancel: () => void }) => {
  const [type, setType] = useState<VehicleType>(vehicle.type);
  const [make, setMake] = useState(vehicle.make);
  const [model, setModel] = useState(vehicle.model);
  const [modelDetail, setModelDetail] = useState(vehicle.modelDetail ?? "");
  const [year, setYear] = useState(vehicle.year);
  const [condition, setCondition] = useState<VehicleCondition | undefined>(vehicle.condition);
  const [vin, setVin] = useState(vehicle.vin);
  const [hsn, setHsn] = useState(vehicle.hsn ?? "");
  const [tsn, setTsn] = useState(vehicle.tsn ?? "");
  const [licensePlate, setLicensePlate] = useState(vehicle.licensePlate ?? "");
  const [previousOwners, setPreviousOwners] = useState<number | "">(vehicle.previousOwners ?? "");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Fahrzeugtyp">
        <select value={type} onChange={(e) => setType(e.target.value as VehicleType)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
          {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="Marke"><Input value={make} onChange={(e) => setMake(e.target.value)} /></Field>
      <Field label="Modell"><Input value={model} onChange={(e) => setModel(e.target.value)} /></Field>
      <Field label="Modell-Details"><Input value={modelDetail} onChange={(e) => setModelDetail(e.target.value)} placeholder="z. B. M-Sport Paket" /></Field>
      <Field label="Baujahr"><Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></Field>
      <Field label="Zustand"><Selectbox value={condition} onChange={setCondition} options={CONDITIONS} /></Field>
      <Field label="VIN" full><Input value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} maxLength={17} className="font-mono" /></Field>
      <Field label="HSN"><Input value={hsn} onChange={(e) => setHsn(e.target.value)} maxLength={4} className="font-mono" /></Field>
      <Field label="TSN"><Input value={tsn} onChange={(e) => setTsn(e.target.value)} maxLength={3} className="font-mono" /></Field>
      <Field label="Kennzeichen"><Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value.toUpperCase())} className="font-mono" /></Field>
      <Field label="Vorbesitzer"><Input type="number" min={0} value={previousOwners} onChange={(e) => setPreviousOwners(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      <div className="md:col-span-2 lg:col-span-3">
        <FormActions
          onCancel={onCancel}
          onSave={() => onSave({
            type, make, model, modelDetail: modelDetail || undefined, year, condition, vin,
            hsn: hsn || undefined, tsn: tsn || undefined, licensePlate: licensePlate || undefined,
            previousOwners: previousOwners === "" ? undefined : Number(previousOwners),
          })}
        />
      </div>
    </div>
  );
};

// ---- Tech ---------------------------------------------------------------

const TechEditor = ({ vehicle, onSave, onCancel }: { vehicle: Vehicle; onSave: (p: Partial<Vehicle>) => void; onCancel: () => void }) => {
  const [fuel, setFuel] = useState<FuelType>(vehicle.fuel);
  const [transmission, setTransmission] = useState<Transmission>(vehicle.transmission);
  const [drive, setDrive] = useState<DriveType | undefined>(vehicle.drive);
  const [hp, setHp] = useState(vehicle.power_hp);
  const [displacement, setDisplacement] = useState<number | "">(vehicle.displacement_ccm ?? "");
  const [cylinders, setCylinders] = useState<number | "">(vehicle.cylinders ?? "");
  const [emission, setEmission] = useState<EmissionClass | undefined>(vehicle.emissionClass);
  const [co2, setCo2] = useState<number | "">(vehicle.co2_g_km ?? "");
  const [consumption, setConsumption] = useState<number | "">(vehicle.consumption_l_100km ?? "");
  const [battery, setBattery] = useState<number | "">(vehicle.batteryCapacity_kwh ?? "");
  const [range, setRange] = useState<number | "">(vehicle.range_km ?? "");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Kraftstoff">
        <select value={fuel} onChange={(e) => setFuel(e.target.value as FuelType)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
          {FUELS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </Field>
      <Field label="Getriebe">
        <select value={transmission} onChange={(e) => setTransmission(e.target.value as Transmission)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
          {TRANSMISSIONS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </Field>
      <Field label="Antrieb"><Selectbox value={drive} onChange={setDrive} options={DRIVES} /></Field>
      <Field label="Leistung (PS)"><Input type="number" value={hp || ""} onChange={(e) => setHp(Number(e.target.value))} /></Field>
      <Field label="Hubraum (ccm)"><Input type="number" value={displacement} onChange={(e) => setDisplacement(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      <Field label="Zylinder"><Input type="number" value={cylinders} onChange={(e) => setCylinders(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      <Field label="Schadstoffklasse"><Selectbox value={emission} onChange={setEmission} options={EMISSIONS} /></Field>
      <Field label="CO₂ (g/km)"><Input type="number" value={co2} onChange={(e) => setCo2(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      <Field label="Verbrauch (l/100km)"><Input type="number" step="0.1" value={consumption} onChange={(e) => setConsumption(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      <Field label="Batterie (kWh)"><Input type="number" value={battery} onChange={(e) => setBattery(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      <Field label="Reichweite (km)"><Input type="number" value={range} onChange={(e) => setRange(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      <div className="md:col-span-2 lg:col-span-3">
        <FormActions
          onCancel={onCancel}
          onSave={() => onSave({
            fuel, transmission, drive,
            power_hp: hp, power_kw: Math.round(hp * 0.7355),
            displacement_ccm: displacement === "" ? undefined : Number(displacement),
            cylinders: cylinders === "" ? undefined : Number(cylinders),
            emissionClass: emission,
            co2_g_km: co2 === "" ? undefined : Number(co2),
            consumption_l_100km: consumption === "" ? undefined : Number(consumption),
            batteryCapacity_kwh: battery === "" ? undefined : Number(battery),
            range_km: range === "" ? undefined : Number(range),
          })}
        />
      </div>
    </div>
  );
};

// ---- Appearance ---------------------------------------------------------

const AppearanceEditor = ({ vehicle, onSave, onCancel }: { vehicle: Vehicle; onSave: (p: Partial<Vehicle>) => void; onCancel: () => void }) => {
  const [color, setColor] = useState(vehicle.color);
  const [paintCode, setPaintCode] = useState(vehicle.paintCode ?? "");
  const [metallic, setMetallic] = useState<boolean | undefined>(vehicle.metallic);
  const [interiorColor, setInteriorColor] = useState(vehicle.interiorColor ?? "");
  const [interiorMaterial, setInteriorMaterial] = useState(vehicle.interiorMaterial ?? "");
  const [doors, setDoors] = useState<number | "">(vehicle.doors ?? "");
  const [seats, setSeats] = useState<number | "">(vehicle.seats ?? "");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Außenfarbe"><Input value={color} onChange={(e) => setColor(e.target.value)} /></Field>
      <Field label="Lackcode"><Input value={paintCode} onChange={(e) => setPaintCode(e.target.value)} className="font-mono" /></Field>
      <Field label="Metallic">
        <Selectbox value={metallic === undefined ? undefined : metallic ? "Ja" : "Nein"} onChange={(v) => setMetallic(v === "Ja")} options={["Ja", "Nein"] as const} />
      </Field>
      <Field label="Innenfarbe"><Input value={interiorColor} onChange={(e) => setInteriorColor(e.target.value)} /></Field>
      <Field label="Polster"><Input value={interiorMaterial} onChange={(e) => setInteriorMaterial(e.target.value)} placeholder="z. B. Leder, Stoff" /></Field>
      <Field label="Türen"><Input type="number" value={doors} onChange={(e) => setDoors(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      <Field label="Sitze"><Input type="number" value={seats} onChange={(e) => setSeats(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      <div className="md:col-span-2 lg:col-span-3">
        <FormActions
          onCancel={onCancel}
          onSave={() => onSave({
            color, paintCode: paintCode || undefined, metallic,
            interiorColor: interiorColor || undefined,
            interiorMaterial: interiorMaterial || undefined,
            doors: doors === "" ? undefined : Number(doors),
            seats: seats === "" ? undefined : Number(seats),
          })}
        />
      </div>
    </div>
  );
};

// ---- Registration -------------------------------------------------------

const RegistrationEditor = ({ vehicle, onSave, onCancel }: { vehicle: Vehicle; onSave: (p: Partial<Vehicle>) => void; onCancel: () => void }) => {
  const [mileage, setMileage] = useState(vehicle.mileage);
  const [firstReg, setFirstReg] = useState(vehicle.firstRegistration ?? "");
  const [hu, setHu] = useState(vehicle.hu ?? "");
  const [serviceBook, setServiceBook] = useState<boolean | undefined>(vehicle.serviceBookComplete);
  const [accidentFree, setAccidentFree] = useState<boolean | undefined>(vehicle.accidentFree);
  const [nonSmoker, setNonSmoker] = useState<boolean | undefined>(vehicle.nonSmoker);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Kilometerstand"><Input type="number" value={mileage || ""} onChange={(e) => setMileage(Number(e.target.value))} /></Field>
      <Field label="Erstzulassung"><Input type="date" value={firstReg} onChange={(e) => setFirstReg(e.target.value)} /></Field>
      <Field label="HU/TÜV bis"><Input type="date" value={hu} onChange={(e) => setHu(e.target.value)} /></Field>
      <Field label="Scheckheft komplett">
        <Selectbox value={serviceBook === undefined ? undefined : serviceBook ? "Ja" : "Nein"} onChange={(v) => setServiceBook(v === "Ja")} options={["Ja", "Nein"] as const} />
      </Field>
      <Field label="Unfallfrei">
        <Selectbox value={accidentFree === undefined ? undefined : accidentFree ? "Ja" : "Nein"} onChange={(v) => setAccidentFree(v === "Ja")} options={["Ja", "Nein"] as const} />
      </Field>
      <Field label="Nichtraucher">
        <Selectbox value={nonSmoker === undefined ? undefined : nonSmoker ? "Ja" : "Nein"} onChange={(v) => setNonSmoker(v === "Ja")} options={["Ja", "Nein"] as const} />
      </Field>
      <div className="md:col-span-2 lg:col-span-3">
        <FormActions
          onCancel={onCancel}
          onSave={() => onSave({
            mileage, firstRegistration: firstReg || undefined, hu: hu || undefined,
            serviceBookComplete: serviceBook, accidentFree, nonSmoker,
          })}
        />
      </div>
    </div>
  );
};

// ---- Price --------------------------------------------------------------

const PriceEditor = ({ vehicle, onSave, onCancel }: { vehicle: Vehicle; onSave: (p: Partial<Vehicle>) => void; onCancel: () => void }) => {
  const [listPrice, setListPrice] = useState(vehicle.listPrice);
  const [purchasePrice, setPurchasePrice] = useState(vehicle.purchasePrice);
  const [vatReportable, setVatReportable] = useState<boolean | undefined>(vehicle.vatReportable);
  const [notes, setNotes] = useState(vehicle.notes ?? "");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Listenpreis brutto (EUR)"><Input type="number" value={listPrice || ""} onChange={(e) => setListPrice(Number(e.target.value))} /></Field>
      <Field label="Einkaufspreis brutto (EUR)"><Input type="number" value={purchasePrice || ""} onChange={(e) => setPurchasePrice(Number(e.target.value))} /></Field>
      <Field label="MwSt. ausweisbar">
        <Selectbox value={vatReportable === undefined ? undefined : vatReportable ? "Ja" : "Nein"} onChange={(v) => setVatReportable(v === "Ja")} options={["Ja", "Nein"] as const} />
      </Field>
      <Field label="Notizen" full>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-input bg-background/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </Field>
      <div className="md:col-span-2 lg:col-span-3">
        <FormActions
          onCancel={onCancel}
          onSave={() => onSave({ listPrice, purchasePrice, vatReportable, notes: notes || undefined })}
        />
      </div>
    </div>
  );
};

// ---- Features -----------------------------------------------------------

const FeatureChips = ({ features }: { features: string[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {features.map((f, i) => (
      <Badge key={i} variant="outline" className="border-border bg-background/40 text-xs">
        <Sparkles className="size-3 mr-1" /> {f}
      </Badge>
    ))}
  </div>
);

const FeaturesEditor = ({ vehicle, onSave, onCancel }: { vehicle: Vehicle; onSave: (p: Partial<Vehicle>) => void; onCancel: () => void }) => {
  const [list, setList] = useState<string[]>(vehicle.features ?? []);
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    setList((l) => [...l, v]);
    setDraft("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="z. B. Navigationssystem, Sitzheizung, …"
        />
        <Button onClick={add} variant="outline" className="gap-1.5"><Plus className="size-3.5" /> Hinzufügen</Button>
      </div>
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground">Noch keine Ausstattung erfasst.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {list.map((f, i) => (
            <Badge key={i} variant="outline" className="border-border bg-background/40 text-xs gap-1.5">
              {f}
              <button type="button" onClick={() => setList((l) => l.filter((_, idx) => idx !== i))} className="hover:text-destructive">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <FormActions
        onCancel={onCancel}
        onSave={() => onSave({ features: list.length > 0 ? list : undefined })}
      />
    </div>
  );
};

// =========================================================================
// Dialog forms
// =========================================================================

const NewOfferForm = ({
  defaultPrice, customers, onSubmit, onCancel,
}: {
  defaultPrice: number;
  customers: { id: string; name: string; city: string }[];
  onSubmit: (d: { customerId: string; price: number; validUntil: string }) => void;
  onCancel: () => void;
}) => {
  const [customerId, setCustomerId] = useState("");
  const [price, setPrice] = useState(defaultPrice);
  const validDefault = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const [validUntil, setValidUntil] = useState(validDefault);
  const valid = customerId && price > 0 && validUntil;

  return (
    <>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Kunde *</Label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
            <option value="">— Kunde wählen —</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.city}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Angebotspreis (EUR) *</Label>
            <Input type="number" value={price || ""} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Gültig bis *</Label>
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
        <Button disabled={!valid} className="bg-gradient-brand" onClick={() => onSubmit({ customerId, price, validUntil })}>
          <Mail className="size-4 mr-1.5" /> Angebot senden
        </Button>
      </DialogFooter>
    </>
  );
};

const DirectSaleForm = ({
  defaultPrice, customers, onSubmit, onCancel,
}: {
  defaultPrice: number;
  customers: { id: string; name: string; city: string }[];
  onSubmit: (d: { customerId: string; price: number }) => void;
  onCancel: () => void;
}) => {
  const [customerId, setCustomerId] = useState("");
  const [price, setPrice] = useState(defaultPrice);
  const valid = customerId && price > 0;

  return (
    <>
      <div className="space-y-3 py-2">
        <p className="text-xs text-muted-foreground bg-info/10 border border-info/30 rounded-md p-3">
          Du überspringst das Angebot und startest sofort einen Vorgang ab Schritt „Anzahlung". Geeignet, wenn du dich mit dem Kunden mündlich geeinigt hast.
        </p>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Kunde *</Label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
            <option value="">— Kunde wählen —</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.city}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Vereinbarter Preis (EUR) *</Label>
          <Input type="number" value={price || ""} onChange={(e) => setPrice(Number(e.target.value))} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
        <Button disabled={!valid} className="bg-gradient-brand" onClick={() => onSubmit({ customerId, price })}>
          <Zap className="size-4 mr-1.5" /> Vorgang starten
        </Button>
      </DialogFooter>
    </>
  );
};

const LocationForm = ({
  locations, currentName, onSubmit, onCancel,
}: {
  locations: string[];
  currentName: string;
  onSubmit: (loc: VehicleLocation) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(currentName);
  const [customName, setCustomName] = useState("");
  const [kind, setKind] = useState<LocationKind>("lot");
  const [note, setNote] = useState("");
  const finalName = name === "__custom__" ? customName.trim() : name;
  const valid = finalName.length > 0;

  return (
    <>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Stellplatz / Standort *</Label>
          <select value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
            {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            <option value="__custom__">— Eigener Standort —</option>
          </select>
          {name === "__custom__" && (
            <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="z. B. Werkstatt Müller" />
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Art</Label>
          <select value={kind} onChange={(e) => setKind(e.target.value as LocationKind)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm">
            {Object.entries(LOCATION_KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Notiz</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
        <Button disabled={!valid} className="bg-gradient-brand" onClick={() => onSubmit({
          name: finalName, kind, since: new Date().toISOString(), note: note || undefined,
        })}>
          Standort übernehmen
        </Button>
      </DialogFooter>
    </>
  );
};

export default VehicleDetail;
