import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useProcessStore } from "@/store/processStore";
import { PROCESS_STEPS, formatCurrency, stepIndex } from "@/data/process";
import { Car, Search, Gauge, Calendar, Palette, Hash, ArrowRight } from "lucide-react";

const Fleet = () => {
  const processes = useProcessStore((s) => s.processes);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "available" | "sold">("all");

  const fleet = useMemo(() => {
    return processes.map((p) => {
      const idx = stepIndex(p.currentStep);
      const isSold = p.currentStep === "delivery_confirmation" &&
        p.steps.delivery_confirmation?.status === "completed";
      const inSales = idx >= stepIndex("offer");
      const status: "available" | "reserved" | "sold" = isSold
        ? "sold"
        : inSales
          ? "reserved"
          : "available";
      return { process: p, status, stepIdx: idx };
    });
  }, [processes]);

  const filtered = fleet.filter(({ process, status }) => {
    if (filter === "available" && status !== "available") return false;
    if (filter === "sold" && status !== "sold") return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      process.vehicle.vin.toLowerCase().includes(q) ||
      process.vehicle.make.toLowerCase().includes(q) ||
      process.vehicle.model.toLowerCase().includes(q) ||
      process.vehicle.color.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: fleet.length,
    available: fleet.filter((f) => f.status === "available").length,
    reserved: fleet.filter((f) => f.status === "reserved").length,
    sold: fleet.filter((f) => f.status === "sold").length,
  };

  const statusBadge = (status: "available" | "reserved" | "sold") => {
    if (status === "available")
      return <Badge className="bg-success/15 text-success border-success/30">Verfügbar</Badge>;
    if (status === "reserved")
      return <Badge className="bg-warning/15 text-warning border-warning/30">Reserviert</Badge>;
    return <Badge className="bg-muted text-muted-foreground border-border">Verkauft</Badge>;
  };

  return (
    <AppShell title="Flotte" subtitle="Fahrzeugbestand · VIN-basiert">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Gesamt", value: stats.total, icon: Car },
            { label: "Verfügbar", value: stats.available, icon: Car, accent: "text-success" },
            { label: "Reserviert", value: stats.reserved, icon: Car, accent: "text-warning" },
            { label: "Verkauft", value: stats.sold, icon: Car, accent: "text-muted-foreground" },
          ].map(({ label, value, icon: Icon, accent }) => (
            <Card key={label} className="p-4 flex items-center gap-4">
              <div className="size-10 rounded-lg bg-secondary grid place-items-center">
                <Icon className={`size-5 ${accent ?? "text-primary"}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="font-display text-2xl font-bold">{value}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="VIN, Marke, Modell oder Farbe…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {([
              { key: "all", label: "Alle" },
              { key: "available", label: "Verfügbar" },
              { key: "sold", label: "Verkauft" },
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

        {/* Grid */}
        {filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            Keine Fahrzeuge gefunden.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(({ process, status, stepIdx }) => {
              const v = process.vehicle;
              const currentStep = PROCESS_STEPS[stepIdx];
              return (
                <Card
                  key={process.id}
                  className="p-5 hover:shadow-glow transition-smooth group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="size-12 rounded-xl bg-gradient-brand grid place-items-center shadow-card">
                      <Car className="size-6 text-primary-foreground" />
                    </div>
                    {statusBadge(status)}
                  </div>

                  <div className="mb-4">
                    <h3 className="font-display font-bold text-lg leading-tight">
                      {v.make} {v.model}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{process.id}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="size-3.5" />
                      <span>{v.year}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Gauge className="size-3.5" />
                      <span>{v.mileage.toLocaleString("de-DE")} km</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Palette className="size-3.5" />
                      <span className="truncate">{v.color}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Hash className="size-3.5" />
                      <span className="font-mono truncate" title={v.vin}>
                        {v.vin.slice(-8)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Aktueller Schritt
                      </p>
                      <p className="text-sm font-medium mt-0.5">{currentStep.shortLabel}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Preis
                      </p>
                      <p className="font-display font-bold">{formatCurrency(v.price)}</p>
                    </div>
                  </div>

                  <Link
                    to={`/vorgaenge/${process.id}`}
                    className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-primary hover:text-primary-glow transition-smooth"
                  >
                    Vorgang öffnen
                    <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-smooth" />
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Fleet;
