import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useProcessStore } from "@/store/processStore";
import { ActivityLog } from "@/components/process/ActivityLog";
import { DataTableShell } from "@/components/shared/DataTableShell";
import { User, Plus, Mail, Phone, MapPin, Calendar as CalendarIcon, FileText, Briefcase, KeyRound } from "lucide-react";
import { formatCurrency, formatDate, type Customer } from "@/data/process";
import { getCustomerBirthDate, buildCustomerAccessCode } from "@/lib/customerCode";
import { useTopbarSearch } from "@/context/TopbarSearchContext";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type CustomerSortKey = "name" | "city" | "offers" | "processes" | "value";
type CustomerFilter = "all" | "with_processes" | "with_offers" | "no_activity";

const Customers = () => {
  const customers = useProcessStore((s) => s.customers);
  const offers = useProcessStore((s) => s.offers);
  const processes = useProcessStore((s) => s.processes);
  const allActivities = useProcessStore((s) => s.activities);
  const customerActivities = useMemo(
    () => allActivities.filter((a) => !!a.customerId),
    [allActivities],
  );

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchField, setSearchField] = useState<"all" | "name" | "email" | "city">("all");
  const [filter, setFilter] = useState<CustomerFilter>("all");
  const [sortKey, setSortKey] = useState<CustomerSortKey>("name");

  const topbarSearch = useMemo(() => ({
    placeholder: "Kunden durchsuchen…",
    value: query,
    onChange: setQuery,
    field: searchField,
    onFieldChange: (f: string) => setSearchField(f as typeof searchField),
    fields: [
      { key: "all",   label: "Alle Felder" },
      { key: "name",  label: "Name" },
      { key: "email", label: "E-Mail" },
      { key: "city",  label: "Stadt" },
    ],
  }), [query, searchField]);

  useTopbarSearch(topbarSearch);

  const enriched = useMemo(
    () =>
      customers.map((c) => {
        const customerOffers = offers.filter((o) => o.customerId === c.id);
        const customerProcesses = processes.filter((p) => p.customerId === c.id);
        const value = customerProcesses.reduce((s, p) => s + (p.fields.finalPrice ?? 0), 0);
        return {
          customer: c,
          offerCount: customerOffers.length,
          processCount: customerProcesses.length,
          value,
        };
      }),
    [customers, offers, processes]
  );

  const filtered = useMemo(() => {
    const list = enriched.filter((e) => {
      if (filter === "with_processes" && e.processCount === 0) return false;
      if (filter === "with_offers" && e.offerCount === 0) return false;
      if (filter === "no_activity" && (e.offerCount > 0 || e.processCount > 0)) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      const fields: Record<typeof searchField, string> = {
        all: `${e.customer.name} ${e.customer.email} ${e.customer.city}`,
        name: e.customer.name,
        email: e.customer.email,
        city: e.customer.city,
      };
      return fields[searchField].toLowerCase().includes(q);
    });
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "name": return a.customer.name.localeCompare(b.customer.name);
        case "city": return a.customer.city.localeCompare(b.customer.city);
        case "offers": return b.offerCount - a.offerCount;
        case "processes": return b.processCount - a.processCount;
        case "value": return b.value - a.value;
      }
    });
  }, [enriched, query, searchField, filter, sortKey]);

  const stats = {
    total: customers.length,
    with_processes: enriched.filter((e) => e.processCount > 0).length,
    with_offers: enriched.filter((e) => e.offerCount > 0).length,
    no_activity: enriched.filter((e) => e.offerCount === 0 && e.processCount === 0).length,
  };

  return (
    <AppShell>
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Kunden</h1>
            <p className="text-xs text-muted-foreground">{customers.length} Kunden mit Angeboten &amp; Vorgängen</p>
          </div>
          <Button size="sm" className="bg-gradient-brand hover:opacity-90 shadow-elegant gap-2">
            <Plus className="size-4" /> Neuer Kunde
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0">
          {[
            { label: "Gesamt", value: stats.total, accent: "text-primary" },
            { label: "Mit Vorgang", value: stats.with_processes, accent: "text-success" },
            { label: "Mit Angebot", value: stats.with_offers, accent: "text-warning" },
            { label: "Ohne Aktivität", value: stats.no_activity, accent: "text-muted-foreground" },
          ].map(({ label, value, accent }) => (
            <Card key={label} className="px-3 py-2 flex items-center gap-3">
              <User className={`size-4 ${accent}`} />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none">{label}</p>
                <p className="font-display text-lg font-bold leading-tight">{value}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card className="px-3 py-2 flex items-center gap-2 flex-wrap shrink-0">
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as CustomerSortKey)}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="city">Stadt A-Z</SelectItem>
              <SelectItem value="value">Auftragswert ↓</SelectItem>
              <SelectItem value="processes">Vorgänge ↓</SelectItem>
              <SelectItem value="offers">Angebote ↓</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1.5 flex-wrap">
            {([
              { key: "all",            label: `Alle (${stats.total})` },
              { key: "with_processes", label: `Mit Vorgang (${stats.with_processes})` },
              { key: "with_offers",    label: `Mit Angebot (${stats.with_offers})` },
              { key: "no_activity",    label: `Ohne Aktivität (${stats.no_activity})` },
            ] as const).map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </Card>

        {filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground flex-1">Keine Kunden gefunden.</Card>
        ) : (
          <DataTableShell footer={<>{filtered.length} Kunden</>}>
            <table>
              <thead>
                <tr>
                  <th>Kunde</th>
                  <th>E-Mail</th>
                  <th>Telefon</th>
                  <th>Stadt</th>
                  <th className="text-center">Angebote</th>
                  <th className="text-center">Vorgänge</th>
                  <th className="text-right">Auftragswert</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ customer, offerCount, processCount, value }) => (
                  <tr
                    key={customer.id}
                    onClick={() => setSelectedId(customer.id)}
                    className="hover:bg-surface-elevated/40 transition-smooth cursor-pointer"
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-md bg-gradient-brand grid place-items-center text-primary-foreground font-display font-bold text-[10px] shrink-0">
                          {customer.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate leading-tight">{customer.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground truncate leading-tight">{customer.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted-foreground truncate max-w-[220px]">{customer.email}</td>
                    <td className="text-muted-foreground whitespace-nowrap">{customer.phone}</td>
                    <td className="text-foreground truncate max-w-[160px]">{`${customer.zip ?? ""} ${customer.city}`.trim()}</td>
                    <td className="text-center">
                      {offerCount > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary/15 text-primary-glow text-[10px] font-semibold">
                          {offerCount}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </td>
                    <td className="text-center">
                      {processCount > 0 ? (
                        <Badge variant="outline" className="border-success/30 text-success text-[10px] px-1.5 py-0">{processCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </td>
                    <td className={cn(
                      "text-right font-semibold whitespace-nowrap",
                      value > 0 ? "text-foreground" : "text-muted-foreground",
                    )}>
                      {value > 0 ? formatCurrency(value) : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTableShell>
        )}
      </div>

      <CustomerDetailDialog
        customerId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </AppShell>
  );
};

const CustomerDetailDialog = ({ customerId, onClose }: { customerId: string | null; onClose: () => void }) => {
  const customer = useProcessStore((s) => (customerId ? s.customers.find((c) => c.id === customerId) : undefined));
  const offers = useProcessStore((s) => s.offers.filter((o) => o.customerId === customerId));
  const processes = useProcessStore((s) => s.processes.filter((p) => p.customerId === customerId));
  const getVehicle = useProcessStore((s) => s.getVehicle);
  const activities = useProcessStore((s) =>
    s.activities.filter((a) => a.customerId === customerId).slice(0, 8)
  );

  const open = !!customer;
  if (!customer) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent />
      </Dialog>
    );
  }

  const totalValue = processes.reduce((s, p) => s + (p.fields.finalPrice ?? 0), 0);
  const accessCode = buildCustomerAccessCode(customer);
  const birthDate = getCustomerBirthDate(customer);
  const isAutoBirthDate = !customer.birthDate;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="size-12 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground font-display font-bold">
              {customer.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="font-display text-xl">{customer.name}</DialogTitle>
              <DialogDescription className="font-mono text-xs">{customer.id}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-3 mt-2">
          <DetailRow icon={<Mail className="size-4" />} label="E-Mail" value={customer.email} />
          <DetailRow icon={<Phone className="size-4" />} label="Telefon" value={customer.phone} />
          <DetailRow
            icon={<MapPin className="size-4" />}
            label="Adresse"
            value={[customer.street, [customer.zip, customer.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "–"}
          />
          <DetailRow
            icon={<CalendarIcon className="size-4" />}
            label={isAutoBirthDate ? "Geburtsdatum (auto)" : "Geburtsdatum"}
            value={formatDate(birthDate)}
          />
        </div>

        <Card className="p-4 mt-2 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary-glow font-semibold mb-1">
            <KeyRound className="size-3.5" /> Portal-Zugangscode
          </div>
          <p className="font-mono text-lg font-bold tracking-widest">{accessCode}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Wird vom Kunden zur Freischaltung des Tracking-Links benötigt.
          </p>
        </Card>

        <div className="grid sm:grid-cols-3 gap-3 mt-2">
          <StatBox label="Angebote" value={offers.length} />
          <StatBox label="Vorgänge" value={processes.length} />
          <StatBox label="Auftragswert" value={totalValue > 0 ? formatCurrency(totalValue) : "–"} />
        </div>

        {processes.length > 0 && (
          <section className="mt-4">
            <h3 className="font-display font-semibold text-sm mb-2 flex items-center gap-2">
              <Briefcase className="size-4 text-primary-glow" /> Vorgänge
            </h3>
            <div className="space-y-2">
              {processes.map((p) => {
                const v = getVehicle(p.vehicleId);
                return (
                  <Link
                    key={p.id}
                    to={`/vorgaenge/${p.id}`}
                    onClick={onClose}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/40 transition-smooth"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs">{p.id}</p>
                      <p className="text-sm font-medium truncate">
                        {v ? `${v.make} ${v.model}` : "—"}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p className="text-foreground font-semibold">{formatCurrency(p.fields.finalPrice ?? 0)}</p>
                      <p>{formatDate(p.createdAt)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {offers.length > 0 && (
          <section className="mt-4">
            <h3 className="font-display font-semibold text-sm mb-2 flex items-center gap-2">
              <FileText className="size-4 text-primary-glow" /> Angebote
            </h3>
            <div className="space-y-2">
              {offers.map((o) => {
                const v = getVehicle(o.vehicleId);
                return (
                  <div key={o.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-card border border-border">
                    <div className="min-w-0">
                      <p className="font-mono text-xs">{o.id}</p>
                      <p className="text-sm font-medium truncate">{v ? `${v.make} ${v.model}` : "—"}</p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-foreground font-semibold">{formatCurrency(o.price)}</p>
                      <Badge variant="outline" className="mt-1 text-[10px]">{o.status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activities.length > 0 && (
          <section className="mt-4">
            <h3 className="font-display font-semibold text-sm mb-2">Letzte Aktivitäten</h3>
            <ActivityLog activities={activities} />
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
};

const DetailRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2 p-3 rounded-lg bg-card border border-border">
    <div className="text-primary-glow mt-0.5">{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground break-words">{value}</p>
    </div>
  </div>
);

const StatBox = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-lg bg-card border border-border p-3 text-center">
    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    <p className="font-display font-bold text-lg text-foreground mt-1">{value}</p>
  </div>
);

export default Customers;
