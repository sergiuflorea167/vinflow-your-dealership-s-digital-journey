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
import { Car, Megaphone, Plus, Download, Upload, FileSpreadsheet, FileText, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { useFleetWorkshopStore } from "@/store/fleetWorkshopStore";
import { FLEET_DEMO_VEHICLES, FLEET_DEMO_OFFERS, FLEET_DEMO_PROCESSES } from "@/data/workshopDemo";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { exportVehicles, downloadTemplate } from "@/lib/fleetIO";
import { FleetImportDialog } from "@/components/fleet/FleetImportDialog";
import { VehicleIntakeDialog } from "@/components/fleet/VehicleIntakeDialog";
import { cn } from "@/lib/utils";
import { useTopbarSearch } from "@/context/TopbarSearchContext";
import { SortableTh, SortState } from "@/components/shared/SortableTh";
import { DataTableShell } from "@/components/shared/DataTableShell";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";

type FleetSortKey =
  | "name" | "type" | "year" | "mileage" | "power" | "color"
  | "location" | "hu" | "stockDays" | "price" | "margin" | "openOffers" | "status" | "listed";

const STATUS_META: Record<VehicleStatus, { label: string; className: string }> = {
  planned:  { label: "Geplant",    className: "bg-info/15 text-info border-info/30" },
  in_stock: { label: "Im Bestand", className: "bg-success/15 text-success border-success/30" },
  reserved: { label: "Reserviert", className: "bg-warning/15 text-warning border-warning/30" },
  sold:     { label: "Verkauft",   className: "bg-muted text-muted-foreground border-border" },
};

const STATUS_ORDER: Record<VehicleStatus, number> = { in_stock: 0, reserved: 1, planned: 2, sold: 3 };

type ListedFilter = "all" | "listed" | "not_listed";

const Fleet = () => {
  const navigate = useNavigate();
  const realVehicles = useProcessStore((s) => s.vehicles);
  const realOffers = useProcessStore((s) => s.offers);
  const realProcesses = useProcessStore((s) => s.processes);
  const locations = useProcessStore((s) => s.settings.locations);
  const addVehicle = useProcessStore((s) => s.addVehicle);
  const setVehicleListed = useProcessStore((s) => s.setVehicleListed);

  const workshopActive = useFleetWorkshopStore((s) => s.active);
  const startWorkshop = useFleetWorkshopStore((s) => s.start);

  // Im Workshop: ausschließlich Demo-Daten
  const vehicles = workshopActive ? FLEET_DEMO_VEHICLES : realVehicles;
  const offers = workshopActive ? FLEET_DEMO_OFFERS : realOffers;
  const processes = workshopActive ? FLEET_DEMO_PROCESSES : realProcesses;

  const [query, setQuery] = useState("");
  const [searchField, setSearchField] = useState<"all" | "vin" | "make" | "model" | "color" | "location">("all");
  const [filter, setFilter] = useState<"all" | VehicleStatus>("in_stock");
  const [typeFilter, setTypeFilter] = useState<"all" | VehicleType>("all");
  const [listedFilter, setListedFilter] = useState<ListedFilter>("all");
  const [sort, setSort] = useState<SortState<FleetSortKey>>({ key: "stockDays", dir: "asc" });
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

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
        all: `${vehicle.vin} ${vehicle.make} ${vehicle.model} ${vehicle.color} ${vehicle.location.name}`,
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color,
        location: vehicle.location.name,
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
        case "location":   cmp = va.location.name.localeCompare(vb.location.name); break;
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
      {/* Mini-Tab Workshop am rechten Rand */}
      <button
        type="button"
        onClick={startWorkshop}
        aria-label="Bestand-Workshop starten"
        className="group fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-2 py-2.5 pl-2.5 pr-2 rounded-l-lg bg-card/90 backdrop-blur border border-r-0 border-primary/30 text-primary shadow-lg hover:bg-primary hover:text-primary-foreground transition-all duration-300 max-w-[40px] hover:max-w-[260px] overflow-hidden"
      >
        <GraduationCap className="size-4 shrink-0" />
        <span className="text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pr-1">
          Bestand-Workshop starten
        </span>
      </button>

      <div className="space-y-3 animate-fade-in">
        {/* Header — kompakt */}
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Bestand</h1>
            <p className="text-xs text-muted-foreground">Fahrzeugbestand · VIN-basiert</p>
          </div>
          <div data-tour="fleet-io" className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <Upload className="size-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs">Aktuelle Auswahl ({filtered.length})</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => { exportVehicles(filtered.map((d) => d.vehicle), "xlsx"); toast.success("Excel-Export erstellt."); }}>
                  <FileSpreadsheet className="size-4 mr-2" /> Als Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { exportVehicles(filtered.map((d) => d.vehicle), "csv"); toast.success("CSV-Export erstellt."); }}>
                  <FileText className="size-4 mr-2" /> Als CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs">Gesamter Bestand ({vehicles.length})</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => { exportVehicles(vehicles, "xlsx"); toast.success("Excel-Export erstellt."); }}>
                  <FileSpreadsheet className="size-4 mr-2" /> Als Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { exportVehicles(vehicles, "csv"); toast.success("CSV-Export erstellt."); }}>
                  <FileText className="size-4 mr-2" /> Als CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => downloadTemplate("xlsx")}>
                  <Download className="size-4 mr-2" /> Vorlage (Excel)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
              <Download className="size-4" /> Import
            </Button>
            <Button
              size="sm"
              data-tour="fleet-intake"
              className="bg-gradient-brand hover:opacity-90 shadow-elegant gap-2"
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
        <Card className="px-3 py-2 flex items-center gap-2 flex-wrap shrink-0">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "all" | VehicleType)}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={listedFilter} onValueChange={(v) => setListedFilter(v as ListedFilter)}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Inserate</SelectItem>
              <SelectItem value="listed">Nur inseriert ({stats.listed})</SelectItem>
              <SelectItem value="not_listed">Nicht inseriert ({stats.notListed})</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1.5 flex-wrap">
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
                className="h-8 text-xs"
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </Card>

        {filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground flex-1">Keine Fahrzeuge gefunden.</Card>
        ) : (
          <DataTableShell
            footer={<>¹ Wunschmarge = Listenpreis − (Einkauf + Kosten brutto). Echte Marge erst nach Verkauf. · {filtered.length} Fahrzeuge</>}
          >
            <table>
              <thead>
                <tr>
                  <SortableTh label="Fahrzeug" sortKey="name" state={sort} onChange={setSort} />
                  <SortableTh label="Typ" sortKey="type" state={sort} onChange={setSort} />
                  <SortableTh label="EZ / km" sortKey="mileage" state={sort} onChange={setSort} />
                  <SortableTh label="PS" sortKey="power" state={sort} onChange={setSort} align="right" />
                  <SortableTh label="HU" sortKey="hu" state={sort} onChange={setSort} />
                  <SortableTh label="Stellplatz" sortKey="location" state={sort} onChange={setSort} />
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
                      onClick={() => navigate(`/bestand/${vehicle.id}`)}
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
                      <td className="text-muted-foreground truncate max-w-[140px]">{vehicle.location.name}</td>
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
          </DataTableShell>
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

      <FleetImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        defaultLocation={locations[0] ?? "Hof A · Platz 01"}
        onImport={(rows) => {
          rows.forEach((data) => addVehicle({ ...data, status: "in_stock" }));
        }}
      />
    </AppShell>
  );
};

export default Fleet;
