import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useProcessStore } from "@/store/processStore";
import {
  DEFAULT_PROCESS_STEP_KEYS, PROCESS_STEPS, Partner, PartnerKind, PARTNER_KIND_LABELS,
  ProcessStepKey, formatCurrency, normalizeProcessStepKeys,
} from "@/data/process";
import {
  CheckCircle2, Database, FileText, Handshake, Mail, MapPin, Pencil, Phone, Plus,
  RotateCcw, Save, Trash2, Users, Workflow, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type StammTab = "customers" | "partners" | "locations";

const Stammdaten = () => {
  const [tab, setTab] = useState<StammTab>("customers");

  return (
    <AppShell>
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center gap-3 shrink-0">
          <div className="size-9 rounded-xl bg-gradient-brand grid place-items-center shadow-glow">
            <Database className="size-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Stammdaten</h1>
            <p className="text-xs text-muted-foreground">
              Kunden, Partner und Standorte zentral verwalten — überall im System auswählbar.
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as StammTab)} className="space-y-3">
          <TabsList className="bg-background/40 self-start shrink-0">
            <TabsTrigger value="customers" className="gap-2"><Users className="size-4" /> Kunden</TabsTrigger>
            <TabsTrigger value="partners"  className="gap-2"><Handshake className="size-4" /> Partner</TabsTrigger>
            <TabsTrigger value="locations" className="gap-2"><MapPin className="size-4" /> Standorte</TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="mt-0"><CustomersPanel /></TabsContent>
          <TabsContent value="partners"  className="mt-0"><PartnersPanel /></TabsContent>
          <TabsContent value="locations" className="mt-0"><LocationsPanel /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};

export default Stammdaten;

// ===========================================================================
// Customers Panel — Kurzliste (Verwaltung & Details siehe /kunden)
// ===========================================================================

const CustomersPanel = () => {
  const customers = useProcessStore((s) => s.customers);
  const offers = useProcessStore((s) => s.offers);
  const processes = useProcessStore((s) => s.processes);
  const [query, setQuery] = useState("");

  const enriched = useMemo(() =>
    customers.map((c) => {
      const off = offers.filter((o) => o.customerId === c.id).length;
      const proc = processes.filter((p) => p.customerId === c.id).length;
      return { customer: c, offerCount: off, processCount: proc };
    }), [customers, offers, processes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter((e) =>
      `${e.customer.name} ${e.customer.email} ${e.customer.city}`.toLowerCase().includes(q),
    );
  }, [enriched, query]);

  return (
    <Card className="bg-card border-border overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Input
            placeholder="Schnellsuche…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
          />
          <span className="text-xs text-muted-foreground">{filtered.length} Kunden</span>
        </div>
        <Button asChild className="bg-gradient-brand gap-2">
          <RouterLink to="/kunden"><Users className="size-4" /> Vollständige Kundenverwaltung</RouterLink>
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground text-sm">Keine Kunden gefunden.</div>
      ) : (
        <div className="overflow-auto max-h-[55vh]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
              <tr className="border-b border-border bg-background/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-medium">Kunde</th>
                <th className="px-3 py-2 font-medium">E-Mail</th>
                <th className="px-3 py-2 font-medium">Telefon</th>
                <th className="px-3 py-2 font-medium">Stadt</th>
                <th className="px-3 py-2 font-medium text-center">Angebote</th>
                <th className="px-3 py-2 font-medium text-center">Vorgänge</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ customer, offerCount, processCount }) => (
                <tr key={customer.id} className="border-b border-border/50 hover:bg-surface-elevated/40 transition-smooth">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-gradient-brand grid place-items-center text-primary-foreground font-display font-bold text-xs shrink-0">
                        {customer.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{customer.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground truncate">{customer.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[220px]">{customer.email}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{customer.phone}</td>
                  <td className="px-3 py-2 text-xs text-foreground truncate max-w-[160px]">
                    {`${customer.zip ?? ""} ${customer.city}`.trim()}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {offerCount > 0
                      ? <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-primary/15 text-primary-glow text-xs font-semibold">{offerCount}</span>
                      : <span className="text-xs text-muted-foreground">–</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {processCount > 0
                      ? <Badge variant="outline" className="border-success/30 text-success">{processCount}</Badge>
                      : <span className="text-xs text-muted-foreground">–</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

// ===========================================================================
// Process Chain Panel
// ===========================================================================

const ProcessChainPanel = () => {
  const settings = useProcessStore((s) => s.settings);
  const updateSettings = useProcessStore((s) => s.updateSettings);
  const selected = normalizeProcessStepKeys(settings.processStepKeys);
  const selectedSet = new Set<ProcessStepKey>(selected);

  const toggleStep = (key: ProcessStepKey) => {
    if (selectedSet.has(key)) {
      if (selected.length === 1) {
        toast.error("Mindestens ein Beleg muss aktiv bleiben.");
        return;
      }
      updateSettings({ processStepKeys: selected.filter((stepKey) => stepKey !== key) });
      toast.success("Beleg aus der Vorgangskette entfernt.");
      return;
    }

    updateSettings({
      processStepKeys: PROCESS_STEPS.map((step) => step.key).filter((stepKey) => (
        selectedSet.has(stepKey) || stepKey === key
      )),
    });
    toast.success("Beleg zur Vorgangskette hinzugefügt.");
  };

  const resetChain = () => {
    updateSettings({ processStepKeys: DEFAULT_PROCESS_STEP_KEYS });
    toast.success("Alle Belege sind wieder aktiv.");
  };

  return (
    <Card className="bg-card border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="size-10 rounded-lg bg-primary/15 text-primary-glow grid place-items-center shrink-0">
            <Workflow className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold">Vorgangskette konfigurieren</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Wähle, welche Belege im Verkaufsvorgang verwendet werden. Neue Vorgänge überspringen deaktivierte Belege automatisch.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={resetChain} className="gap-2">
          <RotateCcw className="size-4" /> Standard
        </Button>
      </div>

      <div className="grid gap-2 p-4">
        {PROCESS_STEPS.map((step) => {
          const active = selectedSet.has(step.key);
          const activeIndex = selected.findIndex((key) => key === step.key);
          return (
            <div
              key={step.key}
              role="button"
              tabIndex={0}
              onClick={() => toggleStep(step.key)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleStep(step.key);
                }
              }}
              className={cn(
                "cursor-pointer",
                "w-full text-left rounded-lg border p-3 transition-smooth",
                "hover:border-primary/40 hover:bg-surface-elevated/40",
                active ? "border-primary/35 bg-primary/5" : "border-border bg-background/30 opacity-75",
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={active}
                  onCheckedChange={() => toggleStep(step.key)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`${step.documentName} aktivieren`}
                  className="mt-1"
                />
                <div className="size-8 rounded-lg bg-background/60 border border-border grid place-items-center shrink-0">
                  {active ? (
                    <CheckCircle2 className="size-4 text-success" />
                  ) : (
                    <FileText className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground">{step.documentName}</p>
                    <Badge variant="outline" className={cn(
                      "text-[10px] px-1.5 py-0",
                      active ? "border-success/30 text-success" : "border-border text-muted-foreground",
                    )}>
                      {active ? `Aktiv ${activeIndex + 1}` : "Aus"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.label} · {step.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// ===========================================================================
// Partners Panel
// ===========================================================================

const KIND_BADGE: Record<PartnerKind, string> = {
  detailer:  "bg-info/15 text-info border-info/30",
  mechanic:  "bg-primary/15 text-primary-glow border-primary/30",
  transport: "bg-warning/15 text-warning border-warning/30",
  appraiser: "bg-accent/15 text-accent-foreground border-accent/30",
  tuv:       "bg-success/15 text-success border-success/30",
  supplier:  "bg-secondary text-secondary-foreground border-border",
  other:     "bg-muted text-muted-foreground border-border",
};

const PartnersPanel = () => {
  const partners = useProcessStore((s) => s.settings.partners ?? []);
  const addPartner = useProcessStore((s) => s.addPartner);
  const updatePartner = useProcessStore((s) => s.updatePartner);
  const removePartner = useProcessStore((s) => s.removePartner);

  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | PartnerKind>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return partners.filter((p) => {
      if (kindFilter !== "all" && p.kind !== kindFilter) return false;
      if (!q) return true;
      return `${p.name} ${p.contactPerson ?? ""} ${p.email ?? ""} ${p.address ?? ""}`.toLowerCase().includes(q);
    });
  }, [partners, query, kindFilter]);

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p: Partner) => { setEditing(p); setDialogOpen(true); };

  return (
    <>
      <Card className="bg-card border-border overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-border flex-wrap">
          <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
            <Input
              placeholder="Partner durchsuchen…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-xs"
            />
            <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as typeof kindFilter)}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                {(Object.keys(PARTNER_KIND_LABELS) as PartnerKind[]).map((k) => (
                  <SelectItem key={k} value={k}>{PARTNER_KIND_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">{filtered.length} Partner</span>
          </div>
          <Button onClick={openCreate} data-tour="master-create" className="bg-gradient-brand gap-2">
            <Plus className="size-4" /> Neuer Partner
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            Noch keine Partner angelegt.
          </div>
        ) : (
          <div className="overflow-auto max-h-[55vh]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                <tr className="border-b border-border bg-background/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Partner</th>
                  <th className="px-3 py-2 font-medium">Typ</th>
                  <th className="px-3 py-2 font-medium">Ansprechpartner</th>
                  <th className="px-3 py-2 font-medium">Kontakt</th>
                  <th className="px-3 py-2 font-medium">Adresse</th>
                  <th className="px-3 py-2 font-medium text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-surface-elevated/40 transition-smooth">
                    <td className="px-3 py-2">
                      <p className="font-medium text-foreground truncate">{p.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground truncate">{p.id}</p>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={KIND_BADGE[p.kind]}>{PARTNER_KIND_LABELS[p.kind]}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-foreground truncate max-w-[180px]">
                      {p.contactPerson || <span className="text-muted-foreground italic">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      <div className="flex flex-col gap-0.5">
                        {p.email && <span className="inline-flex items-center gap-1.5"><Mail className="size-3" /> {p.email}</span>}
                        {p.phone && <span className="inline-flex items-center gap-1.5"><Phone className="size-3" /> {p.phone}</span>}
                        {!p.email && !p.phone && <span className="italic">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[220px]">
                      {p.address || <span className="italic">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(p)} aria-label="Bearbeiten">
                          <Pencil className="size-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Partner "${p.name}" wirklich löschen?`)) {
                              removePartner(p.id);
                              toast.success("Partner gelöscht.");
                            }
                          }}
                          aria-label="Löschen"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Partner bearbeiten" : "Neuer Partner"}</DialogTitle>
          </DialogHeader>
          <PartnerForm
            initial={editing ?? undefined}
            onSubmit={(data) => {
              if (editing) {
                updatePartner(editing.id, data);
                toast.success("Partner aktualisiert.");
              } else {
                addPartner(data);
                toast.success("Partner angelegt.");
              }
              setDialogOpen(false);
            }}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

const PartnerForm = ({
  initial, onSubmit, onCancel,
}: {
  initial?: Partner;
  onSubmit: (data: Omit<Partner, "id" | "createdAt">) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<PartnerKind>(initial?.kind ?? "detailer");
  const [contactPerson, setContactPerson] = useState(initial?.contactPerson ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const submit = () => {
    if (!name.trim()) {
      toast.error("Bitte einen Namen eingeben.");
      return;
    }
    onSubmit({
      name: name.trim(),
      kind,
      contactPerson: contactPerson.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Name *">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </FormField>
        <FormField label="Typ">
          <Select value={kind} onValueChange={(v) => setKind(v as PartnerKind)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PARTNER_KIND_LABELS) as PartnerKind[]).map((k) => (
                <SelectItem key={k} value={k}>{PARTNER_KIND_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Ansprechpartner">
          <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
        </FormField>
        <FormField label="Telefon">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </FormField>
        <FormField label="E-Mail" full>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <FormField label="Adresse" full>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Straße, PLZ Ort" />
        </FormField>
        <FormField label="Notizen" full>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </FormField>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} className="gap-1.5"><X className="size-3.5" /> Abbrechen</Button>
        <Button onClick={submit} className="bg-gradient-brand gap-1.5"><Save className="size-3.5" /> Speichern</Button>
      </DialogFooter>
    </div>
  );
};

const FormField = ({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) => (
  <div className={cn("space-y-1.5", full && "md:col-span-2")}>
    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</Label>
    {children}
  </div>
);

// ===========================================================================
// Locations Panel
// ===========================================================================

const LocationsPanel = () => {
  const locations = useProcessStore((s) => s.settings.locations);
  const addLocation = useProcessStore((s) => s.addSettingsLocation);
  const removeLocation = useProcessStore((s) => s.removeSettingsLocation);
  const vehicles = useProcessStore((s) => s.vehicles);

  const [newName, setNewName] = useState("");

  const usage = useMemo(() => {
    const map: Record<string, number> = {};
    vehicles.forEach((v) => {
      const name = v.location?.name;
      if (name) map[name] = (map[name] ?? 0) + 1;
    });
    return map;
  }, [vehicles]);

  const submit = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (locations.includes(trimmed)) {
      toast.error("Standort existiert bereits.");
      return;
    }
    addLocation(trimmed);
    setNewName("");
    toast.success("Standort hinzugefügt.");
  };

  return (
    <Card className="bg-card border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex gap-2 max-w-md">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="z. B. Hof B · Platz 04"
          />
          <Button onClick={submit} className="bg-gradient-brand gap-2 shrink-0">
            <Plus className="size-4" /> Hinzufügen
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Diese Standorte stehen überall im System als Stellplatz-Auswahl zur Verfügung.
        </p>
      </div>

      {locations.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground text-sm">Noch keine Standorte angelegt.</div>
      ) : (
        <div className="overflow-auto max-h-[55vh]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
              <tr className="border-b border-border bg-background/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-medium">Standort</th>
                <th className="px-3 py-2 font-medium text-center">Belegt mit</th>
                <th className="px-3 py-2 font-medium text-right">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => {
                const count = usage[loc] ?? 0;
                return (
                  <tr key={loc} className="border-b border-border/50 hover:bg-surface-elevated/40 transition-smooth">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-info shrink-0" />
                        <span className="font-medium text-foreground">{loc}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {count > 0 ? (
                        <Badge variant="outline" className="border-primary/30 text-primary-glow">
                          {count} Fahrzeug{count !== 1 ? "e" : ""}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">leer</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end">
                        <Button
                          variant="ghost" size="icon"
                          className={cn(
                            "size-8",
                            count > 0
                              ? "text-muted-foreground/40 cursor-not-allowed"
                              : "text-muted-foreground hover:text-destructive",
                          )}
                          disabled={count > 0}
                          onClick={() => {
                            if (confirm(`Standort "${loc}" wirklich entfernen?`)) {
                              removeLocation(loc);
                              toast.success("Standort entfernt.");
                            }
                          }}
                          aria-label="Löschen"
                          title={count > 0 ? "Standort wird noch verwendet" : "Standort entfernen"}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
