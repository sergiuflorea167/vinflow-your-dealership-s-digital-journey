import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProcessStore } from "@/store/processStore";
import { formatCurrency, Vehicle, VehicleStatus, VEHICLE_TYPE_LABELS, VehicleType, vehicleTotalCostsGross } from "@/data/process";
import { Car, Search, Gauge, Calendar, Palette, Hash, ArrowRight, FileText, ArrowDownAZ, ArrowUpAZ } from "lucide-react";

type FleetSortKey = "newest" | "oldest" | "price_asc" | "price_desc" | "mileage_asc" | "mileage_desc" | "make";

const Fleet = () => {
  const vehicles = useProcessStore((s) => s.vehicles);
  const offers = useProcessStore((s) => s.offers);
  const processes = useProcessStore((s) => s.processes);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | VehicleStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | VehicleType>("all");
  const [sortKey, setSortKey] = useState<FleetSortKey>("newest");

  const data = useMemo(() => {
    return vehicles.map((v) => {
      const vehicleOffers = offers.filter((o) => o.vehicleId === v.id);
      const openOffers = vehicleOffers.filter((o) => o.status === "sent" || o.status === "draft").length;
      const proc = processes.find((p) => p.vehicleId === v.id);
      return { vehicle: v, openOffers, totalOffers: vehicleOffers.length, processId: proc?.id };
    });
  }, [vehicles, offers, processes]);

  const filtered = useMemo(() => {
    const list = data.filter(({ vehicle }) => {
      if (filter !== "all" && vehicle.status !== filter) return false;
      if (typeFilter !== "all" && vehicle.type !== typeFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        vehicle.vin.toLowerCase().includes(q) ||
        vehicle.make.toLowerCase().includes(q) ||
        vehicle.model.toLowerCase().includes(q) ||
        vehicle.color.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      const va = a.vehicle, vb = b.vehicle;
      switch (sortKey) {
        case "newest": return (new Date(vb.arrivedAt ?? 0).getTime() - new Date(va.arrivedAt ?? 0).getTime());
        case "oldest": return (new Date(va.arrivedAt ?? 0).getTime() - new Date(vb.arrivedAt ?? 0).getTime());
        case "price_asc": return va.listPrice - vb.listPrice;
        case "price_desc": return vb.listPrice - va.listPrice;
        case "mileage_asc": return va.mileage - vb.mileage;
        case "mileage_desc": return vb.mileage - va.mileage;
        case "make": return `${va.make} ${va.model}`.localeCompare(`${vb.make} ${vb.model}`);
      }
    });
  }, [data, filter, typeFilter, query, sortKey]);

  const stats = {
    total: vehicles.length,
    in_stock: vehicles.filter((v) => v.status === "in_stock").length,
    reserved: vehicles.filter((v) => v.status === "reserved").length,
    sold: vehicles.filter((v) => v.status === "sold").length,
  };

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Flotte</h1>
            <p className="text-sm text-muted-foreground mt-1">Fahrzeugbestand · VIN-basiert</p>
          </div>
          <Button className="bg-gradient-brand hover:opacity-90 shadow-elegant gap-2">
            <Car className="size-4" /> Fahrzeug aufnehmen
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Gesamt", value: stats.total, accent: "text-primary" },
            { label: "Im Bestand", value: stats.in_stock, accent: "text-success" },
            { label: "Reserviert", value: stats.reserved, accent: "text-warning" },
            { label: "Verkauft", value: stats.sold, accent: "text-muted-foreground" },
          ].map(({ label, value, accent }) => (
            <Card key={label} className="p-4 flex items-center gap-4">
              <div className="size-10 rounded-lg bg-secondary grid place-items-center">
                <Car className={`size-5 ${accent}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="font-display text-2xl font-bold">{value}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="VIN, Marke, Modell oder Farbe…"
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "all" | VehicleType)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Typen</SelectItem>
                  {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as FleetSortKey)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Neueste zuerst</SelectItem>
                  <SelectItem value="oldest">Älteste zuerst</SelectItem>
                  <SelectItem value="price_desc">Preis ↓</SelectItem>
                  <SelectItem value="price_asc">Preis ↑</SelectItem>
                  <SelectItem value="mileage_asc">Kilometer ↑</SelectItem>
                  <SelectItem value="mileage_desc">Kilometer ↓</SelectItem>
                  <SelectItem value="make">Marke / Modell A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {([
              { key: "all", label: `Alle (${stats.total})` },
              { key: "in_stock", label: `Bestand (${stats.in_stock})` },
              { key: "reserved", label: `Reserviert (${stats.reserved})` },
              { key: "sold", label: `Verkauft (${stats.sold})` },
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
          <Card className="p-12 text-center text-muted-foreground">Keine Fahrzeuge gefunden.</Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(({ vehicle, openOffers, processId }) => (
              <VehicleCardItem
                key={vehicle.id}
                vehicle={vehicle}
                openOffers={openOffers}
                processId={processId}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

const StatusBadge = ({ status }: { status: VehicleStatus }) => {
  const map: Record<VehicleStatus, { label: string; className: string }> = {
    planned: { label: "Geplant", className: "bg-info/15 text-info border-info/30" },
    in_stock: { label: "Im Bestand", className: "bg-success/15 text-success border-success/30" },
    reserved: { label: "Reserviert", className: "bg-warning/15 text-warning border-warning/30" },
    sold: { label: "Verkauft", className: "bg-muted text-muted-foreground border-border" },
  };
  const { label, className } = map[status];
  return <Badge className={className}>{label}</Badge>;
};

const VehicleCardItem = ({
  vehicle,
  openOffers,
  processId,
}: {
  vehicle: Vehicle;
  openOffers: number;
  processId?: string;
}) => {
  return (
    <Card className="p-5 hover:shadow-glow transition-smooth group flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="size-12 rounded-xl bg-gradient-brand grid place-items-center shadow-card">
          <Car className="size-6 text-primary-foreground" />
        </div>
        <StatusBadge status={vehicle.status} />
      </div>

      <div className="mb-4">
        <h3 className="font-display font-bold text-lg leading-tight">
          {vehicle.make} {vehicle.model}
        </h3>
        <p className="font-mono text-xs text-muted-foreground mt-1">VIN {vehicle.vin}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs mb-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="size-3.5" />
          <span>{vehicle.year}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Gauge className="size-3.5" />
          <span>{vehicle.mileage.toLocaleString("de-DE")} km</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Palette className="size-3.5" />
          <span className="truncate">{vehicle.color}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Hash className="size-3.5" />
          <span className="font-mono truncate">{vehicle.vin.slice(-8)}</span>
        </div>
      </div>

      <div className="border-t border-border pt-4 flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Listenpreis</p>
          <p className="font-display font-bold text-foreground">{formatCurrency(vehicle.listPrice)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Angebote</p>
          <p className="font-display font-bold text-primary-glow">{openOffers}</p>
        </div>
      </div>

      <div className="mt-auto flex gap-2">
        <Link
          to={`/flotte/${vehicle.id}`}
          className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:border-primary/40 transition-smooth"
        >
          Details
          <ArrowRight className="size-3.5" />
        </Link>
        {processId && (
          <Link
            to={`/vorgaenge/${processId}`}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-primary/15 text-primary-glow hover:bg-primary/25 transition-smooth"
          >
            <FileText className="size-3.5" /> Vorgang
          </Link>
        )}
      </div>
    </Card>
  );
};

export default Fleet;
