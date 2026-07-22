import { useCallback, useMemo, useState } from "react";
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
  PROCESS_STEPS, ProcessStep, ProcessStepKey, formatCurrency, formatDate,
  getLastProcessStepKey, getProcessStepsForDisplay, stepIndexIn,
} from "@/data/process";
import {
  ChevronRight, FileText, Download, ArrowDownAZ, ArrowUpAZ, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadBelegPdf } from "@/lib/pdf";
import { useTopbarSearch } from "@/context/TopbarSearchContext";
import { DataTableShell } from "@/components/shared/DataTableShell";
import { useWorkshopStore } from "@/store/workshopStore";
import { WORKSHOP_DEMO } from "@/data/workshopDemo";
import { useWorkshopPath } from "@/hooks/useWorkshopPath";

type ProcessSortKey = "updated" | "created" | "price" | "id" | "customer";

const ProcessList = () => {
  const navigate = useNavigate();
  const wp = useWorkshopPath();
  const workshopActive = useWorkshopStore((s) => s.activeKey === "processes");
  const realProcesses = useProcessStore((s) => s.processes);
  const realGetVehicle = useProcessStore((s) => s.getVehicle);
  const realGetCustomer = useProcessStore((s) => s.getCustomer);

  const demoVehicleMap = useMemo(() => new Map(WORKSHOP_DEMO.vehicles.map((v) => [v.id, v])), []);
  const demoCustomerMap = useMemo(() => new Map(WORKSHOP_DEMO.customers.map((c) => [c.id, c])), []);

  const processes = workshopActive ? WORKSHOP_DEMO.processes : realProcesses;
  const getVehicle = useMemo(
    () => (workshopActive ? (id: string) => demoVehicleMap.get(id) : realGetVehicle),
    [workshopActive, demoVehicleMap, realGetVehicle],
  );
  const getCustomer = useMemo(
    () => (workshopActive ? (id: string) => demoCustomerMap.get(id) : realGetCustomer),
    [workshopActive, demoCustomerMap, realGetCustomer],
  );
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
  const processSteps = PROCESS_STEPS;
  const isProcessArchived = useCallback(
    (p: { processStepKeys?: ProcessStepKey[]; steps: Record<string, { status?: string } | undefined> }) => {
      const lastStepKey = getLastProcessStepKey(p.processStepKeys);
      return p.steps?.[lastStepKey]?.status === "completed";
    },
    [],
  );

  // ---- Tabs ----
  const [tab, setTab] = useState<"list" | "archived" | "documents">("list");

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

  const activeEnriched = useMemo(() => enriched.filter((e) => !isProcessArchived(e.p)), [enriched, isProcessArchived]);
  const archivedEnriched = useMemo(() => enriched.filter((e) => isProcessArchived(e.p)), [enriched, isProcessArchived]);

  /** Überblick, wie viele aktive Vorgänge gerade in welchem Prozess-Schritt stecken —
   * direkt unter der Überschrift sichtbar, damit man das nicht erst im Filter-Reiter suchen muss. */
  const activeStepCounts = useMemo(
    () =>
      processSteps
        .map((s) => ({ key: s.key, label: s.shortLabel, count: activeEnriched.filter((e) => e.p.currentStep === s.key).length }))
        .filter((s) => s.count > 0),
    [processSteps, activeEnriched],
  );

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
    if (tab === "archived") {
      return {
        placeholder: "Archivierte Vorgänge durchsuchen…",
        value: archQ,
        onChange: setArchQ,
        field: archQField,
        onFieldChange: (f: string) => setArchQField(f as typeof archQField),
        fields: [
          { key: "all",      label: "Alle Felder" },
          { key: "id",       label: "Vorgangs-Nr." },
          { key: "vin",      label: "VIN" },
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
  }, [tab, q, qField, archQ, archQField, docQ, docQField]);

  useTopbarSearch(topbarSearch);

  const documents = useMemo(() => {
    const docs: Array<{
      processId: string;
      step: ProcessStep;
      completedAt: string;
      vehicleLabel: string;
      vin: string;
      customerName: string;
    }> = [];
    enriched.forEach(({ p, vehicle, customer }) => {
      processSteps.forEach((step) => {
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
  }, [enriched, processSteps]);

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
    downloadBelegPdf({ process: proc, vehicle: v, customer: c, stepKey, companyName, companyLogoUrl: settings.companyLogoUrl, seller, pdfTheme, pdfLayout: settings.pdfLayout });
  };

  return (
    <AppShell>
      <div className="space-y-3 animate-fade-in">
        <div className="shrink-0" data-tour="proc-header">
          <h1 className="text-2xl font-display font-bold">Vorgänge</h1>
          <p className="text-xs text-muted-foreground">
            Alle aktiven Verkaufsvorgänge und archivierten Belege. Angebote findest du im eigenen Menüpunkt.
          </p>
          {activeStepCounts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-0.5">
                Pipeline:
              </span>
              {activeStepCounts.map((s) => (
                <button
                  key={s.key}
                  onClick={() => { setTab("list"); setFilter(s.key); }}
                  className="px-2 py-1 rounded-md text-[11px] font-medium bg-secondary/60 text-foreground border border-border hover:border-primary/40 hover:bg-secondary transition-smooth"
                >
                  {s.label} <span className="text-muted-foreground">({s.count})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "list" | "archived" | "documents")}
          className="space-y-3"
        >
          <TabsList className="w-full shrink-0 justify-start self-start" data-tour="proc-tabs">
            <TabsTrigger value="list">Aktive Vorgänge ({activeEnriched.length})</TabsTrigger>
            <TabsTrigger value="archived">Archivierte Vorgänge ({archivedEnriched.length})</TabsTrigger>
            <TabsTrigger value="documents">Belege-Archiv ({documents.length})</TabsTrigger>
          </TabsList>

          {/* -------- Liste Vorgänge -------- */}
          <TabsContent value="list" className="space-y-3 mt-0">
            <Card className="px-3 py-2 bg-card border-border shrink-0" data-tour="proc-filters">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as ProcessSortKey)}>
                  <SelectTrigger className="w-full text-xs bg-background/40 sm:h-8 sm:w-[170px]">
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
                  className="sm:h-8 sm:w-8"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  aria-label="Richtung wechseln"
                >
                  {sortDir === "asc" ? <ArrowUpAZ className="size-4" /> : <ArrowDownAZ className="size-4" />}
                </Button>
                <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
                  <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
                    Alle ({activeEnriched.length})
                  </FilterPill>
                  {processSteps.map((s) => {
                    const c = activeEnriched.filter((e) => e.p.currentStep === s.key).length;
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

            <div className="hidden sm:block" data-tour="proc-table">
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
                    const visibleSteps = getProcessStepsForDisplay(p.currentStep, { processStepKeys: p.processStepKeys });
                    const idx = Math.max(0, stepIndexIn(p.currentStep, visibleSteps));
                    const step = visibleSteps[idx];
                    return (
                      <tr key={p.id} className="hover:bg-surface-elevated/40 transition-smooth group">
                        <td>
                          <Link to={wp(`/vorgaenge/${p.id}`)} className="font-display font-semibold text-foreground hover:text-primary-glow">
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
                          <Link to={wp(`/vorgaenge/${p.id}`)}>
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
            </div>

            <div className="sm:hidden space-y-2">
              {filtered.map(({ p, vehicle, customer }) => {
                const visibleSteps = getProcessStepsForDisplay(p.currentStep, { processStepKeys: p.processStepKeys });
                const idx = Math.max(0, stepIndexIn(p.currentStep, visibleSteps));
                const step = visibleSteps[idx];
                return (
                  <Card
                    key={p.id}
                    onClick={() => navigate(wp(`/vorgaenge/${p.id}`))}
                    className="p-3 cursor-pointer active:bg-surface-elevated/40 transition-smooth"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-semibold text-foreground">{p.id}</span>
                      <Badge variant="outline" className="border-primary/30 text-primary-glow text-[10px] px-1.5 py-0 shrink-0">
                        {idx + 1}. {step.shortLabel}
                      </Badge>
                    </div>
                    <p className="font-medium text-foreground text-sm mt-1.5 leading-tight">{vehicle!.make} {vehicle!.model}</p>
                    <p className="font-mono text-[10px] text-muted-foreground leading-tight">{vehicle!.vin}</p>
                    <div className="mt-2.5 flex items-end justify-between">
                      <div>
                        <p className="text-xs text-foreground leading-tight">{customer!.name}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{customer!.city}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground text-sm">{formatCurrency(p.fields.finalPrice ?? vehicle!.listPrice)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(p.updatedAt)}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {filtered.length === 0 && (
                <Card className="p-8 text-center text-sm text-muted-foreground">Keine Vorgänge gefunden.</Card>
              )}
            </div>
          </TabsContent>

          {/* -------- Archivierte Vorgänge -------- */}
          <TabsContent value="archived" className="space-y-3 mt-0">
            <Card className="px-3 py-2 bg-card border-border shrink-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Select value={archSortKey} onValueChange={(v) => setArchSortKey(v as ProcessSortKey)}>
                  <SelectTrigger className="w-full text-xs bg-background/40 sm:h-8 sm:w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated">Sort.: Abgeschlossen</SelectItem>
                    <SelectItem value="created">Sort.: Erstellt</SelectItem>
                    <SelectItem value="price">Sort.: Preis</SelectItem>
                    <SelectItem value="customer">Sort.: Kunde</SelectItem>
                    <SelectItem value="id">Sort.: Vorgangs-Nr.</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="sm:h-8 sm:w-8"
                  onClick={() => setArchSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  aria-label="Richtung wechseln"
                >
                  {archSortDir === "asc" ? <ArrowUpAZ className="size-4" /> : <ArrowDownAZ className="size-4" />}
                </Button>
                <p className="text-[11px] text-muted-foreground sm:ml-auto">
                  Vorgänge, deren letzter Schritt in ihrer festen Vorgangskette abgeschlossen wurde.
                </p>
              </div>
            </Card>

            <div className="hidden sm:block">
            <DataTableShell footer={<>{filteredArchived.length} archivierte Vorgänge</>}>
              <table>
                <thead>
                  <tr>
                    <th>Vorgang</th>
                    <th>Fahrzeug / VIN</th>
                    <th>Kunde</th>
                    <th className="text-right">Preis</th>
                    <th>Abgeschlossen</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArchived.map(({ p, vehicle, customer }) => {
                    const lastStepKey = getLastProcessStepKey(p.processStepKeys);
                    const completedAt = p.steps[lastStepKey]?.completedAt ?? p.updatedAt;
                    return (
                      <tr key={p.id} className="hover:bg-surface-elevated/40 transition-smooth group">
                        <td>
                          <Link to={wp(`/vorgaenge/${p.id}`)} className="font-display font-semibold text-foreground hover:text-primary-glow">
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
                        <td className="text-right font-semibold text-foreground whitespace-nowrap">
                          {formatCurrency(p.fields.finalPrice ?? vehicle!.listPrice)}
                        </td>
                        <td className="whitespace-nowrap">
                          <Badge variant="outline" className="border-success/40 text-success text-[10px] px-1.5 py-0 gap-1">
                            <CheckCircle2 className="size-3" /> {formatDate(completedAt)}
                          </Badge>
                        </td>
                        <td>
                          <Link to={wp(`/vorgaenge/${p.id}`)}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-smooth">
                              <ChevronRight className="size-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredArchived.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-12 text-center text-muted-foreground">
                        Noch keine archivierten Vorgänge.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </DataTableShell>
            </div>

            <div className="sm:hidden space-y-2">
              {filteredArchived.map(({ p, vehicle, customer }) => {
                const lastStepKey = getLastProcessStepKey(p.processStepKeys);
                const completedAt = p.steps[lastStepKey]?.completedAt ?? p.updatedAt;
                return (
                  <Card
                    key={p.id}
                    onClick={() => navigate(wp(`/vorgaenge/${p.id}`))}
                    className="p-3 cursor-pointer active:bg-surface-elevated/40 transition-smooth"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-semibold text-foreground">{p.id}</span>
                      <Badge variant="outline" className="border-success/40 text-success text-[10px] px-1.5 py-0 gap-1 shrink-0">
                        <CheckCircle2 className="size-3" /> {formatDate(completedAt)}
                      </Badge>
                    </div>
                    <p className="font-medium text-foreground text-sm mt-1.5 leading-tight">{vehicle!.make} {vehicle!.model}</p>
                    <p className="font-mono text-[10px] text-muted-foreground leading-tight">{vehicle!.vin}</p>
                    <div className="mt-2.5 flex items-end justify-between">
                      <div>
                        <p className="text-xs text-foreground leading-tight">{customer!.name}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{customer!.city}</p>
                      </div>
                      <p className="font-semibold text-foreground text-sm">{formatCurrency(p.fields.finalPrice ?? vehicle!.listPrice)}</p>
                    </div>
                  </Card>
                );
              })}
              {filteredArchived.length === 0 && (
                <Card className="p-8 text-center text-sm text-muted-foreground">Noch keine archivierten Vorgänge.</Card>
              )}
            </div>
          </TabsContent>

          {/* -------- Belege-Archiv -------- */}
          <TabsContent value="documents" className="space-y-3 mt-0">
            <Card className="px-3 py-2 bg-card border-border shrink-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Select value={docStep} onValueChange={(v) => setDocStep(v as "all" | ProcessStepKey)}>
                  <SelectTrigger className="w-full text-xs bg-background/40 sm:h-8 sm:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Belegarten</SelectItem>
                    {processSteps.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.documentName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="sm:h-8 sm:w-8"
                  onClick={() => setDocSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  aria-label="Sortierung wechseln"
                  title={docSortDir === "asc" ? "Älteste zuerst" : "Neueste zuerst"}
                >
                  {docSortDir === "asc" ? <ArrowUpAZ className="size-4" /> : <ArrowDownAZ className="size-4" />}
                </Button>
              </div>
            </Card>

            <div className="hidden sm:block">
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
                        <Link to={wp(`/vorgaenge/${d.processId}`)} className="font-display font-semibold text-foreground hover:text-primary-glow">
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
            </div>

            <div className="sm:hidden space-y-2">
              {filteredDocs.map((d, idx) => (
                <Card key={`${d.processId}-${d.step.key}-${idx}`} className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-md bg-primary/15 grid place-items-center shrink-0">
                      <FileText className="size-4 text-primary-glow" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground text-sm truncate">{d.step.documentName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{d.vehicleLabel} · {d.customerName}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-border/50 pt-2.5">
                    <div>
                      <Link to={wp(`/vorgaenge/${d.processId}`)} className="font-display font-semibold text-foreground text-sm hover:text-primary-glow">
                        {d.processId}
                      </Link>
                      <p className="text-[10px] text-muted-foreground">{formatDate(d.completedAt)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 gap-1.5 text-xs"
                      onClick={() => handleDownload(d.processId, d.step.key)}
                    >
                      <Download className="size-3.5" /> PDF
                    </Button>
                  </div>
                </Card>
              ))}
              {filteredDocs.length === 0 && (
                <Card className="p-8 text-center text-sm text-muted-foreground">Keine Belege gefunden.</Card>
              )}
            </div>
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
      "min-h-10 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-smooth border sm:min-h-0 sm:py-1.5",
      active
        ? "bg-primary text-primary-foreground border-primary shadow-glow"
        : "bg-background/40 text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
    )}
  >
    {children}
  </button>
);

export default ProcessList;
