import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProcessStore } from "@/store/processStore";
import { PROCESS_STEPS, ProcessStepKey, formatCurrency, formatDate, stepIndex } from "@/data/process";
import { ChevronRight, FileText, Download, ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadBelegPdf } from "@/lib/pdf";
import { useTopbarSearch } from "@/context/TopbarSearchContext";

type ProcessSortKey = "updated" | "created" | "price" | "id" | "customer";

const ProcessList = () => {
  const processes = useProcessStore((s) => s.processes);
  const getVehicle = useProcessStore((s) => s.getVehicle);
  const getCustomer = useProcessStore((s) => s.getCustomer);

  // ---- Tabs ----
  const [tab, setTab] = useState<"list" | "documents">("list");

  // ---- Liste ----
  const [q, setQ] = useState("");
  const [qField, setQField] = useState<"all" | "id" | "vin" | "vehicle" | "customer">("all");
  const [filter, setFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<ProcessSortKey>("updated");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const enriched = useMemo(
    () =>
      processes
        .map((p) => ({ p, vehicle: getVehicle(p.vehicleId), customer: getCustomer(p.customerId) }))
        .filter((e) => e.vehicle && e.customer),
    [processes, getVehicle, getCustomer]
  );

  const filtered = useMemo(() => {
    const list = enriched.filter(({ p, vehicle, customer }) => {
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
  }, [enriched, q, qField, filter, sortKey, sortDir]);

  // ---- Belege ----
  const [docQ, setDocQ] = useState("");
  const [docQField, setDocQField] = useState<"all" | "id" | "vin" | "vehicle" | "customer" | "doc">("all");
  const [docStep, setDocStep] = useState<"all" | ProcessStepKey>("all");
  const [docSortDir, setDocSortDir] = useState<"asc" | "desc">("desc");

  // ---- Topbar-Suche je nach aktivem Tab ----
  useTopbarSearch(
    tab === "list"
      ? {
          placeholder: "Vorgänge durchsuchen…",
          value: q,
          onChange: setQ,
          field: qField,
          onFieldChange: (f) => setQField(f as typeof qField),
          fields: [
            { key: "all",      label: "Alle Felder" },
            { key: "id",       label: "Vorgangs-Nr." },
            { key: "vin",      label: "VIN" },
            { key: "vehicle",  label: "Fahrzeug" },
            { key: "customer", label: "Kunde" },
          ],
        }
      : {
          placeholder: "Belege durchsuchen…",
          value: docQ,
          onChange: setDocQ,
          field: docQField,
          onFieldChange: (f) => setDocQField(f as typeof docQField),
          fields: [
            { key: "all",      label: "Alle Felder" },
            { key: "id",       label: "Vorgangs-Nr." },
            { key: "vin",      label: "VIN" },
            { key: "vehicle",  label: "Fahrzeug" },
            { key: "customer", label: "Kunde" },
            { key: "doc",      label: "Belegart" },
          ],
        }
  );

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
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">Vorgänge</h1>
          <p className="text-muted-foreground mt-1">
            Alle aktiven &amp; abgeschlossenen Verkaufsvorgänge inkl. archivierter Belege.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "list" | "documents")} className="space-y-6">
          <TabsList>
            <TabsTrigger value="list">Liste ({processes.length})</TabsTrigger>
            <TabsTrigger value="documents">Belege-Archiv ({documents.length})</TabsTrigger>
          </TabsList>

          {/* -------- Liste -------- */}
          <TabsContent value="list" className="space-y-6 mt-0">
            <Card className="p-4 bg-card border-border">
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="flex gap-2 items-center flex-wrap">
                  <Select value={sortKey} onValueChange={(v) => setSortKey(v as ProcessSortKey)}>
                    <SelectTrigger className="w-[180px] bg-background/40">
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
                    onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                    aria-label="Richtung wechseln"
                  >
                    {sortDir === "asc" ? <ArrowUpAZ className="size-4" /> : <ArrowDownAZ className="size-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto mt-3">
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
            </Card>

            <Card className="bg-card border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3 font-medium">Vorgang</th>
                      <th className="px-5 py-3 font-medium">Fahrzeug / VIN</th>
                      <th className="px-5 py-3 font-medium">Kunde</th>
                      <th className="px-5 py-3 font-medium">Aktueller Schritt</th>
                      <th className="px-5 py-3 font-medium text-right">Preis</th>
                      <th className="px-5 py-3 font-medium">Aktualisiert</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(({ p, vehicle, customer }) => {
                      const idx = stepIndex(p.currentStep);
                      const step = PROCESS_STEPS[idx];
                      return (
                        <tr key={p.id} className="border-b border-border/50 hover:bg-surface-elevated/40 transition-smooth group">
                          <td className="px-5 py-4">
                            <Link to={`/vorgaenge/${p.id}`} className="font-display font-semibold text-foreground hover:text-primary-glow">
                              {p.id}
                            </Link>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-foreground">{vehicle!.make} {vehicle!.model}</p>
                            <p className="font-mono text-xs text-muted-foreground">{vehicle!.vin}</p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-foreground">{customer!.name}</p>
                            <p className="text-xs text-muted-foreground">{customer!.city}</p>
                          </td>
                          <td className="px-5 py-4">
                            <Badge variant="outline" className="border-primary/30 text-primary-glow">
                              {idx + 1}. {step.shortLabel}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-right font-semibold text-foreground">
                            {formatCurrency(p.fields.finalPrice ?? vehicle!.listPrice)}
                          </td>
                          <td className="px-5 py-4 text-muted-foreground text-xs">{formatDate(p.updatedAt)}</td>
                          <td className="px-5 py-4">
                            <Link to={`/vorgaenge/${p.id}`}>
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-smooth">
                                <ChevronRight className="size-4" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground text-sm">
                          Keine Vorgänge gefunden.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* -------- Belege-Archiv -------- */}
          <TabsContent value="documents" className="space-y-6 mt-0">
            <Card className="p-4 bg-card border-border">
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="flex gap-2 items-center flex-wrap">
                  <Select value={docStep} onValueChange={(v) => setDocStep(v as "all" | ProcessStepKey)}>
                    <SelectTrigger className="w-[200px] bg-background/40">
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
                    onClick={() => setDocSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                    aria-label="Sortierung wechseln"
                    title={docSortDir === "asc" ? "Älteste zuerst" : "Neueste zuerst"}
                  >
                    {docSortDir === "asc" ? <ArrowUpAZ className="size-4" /> : <ArrowDownAZ className="size-4" />}
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="bg-card border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3 font-medium">Belegart</th>
                      <th className="px-5 py-3 font-medium">Vorgang</th>
                      <th className="px-5 py-3 font-medium">Fahrzeug / VIN</th>
                      <th className="px-5 py-3 font-medium">Kunde</th>
                      <th className="px-5 py-3 font-medium">Erstellt</th>
                      <th className="px-5 py-3 font-medium text-right">Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((d, idx) => (
                      <tr key={`${d.processId}-${d.step.key}-${idx}`} className="border-b border-border/50 hover:bg-surface-elevated/40 transition-smooth group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-lg bg-primary/15 grid place-items-center">
                              <FileText className="size-4 text-primary-glow" />
                            </div>
                            <span className="font-medium text-foreground">{d.step.documentName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <Link to={`/vorgaenge/${d.processId}`} className="font-display font-semibold text-foreground hover:text-primary-glow">
                            {d.processId}
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-foreground">{d.vehicleLabel}</p>
                          <p className="font-mono text-xs text-muted-foreground">{d.vin}</p>
                        </td>
                        <td className="px-5 py-4 text-foreground">{d.customerName}</td>
                        <td className="px-5 py-4 text-muted-foreground text-xs">{formatDate(d.completedAt)}</td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(d.processId, d.step.key)}
                            className="gap-1.5"
                          >
                            <Download className="size-3.5" /> PDF
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredDocs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-sm">
                          Keine Belege gefunden.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
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
