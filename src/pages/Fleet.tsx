import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProcessStore } from "@/store/processStore";
import {
  formatCurrency,
  formatDate,
  VehicleStatus,
  VEHICLE_TYPE_LABELS,
  VehicleType,
  vehicleTotalCostsGross,
} from "@/data/process";
import { Car, Plus } from "lucide-react";
import { toast } from "sonner";
import { VehicleIntakeDialog } from "@/components/fleet/VehicleIntakeDialog";
import { cn } from "@/lib/utils";
import { useTopbarSearch } from "@/context/TopbarSearchContext";
import { SortableTh, SortState } from "@/components/shared/SortableTh";

type FleetSortKey =
  | "name" | "type" | "year" | "mileage" | "power" | "color"
  | "location" | "hu" | "stockDays" | "price" | "margin" | "openOffers" | "status";

const STATUS_META: Record<VehicleStatus, { label: string; className: string }> = {
  planned:  { label: "Geplant",    className: "bg-info/15 text-info border-info/30" },
  in_stock: { label: "Im Bestand", className: "bg-success/15 text-success border-success/30" },
  reserved: { label: "Reserviert", className: "bg-warning/15 text-warning border-warning/30" },
  sold:     { label: "Verkauft",   className: "bg-muted text-muted-foreground border-border" },
};

const STATUS_ORDER: Record<VehicleStatus, number> = { in_stock: 0, reserved: 1, planned: 2, sold: 3 };

const Fleet = () => {
  const navigate = useNavigate();
  const vehicles = useProcessStore((s) => s.vehicles);
  const offers = useProcessStore((s) => s.offers);
  const processes = useProcessStore((s) => s.processes);
  const locations = useProcessStore((s) => s.settings.locations);
  const addVehicle = useProcessStore((s) => s.addVehicle);

  const [query, setQuery] = useState("");
  const [searchField, setSearchField] = useState<"all" | "vin" | "make" | "model" | "color" | "location">("all");
  const [filter, setFilter] = useState<"all" | VehicleStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | VehicleType>("all");
  const [sortKey, setSortKey] = useState<FleetSortKey>("newest");
  const [intakeOpen, setIntakeOpen] = useState(false);

  const topbarSearch = useMemo(() => ({
    placeholder: "Bestand durchsuchen…",
    value: query,
    onChange: setQuery,
    field: searchField,
    onFieldChange: (f: string) => setSearchField(f as typeof searchField),
    fields: [
      { key: "all",      label: "Alle Felder" },
      { key: "vin",      label: "VIN" },
      { key: "make",     label: "Marke" },
      { key: "model",    label: "Modell" },
      { key: "color",    label: "Farbe" },
      { key: "location", label: "Stellplatz" },
    ],
  }), [query, searchField]);

  useTopbarSearch(topbarSearch);

  const data = useMemo(() => {
    return vehicles.map((v) => {
      const vehicleOffers = offers.filter((o) => o.vehicleId === v.id);
      const openOffers = vehicleOffers.filter((o) => o.status === "sent" || o.status === "draft").length;
      const proc = processes.find((p) => p.vehicleId === v.id);
      return { vehicle: v, openOffers, processId: proc?.id };
    });
  }, [vehicles, offers, processes]);

  const filtered = useMemo(() => {
    const list = data.filter(({ vehicle }) => {
      if (filter !== "all" && vehicle.status !== filter) return false;
      if (typeFilter !== "all" && vehicle.type !== typeFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      const fields: Record<typeof searchField, string> = {
        all: `${vehicle.vin} ${vehicle.make} ${vehicle.model} ${vehicle.color} ${vehicle.location.name}`,
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color,
        location: vehicle.location.name,
      };
      return fields[searchField].toLowerCase().includes(q);
    });

    return [...list].sort((a, b) => {
      const va = a.vehicle, vb = b.vehicle;
      switch (sortKey) {
        case "newest":       return (new Date(vb.arrivedAt ?? 0).getTime() - new Date(va.arrivedAt ?? 0).getTime());
        case "oldest":       return (new Date(va.arrivedAt ?? 0).getTime() - new Date(vb.arrivedAt ?? 0).getTime());
        case "price_asc":    return va.listPrice - vb.listPrice;
        case "price_desc":   return vb.listPrice - va.listPrice;
        case "mileage_asc":  return va.mileage - vb.mileage;
        case "mileage_desc": return vb.mileage - va.mileage;
        case "make":         return `${va.make} ${va.model}`.localeCompare(`${vb.make} ${vb.model}`);
      }
    });
  }, [data, filter, typeFilter, query, searchField, sortKey]);

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
            <h1 className="font-display text-3xl font-bold tracking-tight">Bestand</h1>
            <p className="text-sm text-muted-foreground mt-1">Fahrzeugbestand · VIN-basiert</p>
          </div>
          <Button
            className="bg-gradient-brand hover:opacity-90 shadow-elegant gap-2"
            onClick={() => setIntakeOpen(true)}
          >
            <Plus className="size-4" /> Fahrzeug aufnehmen
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
          <div className="flex gap-2 items-center flex-wrap">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "all" | VehicleType)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as FleetSortKey)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
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
          <div className="flex gap-2 flex-wrap">
            {([
              { key: "all",      label: `Alle (${stats.total})` },
              { key: "in_stock", label: `Bestand (${stats.in_stock})` },
              { key: "reserved", label: `Reserviert (${stats.reserved})` },
              { key: "sold",     label: `Verkauft (${stats.sold})` },
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
          <Card className="bg-card border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Fahrzeug</th>
                    <th className="px-5 py-3 font-medium">Typ</th>
                    <th className="px-5 py-3 font-medium">EZ / km</th>
                    <th className="px-5 py-3 font-medium">Farbe</th>
                    <th className="px-5 py-3 font-medium">Stellplatz</th>
                    <th className="px-5 py-3 font-medium text-right">Listenpreis</th>
                    <th className="px-5 py-3 font-medium text-right">Marge¹</th>
                    <th className="px-5 py-3 font-medium text-center">Angebote</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ vehicle, openOffers }) => {
                    const meta = STATUS_META[vehicle.status];
                    const ek = vehicle.purchasePrice + vehicleTotalCostsGross(vehicle);
                    const margin = vehicle.listPrice - ek;
                    return (
                      <tr
                        key={vehicle.id}
                        onClick={() => navigate(`/bestand/${vehicle.id}`)}
                        className="border-b border-border/50 hover:bg-surface-elevated/40 transition-smooth cursor-pointer"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-lg bg-gradient-brand grid place-items-center shrink-0">
                              <Car className="size-4 text-primary-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{vehicle.make} {vehicle.model}</p>
                              <p className="font-mono text-[10px] text-muted-foreground truncate">VIN {vehicle.vin}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground">{VEHICLE_TYPE_LABELS[vehicle.type]}</td>
                        <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                          <div>{vehicle.year}</div>
                          <div>{vehicle.mileage.toLocaleString("de-DE")} km</div>
                        </td>
                        <td className="px-5 py-4 text-xs text-foreground truncate max-w-[140px]">{vehicle.color}</td>
                        <td className="px-5 py-4 text-xs text-muted-foreground truncate max-w-[180px]">{vehicle.location.name}</td>
                        <td className="px-5 py-4 text-right font-semibold whitespace-nowrap">{formatCurrency(vehicle.listPrice)}</td>
                        <td className={cn(
                          "px-5 py-4 text-right font-semibold whitespace-nowrap",
                          margin >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {formatCurrency(margin)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {openOffers > 0 ? (
                            <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-primary/15 text-primary-glow text-xs font-semibold">
                              {openOffers}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">–</span>
                          )}
                        </td>
                        <td className="px-5 py-4"><Badge className={meta.className}>{meta.label}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-2 text-[10px] text-muted-foreground border-t border-border/50">
              ¹ Marge = Listenpreis − (Einkauf + alle Kosten brutto)
            </p>
          </Card>
        )}
      </div>

      <VehicleIntakeDialog
        open={intakeOpen}
        onOpenChange={setIntakeOpen}
        locations={locations}
        onSubmit={(data) => {
          addVehicle({ ...data, status: "in_stock" });
          toast.success(`${data.make} ${data.model} in den Bestand aufgenommen.`);
          setIntakeOpen(false);
        }}
      />
    </AppShell>
  );
};

export default Fleet;
