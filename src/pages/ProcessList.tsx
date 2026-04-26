import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProcessStore } from "@/store/processStore";
import {
  PROCESS_STEPS, ProcessStepKey, OfferStatus, formatCurrency, formatDate, stepIndex,
} from "@/data/process";
import {
  ChevronRight, FileText, Download, ArrowDownAZ, ArrowUpAZ, CheckCircle2,
  Send, X, Clock, AlertTriangle, Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadBelegPdf, downloadOfferPdf } from "@/lib/pdf";
import { useTopbarSearch } from "@/context/TopbarSearchContext";
import { DataTableShell } from "@/components/shared/DataTableShell";
import { toast } from "sonner";

type ProcessSortKey = "updated" | "created" | "price" | "id" | "customer";
type OfferSortKey = "validUntil" | "created" | "price" | "customer" | "id";
type ValidityFilter = "all" | "active" | "soon" | "expired";

/** Ein Vorgang gilt als archiviert, sobald der letzte Schritt der Kette abgeschlossen wurde. */
const LAST_STEP_KEY: ProcessStepKey = PROCESS_STEPS[PROCESS_STEPS.length - 1].key;
const isProcessArchived = (p: { steps: Record<string, { status?: string } | undefined> }) =>
  p.steps?.[LAST_STEP_KEY]?.status === "completed";

const STATUS_META: Record<OfferStatus, { label: string; className: string }> = {
  draft:    { label: "Entwurf",     className: "bg-muted text-muted-foreground border-border" },
  sent:     { label: "Gesendet",    className: "bg-info/15 text-info border-info/30" },
  accepted: { label: "Angenommen",  className: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Abgelehnt",   className: "bg-destructive/15 text-destructive border-destructive/30" },
  expired:  { label: "Abgelaufen",  className: "bg-warning/15 text-warning border-warning/30" },
};

const ProcessList = () => {
  const navigate = useNavigate();
  const processes = useProcessStore((s) => s.processes);
  const offers = useProcessStore((s) => s.offers);
  const getVehicle = useProcessStore((s) => s.getVehicle);
  const getCustomer = useProcessStore((s) => s.getCustomer);
  const updateOfferStatus = useProcessStore((s) => s.updateOfferStatus);
  const acceptOffer = useProcessStore((s) => s.acceptOffer);
  const companyName = useProcessStore((s) => s.settings.companyName);

  // ---- Tabs ----
  const [tab, setTab] = useState<"list" | "archived" | "offers" | "documents">("list");

  // ---- Liste ----
  const [q, setQ] = useState("");
  const [qField, setQField] = useState<"all" | "id" | "vin" | "vehicle" | "customer">("all");
  const [filter, setFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<ProcessSortKey>("updated");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ---- Archivierte Vorgänge ----
  const [archQ, setArchQ] = useState("");
  const [archQField, setArchQField] = useState<"all" | "id" | "vin" | "vehicle" | "customer">("all");
  const [archSortKey, setArchSortKey] = useState<ProcessSortKey>("updated");
  const [archSortDir, setArchSortDir] = useState<"asc" | "desc">("desc");

  const enriched = useMemo(
    () =>
      processes
        .map((p) => ({ p, vehicle: getVehicle(p.vehicleId), customer: getCustomer(p.customerId) }))
        .filter((e) => e.vehicle && e.customer),
    [processes, getVehicle, getCustomer]
  );

  const activeEnriched = useMemo(() => enriched.filter((e) => !isProcessArchived(e.p)), [enriched]);
  const archivedEnriched = useMemo(() => enriched.filter((e) => isProcessArchived(e.p)), [enriched]);

  const filtered = useMemo(() => {
    const list = activeEnriched.filter(({ p, vehicle, customer }) => {
      if (filter !== "all" && p.currentStep !== filter) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      const fields: Record<typeof qField, string> = {
        all: `${p.id} ${vehicle!.vin} ${vehicle!.make} ${vehicle!.model} ${customer!.name}`,
        id: p.id,
        vin: vehicle!.vin,
        vehicle: `${vehicle!.make} ${vehicle!.model}`,
        customer: customer!.name,
      };
      return fields[qField].toLowerCase().includes(s);
    });

    const sorted = [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "updated": return (new Date(a.p.updatedAt).getTime() - new Date(b.p.updatedAt).getTime()) * dir;
        case "created": return (new Date(a.p.createdAt).getTime() - new Date(b.p.createdAt).getTime()) * dir;
        case "price": return ((a.p.fields.finalPrice ?? a.vehicle!.listPrice) - (b.p.fields.finalPrice ?? b.vehicle!.listPrice)) * dir;
        case "id": return a.p.id.localeCompare(b.p.id) * dir;
        case "customer": return a.customer!.name.localeCompare(b.customer!.name) * dir;
      }
    });
    return sorted;
  }, [activeEnriched, q, qField, filter, sortKey, sortDir]);

  const filteredArchived = useMemo(() => {
    const list = archivedEnriched.filter(({ p, vehicle, customer }) => {
      if (!archQ) return true;
      const s = archQ.toLowerCase();
      const fields: Record<typeof archQField, string> = {
        all: `${p.id} ${vehicle!.vin} ${vehicle!.make} ${vehicle!.model} ${customer!.name}`,
        id: p.id,
        vin: vehicle!.vin,
        vehicle: `${vehicle!.make} ${vehicle!.model}`,
        customer: customer!.name,
      };
      return fields[archQField].toLowerCase().includes(s);
    });
    return [...list].sort((a, b) => {
      const dir = archSortDir === "asc" ? 1 : -1;
      switch (archSortKey) {
        case "updated": return (new Date(a.p.updatedAt).getTime() - new Date(b.p.updatedAt).getTime()) * dir;
        case "created": return (new Date(a.p.createdAt).getTime() - new Date(b.p.createdAt).getTime()) * dir;
        case "price": return ((a.p.fields.finalPrice ?? a.vehicle!.listPrice) - (b.p.fields.finalPrice ?? b.vehicle!.listPrice)) * dir;
        case "id": return a.p.id.localeCompare(b.p.id) * dir;
        case "customer": return a.customer!.name.localeCompare(b.customer!.name) * dir;
      }
    });
  }, [archivedEnriched, archQ, archQField, archSortKey, archSortDir]);

  // ---- Angebote ----
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

  // ---- Belege ----
  const [docQ, setDocQ] = useState("");
  const [docQField, setDocQField] = useState<"all" | "id" | "vin" | "vehicle" | "customer" | "doc">("all");
  const [docStep, setDocStep] = useState<"all" | ProcessStepKey>("all");
  const [docSortDir, setDocSortDir] = useState<"asc" | "desc">("desc");

  const topbarSearch = useMemo(() => {
    if (tab === "list") {
      return {
        placeholder: "Vorgänge durchsuchen…",
        value: q,
        onChange: setQ,
        field: qField,
        onFieldChange: (f: string) => setQField(f as typeof qField),
        fields: [
          { key: "all",      label: "Alle Felder" },
          { key: "id",       label: "Vorgangs-Nr." },
          { key: "vin",      label: "VIN" },
          { key: "vehicle",  label: "Fahrzeug" },
          { key: "customer", label: "Kunde" },
        ],
      };
    }
    if (tab === "offers") {
      return {
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
      };
    }
    return {
      placeholder: "Belege durchsuchen…",
      value: docQ,
      onChange: setDocQ,
      field: docQField,
      onFieldChange: (f: string) => setDocQField(f as typeof docQField),
      fields: [
        { key: "all",      label: "Alle Felder" },
        { key: "id",       label: "Vorgangs-Nr." },
        { key: "vin",      label: "VIN" },
        { key: "vehicle",  label: "Fahrzeug" },
        { key: "customer", label: "Kunde" },
        { key: "doc",      label: "Belegart" },
      ],
    };
  }, [tab, q, qField, offerQ, offerQField, docQ, docQField]);

  useTopbarSearch(topbarSearch);

  const documents = useMemo(() => {
    const docs: Array<{
      processId: string;
      step: typeof PROCESS_STEPS[number];
      completedAt: string;
      vehicleLabel: string;
      vin: string;
      customerName: string;
    }> = [];
    enriched.forEach(({ p, vehicle, customer }) => {
      PROCESS_STEPS.forEach((step) => {
        const rec = p.steps[step.key];
        if (rec?.status === "completed" && rec.documentArchived && rec.completedAt) {
          docs.push({
            processId: p.id,
            step,
            completedAt: rec.completedAt,
            vehicleLabel: `${vehicle!.make} ${vehicle!.model}`,
            vin: vehicle!.vin,
            customerName: customer!.name,
          });
        }
      });
    });
    return docs;
  }, [enriched]);

  const filteredDocs = useMemo(() => {
    const list = documents.filter((d) => {
      if (docStep !== "all" && d.step.key !== docStep) return false;
      if (!docQ) return true;
      const s = docQ.toLowerCase();
      const fields: Record<typeof docQField, string> = {
        all: `${d.processId} ${d.vin} ${d.vehicleLabel} ${d.customerName} ${d.step.documentName}`,
        id: d.processId,
        vin: d.vin,
        vehicle: d.vehicleLabel,
        customer: d.customerName,
        doc: d.step.documentName,
      };
      return fields[docQField].toLowerCase().includes(s);
    });
    return list.sort((a, b) => {
      const diff = new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
      return docSortDir === "asc" ? diff : -diff;
    });
  }, [documents, docQ, docQField, docStep, docSortDir]);

  const handleDownload = (processId: string, stepKey: ProcessStepKey) => {
    const proc = processes.find((p) => p.id === processId);
    if (!proc) return;
    const v = getVehicle(proc.vehicleId);
    const c = getCustomer(proc.customerId);
    if (!v || !c) return;
    downloadBelegPdf({ process: proc, vehicle: v, customer: c, stepKey });
  };

  return (
    <AppShell>
      <div className="space-y-3 animate-fade-in">
        <div className="shrink-0">
          <h1 className="text-2xl font-display font-bold">Vorgänge</h1>
          <p className="text-xs text-muted-foreground">
            Alle Angebote, aktiven Verkaufsvorgänge und archivierten Belege.
          </p>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "list" | "offers" | "documents")}
          className="space-y-3"
        >
          <TabsList className="shrink-0 self-start">
            <TabsTrigger value="list">Vorgänge ({processes.length})</TabsTrigger>
            <TabsTrigger value="offers">Angebote ({offers.length})</TabsTrigger>
            <TabsTrigger value="documents">Belege-Archiv ({documents.length})</TabsTrigger>
          </TabsList>

          {/* -------- Liste Vorgänge -------- */}
          <TabsContent value="list" className="space-y-3 mt-0">
            <Card className="px-3 py-2 bg-card border-border shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as ProcessSortKey)}>
                  <SelectTrigger className="w-[170px] h-8 text-xs bg-background/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated">Sort.: Aktualisiert</SelectItem>
                    <SelectItem value="created">Sort.: Erstellt</SelectItem>
                    <SelectItem value="price">Sort.: Preis</SelectItem>
                    <SelectItem value="customer">Sort.: Kunde</SelectItem>
                    <SelectItem value="id">Sort.: Vorgangs-Nr.</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  aria-label="Richtung wechseln"
                >
                  {sortDir === "asc" ? <ArrowUpAZ className="size-4" /> : <ArrowDownAZ className="size-4" />}
                </Button>
                <div className="flex gap-1.5 overflow-x-auto">
                  <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
                    Alle ({processes.length})
                  </FilterPill>
                  {PROCESS_STEPS.map((s) => {
                    const c = processes.filter((p) => p.currentStep === s.key).length;
                    if (c === 0) return null;
                    return (
                      <FilterPill key={s.key} active={filter === s.key} onClick={() => setFilter(s.key)}>
                        {s.shortLabel} ({c})
                      </FilterPill>
                    );
                  })}
                </div>
              </div>
            </Card>

            <DataTableShell footer={<>{filtered.length} Vorgänge</>}>
              <table>
                <thead>
                  <tr>
                    <th>Vorgang</th>
                    <th>Fahrzeug / VIN</th>
                    <th>Kunde</th>
                    <th>Aktueller Schritt</th>
                    <th className="text-right">Preis</th>
                    <th>Aktualisiert</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ p, vehicle, customer }) => {
                    const idx = stepIndex(p.currentStep);
                    const step = PROCESS_STEPS[idx];
                    return (
                      <tr key={p.id} className="hover:bg-surface-elevated/40 transition-smooth group">
                        <td>
                          <Link to={`/vorgaenge/${p.id}`} className="font-display font-semibold text-foreground hover:text-primary-glow">
                            {p.id}
                          </Link>
                        </td>
                        <td>
                          <p className="font-medium text-foreground leading-tight">{vehicle!.make} {vehicle!.model}</p>
                          <p className="font-mono text-[10px] text-muted-foreground leading-tight">{vehicle!.vin}</p>
                        </td>
                        <td>
                          <p className="text-foreground leading-tight">{customer!.name}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">{customer!.city}</p>
                        </td>
                        <td>
                          <Badge variant="outline" className="border-primary/30 text-primary-glow text-[10px] px-1.5 py-0">
                            {idx + 1}. {step.shortLabel}
                          </Badge>
                        </td>
                        <td className="text-right font-semibold text-foreground whitespace-nowrap">
                          {formatCurrency(p.fields.finalPrice ?? vehicle!.listPrice)}
                        </td>
                        <td className="text-muted-foreground whitespace-nowrap">{formatDate(p.updatedAt)}</td>
                        <td>
                          <Link to={`/vorgaenge/${p.id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-smooth">
                              <ChevronRight className="size-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-12 text-center text-muted-foreground">
                        Keine Vorgänge gefunden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </DataTableShell>
          </TabsContent>

          {/* -------- Angebote -------- */}
          <TabsContent value="offers" className="space-y-3 mt-0">
            <Card className="px-3 py-2 bg-card border-border shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={offerSortKey} onValueChange={(v) => setOfferSortKey(v as OfferSortKey)}>
                  <SelectTrigger className="w-[180px] h-8 text-xs bg-background/40">
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
                  className="h-8 w-8"
                  onClick={() => setOfferSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  aria-label="Richtung wechseln"
                >
                  {offerSortDir === "asc" ? <ArrowUpAZ className="size-4" /> : <ArrowDownAZ className="size-4" />}
                </Button>

                <Select value={offerStatus} onValueChange={(v) => setOfferStatus(v as "all" | OfferStatus)}>
                  <SelectTrigger className="w-[160px] h-8 text-xs bg-background/40">
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

                <div className="flex gap-1.5 overflow-x-auto">
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
                                downloadOfferPdf({ offer: o, vehicle: vehicle!, customer: customer!, companyName });
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
          </TabsContent>

          {/* -------- Belege-Archiv -------- */}
          <TabsContent value="documents" className="space-y-3 mt-0">
            <Card className="px-3 py-2 bg-card border-border shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={docStep} onValueChange={(v) => setDocStep(v as "all" | ProcessStepKey)}>
                  <SelectTrigger className="w-[200px] h-8 text-xs bg-background/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Belegarten</SelectItem>
                    {PROCESS_STEPS.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.documentName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDocSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  aria-label="Sortierung wechseln"
                  title={docSortDir === "asc" ? "Älteste zuerst" : "Neueste zuerst"}
                >
                  {docSortDir === "asc" ? <ArrowUpAZ className="size-4" /> : <ArrowDownAZ className="size-4" />}
                </Button>
              </div>
            </Card>

            <DataTableShell footer={<>{filteredDocs.length} Belege</>}>
              <table>
                <thead>
                  <tr>
                    <th>Belegart</th>
                    <th>Vorgang</th>
                    <th>Fahrzeug / VIN</th>
                    <th>Kunde</th>
                    <th>Erstellt</th>
                    <th className="text-right">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((d, idx) => (
                    <tr key={`${d.processId}-${d.step.key}-${idx}`} className="hover:bg-surface-elevated/40 transition-smooth group">
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-md bg-primary/15 grid place-items-center shrink-0">
                            <FileText className="size-3.5 text-primary-glow" />
                          </div>
                          <span className="font-medium text-foreground">{d.step.documentName}</span>
                        </div>
                      </td>
                      <td>
                        <Link to={`/vorgaenge/${d.processId}`} className="font-display font-semibold text-foreground hover:text-primary-glow">
                          {d.processId}
                        </Link>
                      </td>
                      <td>
                        <p className="text-foreground leading-tight">{d.vehicleLabel}</p>
                        <p className="font-mono text-[10px] text-muted-foreground leading-tight">{d.vin}</p>
                      </td>
                      <td className="text-foreground">{d.customerName}</td>
                      <td className="text-muted-foreground whitespace-nowrap">{formatDate(d.completedAt)}</td>
                      <td className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(d.processId, d.step.key)}
                          className="h-7 gap-1.5 text-xs"
                        >
                          <Download className="size-3.5" /> PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredDocs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-12 text-center text-muted-foreground">
                        Keine Belege gefunden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </DataTableShell>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};

const FilterPill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-smooth border",
      active
        ? "bg-primary text-primary-foreground border-primary shadow-glow"
        : "bg-background/40 text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
    )}
  >
    {children}
  </button>
);

export default ProcessList;
