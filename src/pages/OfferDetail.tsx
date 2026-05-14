import { useMemo, useState, useEffect } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Download, FileText, Mail, Plus, Send,
  Trash2, X, Save, Clock, AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useProcessStore } from "@/store/processStore";
import { formatCurrency, formatDate, OfferStatus } from "@/data/process";
import { downloadOfferPdf } from "@/lib/pdf";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_META: Record<OfferStatus, { label: string; className: string }> = {
  draft:    { label: "Entwurf",     className: "bg-muted text-muted-foreground border-border" },
  sent:     { label: "Gesendet",    className: "bg-info/15 text-info border-info/30" },
  accepted: { label: "Angenommen",  className: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Abgelehnt",   className: "bg-destructive/15 text-destructive border-destructive/30" },
  expired:  { label: "Abgelaufen",  className: "bg-warning/15 text-warning border-warning/30" },
};

const OfferDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const offer = useProcessStore((s) => s.offers.find((o) => o.id === id));
  const vehicle = useProcessStore((s) => offer && s.getVehicle(offer.vehicleId));
  const customer = useProcessStore((s) => offer && s.getCustomer(offer.customerId));
  const existingProcess = useProcessStore((s) =>
    offer ? s.processes.find((p) => p.acceptedOfferId === offer.id) : undefined
  );
  const companyName = useProcessStore((s) => s.settings.companyName);
  const pdfTheme = useProcessStore((s) => s.settings.pdfTheme);

  const updateOffer = useProcessStore((s) => s.updateOffer);
  const updateOfferStatus = useProcessStore((s) => s.updateOfferStatus);
  const acceptOffer = useProcessStore((s) => s.acceptOffer);

  // Lokaler Editier-State – wird in den Store geschrieben on save / on action
  const [price, setPrice] = useState(offer?.price ?? 0);
  const [discount, setDiscount] = useState<number | undefined>(offer?.discount);
  const [validUntil, setValidUntil] = useState(offer?.validUntil ?? "");
  const [notes, setNotes] = useState(offer?.notes ?? "");
  const [todos, setTodos] = useState(offer?.customerTodos ?? []);
  const [todoDraft, setTodoDraft] = useState("");

  // Wenn der Offer wechselt (z.B. nach Reload), State angleichen
  useEffect(() => {
    if (!offer) return;
    setPrice(offer.price);
    setDiscount(offer.discount);
    setValidUntil(offer.validUntil);
    setNotes(offer.notes ?? "");
    setTodos(offer.customerTodos);
  }, [offer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDirty = useMemo(() => {
    if (!offer) return false;
    return (
      price !== offer.price ||
      (discount ?? undefined) !== (offer.discount ?? undefined) ||
      validUntil !== offer.validUntil ||
      (notes ?? "") !== (offer.notes ?? "") ||
      JSON.stringify(todos) !== JSON.stringify(offer.customerTodos)
    );
  }, [offer, price, discount, validUntil, notes, todos]);

  if (!offer || !vehicle || !customer) return <Navigate to="/vorgaenge" replace />;

  const meta = STATUS_META[offer.status];
  const editable = offer.status === "draft" || offer.status === "sent";

  const daysToExpiry = Math.ceil(
    (new Date(offer.validUntil).getTime() - Date.now()) / 86400000
  );
  const isExpired = daysToExpiry < 0 && offer.status === "sent";
  const expiringSoon = daysToExpiry >= 0 && daysToExpiry <= 3 && offer.status === "sent";

  const persist = () => {
    updateOffer(offer.id, {
      price,
      discount: discount && discount > 0 ? discount : undefined,
      validUntil,
      notes: notes.trim() || undefined,
      customerTodos: todos,
    });
  };

  const handleSave = () => {
    persist();
    toast.success("Angebot gespeichert.");
  };

  const handleDownload = () => {
    // sicherstellen, dass die letzten Eingaben drin sind
    if (isDirty) persist();
    const fresh = useProcessStore.getState().offers.find((o) => o.id === offer.id) ?? offer;
    downloadOfferPdf({ offer: fresh, vehicle, customer, companyName });
    toast.success("Angebots-PDF heruntergeladen.");
  };

  const handleSend = () => {
    if (isDirty) persist();
    updateOfferStatus(offer.id, "sent");
    toast.success("Angebot als gesendet markiert.");
  };

  const handleReject = () => {
    updateOfferStatus(offer.id, "rejected");
    toast.message("Angebot abgelehnt.");
  };

  const handleAccept = () => {
    if (isDirty) persist();
    const proc = acceptOffer(offer.id);
    if (proc) {
      toast.success(`Angebot angenommen · Vorgang ${proc.id} gestartet.`);
      navigate(`/vorgaenge/${proc.id}`);
    }
  };

  const handleExtendValidity = (days: number) => {
    const base = new Date(offer.validUntil);
    if (isNaN(base.getTime()) || base.getTime() < Date.now()) {
      base.setTime(Date.now());
    }
    base.setDate(base.getDate() + days);
    const next = base.toISOString().slice(0, 10);
    setValidUntil(next);
    updateOffer(offer.id, { validUntil: next });
    toast.success(`Gültigkeit um ${days} Tage verlängert.`);
  };

  const addTodo = () => {
    const v = todoDraft.trim();
    if (!v) return;
    setTodos((l) => [...l, { id: `ot-${Date.now()}`, title: v }]);
    setTodoDraft("");
  };

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-4">
          <Link to="/vorgaenge" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-smooth">
            <ArrowLeft className="size-4" /> Alle Vorgänge & Angebote
          </Link>
          <div className="flex items-center gap-2">
            <Badge className={meta.className}>{meta.label}</Badge>
            {isExpired && (
              <Badge variant="outline" className="border-warning/40 text-warning gap-1.5">
                <AlertTriangle className="size-3" /> abgelaufen
              </Badge>
            )}
            {expiringSoon && (
              <Badge variant="outline" className="border-warning/40 text-warning gap-1.5">
                <Clock className="size-3" /> läuft in {daysToExpiry} Tag{daysToExpiry === 1 ? "" : "en"} ab
              </Badge>
            )}
          </div>
        </div>

        {/* Header */}
        <Card className="p-6 bg-gradient-surface border-border shadow-card">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Angebot {offer.id}</p>
              <h1 className="text-3xl font-display font-bold text-foreground">
                {vehicle.make} {vehicle.model}
              </h1>
              <p className="font-mono text-xs text-muted-foreground mt-2">VIN {vehicle.vin}</p>
              <Link to={`/bestand/${vehicle.id}`} className="text-xs text-primary-glow hover:underline mt-1 inline-block">
                Fahrzeug öffnen →
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <Stat label="Kunde" value={customer.name} sub={customer.city} />
              <Stat label="Angebotspreis" value={formatCurrency(price)} sub={discount ? `Rabatt ${formatCurrency(discount)}` : undefined} />
              <Stat label="Erstellt" value={formatDate(offer.createdAt)} />
              <Stat label="Gültig bis" value={formatDate(validUntil)} sub={!isExpired ? `noch ${Math.max(0, daysToExpiry)} Tag${daysToExpiry === 1 ? "" : "e"}` : "abgelaufen"} />
            </div>
          </div>
        </Card>

        {existingProcess && (
          <Card className="p-5 bg-success/5 border-success/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-success" />
              <div>
                <p className="font-display font-semibold text-foreground">Vorgang läuft: {existingProcess.id}</p>
                <p className="text-xs text-muted-foreground">Aus diesem Angebot entstanden – aktueller Schritt: {existingProcess.currentStep}</p>
              </div>
            </div>
            <Button asChild className="bg-gradient-brand">
              <Link to={`/vorgaenge/${existingProcess.id}`}>Vorgang öffnen</Link>
            </Button>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main editor */}
          <Card className="lg:col-span-2 p-6 bg-card border-border shadow-card space-y-6">
            <div>
              <h2 className="text-xl font-display font-semibold mb-1">Angebotsdaten</h2>
              <p className="text-xs text-muted-foreground">
                {editable
                  ? "Pflegen Sie Preis, Gültigkeit und Konditionen. Die Felder erscheinen 1:1 auf dem PDF-Beleg."
                  : "Angebot ist abgeschlossen und kann nicht mehr bearbeitet werden."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Angebotspreis (EUR) *</Label>
                <Input
                  type="number"
                  value={price || ""}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  disabled={!editable}
                  className="bg-background/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Rabatt (EUR)</Label>
                <Input
                  type="number"
                  value={discount ?? ""}
                  onChange={(e) => setDiscount(e.target.value === "" ? undefined : Number(e.target.value))}
                  disabled={!editable}
                  className="bg-background/40"
                  placeholder="optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Gültig bis *</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  disabled={!editable}
                  className="bg-background/40"
                />
                {editable && (
                  <div className="flex gap-1.5 pt-1">
                    <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => handleExtendValidity(7)}>
                      +7 Tage
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => handleExtendValidity(14)}>
                      +14 Tage
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs text-muted-foreground">Notizen / Hinweise (erscheinen auf PDF)</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!editable}
                  rows={3}
                  placeholder="z. B. Lieferzeit, Sonderausstattung, Sondervereinbarung…"
                  className="w-full rounded-md border border-input bg-background/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
              </div>
            </div>

            <Separator className="bg-border/60" />

            {/* Vereinbarte Leistungen / Customer-To-Dos */}
            <div className="space-y-3">
              <div>
                <h3 className="font-display font-semibold text-sm">Vereinbarte Leistungen</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Werden auf dem Angebots-PDF als Liste gedruckt – sichtbar für den Kunden.
                </p>
              </div>
              {editable && (
                <div className="flex gap-2">
                  <Input
                    value={todoDraft}
                    onChange={(e) => setTodoDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTodo(); } }}
                    placeholder="z. B. Winterreifen-Set inkl., Service vor Übergabe…"
                    className="bg-background/40"
                  />
                  <Button onClick={addTodo} variant="outline" className="gap-1.5">
                    <Plus className="size-3.5" /> Hinzufügen
                  </Button>
                </div>
              )}
              {todos.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Noch keine vereinbarten Leistungen.</p>
              ) : (
                <ul className="space-y-1.5">
                  {todos.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 p-2 rounded-md border border-border bg-background/40 text-sm">
                      <span className="flex-1">{t.title}</span>
                      {editable && (
                        <button
                          type="button"
                          onClick={() => setTodos((l) => l.filter((x) => x.id !== t.id))}
                          className="text-muted-foreground hover:text-destructive transition-smooth"
                          aria-label="Entfernen"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* PDF-Beleg-Box */}
            <div className="rounded-xl border border-dashed border-border bg-background/40 p-4">
              <div className="flex items-start gap-4">
                <div className="size-10 rounded-lg bg-primary/10 grid place-items-center border border-primary/20 shrink-0">
                  <FileText className="size-5 text-primary-glow" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-foreground">Angebots-Beleg PDF</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Wird mit den oben gepflegten Daten erzeugt. Bei jedem Senden / Annehmen aktualisiert.
                  </p>
                </div>
                <Button onClick={handleDownload} variant="outline" size="sm" className="gap-1.5 shrink-0">
                  <Download className="size-3.5" /> PDF
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 flex-wrap pt-2 border-t border-border">
              {editable && isDirty && (
                <p className="text-xs text-warning mr-auto">Nicht gespeicherte Änderungen.</p>
              )}
              {editable && (
                <Button variant="outline" onClick={handleSave} disabled={!isDirty} className="gap-1.5">
                  <Save className="size-3.5" /> Speichern
                </Button>
              )}
              {offer.status === "draft" && (
                <Button onClick={handleSend} className="bg-gradient-brand gap-1.5">
                  <Send className="size-3.5" /> Senden
                </Button>
              )}
              {offer.status === "sent" && !existingProcess && (
                <>
                  <Button variant="outline" onClick={handleReject} className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <X className="size-3.5" /> Ablehnen
                  </Button>
                  <Button onClick={handleAccept} className="bg-success hover:bg-success/90 text-success-foreground gap-1.5">
                    <CheckCircle2 className="size-3.5" /> Annehmen → Vorgang <ArrowRight className="size-3.5" />
                  </Button>
                </>
              )}
            </div>
          </Card>

          {/* Right column */}
          <div className="space-y-6">
            <Card className="p-5 bg-card border-border shadow-card">
              <h3 className="font-display font-semibold text-sm mb-4">Kunde</h3>
              <div className="space-y-2 text-sm">
                <Row label="Name" value={customer.name} />
                <Row label="E-Mail" value={customer.email} mono />
                <Row label="Telefon" value={customer.phone} mono />
                <Row label="Stadt" value={customer.city} />
              </div>
              <Button asChild variant="outline" size="sm" className="w-full mt-4 gap-1.5">
                <a href={`tel:${customer.phone}`}>
                  <Mail className="size-3.5" /> Nachfassen
                </a>
              </Button>
            </Card>

            <Card className="p-5 bg-card border-border shadow-card">
              <h3 className="font-display font-semibold text-sm mb-4">Fahrzeug</h3>
              <div className="space-y-2 text-sm">
                <Row label="Modell" value={`${vehicle.make} ${vehicle.model}`} />
                <Row label="VIN" value={vehicle.vin} mono />
                <Row label="Baujahr" value={String(vehicle.year)} />
                <Row label="Listenpreis" value={formatCurrency(vehicle.listPrice)} />
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
  <div className="flex items-start justify-between gap-3">
    <span className="text-xs text-muted-foreground shrink-0">{label}</span>
    <span className={cn("text-foreground text-right truncate", mono && "font-mono text-xs")}>{value}</span>
  </div>
);

export default OfferDetail;
