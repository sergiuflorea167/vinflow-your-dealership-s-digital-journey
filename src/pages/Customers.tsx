import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProcessStore } from "@/store/processStore";
import { Search, User, Mail, Phone, MapPin, FileText } from "lucide-react";
import { formatCurrency } from "@/data/process";

type CustomerSortKey = "name" | "city" | "offers" | "processes" | "value";
type CustomerFilter = "all" | "with_processes" | "with_offers" | "no_activity";

const Customers = () => {
  const customers = useProcessStore((s) => s.customers);
  const offers = useProcessStore((s) => s.offers);
  const processes = useProcessStore((s) => s.processes);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CustomerFilter>("all");
  const [sortKey, setSortKey] = useState<CustomerSortKey>("name");

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
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        e.customer.name.toLowerCase().includes(q) ||
        e.customer.email.toLowerCase().includes(q) ||
        e.customer.city.toLowerCase().includes(q)
      );
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
  }, [enriched, query, filter, sortKey]);

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Kunden</h1>
            <p className="text-sm text-muted-foreground mt-1">{customers.length} Kunden mit Angeboten &amp; Vorgängen.</p>
          </div>
          <Button className="bg-gradient-brand hover:opacity-90 shadow-elegant gap-2">
            <User className="size-4" /> Neuer Kunde
          </Button>
        </div>

        <Card className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, E-Mail oder Stadt…" className="pl-9" />
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <Select value={filter} onValueChange={(v) => setFilter(v as CustomerFilter)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kunden</SelectItem>
                  <SelectItem value="with_processes">Mit Vorgang</SelectItem>
                  <SelectItem value="with_offers">Mit Angebot</SelectItem>
                  <SelectItem value="no_activity">Ohne Aktivität</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as CustomerSortKey)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name A-Z</SelectItem>
                  <SelectItem value="city">Stadt A-Z</SelectItem>
                  <SelectItem value="value">Auftragswert ↓</SelectItem>
                  <SelectItem value="processes">Vorgänge ↓</SelectItem>
                  <SelectItem value="offers">Angebote ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(({ customer, offerCount, processCount, value }) => (
            <Card key={customer.id} className="p-5 hover:shadow-glow transition-smooth">
              <div className="flex items-start gap-3 mb-4">
                <div className="size-12 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground font-display font-bold text-lg shadow-card">
                  {customer.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-foreground truncate">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">{customer.id}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <Detail icon={Mail} value={customer.email} />
                <Detail icon={Phone} value={customer.phone} />
                <Detail icon={MapPin} value={`${customer.zip ?? ""} ${customer.city}`.trim()} />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border gap-3">
                <div className="flex gap-2 flex-wrap min-w-0">
                  <Badge variant="outline" className="border-primary/30 text-primary-glow">
                    {offerCount} Angebote
                  </Badge>
                  {processCount > 0 && (
                    <Badge variant="outline" className="border-success/30 text-success">
                      <FileText className="size-3 mr-1" /> {processCount} Vorgang{processCount !== 1 ? "e" : ""}
                    </Badge>
                  )}
                </div>
                {value > 0 && (
                  <span className="text-xs font-display font-bold text-foreground shrink-0">{formatCurrency(value)}</span>
                )}
              </div>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground">Keine Kunden gefunden.</Card>
        )}
      </div>
    </AppShell>
  );
};

const Detail = ({ icon: Icon, value }: { icon: any; value: string }) => (
  <div className="flex items-center gap-2 text-muted-foreground">
    <Icon className="size-3.5 shrink-0" />
    <span className="truncate">{value}</span>
  </div>
);

export default Customers;
