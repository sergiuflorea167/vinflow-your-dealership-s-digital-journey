import { lazy, Suspense, useMemo, useState } from "react";
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
import { Car, Megaphone, Plus, Download, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkshopStore } from "@/store/workshopStore";
import { FLEET_DEMO_VEHICLES, FLEET_DEMO_OFFERS, FLEET_DEMO_PROCESSES } from "@/data/workshopDemo";
import { withWorkshopGuard } from "@/lib/workshopGuard";
import { cn } from "@/lib/utils";
import { useTopbarSearch } from "@/context/TopbarSearchContext";
import { SortableTh, SortDir, SortState } from "@/components/shared/SortableTh";
import { DataTableShell } from "@/components/shared/DataTableShell";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";

type FleetSortKey =
  | "name" | "type" | "year" | "mileage" | "power" | "color"
  | "hu" | "stockDays" | "price" | "margin" | "openOffers" | "status" | "listed";

const STATUS_META: Record<VehicleStatus, { label: string; className: string }> = {
  planned:  { label: "Geplant",    className: "bg-info/15 text-info border-info/30" },
  in_stock: { label: "Im Bestand", className: "bg-success/15 text-success border-success/30" },
  reserved: { label: "Reserviert", className: "bg-warning/15 text-warning border-warning/30" },
  sold:     { label: "Verkauft",   className: "bg-muted text-muted-foreground border-border" },
};

const STATUS_ORDER: Record<VehicleStatus, number> = { in_stock: 0, reserved: 1, planned: 2, sold: 3 };

type ListedFilter = "all" | "listed" | "not_listed";

const FleetImportDialog = lazy(() =>
  import("@/components/fleet/FleetImportDialog").then((module) => ({ default: module.FleetImportDialog })),
);
const FleetExportDialog = lazy(() =>
  import("@/components/fleet/FleetExportDialog").then((module) => ({ default: module.FleetExportDialog })),
);
const VehicleIntakeDialog = lazy(() =>
  import("@/components/fleet/VehicleIntakeDialog").then((module) => ({ default: module.VehicleIntakeDialog })),
);

const Fleet = () => {
  const navigate = useNavigate();
  const realVehicles = useProcessStore((s) => s.vehicles);
  const realOffers = useProcessStore((s) => s.offers);
  const realProcesses = useProcessStore((s) => s.processes);
  const locations = useProcessStore((s) => s.settings.locations);
  const realAddVehicle = useProcessStore((s) => s.addVehicle);
  const realSetVehicleListed = useProcessStore((s) => s.setVehicleListed);

  const workshopActive = useWorkshopStore((s) => s.activeKey === "fleet");

  // Im Workshop: ausschließlich Demo-Daten, keine echten Schreibzugriffe
  const vehicles = workshopActive ? FLEET_DEMO_VEHICLES : realVehicles;
  const offers = workshopActive ? FLEET_DEMO_OFFERS : realOffers;
  const processes = workshopActive ? FLEET_DEMO_PROCESSES : realProcesses;
  const addVehicle = withWorkshopGuard(workshopActive, realAddVehicle);
  const setVehicleListed = withWorkshopGuard(workshopActive, realSetVehicleListed);

  const [query, setQuery] = useState("");
  const [searchField, setSearchField] = useState<"all" | "vin" | "make" | "model" | "color">("all");
  const [filter, setFilter] = useState<"all" | VehicleStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | VehicleType>("all");
  const [listedFilter, setListedFilter] = useState<ListedFilter>("all");
  const [sort, setSort] = useState<SortState<FleetSortKey>>({ key: "stockDays", dir: "asc" });
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

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
    ],
  }), [query, searchField]);

  useTopbarSearch(topbarSearch);

  const data = useMemo(() => {
    const now = Date.now();
    return vehicles.map((v) => {
      const vehicleOffers = offers.filter((o) => o.vehicleId === v.id);
      const openOffers = vehicleOffers.filter((o) => o.status === "sent" || o.status === "draft").length;
      const proc = processes.find((p) => p.vehicleId === v.id);
      const ek = v.purchasePrice + vehicleTotalCostsGross(v);
      // Wunschmarge: Listenpreis − (Einkauf + Kosten). Nur ein Plan-Wert.
      const desiredMargin = v.listPrice - ek;
      // Tatsächliche Marge: nur wenn das Auto verkauft wurde und es einen finalen VK-Preis gibt.
      const isSold = v.status === "sold";
      const finalPrice = proc?.fields?.finalPrice;
      const realizedMargin = isSold && typeof finalPrice === "number" && finalPrice > 0
        ? finalPrice - ek
        : null;
      const stockDays = v.arrivedAt
        ? Math.max(0, Math.floor((now - new Date(v.arrivedAt).getTime()) / 86400000))
        : 0;
      return { vehicle: v, openOffers, processId: proc?.id, desiredMargin, realizedMargin, stockDays };
    });
  }, [vehicles, offers, processes]);

  const filtered = useMemo(() => {
    const list = data.filter(({ vehicle }) => {
      if (filter !== "all" && vehicle.status !== filter) return false;
      if (typeFilter !== "all" && vehicle.type !== typeFilter) return false;
      if (listedFilter === "listed" && !vehicle.listed?.active) return false;
      if (listedFilter === "not_listed" && vehicle.listed?.active) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      const fields: Record<typeof searchField, string> = {
        all: `${vehicle.vin} ${vehicle.make} ${vehicle.model} ${vehicle.color}`,
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color,
      };
      return fields[searchField].toLowerCase().includes(q);
    });

    const dirMul = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const va = a.vehicle, vb = b.vehicle;
      let cmp = 0;
      switch (sort.key) {
        case "name":       cmp = `${va.make} ${va.model}`.localeCompare(`${vb.make} ${vb.model}`); break;
        case "type":       cmp = VEHICLE_TYPE_LABELS[va.type].localeCompare(VEHICLE_TYPE_LABELS[vb.type]); break;
        case "year":       cmp = va.year - vb.year; break;
        case "mileage":    cmp = va.mileage - vb.mileage; break;
        case "power":      cmp = va.power_hp - vb.power_hp; break;
        case "color":      cmp = va.color.localeCompare(vb.color); break;
        case "hu":         cmp = (va.hu ?? "").localeCompare(vb.hu ?? ""); break;
        case "stockDays":  cmp = b.stockDays - a.stockDays; break; // default: ältester zuerst → invertiere unten
        case "price":      cmp = va.listPrice - vb.listPrice; break;
        case "margin":     {
          // Sortierung: realisierte Marge bevorzugen, sonst Wunschmarge.
          const am = a.realizedMargin ?? a.desiredMargin;
          const bm = b.realizedMargin ?? b.desiredMargin;
          cmp = am - bm; break;
        }
        case "openOffers": cmp = a.openOffers - b.openOffers; break;
        case "status":     cmp = STATUS_ORDER[va.status] - STATUS_ORDER[vb.status]; break;
        case "listed":     cmp = Number(!!va.listed?.active) - Number(!!vb.listed?.active); break;
      }
      // stockDays asc = "längste im Bestand zuerst" intuitiv
      if (sort.key === "stockDays") return cmp * (sort.dir === "asc" ? 1 : -1);
      return cmp * dirMul;
    });
  }, [data, filter, typeFilter, listedFilter, query, searchField, sort]);

  const stats = {
    total: vehicles.length,
    in_stock: vehicles.filter((v) => v.status === "in_stock").length,
    reserved: vehicles.filter((v) => v.status === "reserved").length,
    sold: vehicles.filter((v) => v.status === "sold").length,
    listed: vehicles.filter((v) => v.listed?.active).length,
    notListed: vehicles.filter((v) => v.status !== "sold" && !v.listed?.active).length,
  };

  return (
    <AppShell>

      <div className="space-y-3 animate-fade-in">
        {/* Header — kompakt */}
        <div className="flex flex-col gap-3 shrink-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Bestand</h1>
            <p className="text-xs text-muted-foreground">Fahrzeugbestand · VIN-basiert</p>
          </div>
          <div data-tour="fleet-io" className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setExportOpen(true)}>
              <Settings2 className="size-4" /> Export…
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
              <Download className="size-4" /> Import
            </Button>
            <Button
              size="sm"
              data-tour="fleet-intake"
              className="col-span-2 bg-gradient-brand hover:opacity-90 shadow-elegant gap-2 sm:col-span-1"
              onClick={() => setIntakeOpen(true)}
            >
              <Plus className="size-4" /> Fahrzeug aufnehmen
            </Button>
          </div>
        </div>

        {/* KPI-Strip kompakt */}
        <div data-tour="fleet-kpis" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 shrink-0">
          {[
            { label: "Gesamt", value: stats.total, icon: Car, accent: "text-primary" },
            { label: "Im Bestand", value: stats.in_stock, icon: Car, accent: "text-success" },
            { label: "Reserviert", value: stats.reserved, icon: Car, accent: "text-warning" },
            { label: "Verkauft", value: stats.sold, icon: Car, accent: "text-muted-foreground" },
            { label: "Inseriert", value: stats.listed, icon: Megaphone, accent: "text-primary-glow" },
            { label: "Nicht inseriert", value: stats.notListed, icon: Megaphone, accent: "text-destructive" },
          ].map(({ label, value, icon: Icon, accent }) => (
            <Card key={label} className="px-3 py-2 flex items-center gap-3">
              <Icon className={`size-4 ${accent}`} />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none">{label}</p>
                <p className="font-display text-lg font-bold leading-tight">{value}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Filter-Leiste kompakt */}
        <Card data-tour="fleet-filters" className="px-3 py-2 flex flex-col gap-2 shrink-0 sm:flex-row sm:flex-wrap sm:items-center">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "all" | VehicleType)}>
            <SelectTrigger className="w-full text-xs sm:h-8 sm:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={listedFilter} onValueChange={(v) => setListedFilter(v as ListedFilter)}>
            <SelectTrigger className="w-full text-xs sm:h-8 sm:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Inserate</SelectItem>
              <SelectItem value="listed">Nur inseriert ({stats.listed})</SelectItem>
              <SelectItem value="not_listed">Nicht inseriert ({stats.notListed})</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
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
                className="text-xs sm:h-8"
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <Select
            value={`${sort.key}:${sort.dir}`}
            onValueChange={(v) => {
              const [key, dir] = v.split(":") as [FleetSortKey, SortDir];
              setSort({ key, dir });
            }}
          >
            <SelectTrigger className="w-full text-xs sm:hidden">
              <SelectValue placeholder="Sortieren nach…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stockDays:asc">Standzeit (länger zuerst)</SelectItem>
              <SelectItem value="price:desc">Preis (hoch → niedrig)</SelectItem>
              <SelectItem value="price:asc">Preis (niedrig → hoch)</SelectItem>
              <SelectItem value="margin:desc">Marge (hoch → niedrig)</SelectItem>
              <SelectItem value="name:asc">Fahrzeug (A → Z)</SelectItem>
              <SelectItem value="hu:asc">HU (früheste zuerst)</SelectItem>
            </SelectContent>
          </Select>
        </Card>

        {filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground flex-1">
            <p>
              {vehicles.length > 0
                ? "Keine Fahrzeuge im aktuellen Filter."
                : "Keine Fahrzeuge gefunden."}
            </p>
            {vehicles.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                  setTypeFilter("all");
                  setListedFilter("all");
                }}
              >
                Alle Fahrzeuge anzeigen
              </Button>
            )}
          </Card>
        ) : (
          <>
          <div className="hidden sm:block">
          <DataTableShell
            footer={<>¹ Wunschmarge = Listenpreis − (Einkauf + Kosten brutto). Echte Marge erst nach Verkauf. · {filtered.length} Fahrzeuge</>}
          >
            <div data-tour="fleet-table">
            <table>
              <thead>
                <tr>
                  <SortableTh label="Fahrzeug" sortKey="name" state={sort} onChange={setSort} />
                  <SortableTh label="Typ" sortKey="type" state={sort} onChange={setSort} />
                  <SortableTh label="EZ / km" sortKey="mileage" state={sort} onChange={setSort} />
                  <SortableTh label="PS" sortKey="power" state={sort} onChange={setSort} align="right" />
                  <SortableTh label="HU" sortKey="hu" state={sort} onChange={setSort} />
                  <SortableTh label="Tage" sortKey="stockDays" state={sort} onChange={setSort} align="right" />
                  <SortableTh label="VK" sortKey="price" state={sort} onChange={setSort} align="right" />
                  <SortableTh label="Marge¹" sortKey="margin" state={sort} onChange={setSort} align="right" />
                  <SortableTh label="Ang." sortKey="openOffers" state={sort} onChange={setSort} align="center" />
                  <SortableTh label="Inseriert" sortKey="listed" state={sort} onChange={setSort} align="center" />
                  <SortableTh label="Status" sortKey="status" state={sort} onChange={setSort} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ vehicle, openOffers, desiredMargin, realizedMargin, stockDays }) => {
                  const meta = STATUS_META[vehicle.status];
                  const huDate = vehicle.hu ? new Date(vehicle.hu) : null;
                  const huSoon = huDate ? (huDate.getTime() - Date.now()) / 86400000 < 90 : false;
                  return (
                    <tr
                      key={vehicle.id}
                      onClick={() => {
                        if (workshopActive) {
                          toast.info("Eine Fahrzeug-Detailseite lernst du im Vorgänge-Workshop Schritt für Schritt kennen.");
                          return;
                        }
                        navigate(`/bestand/${vehicle.id}`);
                      }}
                      className="hover:bg-surface-elevated/40 transition-smooth cursor-pointer"
                    >
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-md bg-gradient-brand grid place-items-center shrink-0">
                            <Car className="size-3.5 text-primary-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate leading-tight">{vehicle.make} {vehicle.model}</p>
                            <p className="text-[10px] text-muted-foreground truncate leading-tight">{vehicle.color} · {vehicle.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-muted-foreground">{VEHICLE_TYPE_LABELS[vehicle.type]}</td>
                      <td className="text-muted-foreground whitespace-nowrap leading-tight">
                        <div className="text-foreground">{vehicle.year}</div>
                        <div>{vehicle.mileage.toLocaleString("de-DE")} km</div>
                      </td>
                      <td className="text-foreground text-right whitespace-nowrap">{vehicle.power_hp}</td>
                      <td className={cn("whitespace-nowrap", huSoon ? "text-warning font-medium" : "text-muted-foreground")}>
                        {vehicle.hu ? formatDate(vehicle.hu) : "–"}
                      </td>
                      <td className={cn(
                        "text-right font-medium whitespace-nowrap",
                        stockDays > 90 ? "text-warning" : stockDays > 60 ? "text-foreground" : "text-muted-foreground",
                      )}>
                        {stockDays}
                      </td>
                      <td className="text-right font-semibold whitespace-nowrap">{formatCurrency(vehicle.listPrice)}</td>
                      <td className="text-right whitespace-nowrap">
                        {realizedMargin !== null ? (
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <span className={cn("font-semibold", realizedMargin >= 0 ? "text-success" : "text-destructive")}>
                                {formatCurrency(realizedMargin)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-xs">
                              Realisierte Marge nach Verkauf (finaler VK − Einkauf − Kosten brutto).
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <span className={cn("italic font-medium text-muted-foreground")}>
                                ~{formatCurrency(desiredMargin)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-xs">
                              Wunschmarge — basiert auf dem voraussichtlichen Listenpreis.
                              Echte Marge wird erst nach dem Verkauf berechnet.
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </td>
                      <td className="text-center">
                        {openOffers > 0 ? (
                          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary/15 text-primary-glow text-[10px] font-semibold">
                            {openOffers}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </td>
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center justify-center">
                              <Switch
                                checked={!!vehicle.listed?.active}
                                onCheckedChange={(checked) => {
                                  setVehicleListed(vehicle.id, checked);
                                  toast.success(
                                    checked
                                      ? `${vehicle.make} ${vehicle.model} als inseriert markiert.`
                                      : `Inserat zurückgenommen — neues To-Do erstellt.`
                                  );
                                }}
                                aria-label="Inseriert"
                              />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs max-w-xs">
                            {vehicle.listed?.active
                              ? `Aktiv inseriert${vehicle.listed.listedAt ? ` seit ${formatDate(vehicle.listed.listedAt)}` : ""}.`
                              : 'Noch nicht online inseriert. Ein To-Do „Inserat erstellen" ist offen.'}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td><Badge className={cn(meta.className, "text-[10px] px-1.5 py-0")}>{meta.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </DataTableShell>
          </div>

          <div className="sm:hidden space-y-2" data-tour="fleet-table">
            {filtered.map(({ vehicle, openOffers, desiredMargin, realizedMargin, stockDays }) => {
              const meta = STATUS_META[vehicle.status];
              const huDate = vehicle.hu ? new Date(vehicle.hu) : null;
              const huSoon = huDate ? (huDate.getTime() - Date.now()) / 86400000 < 90 : false;
              return (
                <Card
                  key={vehicle.id}
                  onClick={() => {
                        if (workshopActive) {
                          toast.info("Eine Fahrzeug-Detailseite lernst du im Vorgänge-Workshop Schritt für Schritt kennen.");
                          return;
                        }
                        navigate(`/bestand/${vehicle.id}`);
                      }}
                  className="p-3 cursor-pointer active:bg-surface-elevated/40 transition-smooth"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-8 rounded-md bg-gradient-brand grid place-items-center shrink-0">
                        <Car className="size-4 text-primary-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate leading-tight">{vehicle.make} {vehicle.model}</p>
                        <p className="text-[11px] text-muted-foreground truncate leading-tight">{vehicle.color} · {vehicle.id}</p>
                      </div>
                    </div>
                    <Badge className={cn(meta.className, "text-[10px] px-1.5 py-0 shrink-0")}>{meta.label}</Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <FleetStat label="EZ / km" value={`${vehicle.year} · ${vehicle.mileage.toLocaleString("de-DE")} km`} />
                    <FleetStat label="PS" value={String(vehicle.power_hp)} align="right" />
                    <FleetStat
                      label="HU"
                      value={vehicle.hu ? formatDate(vehicle.hu) : "–"}
                      valueClassName={huSoon ? "text-warning font-medium" : undefined}
                    />
                    <FleetStat
                      label="Tage im Bestand"
                      value={String(stockDays)}
                      align="right"
                      valueClassName={stockDays > 90 ? "text-warning" : stockDays > 60 ? "text-foreground" : undefined}
                    />
                    <FleetStat label="Verkaufspreis" value={formatCurrency(vehicle.listPrice)} valueClassName="font-semibold" />
                    <FleetStat
                      label="Marge¹"
                      value={realizedMargin !== null ? formatCurrency(realizedMargin) : `~${formatCurrency(desiredMargin)}`}
                      align="right"
                      valueClassName={cn(
                        "font-semibold",
                        realizedMargin !== null
                          ? (realizedMargin >= 0 ? "text-success" : "text-destructive")
                          : "italic font-medium text-muted-foreground",
                      )}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5">
                    <span className="text-[11px] text-muted-foreground">
                      {openOffers > 0 ? `${openOffers} Angebot${openOffers === 1 ? "" : "e"} offen` : "Keine Angebote"}
                    </span>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[11px] text-muted-foreground">Inseriert</span>
                      <Switch
                        checked={!!vehicle.listed?.active}
                        onCheckedChange={(checked) => {
                          setVehicleListed(vehicle.id, checked);
                          toast.success(
                            checked
                              ? `${vehicle.make} ${vehicle.model} als inseriert markiert.`
                              : `Inserat zurückgenommen — neues To-Do erstellt.`
                          );
                        }}
                        aria-label="Inseriert"
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
            <p className="px-1 text-[10px] text-muted-foreground">
              ¹ Wunschmarge = Listenpreis − (Einkauf + Kosten brutto). Echte Marge erst nach Verkauf. · {filtered.length} Fahrzeuge
            </p>
          </div>
          </>
        )}
      </div>

      <Suspense fallback={null}>
        {intakeOpen && (
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
        )}

        {importOpen && (
          <FleetImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        defaultLocation={locations[0] ?? "Hof A · Platz 01"}
        onImport={(rows) => {
          // Status / soldAt / listed kommen aus der Datei – wenn nichts gesetzt,
          // fällt addVehicle auf "in_stock" zurück.
          rows.forEach((data) => addVehicle(data));
          setQuery("");
          setFilter("all");
          setTypeFilter("all");
          setListedFilter("all");
        }}
          />
        )}

        {exportOpen && (
          <FleetExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        totalCount={filtered.length}
        onExport={async (keys, format) => {
          const { exportVehicles } = await import("@/lib/fleetIO");
          exportVehicles(filtered.map((d) => d.vehicle), format, keys, "bestand", { processes });
          toast.success(`${format.toUpperCase()}-Export erstellt (${keys.length} Spalten).`);
        }}
        onDownloadTemplate={async (keys, format) => {
          const { downloadTemplate } = await import("@/lib/fleetIO");
          downloadTemplate(format, keys);
          toast.success("Vorlage heruntergeladen.");
        }}
          />
        )}
      </Suspense>
    </AppShell>
  );
};

const FleetStat = ({
  label, value, align = "left", valueClassName,
}: { label: string; value: string; align?: "left" | "right"; valueClassName?: string }) => (
  <div className={align === "right" ? "text-right" : undefined}>
    <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none">{label}</p>
    <p className={cn("text-foreground mt-1 leading-tight", valueClassName)}>{value}</p>
  </div>
);

export default Fleet;
