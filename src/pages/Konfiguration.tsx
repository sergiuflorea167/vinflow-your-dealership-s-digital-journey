import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProcessStore } from "@/store/processStore";
import {
  DEFAULT_NUMBER_RANGES, DEFAULT_PROCESS_STEP_KEYS, PROCESS_STEPS, ProcessStepKey,
  NumberRangeConfig, NumberRangeKey, TodoProgressPeriod, formatDocumentNumber, normalizeNumberRanges, normalizeProcessStepKeys,
} from "@/data/process";
import { CheckCircle2, FileText, Gauge, Hash, RotateCcw, Settings as SettingsIcon, Workflow } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TODO_PROGRESS_PERIODS } from "@/lib/todoProgress";

const Konfiguration = () => {
  const settings = useProcessStore((s) => s.settings);
  const updateSettings = useProcessStore((s) => s.updateSettings);
  const selected = normalizeProcessStepKeys(settings.processStepKeys);
  const selectedSet = new Set<ProcessStepKey>(selected);
  const numberRanges = normalizeNumberRanges(settings.numberRanges);

  const updateNumberRange = (key: NumberRangeKey, patch: Partial<NumberRangeConfig>) => {
    updateSettings({
      numberRanges: {
        ...numberRanges,
        [key]: { ...numberRanges[key], ...patch },
      },
    });
  };

  const resetNumberRanges = () => {
    updateSettings({ numberRanges: normalizeNumberRanges(DEFAULT_NUMBER_RANGES) });
    toast.success("Nummernkreise wurden auf den Standard zurückgesetzt.");
  };

  const toggleStep = (key: ProcessStepKey) => {
    if (selectedSet.has(key)) {
      if (selected.length === 1) {
        toast.error("Mindestens ein Beleg muss aktiv bleiben.");
        return;
      }
      updateSettings({ processStepKeys: selected.filter((stepKey) => stepKey !== key) });
      toast.success("Beleg aus der Vorgangskette entfernt.");
      return;
    }
    updateSettings({
      processStepKeys: PROCESS_STEPS.map((step) => step.key).filter((stepKey) => (
        selectedSet.has(stepKey) || stepKey === key
      )),
    });
    toast.success("Beleg zur Vorgangskette hinzugefügt.");
  };

  const resetChain = () => {
    updateSettings({ processStepKeys: DEFAULT_PROCESS_STEP_KEYS });
    toast.success("Alle Belege sind wieder aktiv.");
  };

  return (
    <AppShell>
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3 shrink-0">
          <div className="size-9 rounded-xl bg-gradient-brand grid place-items-center shadow-glow">
            <SettingsIcon className="size-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Konfiguration</h1>
            <p className="text-xs text-muted-foreground">
              Systemeinstellungen nach Bereichen geordnet verwalten.
            </p>
          </div>
        </div>

        <Tabs defaultValue="process" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-3 p-1">
            <TabsTrigger value="process" className="gap-2 py-2.5">
              <Workflow className="size-4" />
              <span>Vorgangskette</span>
            </TabsTrigger>
            <TabsTrigger value="number-ranges" className="gap-2 py-2.5">
              <Hash className="size-4" />
              <span>Nummernkreise</span>
            </TabsTrigger>
            <TabsTrigger value="todo-focus" className="gap-2 py-2.5">
              <Gauge className="size-4" />
              <span>To-Do-Fokus</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="process" className="mt-4">
            <Card className="bg-card border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <div className="size-10 rounded-lg bg-primary/15 text-primary-glow grid place-items-center shrink-0">
                <Workflow className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold">Vorgangskette konfigurieren</h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                  Wähle, welche Belege im Verkaufsvorgang verwendet werden. Neue Vorgänge überspringen deaktivierte Belege automatisch.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={resetChain} className="gap-2">
              <RotateCcw className="size-4" /> Standard
            </Button>
          </div>

          <div className="grid gap-2 p-4">
            {PROCESS_STEPS.map((step) => {
              const active = selectedSet.has(step.key);
              const activeIndex = selected.findIndex((key) => key === step.key);
              return (
                <div
                  key={step.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleStep(step.key)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleStep(step.key);
                    }
                  }}
                  className={cn(
                    "cursor-pointer w-full text-left rounded-lg border p-3 transition-smooth",
                    "hover:border-primary/40 hover:bg-surface-elevated/40",
                    active ? "border-primary/35 bg-primary/5" : "border-border bg-background/30 opacity-75",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={active}
                      onCheckedChange={() => toggleStep(step.key)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`${step.documentName} aktivieren`}
                      className="mt-1"
                    />
                    <div className="size-8 rounded-lg bg-background/60 border border-border grid place-items-center shrink-0">
                      {active ? (
                        <CheckCircle2 className="size-4 text-success" />
                      ) : (
                        <FileText className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">{step.documentName}</p>
                        <Badge variant="outline" className={cn(
                          "text-[10px] px-1.5 py-0",
                          active ? "border-success/30 text-success" : "border-border text-muted-foreground",
                        )}>
                          {active ? `Aktiv ${activeIndex + 1}` : "Aus"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {step.label} · {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            </Card>
          </TabsContent>

          <TabsContent value="todo-focus" className="mt-4">
            <Card className="overflow-hidden border-border bg-card">
              <div className="flex items-start gap-3 border-b border-border p-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary-glow">
                  <Gauge className="size-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold">Persönlicher Erledigungsfokus</h2>
                  <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
                    Lege fest, welcher Zeitraum beim Öffnen der To-Dos standardmäßig für deinen Fortschritt verwendet wird. Auf der To-Do-Seite kannst du jederzeit spontan umschalten.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                {TODO_PROGRESS_PERIODS.map((option) => {
                  const active = (settings.todoProgressPeriod ?? "week") === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        updateSettings({ todoProgressPeriod: option.value as TodoProgressPeriod });
                        toast.success(`To-Do-Fokus: ${option.label}`);
                      }}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-smooth hover:border-primary/40 hover:bg-surface-elevated/40",
                        active ? "border-primary/40 bg-primary/5" : "border-border bg-background/30",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{option.label}</p>
                        {active && <CheckCircle2 className="size-4 text-success" />}
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="number-ranges" className="mt-4">
            <Card className="bg-card border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <div className="size-10 rounded-lg bg-primary/15 text-primary-glow grid place-items-center shrink-0">
                <Hash className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold">Nummernkreise</h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                  Lege das Format für neue Rechnungen, Anzahlungsrechnungen, Auftragsbestätigungen und Kaufverträge fest. Bereits vergebene Nummern bleiben unverändert.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={resetNumberRanges} className="gap-2">
              <RotateCcw className="size-4" /> Standard
            </Button>
          </div>

          <div className="grid gap-3 p-4">
            {([
              ["invoice", "Rechnungen", "Schlussrechnungen im Verkaufsvorgang"],
              ["downPayment", "Anzahlungsrechnungen", "Belege für erhaltene Anzahlungen"],
              ["orderConfirmation", "Auftragsbestätigungen", "AB-Nummern für bestätigte Aufträge"],
              ["purchaseContract", "Kaufverträge", "Vertragsnummern für Fahrzeugverkäufe"],
            ] as const).map(([key, title, description]) => {
              const config = numberRanges[key];
              return (
                <div key={key} className="rounded-lg border border-border bg-background/30 p-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-medium text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary-glow">
                      Vorschau: {formatDocumentNumber(config, config.startNumber)}
                    </Badge>
                  </div>

                  <div className="grid gap-3 mt-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label htmlFor={`${key}-prefix`} className="text-xs">Präfix</Label>
                      <Input
                        id={`${key}-prefix`}
                        value={config.prefix}
                        maxLength={12}
                        onChange={(event) => updateNumberRange(key, { prefix: event.target.value.toUpperCase() })}
                        className="bg-background/40 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`${key}-start`} className="text-xs">Startnummer</Label>
                      <Input
                        id={`${key}-start`}
                        type="number"
                        min={1}
                        value={config.startNumber}
                        onChange={(event) => updateNumberRange(key, { startNumber: Math.max(1, Number(event.target.value) || 1) })}
                        className="bg-background/40"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`${key}-digits`} className="text-xs">Stellen</Label>
                      <Input
                        id={`${key}-digits`}
                        type="number"
                        min={1}
                        max={8}
                        value={config.digits}
                        onChange={(event) => updateNumberRange(key, { digits: Math.min(8, Math.max(1, Number(event.target.value) || 1)) })}
                        className="bg-background/40"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="h-10 w-full rounded-md border border-border bg-background/40 px-3 flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={config.includeYear}
                          onCheckedChange={(checked) => updateNumberRange(key, { includeYear: checked === true })}
                          aria-label={`Jahr bei ${title} einfügen`}
                        />
                        <span className="text-sm">Jahr einfügen</span>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};

export default Konfiguration;
