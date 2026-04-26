import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useProcessStore } from "@/store/processStore";
import { Search, User, Mail, Phone, MapPin, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Customers = () => {
  const customers = useProcessStore((s) => s.customers);
  const offers = useProcessStore((s) => s.offers);
  const processes = useProcessStore((s) => s.processes);
  const [query, setQuery] = useState("");

  const enriched = customers.map((c) => {
    const customerOffers = offers.filter((o) => o.customerId === c.id);
    const customerProcesses = processes.filter((p) => p.customerId === c.id);
    return { customer: c, offerCount: customerOffers.length, processCount: customerProcesses.length };
  });

  const filtered = enriched.filter(({ customer: c }) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.city.toLowerCase().includes(q);
  });

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Kunden</h1>
            <p className="text-sm text-muted-foreground mt-1">Alle Kunden mit Angeboten & Vorgängen.</p>
          </div>
          <Button className="bg-gradient-brand hover:opacity-90 shadow-elegant gap-2">
            <User className="size-4" /> Neuer Kunde
          </Button>
        </div>

        <Card className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, E-Mail oder Stadt…" className="pl-9" />
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(({ customer, offerCount, processCount }) => (
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

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex gap-2">
                  <Badge variant="outline" className="border-primary/30 text-primary-glow">
                    {offerCount} Angebote
                  </Badge>
                  {processCount > 0 && (
                    <Badge variant="outline" className="border-success/30 text-success">
                      <FileText className="size-3 mr-1" /> {processCount} Vorgang{processCount !== 1 ? "e" : ""}
                    </Badge>
                  )}
                </div>
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
