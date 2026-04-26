import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProcessStore } from "@/store/processStore";
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
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Kunden</h1>
            <p className="text-sm text-muted-foreground mt-1">{customers.length} Kunden mit Angeboten &amp; Vorgängen</p>
          </div>
          <Button className="bg-gradient-brand hover:opacity-90 shadow-elegant gap-2">
            <Plus className="size-4" /> Neuer Kunde
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Gesamt", value: stats.total, accent: "text-primary" },
            { label: "Mit Vorgang", value: stats.with_processes, accent: "text-success" },
            { label: "Mit Angebot", value: stats.with_offers, accent: "text-warning" },
            { label: "Ohne Aktivität", value: stats.no_activity, accent: "text-muted-foreground" },
          ].map(({ label, value, accent }) => (
            <Card key={label} className="p-4 flex items-center gap-4">
              <div className="size-10 rounded-lg bg-secondary grid place-items-center">
                <User className={`size-5 ${accent}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="font-display text-2xl font-bold">{value}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-4 space-y-3">
          <div className="flex gap-2 items-center flex-wrap">
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as CustomerSortKey)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="city">Stadt A-Z</SelectItem>
                <SelectItem value="value">Auftragswert ↓</SelectItem>
                <SelectItem value="processes">Vorgänge ↓</SelectItem>
                <SelectItem value="offers">Angebote ↓</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 flex-wrap">
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
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </Card>

        {filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">Keine Kunden gefunden.</Card>
        ) : (
          <Card className="bg-card border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Kunde</th>
                    <th className="px-5 py-3 font-medium">E-Mail</th>
                    <th className="px-5 py-3 font-medium">Telefon</th>
                    <th className="px-5 py-3 font-medium">Stadt</th>
                    <th className="px-5 py-3 font-medium text-center">Angebote</th>
                    <th className="px-5 py-3 font-medium text-center">Vorgänge</th>
                    <th className="px-5 py-3 font-medium text-right">Auftragswert</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ customer, offerCount, processCount, value }) => (
                    <tr
                      key={customer.id}
                      className="border-b border-border/50 hover:bg-surface-elevated/40 transition-smooth"
                    >
                      <td className="px-5 py-4">
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
                      <td className="px-5 py-4 text-xs text-muted-foreground truncate max-w-[220px]">{customer.email}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">{customer.phone}</td>
                      <td className="px-5 py-4 text-xs text-foreground truncate max-w-[160px]">
                        {`${customer.zip ?? ""} ${customer.city}`.trim()}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {offerCount > 0 ? (
                          <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-primary/15 text-primary-glow text-xs font-semibold">
                            {offerCount}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">–</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {processCount > 0 ? (
                          <Badge variant="outline" className="border-success/30 text-success">{processCount}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">–</span>
                        )}
                      </td>
                      <td className={cn(
                        "px-5 py-4 text-right font-semibold whitespace-nowrap",
                        value > 0 ? "text-foreground" : "text-muted-foreground",
                      )}>
                        {value > 0 ? formatCurrency(value) : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
};

export default Customers;
