import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProcessStore } from "@/store/processStore";
import { OfferStatus, formatCurrency, formatDate } from "@/data/process";
import {
  ChevronRight, Download, ArrowDownAZ, ArrowUpAZ, CheckCircle2,
  Send, X, Clock, AlertTriangle, Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadOfferPdf } from "@/lib/pdf";
import { useTopbarSearch } from "@/context/TopbarSearchContext";
import { DataTableShell } from "@/components/shared/DataTableShell";
import { toast } from "sonner";

type OfferSortKey = "validUntil" | "created" | "price" | "customer" | "id";
type ValidityFilter = "all" | "active" | "soon" | "expired";

const STATUS_META: Record<OfferStatus, { label: string; className: string }> = {
  draft:    { label: "Entwurf",     className: "bg-muted text-muted-foreground border-border" },
  sent:     { label: "Gesendet",    className: "bg-info/15 text-info border-info/30" },
  accepted: { label: "Angenommen",  className: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Abgelehnt",   className: "bg-destructive/15 text-destructive border-destructive/30" },
  expired:  { label: "Abgelaufen",  className: "bg-warning/15 text-warning border-warning/30" },
};

const FilterPill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      "min-h-10 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-smooth border sm:min-h-0 sm:py-1.5",
      active
        ? "bg-primary text-primary-foreground border-primary shadow-glow"
        : "bg-background/40 text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
    )}
  >
    {children}
  </button>
);

const Offers = () => {
  const navigate = useNavigate();
  const offers = useProcessStore((s) => s.offers);
  const getVehicle = useProcessStore((s) => s.getVehicle);
  const getCustomer = useProcessStore((s) => s.getCustomer);
  const updateOfferStatus = useProcessStore((s) => s.updateOfferStatus);
  const acceptOffer = useProcessStore((s) => s.acceptOffer);
  const companyName = useProcessStore((s) => s.settings.companyName);
  const pdfTheme = useProcessStore((s) => s.settings.pdfTheme);
  const settings = useProcessStore((s) => s.settings);
  const seller = {
    street: settings.companyStreet,
    zip: settings.companyZip,
    city: settings.companyCity,
    representative: settings.companyRepresentative,
    vatId: settings.companyVatId,
    taxNumber: settings.companyTaxNumber,
    email: settings.companyEmail ?? settings.email,
    phone: settings.companyPhone ?? settings.phone,
    website: settings.companyWebsite,
    bankName: settings.companyBankName,
    iban: settings.companyIban,
    bic: settings.companyBic,
    registration: settings.companyRegistration,
  };

  const [offerQ, setOfferQ] = useState("");
  const [offerQField, setOfferQField] = useState<"all" | "id" | "vehicle" | "customer">("all");
  const [offerStatus, setOfferStatus] = useState<"all" | OfferStatus>("all");
  const [offerValidity, setOfferValidity] = useState<ValidityFilter>("all");
  const [offerSortKey, setOfferSortKey] = useState<OfferSortKey>("validUntil");
  const [offerSortDir, setOfferSortDir] = useState<"asc" | "desc">("asc");

  const enrichedOffers = useMemo(
    () =>
      offers
        .map((o) => ({ o, vehicle: getVehicle(o.vehicleId), customer: getCustomer(o.customerId) }))
        .filter((e) => e.vehicle && e.customer),
    [offers, getVehicle, getCustomer]
  );

  const offerCounts = useMemo(() => {
    const now = Date.now();
    const active = enrichedOffers.filter(({ o }) =>
      o.status === "sent" && new Date(o.validUntil).getTime() >= now
    ).length;
    const soon = enrichedOffers.filter(({ o }) => {
      if (o.status !== "sent") return false;
      const d = (new Date(o.validUntil).getTime() - now) / 86400000;
      return d >= 0 && d <= 3;
    }).length;
    const expired = enrichedOffers.filter(({ o }) =>
      o.status === "sent" && new Date(o.validUntil).getTime() < now
    ).length;
    return { all: enrichedOffers.length, active, soon, expired };
  }, [enrichedOffers]);

  const filteredOffers = useMemo(() => {
    const now = Date.now();
    const list = enrichedOffers.filter(({ o, vehicle, customer }) => {
      if (offerStatus !== "all" && o.status !== offerStatus) return false;
      if (offerValidity !== "all") {
        const ts = new Date(o.validUntil).getTime();
        const days = (ts - now) / 86400000;
        if (offerValidity === "active" && !(o.status === "sent" && ts >= now)) return false;
        if (offerValidity === "soon" && !(o.status === "sent" && days >= 0 && days <= 3)) return false;
        if (offerValidity === "expired" && !(o.status === "sent" && ts < now)) return false;
      }
      if (!offerQ) return true;
      const s = offerQ.toLowerCase();
      const fields: Record<typeof offerQField, string> = {
        all: `${o.id} ${vehicle!.vin} ${vehicle!.make} ${vehicle!.model} ${customer!.name}`,
        id: o.id,
        vehicle: `${vehicle!.make} ${vehicle!.model}`,
        customer: customer!.name,
      };
      return fields[offerQField].toLowerCase().includes(s);
    });

    return [...list].sort((a, b) => {
      const dir = offerSortDir === "asc" ? 1 : -1;
      switch (offerSortKey) {
        case "validUntil": return (new Date(a.o.validUntil).getTime() - new Date(b.o.validUntil).getTime()) * dir;
        case "created": return (new Date(a.o.createdAt).getTime() - new Date(b.o.createdAt).getTime()) * dir;
        case "price": return (a.o.price - b.o.price) * dir;
        case "customer": return a.customer!.name.localeCompare(b.customer!.name) * dir;
        case "id": return a.o.id.localeCompare(b.o.id) * dir;
      }
    });
  }, [enrichedOffers, offerQ, offerQField, offerStatus, offerValidity, offerSortKey, offerSortDir]);

  useTopbarSearch({
    placeholder: "Angebote durchsuchen…",
    value: offerQ,
    onChange: setOfferQ,
    field: offerQField,
    onFieldChange: (f: string) => setOfferQField(f as typeof offerQField),
    fields: [
      { key: "all",      label: "Alle Felder" },
      { key: "id",       label: "Angebots-Nr." },
      { key: "vehicle",  label: "Fahrzeug" },
      { key: "customer", label: "Kunde" },
    ],
  });

  return (
    <AppShell>
      <div className="space-y-3 animate-fade-in">
        <div className="shrink-0" data-tour="offers-header">
          <h1 className="text-2xl font-display font-bold">Angebote</h1>
          <p className="text-xs text-muted-foreground">
            Entwürfe, versendete, angenommene und abgelehnte Preisangebote.
          </p>
        </div>

        <Card className="px-3 py-2 bg-card border-border shrink-0" data-tour="offers-filters">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Select value={offerSortKey} onValueChange={(v) => setOfferSortKey(v as OfferSortKey)}>
              <SelectTrigger className="w-full text-xs bg-background/40 sm:h-8 sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="validUntil">Sort.: Gültig bis</SelectItem>
                <SelectItem value="created">Sort.: Erstellt</SelectItem>
                <SelectItem value="price">Sort.: Preis</SelectItem>
                <SelectItem value="customer">Sort.: Kunde</SelectItem>
                <SelectItem value="id">Sort.: Angebots-Nr.</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="sm:h-8 sm:w-8"
              onClick={() => setOfferSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              aria-label="Richtung wechseln"
            >
              {offerSortDir === "asc" ? <ArrowUpAZ className="size-4" /> : <ArrowDownAZ className="size-4" />}
            </Button>

            <Select value={offerStatus} onValueChange={(v) => setOfferStatus(v as "all" | OfferStatus)}>
              <SelectTrigger className="w-full text-xs bg-background/40 sm:h-8 sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status: Alle</SelectItem>
                <SelectItem value="draft">Entwurf</SelectItem>
                <SelectItem value="sent">Gesendet</SelectItem>
                <SelectItem value="accepted">Angenommen</SelectItem>
                <SelectItem value="rejected">Abgelehnt</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              <FilterPill active={offerValidity === "all"} onClick={() => setOfferValidity("all")}>
                Alle ({offerCounts.all})
              </FilterPill>
              <FilterPill active={offerValidity === "active"} onClick={() => setOfferValidity("active")}>
                Aktiv ({offerCounts.active})
              </FilterPill>
              <FilterPill active={offerValidity === "soon"} onClick={() => setOfferValidity("soon")}>
                <Clock className="size-3 mr-1 inline" /> Bald ({offerCounts.soon})
              </FilterPill>
              <FilterPill active={offerValidity === "expired"} onClick={() => setOfferValidity("expired")}>
                <AlertTriangle className="size-3 mr-1 inline" /> Abgelaufen ({offerCounts.expired})
              </FilterPill>
            </div>
          </div>
        </Card>

        <div className="hidden sm:block" data-tour="offers-table">
        <DataTableShell footer={<>{filteredOffers.length} Angebote</>}>
          <table>
            <thead>
              <tr>
                <th>Angebot</th>
                <th>Fahrzeug</th>
                <th>Kunde</th>
                <th>Status</th>
                <th className="text-right">Preis</th>
                <th>Gültig bis</th>
                <th>Nachfass</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredOffers.map(({ o, vehicle, customer }) => {
                const meta = STATUS_META[o.status];
                const days = Math.ceil((new Date(o.validUntil).getTime() - Date.now()) / 86400000);
                const isExpired = o.status === "sent" && days < 0;
                const isSoon = o.status === "sent" && days >= 0 && days <= 3;
                return (
                  <tr key={o.id} className="hover:bg-surface-elevated/40 transition-smooth group">
                    <td>
                      <Link to={`/angebote/${o.id}`} className="font-display font-semibold text-foreground hover:text-primary-glow">
                        {o.id}
                      </Link>
                      <p className="text-[10px] text-muted-foreground">erstellt {formatDate(o.createdAt)}</p>
                    </td>
                    <td>
                      <Link to={`/bestand/${vehicle!.id}`} className="hover:text-primary-glow transition-smooth">
                        <p className="font-medium text-foreground leading-tight">{vehicle!.make} {vehicle!.model}</p>
                        <p className="font-mono text-[10px] text-muted-foreground leading-tight">{vehicle!.vin}</p>
                      </Link>
                    </td>
                    <td>
                      <p className="text-foreground leading-tight">{customer!.name}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{customer!.city}</p>
                    </td>
                    <td>
                      <Badge className={cn(meta.className, "text-[10px] px-1.5 py-0")}>{meta.label}</Badge>
                    </td>
                    <td className="text-right font-semibold text-foreground whitespace-nowrap">
                      {formatCurrency(o.price)}
                    </td>
                    <td className="whitespace-nowrap">
                      <p className={cn(
                        "text-foreground",
                        isExpired && "text-warning",
                      )}>{formatDate(o.validUntil)}</p>
                      {o.status === "sent" && (
                        <p className={cn(
                          "text-[10px]",
                          isExpired ? "text-warning" : isSoon ? "text-warning" : "text-muted-foreground",
                        )}>
                          {isExpired
                            ? `vor ${Math.abs(days)} Tag${Math.abs(days) === 1 ? "" : "en"}`
                            : `noch ${days} Tag${days === 1 ? "" : "e"}`}
                        </p>
                      )}
                    </td>
                    <td>
                      {o.status === "sent" && (customer?.phone) && (
                        <a
                          href={`tel:${customer.phone}`}
                          className="inline-flex items-center gap-1 text-xs text-primary-glow hover:underline"
                          title={`Anrufen: ${customer.phone}`}
                        >
                          <Phone className="size-3" /> Anrufen
                        </a>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="PDF herunterladen"
                          onClick={(e) => {
                            e.preventDefault();
                            downloadOfferPdf({ offer: o, vehicle: vehicle!, customer: customer!, companyName, companyLogoUrl: settings.companyLogoUrl, seller, pdfTheme, pdfLayout: settings.pdfLayout });
                          }}
                        >
                          <Download className="size-3.5" />
                        </Button>
                        {o.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-info"
                            title="Senden"
                            onClick={(e) => {
                              e.preventDefault();
                              updateOfferStatus(o.id, "sent");
                              toast.success("Angebot versendet.");
                            }}
                          >
                            <Send className="size-3.5" />
                          </Button>
                        )}
                        {o.status === "sent" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-success"
                              title="Annehmen → Vorgang starten"
                              onClick={(e) => {
                                e.preventDefault();
                                const proc = acceptOffer(o.id);
                                if (proc) {
                                  toast.success(`Vorgang ${proc.id} gestartet.`);
                                  navigate(`/vorgaenge/${proc.id}`);
                                }
                              }}
                            >
                              <CheckCircle2 className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              title="Ablehnen"
                              onClick={(e) => {
                                e.preventDefault();
                                updateOfferStatus(o.id, "rejected");
                                toast.message("Angebot abgelehnt.");
                              }}
                            >
                              <X className="size-3.5" />
                            </Button>
                          </>
                        )}
                        <Link to={`/angebote/${o.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ChevronRight className="size-4" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredOffers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">
                    Keine Angebote gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </DataTableShell>
        </div>

        <div className="sm:hidden space-y-2">
          {filteredOffers.map(({ o, vehicle, customer }) => {
            const meta = STATUS_META[o.status];
            const days = Math.ceil((new Date(o.validUntil).getTime() - Date.now()) / 86400000);
            const isExpired = o.status === "sent" && days < 0;
            const isSoon = o.status === "sent" && days >= 0 && days <= 3;
            return (
              <Card key={o.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to={`/angebote/${o.id}`} className="font-display font-semibold text-foreground hover:text-primary-glow">
                      {o.id}
                    </Link>
                    <p className="text-[10px] text-muted-foreground">erstellt {formatDate(o.createdAt)}</p>
                  </div>
                  <Badge className={cn(meta.className, "text-[10px] px-1.5 py-0 shrink-0")}>{meta.label}</Badge>
                </div>
                <Link to={`/bestand/${vehicle!.id}`} className="block mt-2 hover:text-primary-glow transition-smooth">
                  <p className="font-medium text-foreground text-sm leading-tight">{vehicle!.make} {vehicle!.model}</p>
                  <p className="font-mono text-[10px] text-muted-foreground leading-tight">{vehicle!.vin}</p>
                </Link>
                <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Kunde</p>
                    <p className="text-foreground">{customer!.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Preis</p>
                    <p className="font-semibold text-foreground">{formatCurrency(o.price)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gültig bis</p>
                    <p className={cn("text-foreground", isExpired && "text-warning")}>{formatDate(o.validUntil)}</p>
                    {o.status === "sent" && (
                      <p className={cn("text-[10px]", (isExpired || isSoon) ? "text-warning" : "text-muted-foreground")}>
                        {isExpired
                          ? `vor ${Math.abs(days)} Tag${Math.abs(days) === 1 ? "" : "en"}`
                          : `noch ${days} Tag${days === 1 ? "" : "e"}`}
                      </p>
                    )}
                  </div>
                  {o.status === "sent" && customer?.phone && (
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Nachfass</p>
                      <a
                        href={`tel:${customer.phone}`}
                        className="inline-flex items-center gap-1 text-primary-glow text-xs hover:underline"
                      >
                        <Phone className="size-3" /> Anrufen
                      </a>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-1.5 border-t border-border/50 pt-2.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 gap-1.5 text-xs"
                    onClick={() => downloadOfferPdf({ offer: o, vehicle: vehicle!, customer: customer!, companyName, companyLogoUrl: settings.companyLogoUrl, seller, pdfTheme, pdfLayout: settings.pdfLayout })}
                  >
                    <Download className="size-3.5" /> PDF
                  </Button>
                  {o.status === "draft" && (
                    <Button
                      size="sm"
                      className="flex-1 h-9 gap-1.5 text-xs bg-info hover:bg-info/90"
                      onClick={() => { updateOfferStatus(o.id, "sent"); toast.success("Angebot versendet."); }}
                    >
                      <Send className="size-3.5" /> Senden
                    </Button>
                  )}
                  {o.status === "sent" && (
                    <>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 shrink-0 text-success border-success/40"
                        aria-label="Annehmen → Vorgang starten"
                        onClick={() => {
                          const proc = acceptOffer(o.id);
                          if (proc) { toast.success(`Vorgang ${proc.id} gestartet.`); navigate(`/vorgaenge/${proc.id}`); }
                        }}
                      >
                        <CheckCircle2 className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 shrink-0 text-destructive border-destructive/40"
                        aria-label="Ablehnen"
                        onClick={() => { updateOfferStatus(o.id, "rejected"); toast.message("Angebot abgelehnt."); }}
                      >
                        <X className="size-4" />
                      </Button>
                    </>
                  )}
                  <Link to={`/angebote/${o.id}`}>
                    <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" aria-label="Öffnen">
                      <ChevronRight className="size-4" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
          {filteredOffers.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">Keine Angebote gefunden.</Card>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default Offers;
