import { useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useProcessStore } from "@/store/processStore";
import { formatCurrency, formatDate, OfferStatus } from "@/data/process";
import { ArrowLeft, Car, Calendar, Gauge, Palette, Plus, FileText, CheckCircle2, X, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link as RouterLink, useNavigate } from "react-router-dom";

const STATUS_META: Record<OfferStatus, { label: string; className: string }> = {
  draft: { label: "Entwurf", className: "bg-muted text-muted-foreground border-border" },
  sent: { label: "Gesendet", className: "bg-info/15 text-info border-info/30" },
  accepted: { label: "Angenommen", className: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Abgelehnt", className: "bg-destructive/15 text-destructive border-destructive/30" },
  expired: { label: "Abgelaufen", className: "bg-muted text-muted-foreground border-border" },
};

const VehicleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const vehicle = useProcessStore((s) => s.vehicles.find((v) => v.id === id));
  const offers = useProcessStore((s) => s.getOffersForVehicle(id ?? ""));
  const customers = useProcessStore((s) => s.customers);
  const getCustomer = useProcessStore((s) => s.getCustomer);
  const process = useProcessStore((s) => s.processes.find((p) => p.vehicleId === id));
  const addOffer = useProcessStore((s) => s.addOffer);
  const updateOfferStatus = useProcessStore((s) => s.updateOfferStatus);
  const acceptOffer = useProcessStore((s) => s.acceptOffer);

  const [offerDialog, setOfferDialog] = useState(false);

  if (!vehicle) return <Navigate to="/bestand" replace />;

  const acceptedOffer = offers.find((o) => o.status === "accepted");
  const canAcceptMore = !acceptedOffer;

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in">
        <Link to="/bestand" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Zurück zum Bestand
        </Link>

        <Card className="p-6 bg-gradient-surface border-border shadow-card">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-2xl bg-gradient-brand grid place-items-center shadow-glow">
                <Car className="size-8 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Fahrzeug {vehicle.id}</p>
                <h1 className="text-3xl font-display font-bold">{vehicle.make} {vehicle.model}</h1>
                <p className="font-mono text-xs text-muted-foreground mt-1">VIN {vehicle.vin}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <Stat icon={Calendar} label="Baujahr" value={vehicle.year.toString()} />
              <Stat icon={Gauge} label="Kilometer" value={`${vehicle.mileage.toLocaleString("de-DE")} km`} />
              <Stat icon={Palette} label="Farbe" value={vehicle.color} />
              <Stat icon={FileText} label="Listenpreis" value={formatCurrency(vehicle.listPrice)} highlight />
            </div>
          </div>
        </Card>

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

        <Card className="p-6 bg-card border-border shadow-card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-display font-semibold">Angebote</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {offers.length} Angebot{offers.length !== 1 ? "e" : ""} · sobald eines angenommen wird, startet der Vorgang.
              </p>
            </div>
            {!process && (
              <Button onClick={() => setOfferDialog(true)} className="bg-gradient-brand gap-2">
                <Plus className="size-4" /> Neues Angebot
              </Button>
            )}
          </div>

          {offers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
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

      {/* New offer dialog */}
      <Dialog open={offerDialog} onOpenChange={setOfferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Angebot erstellen</DialogTitle>
          </DialogHeader>
          <NewOfferForm
            vehicleId={vehicle.id}
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
    </AppShell>
  );
};

const NewOfferForm = ({
  vehicleId,
  defaultPrice,
  customers,
  onSubmit,
  onCancel,
}: {
  vehicleId: string;
  defaultPrice: number;
  customers: ReturnType<typeof useProcessStore.getState>["customers"];
  onSubmit: (d: { customerId: string; price: number; validUntil: string; notes?: string }) => void;
  onCancel: () => void;
}) => {
  const [customerId, setCustomerId] = useState("");
  const [price, setPrice] = useState(defaultPrice);
  const validUntilDefault = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const [validUntil, setValidUntil] = useState(validUntilDefault);

  const valid = customerId && price > 0 && validUntil;

  return (
    <>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Kunde *</Label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">— Kunde wählen —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} · {c.city}</option>
            ))}
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

const Stat = ({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) => (
  <div>
    <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
      <Icon className="size-3" /> {label}
    </p>
    <p className={cn("text-sm font-semibold mt-1", highlight ? "text-primary-glow text-base" : "text-foreground")}>{value}</p>
  </div>
);

export default VehicleDetail;
