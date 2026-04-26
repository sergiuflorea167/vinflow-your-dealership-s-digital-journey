import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProcessStore } from "@/store/processStore";
import { ActivityLog } from "@/components/process/ActivityLog";
import { DataTableShell } from "@/components/shared/DataTableShell";
import { User, Plus } from "lucide-react";
import { formatCurrency } from "@/data/process";
import { useTopbarSearch } from "@/context/TopbarSearchContext";
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
      <div className="flex flex-col min-h-0 flex-1 gap-4 animate-fade-in">
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
                  <tr key={customer.id} className="hover:bg-surface-elevated/40 transition-smooth">
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
    </AppShell>
  );
};

export default Customers;
