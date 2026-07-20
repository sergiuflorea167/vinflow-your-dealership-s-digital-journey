// Insight+ BI-Builder — Pro-Variante.
// Konfigurierbare Auswertungen: Metrik → Station(en) → Zeitraum → Filter → Breakdown.
// Live berechnet aus Bestands-, Vorgangs- und Einkaufsdaten.
// Mit Quick-Templates, Trend vs. Vorperiode, Top-Liste, Mini-Bar-Charts.

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Calendar as CalendarIcon, Plus, Trash2, Info, ArrowRight, Car,
  Sparkles, TrendingUp, TrendingDown, Layers, BarChart3, Copy,
  Fuel, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Process, Vehicle, PurchasePlan,
  VehicleType, VEHICLE_TYPE_LABELS, VehicleStatus, FuelType,
  formatCurrency,
} from "@/data/process";
import {
  type StationKey, STATIONS,
  stationIndex, stationLabel,
  type MetricGroup, METRICS, METRIC_GROUP_LABEL, metricDef,
  type RangePreset, type Breakdown, type Measurement, type Result,
  RANGE_LABELS, VEHICLE_STATUS_LABELS, FUEL_TYPES,
  resolveRange, previousRange, computeInsight, formatValue,
  TEMPLATES, baseDraft, newId,
} from "@/lib/insightEngine";
import { loadMeasurements, saveMeasurements, INSIGHT_MEASUREMENTS_EVENT } from "@/lib/insightMeasurementsStore";

interface Props {
  processes: Process[];
  vehicles: Vehicle[];
  purchasePlans: PurchasePlan[];
}

export const InsightPlusBuilder = ({ processes, vehicles, purchasePlans }: Props) => {
  const allMakes = useMemo(() => Array.from(new Set(vehicles.map((v) => v.make))).sort(), [vehicles]);

  const [measurements, setMeasurements] = useState<Measurement[]>(() => loadMeasurements());

  useEffect(() => {
    saveMeasurements(measurements);
  }, [measurements]);

  useEffect(() => {
    const handler = () => setMeasurements(loadMeasurements());
    window.addEventListener(INSIGHT_MEASUREMENTS_EVENT, handler);
    return () => window.removeEventListener(INSIGHT_MEASUREMENTS_EVENT, handler);
  }, []);

  const [draft, setDraft] = useState<Measurement>(baseDraft());
  const [builderOpen, setBuilderOpen] = useState(false);

  const def = metricDef(draft.metric);
  const validDraft =
    (def.needsTwoStations ? stationIndex(draft.toStation) > stationIndex(draft.fromStation) : true) &&
    (draft.rangePreset !== "custom" || (!!draft.customFrom && !!draft.customTo));

  const addMeasurement = (m?: Measurement) => {
    const toAdd = m ?? { ...draft, id: newId() };
    setMeasurements((prev) => [...prev, toAdd]);
    if (!m) setBuilderOpen(false);
  };

  const removeMeasurement = (id: string) => setMeasurements((prev) => prev.filter((m) => m.id !== id));
  const duplicateMeasurement = (id: string) => {
    const src = measurements.find((m) => m.id === id);
    if (src) addMeasurement({ ...src, id: newId(), title: src.title ? `${src.title} (Kopie)` : undefined });
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">

        {/* ===== Quick-Templates ===== */}
        <Card data-tour="insight-templates" className="p-4 bg-card border-border shadow-card">
          <div className="flex items-center gap-2 mb-3">

            <Sparkles className="size-4 text-primary-glow" />
            <h3 className="text-sm font-semibold">Schnell-Vorlagen</h3>
            <span className="text-xs text-muted-foreground">— ein Klick → Auswertung erscheint unten</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {TEMPLATES.map((t) => {
              const Icon = t.icon;
              return (
                <Tooltip key={t.id} delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => addMeasurement(t.build())}
                      className="rounded-lg border border-border bg-background/40 hover:border-primary/50 hover:bg-primary/5 p-2.5 text-left transition-smooth group"
                    >
                      <Icon className="size-4 text-primary-glow mb-1.5" />
                      <p className="text-xs font-semibold leading-tight truncate">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">{t.description}</p>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{t.description}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </Card>

        {/* ===== Builder (collapsible) ===== */}
        <Card data-tour="insight-builder" className="bg-card border-border shadow-card overflow-hidden">

          <button
            type="button"
            onClick={() => setBuilderOpen((v) => !v)}
            className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-smooth text-left"
          >
            <div className="size-9 rounded-xl bg-gradient-brand grid place-items-center shadow-glow">
              <Layers className="size-4 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">Eigene Auswertung bauen</h3>
              <p className="text-xs text-muted-foreground">Metrik · Station(en) · Zeitraum · Filter · Breakdown</p>
            </div>
            {builderOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </button>

          {builderOpen && (
            <div className="border-t border-border p-4 space-y-5">
              {/* STEP 1: Metrik */}
              <Step number={1} title="Was möchtest du messen?" hint="Wähle eine Metrik">
                <div className="space-y-2.5">
                  {(Object.keys(METRIC_GROUP_LABEL) as MetricGroup[]).map((g) => (
                    <div key={g}>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1.5">{METRIC_GROUP_LABEL[g]}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        {METRICS.filter((m) => m.group === g).map((m) => {
                          const Icon = m.icon;
                          const active = draft.metric === m.key;
                          return (
                            <Tooltip key={m.key} delayDuration={250}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => setDraft((d) => ({ ...d, metric: m.key }))}
                                  className={cn(
                                    "rounded-lg border p-2 text-left transition-smooth",
                                    active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-background/40 hover:border-primary/40",
                                  )}
                                >
                                  <Icon className={cn("size-3.5 mb-1", active ? "text-primary-glow" : m.color)} />
                                  <p className="text-[11px] font-semibold leading-tight">{m.shortLabel}</p>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs text-xs">{m.description}</TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Step>

              {/* STEP 2: Stationen */}
              <Step number={2} title="An welcher Stelle im Prozess?" hint={def.needsTwoStations ? "Von- und Bis-Station wählen" : "Ziel-Station wählen"}>
                <div className="flex flex-wrap items-end gap-2">
                  {def.needsTwoStations && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Von</label>
                        <StationSelect value={draft.fromStation} onChange={(v) => setDraft((d) => ({ ...d, fromStation: v }))} width={200} excludeLast />
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground mb-2" />
                    </>
                  )}
                  {(def.needsOneStation || def.needsTwoStations) && (
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider">{def.needsTwoStations ? "Bis" : "Station"}</label>
                      <StationSelect value={draft.toStation} onChange={(v) => setDraft((d) => ({ ...d, toStation: v }))} width={210} minIndex={def.needsTwoStations ? stationIndex(draft.fromStation) + 1 : 0} />
                    </div>
                  )}
                  {!def.needsOneStation && !def.needsTwoStations && (
                    <p className="text-xs text-muted-foreground italic">Diese Metrik (Standzeit) braucht keine Station — sie nutzt den aktuellen Bestand.</p>
                  )}
                </div>
              </Step>

              {/* STEP 3: Zeitraum */}
              <Step number={3} title="In welchem Zeitraum?" hint="Vorperioden-Vergleich automatisch">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Zeitraum</label>
                    <Select value={draft.rangePreset} onValueChange={(v) => setDraft((d) => ({ ...d, rangePreset: v as RangePreset }))}>
                      <SelectTrigger className="h-9 w-[180px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(RANGE_LABELS) as RangePreset[]).map((r) => (
                          <SelectItem key={r} value={r}>{RANGE_LABELS[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {draft.rangePreset === "custom" && (
                    <>
                      <DatePop label="Von" value={draft.customFrom} onChange={(s) => setDraft((d) => ({ ...d, customFrom: s }))} />
                      <DatePop label="Bis" value={draft.customTo} onChange={(s) => setDraft((d) => ({ ...d, customTo: s }))} disabledBefore={draft.customFrom} />
                    </>
                  )}
                </div>
              </Step>

              {/* STEP 4: Filter & Breakdown */}
              <Step number={4} title="Filter & Aufschlüsselung" hint="Optional — schränke Datenbasis ein und gruppiere">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <FilterField label="Fahrzeugtyp">
                      <Select value={draft.vehicleType} onValueChange={(v) => setDraft((d) => ({ ...d, vehicleType: v as VehicleType | "all" }))}>
                        <SelectTrigger className="h-9 w-[150px] text-xs"><Car className="size-3 mr-1 inline" /><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Typen</SelectItem>
                          {(Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((t) => (
                            <SelectItem key={t} value={t}>{VEHICLE_TYPE_LABELS[t]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FilterField>
                    <FilterField label="Marke">
                      <Select value={draft.make} onValueChange={(v) => setDraft((d) => ({ ...d, make: v }))}>
                        <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Marken</SelectItem>
                          {allMakes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FilterField>
                    <FilterField label="Status">
                      <Select value={draft.status} onValueChange={(v) => setDraft((d) => ({ ...d, status: v as VehicleStatus | "all" }))}>
                        <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Status</SelectItem>
                          {(Object.keys(VEHICLE_STATUS_LABELS) as VehicleStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{VEHICLE_STATUS_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FilterField>
                    <FilterField label="Kraftstoff">
                      <Select value={draft.fuel} onValueChange={(v) => setDraft((d) => ({ ...d, fuel: v as FuelType | "all" }))}>
                        <SelectTrigger className="h-9 w-[140px] text-xs"><Fuel className="size-3 mr-1 inline" /><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle</SelectItem>
                          {FUEL_TYPES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FilterField>
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    <RangeField label="Listenpreis (€)" iconLabel="€"
                      min={draft.minPrice} max={draft.maxPrice}
                      onChange={(min, max) => setDraft((d) => ({ ...d, minPrice: min, maxPrice: max }))}
                    />
                    <RangeField label="KM-Stand" iconLabel="km"
                      min={draft.minKm} max={draft.maxKm}
                      onChange={(min, max) => setDraft((d) => ({ ...d, minKm: min, maxKm: max }))}
                    />
                    <RangeField label="Baujahr" iconLabel="J"
                      min={draft.minYear} max={draft.maxYear}
                      onChange={(min, max) => setDraft((d) => ({ ...d, minYear: min, maxYear: max }))}
                    />

                    <FilterField label="Aufschlüsselung nach">
                      <Select value={draft.breakdown} onValueChange={(v) => setDraft((d) => ({ ...d, breakdown: v as Breakdown }))}>
                        <SelectTrigger className="h-9 w-[170px] text-xs"><BarChart3 className="size-3 mr-1 inline" /><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Keine (Gesamt)</SelectItem>
                          <SelectItem value="make">Marke</SelectItem>
                          <SelectItem value="type">Fahrzeugtyp</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                          <SelectItem value="fuel">Kraftstoff</SelectItem>
                          <SelectItem value="month">Monat</SelectItem>
                        </SelectContent>
                      </Select>
                    </FilterField>
                  </div>
                </div>
              </Step>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="ghost" size="sm" onClick={() => setDraft(baseDraft())}>Zurücksetzen</Button>
                <Button size="sm" className="bg-gradient-brand gap-1.5" disabled={!validDraft} onClick={() => addMeasurement()}>
                  <Plus className="size-4" /> Auswertung hinzufügen
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* ===== Ergebnisse ===== */}
        <div data-tour="insight-results">

          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="size-4 text-primary-glow" />
              Deine Auswertungen
              <Badge variant="outline" className="text-[10px]">{measurements.length}</Badge>
            </h3>
            {measurements.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setMeasurements([])} className="text-xs text-muted-foreground hover:text-destructive">
                Alle entfernen
              </Button>
            )}
          </div>

          {measurements.length === 0 ? (
            <Card className="p-10 text-center border-dashed">
              <Sparkles className="size-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Klicke oben auf eine Vorlage oder baue eine eigene Auswertung.</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {measurements.map((m) => (
                <MeasurementCard
                  key={m.id} measurement={m}
                  processes={processes} vehicles={vehicles} purchasePlans={purchasePlans}
                  onRemove={() => removeMeasurement(m.id)}
                  onDuplicate={() => duplicateMeasurement(m.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

// ---------------------------------------------------------------------------
// Helper-Komponenten Builder
// ---------------------------------------------------------------------------

const Step = ({ number, title, hint, children }: { number: number; title: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <div className="flex items-baseline gap-2">
      <span className="size-5 rounded-full bg-primary/15 text-primary-glow text-[10px] font-bold grid place-items-center shrink-0">{number}</span>
      <h4 className="text-sm font-semibold">{title}</h4>
      {hint && <span className="text-[11px] text-muted-foreground">— {hint}</span>}
    </div>
    <div className="pl-7">{children}</div>
  </div>
);

const FilterField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

const RangeField = ({
  label, iconLabel, min, max, onChange,
}: { label: string; iconLabel: string; min?: number; max?: number; onChange: (min?: number, max?: number) => void }) => (
  <FilterField label={label}>
    <div className="flex items-center gap-1">
      <Input
        type="number" placeholder="min" value={min ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value), max)}
        className="h-9 w-20 text-xs"
      />
      <span className="text-[10px] text-muted-foreground">–</span>
      <Input
        type="number" placeholder="max" value={max ?? ""}
        onChange={(e) => onChange(min, e.target.value === "" ? undefined : Number(e.target.value))}
        className="h-9 w-20 text-xs"
      />
      <span className="text-[10px] text-muted-foreground ml-1">{iconLabel}</span>
    </div>
  </FilterField>
);

const DatePop = ({
  label, value, onChange, disabledBefore,
}: { label: string; value?: string; onChange: (s: string | undefined) => void; disabledBefore?: string }) => (
  <FilterField label={label}>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-9 w-[140px] justify-start text-xs", !value && "text-muted-foreground")}>
          <CalendarIcon className="size-3.5 mr-1" />
          {value ? format(new Date(value), "dd.MM.yyyy") : "Datum"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={(d) => onChange(d?.toISOString())}
          locale={de}
          disabled={(d) => !!disabledBefore && d < new Date(disabledBefore)}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  </FilterField>
);

const StationSelect = ({
  value, onChange, width, minIndex = 0, excludeLast = false,
}: {
  value: StationKey; onChange: (v: StationKey) => void; width: number; minIndex?: number; excludeLast?: boolean;
}) => {
  const filtered = STATIONS.filter((_s, i) => i >= minIndex && (!excludeLast || i < STATIONS.length - 1));
  const lifecycle = filtered.filter((s) => s.group === "lifecycle");
  const process = filtered.filter((s) => s.group === "process");

  return (
    <Select value={value} onValueChange={(v) => onChange(v as StationKey)}>
      <SelectTrigger className="h-9 text-xs" style={{ width }}><SelectValue /></SelectTrigger>
      <SelectContent>
        {lifecycle.length > 0 && (
          <>
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Bestand</div>
            {lifecycle.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </>
        )}
        {process.length > 0 && (
          <>
            <div className="px-2 py-1 mt-1 text-[10px] uppercase tracking-wider text-muted-foreground border-t border-border">Vorgangs-Schritte</div>
            {process.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </>
        )}
      </SelectContent>
    </Select>
  );
};

// ---------------------------------------------------------------------------
// Result Card
// ---------------------------------------------------------------------------

const MeasurementCard = ({
  measurement, processes, vehicles, purchasePlans, onRemove, onDuplicate,
}: {
  measurement: Measurement;
  processes: Process[]; vehicles: Vehicle[]; purchasePlans: PurchasePlan[];
  onRemove: () => void; onDuplicate: () => void;
}) => {
  const result = useMemo(() => computeInsight(vehicles, processes, purchasePlans, measurement), [vehicles, processes, purchasePlans, measurement]);
  const def = metricDef(measurement.metric);
  const Icon = def.icon;

  // Trend vs Vorperiode
  const prev = useMemo(() => {
    if (measurement.metric === "aging_days") return null;
    const r = resolveRange(measurement);
    const p = previousRange(r);
    const prevM: Measurement = { ...measurement, rangePreset: "custom", customFrom: p.from.toISOString(), customTo: p.to.toISOString() };
    return computeInsight(vehicles, processes, purchasePlans, prevM);
  }, [measurement, vehicles, processes, purchasePlans]);

  const delta = prev && prev.primary !== 0 ? ((result.primary - prev.primary) / Math.abs(prev.primary)) * 100 : null;

  const { from, to } = resolveRange(measurement);
  const rangeText = measurement.rangePreset === "all" ? "Gesamt"
    : measurement.rangePreset === "custom" ? `${format(from, "dd.MM.yy")} – ${format(to, "dd.MM.yy")}`
    : RANGE_LABELS[measurement.rangePreset];

  const filterChips: string[] = [];
  if (measurement.vehicleType && measurement.vehicleType !== "all") filterChips.push(VEHICLE_TYPE_LABELS[measurement.vehicleType]);
  if (measurement.make && measurement.make !== "all") filterChips.push(measurement.make);
  if (measurement.status && measurement.status !== "all") filterChips.push(VEHICLE_STATUS_LABELS[measurement.status]);
  if (measurement.fuel && measurement.fuel !== "all") filterChips.push(measurement.fuel);
  if (measurement.minPrice != null || measurement.maxPrice != null) filterChips.push(`${measurement.minPrice ?? "0"} – ${measurement.maxPrice ?? "∞"} €`);
  if (measurement.minKm != null || measurement.maxKm != null) filterChips.push(`${measurement.minKm ?? "0"} – ${measurement.maxKm ?? "∞"} km`);
  if (measurement.minYear != null || measurement.maxYear != null) filterChips.push(`BJ ${measurement.minYear ?? ""}–${measurement.maxYear ?? ""}`);

  // Trend-Bewertung: für Zeit-Metriken ist niedriger besser
  const lowerIsBetter = ["duration", "aging_days", "discount", "discount_percent", "costs"].includes(def.key);
  const trendPositive = delta != null && (lowerIsBetter ? delta < 0 : delta > 0);
  const trendColor = delta == null ? "text-muted-foreground" : trendPositive ? "text-success" : "text-destructive";

  // Top-3 Fahrzeuge
  const topRows = useMemo(() => {
    const dir = lowerIsBetter ? 1 : -1; // bei "lowerIsBetter" zeigen wir die schlimmsten 3 (zur Aktion)
    return [...result.rows].sort((a, b) => dir * (a.value - b.value)).slice(0, 3);
  }, [result.rows, lowerIsBetter]);

  // Breakdown bar max
  const breakdownMax = result.breakdown ? Math.max(...result.breakdown.map((b) => Math.abs(b.value))) : 0;

  const title = measurement.title || (def.needsTwoStations
    ? `${def.shortLabel}: ${stationLabel(measurement.fromStation)} → ${stationLabel(measurement.toStation)}`
    : def.key === "aging_days" ? "Standzeit aktiver Bestand"
    : `${def.shortLabel} · ${stationLabel(measurement.toStation)}`);

  return (
    <div className="rounded-xl border border-border bg-background/40 p-4 space-y-3 group relative hover:border-primary/30 transition-smooth">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon className={cn("size-3.5", def.color)} />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{def.shortLabel}</span>
          </div>
          <h4 className="text-sm font-display font-semibold leading-tight truncate">{title}</h4>
        </div>
        <div className="flex opacity-0 group-hover:opacity-100 transition-smooth">
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-primary-glow" onClick={onDuplicate} aria-label="Duplizieren">
            <Copy className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label="Entfernen">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[10px] gap-1 border-border">
          <CalendarIcon className="size-2.5" />{rangeText}
        </Badge>
        {filterChips.map((c) => (
          <Badge key={c} variant="outline" className="text-[10px] border-border">{c}</Badge>
        ))}
        {measurement.breakdown !== "none" && (
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary-glow gap-1">
            <BarChart3 className="size-2.5" /> nach {measurement.breakdown}
          </Badge>
        )}
      </div>

      {/* Hauptzahl + Trend */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-3xl font-display font-bold tracking-tight tabular-nums">
            {formatValue(result.primary, result.unit)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {result.count} {result.count === 1 ? "Fahrzeug" : "Fahrzeuge"} einbezogen
          </p>
        </div>
        {delta != null && Number.isFinite(delta) && (
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <div className={cn("flex items-center gap-1 text-xs font-semibold rounded-md px-2 py-1 bg-secondary/40", trendColor)}>
                {trendPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {delta > 0 ? "+" : ""}{delta.toFixed(1)} %
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              vs. Vorperiode: {prev ? formatValue(prev.primary, prev.unit) : "—"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Sekundäre Werte */}
      {(def.key === "duration" || def.key === "aging_days") && result.count > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Median" value={`${result.median!.toFixed(1)}`} />
          <Stat label="Min" value={`${result.min!.toFixed(1)}`} />
          <Stat label="Max" value={`${result.max!.toFixed(1)}`} />
        </div>
      )}
      {(def.key === "revenue" || def.key === "margin" || def.key === "costs" || def.key === "purchase_volume" || def.key === "discount") && result.count > 0 && (
        <div className="grid grid-cols-2 gap-2 text-center">
          <Stat label="Ø pro Fzg." value={formatCurrency(result.primary / Math.max(1, result.count))} />
          <Stat label="Max" value={formatCurrency(result.max ?? 0)} />
        </div>
      )}

      {/* Breakdown Bar-Chart */}
      {result.breakdown && result.breakdown.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Aufschlüsselung</p>
          <div className="space-y-1">
            {result.breakdown.slice(0, 6).map((b) => (
              <div key={b.key} className="space-y-0.5">
                <div className="flex justify-between text-[11px] gap-2">
                  <span className="truncate font-medium">{b.key}</span>
                  <span className="text-muted-foreground tabular-nums shrink-0">{formatValue(b.value, result.unit)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary/40 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary/80 to-primary-glow rounded-full"
                    style={{ width: `${breakdownMax > 0 ? (Math.abs(b.value) / breakdownMax) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
            {result.breakdown.length > 6 && (
              <p className="text-[10px] text-muted-foreground pt-0.5">+ {result.breakdown.length - 6} weitere</p>
            )}
          </div>
        </div>
      )}

      {/* Top-3 Liste */}
      {topRows.length > 0 && def.key !== "count_reached" && def.key !== "conversion" && (
        <div className="pt-2 border-t border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
            {lowerIsBetter ? "Hotspots (höchster Wert)" : "Top 3"}
          </p>
          <ul className="space-y-0.5">
            {[...topRows].reverse().map((r) => (
              <li key={r.vehicle.id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate text-foreground">{r.label}</span>
                <span className="text-muted-foreground tabular-nums shrink-0">{formatValue(r.value, result.unit)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.count === 0 && (
        <p className="text-xs text-muted-foreground italic pt-1">Keine Datensätze für diese Konfiguration. Filter weicher setzen oder Zeitraum erweitern.</p>
      )}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-secondary/40 px-2 py-1.5">
    <p className="text-[9px] uppercase tracking-wider text-muted-foreground leading-none">{label}</p>
    <p className="text-sm font-semibold leading-tight mt-0.5 tabular-nums">{value}</p>
  </div>
);
