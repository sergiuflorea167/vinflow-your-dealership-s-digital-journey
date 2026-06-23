import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useProcessStore } from "@/store/processStore";
import {
  DEFAULT_PROCESS_STEP_KEYS, PROCESS_STEPS, ProcessStepKey, normalizeProcessStepKeys,
} from "@/data/process";
import { CheckCircle2, FileText, RotateCcw, Settings as SettingsIcon, Workflow } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Konfiguration = () => {
  const settings = useProcessStore((s) => s.settings);
  const updateSettings = useProcessStore((s) => s.updateSettings);
  const selected = normalizeProcessStepKeys(settings.processStepKeys);
  const selectedSet = new Set<ProcessStepKey>(selected);

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
              Systemeinstellungen — Belege der Vorgangskette aktivieren oder deaktivieren.
            </p>
          </div>
        </div>

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
      </div>
    </AppShell>
  );
};

export default Konfiguration;
