import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProcessStore } from "@/store/processStore";
import { PROCESS_STEPS, formatCurrency, formatDate, stepIndex } from "@/data/process";
import { Search, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ProcessList = () => {
  const processes = useProcessStore((s) => s.processes);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = processes.filter((p) => {
    if (filter !== "all" && p.currentStep !== filter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      p.id.toLowerCase().includes(s) ||
      p.vehicle.vin.toLowerCase().includes(s) ||
      p.vehicle.make.toLowerCase().includes(s) ||
      p.vehicle.model.toLowerCase().includes(s) ||
      p.customer.name.toLowerCase().includes(s)
    );
  });

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">Vorgänge</h1>
          <p className="text-muted-foreground mt-1">Alle aktiven & abgeschlossenen Verkaufsvorgänge.</p>
        </div>

        <Card className="p-4 bg-card border-border">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="VIN, Vorgangs-Nr., Modell oder Kunde…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 bg-background/40"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
                Alle ({processes.length})
              </FilterPill>
              {PROCESS_STEPS.map((s) => {
                const c = processes.filter((p) => p.currentStep === s.key).length;
                if (c === 0) return null;
                return (
                  <FilterPill key={s.key} active={filter === s.key} onClick={() => setFilter(s.key)}>
                    {s.shortLabel} ({c})
                  </FilterPill>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Vorgang</th>
                  <th className="px-5 py-3 font-medium">Fahrzeug / VIN</th>
                  <th className="px-5 py-3 font-medium">Kunde</th>
                  <th className="px-5 py-3 font-medium">Aktueller Schritt</th>
                  <th className="px-5 py-3 font-medium text-right">Preis</th>
                  <th className="px-5 py-3 font-medium">Aktualisiert</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const idx = stepIndex(p.currentStep);
                  const step = PROCESS_STEPS[idx];
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-surface-elevated/40 transition-smooth group">
                      <td className="px-5 py-4">
                        <Link to={`/vorgaenge/${p.id}`} className="font-display font-semibold text-foreground hover:text-primary-glow">
                          {p.id}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">{p.vehicle.make} {p.vehicle.model}</p>
                        <p className="font-mono text-xs text-muted-foreground">{p.vehicle.vin}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-foreground">{p.customer.name}</p>
                        <p className="text-xs text-muted-foreground">{p.customer.city}</p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className="border-primary/30 text-primary-glow">
                          {idx + 1}. {step.shortLabel}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-foreground">{formatCurrency(p.vehicle.price)}</td>
                      <td className="px-5 py-4 text-muted-foreground text-xs">{formatDate(p.updatedAt)}</td>
                      <td className="px-5 py-4">
                        <Link to={`/vorgaenge/${p.id}`}>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-smooth">
                            <ChevronRight className="size-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground text-sm">
                      Keine Vorgänge gefunden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
};

const FilterPill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-smooth border",
      active
        ? "bg-primary text-primary-foreground border-primary shadow-glow"
        : "bg-background/40 text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
    )}
  >
    {children}
  </button>
);

export default ProcessList;
