import { type CSSProperties, type PointerEvent as ReactPointerEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProcessStore } from "@/store/processStore";
import {
  DEFAULT_NUMBER_RANGES, DEFAULT_PROCESS_STEP_KEYS, PROCESS_STEPS, ProcessStepKey,
  NumberRangeConfig, NumberRangeKey, TodoProgressPeriod, formatDocumentNumber, normalizeNumberRanges, normalizeProcessStepKeys,
  DEFAULT_PDF_LAYOUT, PdfAccentColor, PdfDocumentLayoutGroupKey, PdfLayoutBlockKey, PdfLogoPosition, PdfTableLayoutConfig, normalizePdfLayout,
} from "@/data/process";
import { CheckCircle2, FileText, Gauge, Hash, LayoutTemplate, Maximize2, Palette, RotateCcw, Settings as SettingsIcon, Workflow } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TODO_PROGRESS_PERIODS } from "@/lib/todoProgress";

const PDF_ACCENTS: Array<{ key: PdfAccentColor; label: string; className: string; rgb: string }> = [
  { key: "blue", label: "Blau", className: "bg-[#00467d]", rgb: "rgb(0,70,125)" },
  { key: "graphite", label: "Graphit", className: "bg-slate-700", rgb: "rgb(55,65,81)" },
  { key: "gold", label: "Gold", className: "bg-[#a88432]", rgb: "rgb(168,132,50)" },
  { key: "red", label: "Rot", className: "bg-[#c0202c]", rgb: "rgb(192,32,44)" },
  { key: "green", label: "Grün", className: "bg-[#2d6a4f]", rgb: "rgb(45,106,79)" },
];

const LOGO_POSITIONS: Array<{ key: PdfLogoPosition; label: string }> = [
  { key: "right", label: "Rechts" },
  { key: "left", label: "Links" },
  { key: "hidden", label: "Aus" },
];

const FOOTER_STYLES: Array<{ key: ReturnType<typeof normalizePdfLayout>["footer"]["style"]; label: string }> = [
  { key: "columns", label: "Spalten" },
  { key: "compact", label: "Kompakt" },
  { key: "minimal", label: "Minimal" },
];

const LAYOUT_BLOCKS: Array<{ key: PdfLayoutBlockKey; label: string; hint: string; x: boolean }> = [
  { key: "logo", label: "Logo", hint: "Position des Logo-Felds", x: true },
  { key: "sender", label: "Kopftext", hint: "Firma und Absenderzeile", x: true },
  { key: "address", label: "Empfänger", hint: "Adressfenster links", x: true },
  { key: "meta", label: "Infoblock", hint: "Belegdaten rechts", x: true },
  { key: "title", label: "Titel", hint: "Belegüberschrift", x: true },
  { key: "vehicle", label: "Fahrzeug", hint: "Fahrzeugdaten unter dem Titel", x: true },
  { key: "content", label: "Inhaltstart", hint: "Startpunkt für Text und Tabellen", x: false },
];

const LAYOUT_PRESETS: Array<{ label: string; patch: Partial<ReturnType<typeof normalizePdfLayout>> }> = [
  { label: "Standard", patch: DEFAULT_PDF_LAYOUT },
  { label: "Kompakt", patch: { marginMm: 15, blockOffsets: { ...DEFAULT_PDF_LAYOUT.blockOffsets, title: { x: 0, y: -4 }, vehicle: { x: 0, y: -5 }, content: { x: 0, y: -8 } } } },
  { label: "Luftig", patch: { marginMm: 21, blockOffsets: { ...DEFAULT_PDF_LAYOUT.blockOffsets, address: { x: 0, y: 5 }, title: { x: 0, y: 8 }, vehicle: { x: 0, y: 8 }, content: { x: 0, y: 12 } } } },
];

const TABLE_COLUMNS: Array<{ key: keyof PdfTableLayoutConfig["columnWidthsMm"]; label: string }> = [
  { key: "pos", label: "Pos." },
  { key: "description", label: "Bezeichnung" },
  { key: "qty", label: "Menge" },
  { key: "unit", label: "Einh." },
  { key: "unitPrice", label: "E-Preis" },
  { key: "total", label: "G-Preis" },
];

const TABLE_ROWS: Array<{ key: keyof PdfTableLayoutConfig["rowHeightsMm"]; label: string }> = [
  { key: "header", label: "Kopf" },
  { key: "item", label: "Position" },
  { key: "total", label: "Summe" },
];

type LayoutCategory = "basis" | "kopf" | "inhalt" | "tabelle" | "fuss" | "positionen";

const LAYOUT_CATEGORIES: Array<{ key: LayoutCategory; label: string }> = [
  { key: "basis", label: "Basis" },
  { key: "kopf", label: "Kopfbereich" },
  { key: "inhalt", label: "Inhalt" },
  { key: "tabelle", label: "Tabelle" },
  { key: "fuss", label: "Fußzeile" },
  { key: "positionen", label: "Positionen" },
];

const DOCUMENT_LAYOUT_GROUPS: Array<{ key: PdfDocumentLayoutGroupKey; label: string; hint: string }> = [
  { key: "sales", label: "Angebot / Anzahlung / AB / Rechnung", hint: "Gemeinsame Struktur für Verkaufsbelege mit Tabelle." },
  { key: "control", label: "Kontrolle", hint: "Ausgangskontrolle mit Checkliste und internen Punkten." },
  { key: "contract", label: "Vertrag", hint: "Kaufvertrag mit Vertragsklauseln und Unterschriften." },
  { key: "delivery", label: "Lieferung", hint: "Übergabeprotokoll mit Übergabedaten und Signatur." },
];

const CONTENT_TOGGLES: Array<{ key: keyof ReturnType<typeof normalizePdfLayout>["documentContents"]["sales"]; label: string; groups: PdfDocumentLayoutGroupKey[] }> = [
  { key: "showVehicleCard", label: "Fahrzeugblock", groups: ["sales", "control", "contract", "delivery"] },
  { key: "showIntroText", label: "Einleitungstext", groups: ["sales", "control", "contract", "delivery"] },
  { key: "showMainTable", label: "Haupttabelle", groups: ["sales", "contract"] },
  { key: "showPaymentInfo", label: "Zahlungsdetails", groups: ["sales", "contract"] },
  { key: "showTodos", label: "Vereinbarungen / To-Dos", groups: ["sales", "control", "contract"] },
  { key: "showChecklist", label: "Checkliste", groups: ["control"] },
  { key: "showContractClauses", label: "Vertragsklauseln", groups: ["contract"] },
  { key: "showDeliveryDetails", label: "Übergabedaten", groups: ["sales", "contract", "delivery"] },
  { key: "showSignatures", label: "Unterschriften", groups: ["contract", "delivery"] },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const Konfiguration = () => {
  const [selectedLayoutBlock, setSelectedLayoutBlock] = useState<PdfLayoutBlockKey>("logo");
  const [layoutPageMode, setLayoutPageMode] = useState<"first" | "following">("first");
  const [layoutCategory, setLayoutCategory] = useState<LayoutCategory>("basis");
  const [selectedDocumentGroup, setSelectedDocumentGroup] = useState<PdfDocumentLayoutGroupKey>("sales");
  const settings = useProcessStore((s) => s.settings);
  const updateSettings = useProcessStore((s) => s.updateSettings);
  const selected = normalizeProcessStepKeys(settings.processStepKeys);
  const selectedSet = new Set<ProcessStepKey>(selected);
  const numberRanges = normalizeNumberRanges(settings.numberRanges);
  const [draftPdfLayout, setDraftPdfLayout] = useState(() => normalizePdfLayout(settings.pdfLayout));
  const [layoutDirty, setLayoutDirty] = useState(false);
  const pdfLayout = draftPdfLayout;
  const accent = PDF_ACCENTS.find((item) => item.key === pdfLayout.accentColor) ?? PDF_ACCENTS[0];
  const selectedBlock = LAYOUT_BLOCKS.find((block) => block.key === selectedLayoutBlock) ?? LAYOUT_BLOCKS[0];
  const selectedOffset = pdfLayout.blockOffsets[selectedBlock.key];
  const selectedDocumentGroupMeta = DOCUMENT_LAYOUT_GROUPS.find((group) => group.key === selectedDocumentGroup) ?? DOCUMENT_LAYOUT_GROUPS[0];
  const selectedDocumentContent = pdfLayout.documentContents[selectedDocumentGroup];

  useEffect(() => {
    if (!layoutDirty) setDraftPdfLayout(normalizePdfLayout(settings.pdfLayout));
  }, [settings.pdfLayout, layoutDirty]);
  const previewFocus = (page: "first" | "following") => {
    if (layoutCategory === "basis") {
      return { label: "Basis · beide Seiten", style: { inset: `${pdfLayout.marginMm / 2}px` } };
    }
    if (layoutCategory === "kopf") {
      return { label: "Kopfbereich · beide Seiten", style: { left: "26px", right: "26px", top: "16px", height: "58px" } };
    }
    if (layoutCategory === "inhalt") {
      return page === "first"
        ? { label: `${selectedDocumentGroupMeta.label} · Inhalt`, style: { left: "28px", right: "28px", top: "154px", height: "230px" } }
        : { label: `${selectedDocumentGroupMeta.label} · Inhalt`, style: { left: "28px", right: "28px", top: `${Math.max(80, pdfLayout.followingPage.contentStartMm * 1.55 - 10)}px`, height: "210px" } };
    }
    if (layoutCategory === "tabelle") {
      return page === "first"
        ? { label: "Tabelle · beide Seiten", style: { left: "32px", right: "32px", top: "255px", height: "96px" } }
        : { label: "Tabelle · beide Seiten", style: { left: "32px", right: "32px", top: `${pdfLayout.followingPage.contentStartMm * 1.55}px`, height: "170px" } };
    }
    if (layoutCategory === "fuss") {
      return { label: "Fußzeile · beide Seiten", style: { left: "30px", right: "30px", bottom: "18px", height: "58px" } };
    }
    if (layoutCategory === "positionen") {
      if (page === "following") {
        if (layoutPageMode !== "following") return null;
        return { label: "Positionen · Folgeseite", style: { left: "28px", right: "28px", top: "18px", height: "220px" } };
      }
      if (layoutPageMode !== "first") return null;
      const firstPageStyles: Record<PdfLayoutBlockKey, CSSProperties> = {
        logo: { left: pdfLayout.logoPosition === "right" ? "250px" : "24px", top: "16px", width: "120px", height: "52px" },
        sender: { left: "28px", right: "28px", top: "16px", height: "48px" },
        address: { left: "28px", top: "92px", width: "210px", height: "62px" },
        meta: { right: "28px", top: "92px", width: "125px", height: "62px" },
        title: { left: "28px", top: "154px", width: "160px", height: "32px" },
        vehicle: { left: "28px", right: "28px", top: "178px", height: "68px" },
        content: { left: "28px", right: "28px", top: "248px", height: "132px" },
      };
      return { label: `${selectedBlock.label} · erste Seite`, style: firstPageStyles[selectedBlock.key] };
    }
    return null;
  };

  const renderPreviewFocus = (page: "first" | "following") => {
    const focus = previewFocus(page);
    if (!focus) return null;
    return (
      <div
        className="pointer-events-none absolute z-30 rounded-md border-2 border-primary/80 bg-primary/10 shadow-[0_0_0_999px_rgba(15,23,42,0.06)]"
        style={focus.style}
      >
        <span className="absolute -top-5 left-0 rounded bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground shadow-sm">
          {focus.label}
        </span>
      </div>
    );
  };

  const updatePdfLayout = (patch: Partial<typeof pdfLayout>) => {
    setDraftPdfLayout((current) => normalizePdfLayout({ ...current, ...patch }));
    setLayoutDirty(true);
  };

  const updateFooterLayout = (patch: Partial<typeof pdfLayout.footer>) => {
    updatePdfLayout({ footer: { ...pdfLayout.footer, ...patch } });
  };

  const updateFollowingPageLayout = (patch: Partial<typeof pdfLayout.followingPage>) => {
    updatePdfLayout({ followingPage: { ...pdfLayout.followingPage, ...patch } });
  };

  const updateLogoSize = (patch: Partial<typeof pdfLayout.logoSize>) => {
    updatePdfLayout({ logoSize: { ...pdfLayout.logoSize, ...patch } });
  };

  const updateTableColumns = (patch: Partial<typeof pdfLayout.table.columnWidthsMm>) => {
    updatePdfLayout({
      table: {
        ...pdfLayout.table,
        columnWidthsMm: { ...pdfLayout.table.columnWidthsMm, ...patch },
      },
    });
  };

  const updateTableRows = (patch: Partial<typeof pdfLayout.table.rowHeightsMm>) => {
    updatePdfLayout({
      table: {
        ...pdfLayout.table,
        rowHeightsMm: { ...pdfLayout.table.rowHeightsMm, ...patch },
      },
    });
  };

  const resetTableLayout = () => {
    updatePdfLayout({ table: DEFAULT_PDF_LAYOUT.table });
    toast.success("Tabellenstruktur wurde zurückgesetzt.");
  };

  const startColumnResize = (event: ReactPointerEvent<HTMLButtonElement>, key: keyof typeof pdfLayout.table.columnWidthsMm) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = pdfLayout.table.columnWidthsMm[key];
    const onMove = (moveEvent: PointerEvent) => {
      updateTableColumns({ [key]: Math.round(clamp(startWidth + (moveEvent.clientX - startX) / 2.2, 7, 120)) });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const startRowResize = (event: ReactPointerEvent<HTMLButtonElement>, key: keyof typeof pdfLayout.table.rowHeightsMm) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = pdfLayout.table.rowHeightsMm[key];
    const onMove = (moveEvent: PointerEvent) => {
      updateTableRows({ [key]: Math.round(clamp(startHeight + (moveEvent.clientY - startY) / 2, 5, 18)) });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const updateLayoutBlock = (key: PdfLayoutBlockKey, patch: Partial<{ x: number; y: number }>) => {
    updatePdfLayout({
      blockOffsets: {
        ...pdfLayout.blockOffsets,
        [key]: {
          ...pdfLayout.blockOffsets[key],
          ...patch,
        },
      },
    });
  };

  const resetPdfLayout = () => {
    setDraftPdfLayout(normalizePdfLayout(DEFAULT_PDF_LAYOUT));
    setLayoutDirty(true);
    toast.success("Layout-Entwurf wurde auf den Standard gesetzt.");
  };

  const updateDocumentContent = (patch: Partial<typeof selectedDocumentContent>) => {
    updatePdfLayout({
      documentContents: {
        ...pdfLayout.documentContents,
        [selectedDocumentGroup]: {
          ...selectedDocumentContent,
          ...patch,
        },
      },
    });
  };

  const savePdfLayout = () => {
    updateSettings({ pdfLayout: normalizePdfLayout(pdfLayout) });
    setLayoutDirty(false);
    toast.success("Layout wurde gespeichert.");
  };

  const resetSelectedBlock = () => {
    updateLayoutBlock(selectedBlock.key, DEFAULT_PDF_LAYOUT.blockOffsets[selectedBlock.key]);
    toast.success(`${selectedBlock.label} wurde zurückgesetzt.`);
  };

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
        <div className="flex items-center gap-3 shrink-0" data-tour="cfg-header">
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
          <TabsList className="flex h-auto w-full justify-start overflow-x-auto sm:grid sm:grid-cols-4 p-1" data-tour="cfg-tabs">
            <TabsTrigger value="process" className="shrink-0 gap-2 py-2.5">
              <Workflow className="size-4" />
              <span>Vorgangskette</span>
            </TabsTrigger>
            <TabsTrigger value="number-ranges" className="shrink-0 gap-2 py-2.5">
              <Hash className="size-4" />
              <span>Nummernkreise</span>
            </TabsTrigger>
            <TabsTrigger value="todo-focus" className="shrink-0 gap-2 py-2.5">
              <Gauge className="size-4" />
              <span>To-Do-Fokus</span>
            </TabsTrigger>
            <TabsTrigger value="layout" className="shrink-0 gap-2 py-2.5">
              <LayoutTemplate className="size-4" />
              <span>Layoutdesigner</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="process" className="mt-4">
            <Card className="bg-card border-border overflow-hidden" data-tour="cfg-process">
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
            <Card className="overflow-visible border-border bg-card">
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

          <TabsContent value="layout" className="mt-4">
            <Card className="overflow-hidden border-border bg-card">
              <div className="flex items-start justify-between gap-4 border-b border-border p-4 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary-glow">
                    <LayoutTemplate className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold">Einfacher Layoutdesigner</h2>
                    <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
                      Passe die Grundoptik deiner Belege an. Neue PDFs nutzen diese Einstellungen automatisch.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {layoutDirty && (
                    <Badge variant="outline" className="border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      Ungespeichert
                    </Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={resetPdfLayout} className="gap-2">
                    <RotateCcw className="size-4" /> Standard
                  </Button>
                  <Button size="sm" onClick={savePdfLayout} disabled={!layoutDirty} className="gap-2">
                    <CheckCircle2 className="size-4" /> Speichern
                  </Button>
                </div>
              </div>

              <div className="grid gap-0 lg:h-[calc(100vh-12rem)] lg:min-h-[620px] lg:grid-cols-[360px_minmax(0,1fr)]">
                <div className="space-y-4 border-b border-border p-4 lg:h-full lg:overflow-y-auto lg:border-b-0 lg:border-r lg:pr-3">
                  <div className="space-y-2 rounded-lg border border-border bg-background/30 p-3">
                    <Label className="text-xs">Belegart</Label>
                    <div className="grid gap-2">
                      {DOCUMENT_LAYOUT_GROUPS.map((group) => (
                        <button
                          key={group.key}
                          type="button"
                          onClick={() => setSelectedDocumentGroup(group.key)}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-left text-xs transition-smooth",
                            selectedDocumentGroup === group.key
                              ? "border-primary/50 bg-primary/10 text-primary"
                              : "border-border bg-card hover:border-primary/40",
                          )}
                        >
                          <span className="block font-medium">{group.label}</span>
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">{group.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {LAYOUT_CATEGORIES.map((category) => (
                      <button
                        key={category.key}
                        type="button"
                        onClick={() => setLayoutCategory(category.key)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm transition-smooth",
                          layoutCategory === category.key
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "border-border bg-background/40 text-foreground hover:border-primary/40",
                        )}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>

                  <div className={cn("space-y-2 rounded-lg border border-border bg-background/30 p-3", layoutCategory !== "basis" && "hidden")}>
                    <Label className="text-xs">Seitentyp</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ["first", "Erste Seite"],
                        ["following", "Folgeseiten"],
                      ] as const).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setLayoutPageMode(key)}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-sm transition-smooth",
                            layoutPageMode === key
                              ? "border-primary/50 bg-primary/10 text-primary"
                              : "border-border bg-card hover:border-primary/40",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {layoutPageMode === "first"
                        ? "Mit Anschrift, Infoblock und Fahrzeugdaten."
                        : "Für Seiten nach dem Umbruch ohne Anschrift."}
                    </p>
                  </div>

                  <div className={cn("space-y-2", layoutCategory !== "kopf" && "hidden")}>
                    <Label className="text-xs">Logo</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {LOGO_POSITIONS.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => updatePdfLayout({ logoPosition: option.key })}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-sm transition-smooth",
                            pdfLayout.logoPosition === option.key
                              ? "border-primary/50 bg-primary/10 text-primary"
                              : "border-border bg-background/40 text-foreground hover:border-primary/40",
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {pdfLayout.logoPosition !== "hidden" && (
                    <div className={cn("space-y-3 rounded-lg border border-border bg-background/30 p-3", layoutCategory !== "kopf" && "hidden")}>
                      <div>
                        <Label className="flex items-center gap-1.5 text-xs">
                          <Maximize2 className="size-3" /> Logo-GrÃ¶ÃŸe
                        </Label>
                        <p className="mt-1 text-[11px] text-muted-foreground">Breite und HÃ¶he lassen sich unabhÃ¤ngig einstellen.</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <Label className="text-xs">Breite</Label>
                          <Badge variant="outline" className="font-mono text-[10px]">{pdfLayout.logoSize.widthMm} mm</Badge>
                        </div>
                        <Slider
                          min={18}
                          max={110}
                          step={1}
                          value={[pdfLayout.logoSize.widthMm]}
                          onValueChange={([value]) => updateLogoSize({ widthMm: value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <Label className="text-xs">HÃ¶he</Label>
                          <Badge variant="outline" className="font-mono text-[10px]">{pdfLayout.logoSize.heightMm} mm</Badge>
                        </div>
                        <Slider
                          min={8}
                          max={45}
                          step={1}
                          value={[pdfLayout.logoSize.heightMm]}
                          onValueChange={([value]) => updateLogoSize({ heightMm: value })}
                        />
                      </div>
                    </div>
                  )}

                  <div className={cn("space-y-3 rounded-lg border border-border bg-background/30 p-3", layoutCategory !== "kopf" && "hidden")}>
                    <div>
                      <Label className="text-xs">Kopftext</Label>
                      <p className="mt-1 text-[11px] text-muted-foreground">Firma und Absenderzeile separat vom Logo ausrichten.</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-xs">Horizontal</Label>
                        <Badge variant="outline" className="font-mono text-[10px]">{pdfLayout.blockOffsets.sender.x} mm</Badge>
                      </div>
                      <Slider
                        min={-40}
                        max={40}
                        step={1}
                        value={[pdfLayout.blockOffsets.sender.x]}
                        onValueChange={([value]) => updateLayoutBlock("sender", { x: value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-xs">Vertikal</Label>
                        <Badge variant="outline" className="font-mono text-[10px]">{pdfLayout.blockOffsets.sender.y} mm</Badge>
                      </div>
                      <Slider
                        min={-40}
                        max={40}
                        step={1}
                        value={[pdfLayout.blockOffsets.sender.y]}
                        onValueChange={([value]) => updateLayoutBlock("sender", { y: value })}
                      />
                    </div>
                  </div>

                  <div className={cn("space-y-2", layoutCategory !== "basis" && "hidden")}>
                    <Label className="flex items-center gap-1.5 text-xs">
                      <Palette className="size-3" /> Akzentfarbe
                    </Label>
                    <div className="grid grid-cols-5 gap-2">
                      {PDF_ACCENTS.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => updatePdfLayout({ accentColor: item.key })}
                          aria-label={item.label}
                          className={cn(
                            "grid h-10 place-items-center rounded-lg border transition-smooth",
                            pdfLayout.accentColor === item.key ? "border-primary ring-2 ring-primary/25" : "border-border",
                          )}
                        >
                          <span className={cn("size-5 rounded-full", item.className)} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={cn("space-y-2", layoutCategory !== "basis" && "hidden")}>
                    <Label className="text-xs">Schnelllayout</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {LAYOUT_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => updatePdfLayout(preset.patch)}
                          className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm transition-smooth hover:border-primary/40 hover:bg-surface-elevated/40"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={cn("space-y-2", layoutCategory !== "basis" && "hidden")}>
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-xs">Seitenrand</Label>
                      <Badge variant="outline" className="font-mono text-[10px]">{pdfLayout.marginMm} mm</Badge>
                    </div>
                    <Slider
                      min={12}
                      max={24}
                      step={1}
                      value={[pdfLayout.marginMm]}
                      onValueChange={([value]) => updatePdfLayout({ marginMm: value })}
                    />
                  </div>

                  <div className={cn("space-y-2", layoutCategory !== "basis" && "hidden")}>
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-xs">Schriftgröße</Label>
                      <Badge variant="outline" className="font-mono text-[10px]">{Math.round(pdfLayout.fontScale * 100)}%</Badge>
                    </div>
                    <Slider
                      min={90}
                      max={112}
                      step={1}
                      value={[Math.round(pdfLayout.fontScale * 100)]}
                      onValueChange={([value]) => updatePdfLayout({ fontScale: value / 100 })}
                    />
                  </div>

                  <div className={cn("space-y-3 rounded-lg border border-border bg-background/30 p-3", layoutCategory !== "inhalt" && "hidden")}>
                    <div>
                      <Label className="text-xs">Beleginhalt</Label>
                      <p className="mt-1 text-[11px] text-muted-foreground">{selectedDocumentGroupMeta.label}</p>
                    </div>

                    <div className="grid gap-2">
                      {CONTENT_TOGGLES.filter((item) => item.groups.includes(selectedDocumentGroup)).map((item) => (
                        <label key={item.key} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
                          <span className="text-xs">{item.label}</span>
                          <Switch
                            checked={Boolean(selectedDocumentContent[item.key])}
                            onCheckedChange={(checked) => updateDocumentContent({ [item.key]: checked })}
                            aria-label={item.label}
                          />
                        </label>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-xs">Inhalt verschieben</Label>
                        <Badge variant="outline" className="font-mono text-[10px]">{selectedDocumentContent.contentOffsetMm} mm</Badge>
                      </div>
                      <Slider
                        min={-24}
                        max={40}
                        step={1}
                        value={[selectedDocumentContent.contentOffsetMm]}
                        onValueChange={([value]) => updateDocumentContent({ contentOffsetMm: value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-xs">Abschnittsabstand</Label>
                        <Badge variant="outline" className="font-mono text-[10px]">{selectedDocumentContent.sectionGapMm} mm</Badge>
                      </div>
                      <Slider
                        min={2}
                        max={16}
                        step={1}
                        value={[selectedDocumentContent.sectionGapMm]}
                        onValueChange={([value]) => updateDocumentContent({ sectionGapMm: value })}
                      />
                    </div>
                  </div>

                  <div className={cn("space-y-3 rounded-lg border border-border bg-background/30 p-3", layoutCategory !== "tabelle" && "hidden")}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Label className="text-xs">Tabellenstruktur</Label>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {TABLE_ROWS.map((row) => (
                            <Badge key={row.key} variant="outline" className="font-mono text-[10px]">
                              {row.label} {pdfLayout.table.rowHeightsMm[row.key]} mm
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={resetTableLayout} className="h-8 px-2 text-xs">
                        Reset
                      </Button>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-border bg-card">
                      <div
                        className="grid text-[10px] font-medium text-foreground"
                        style={{
                          gridTemplateColumns: TABLE_COLUMNS.map((col) => `${pdfLayout.table.columnWidthsMm[col.key]}fr`).join(" "),
                        }}
                      >
                        {TABLE_COLUMNS.map((col) => (
                          <div
                            key={col.key}
                            className="relative flex min-w-0 items-center border-r border-border/80 bg-muted/50 px-1.5 last:border-r-0"
                            style={{ height: `${pdfLayout.table.rowHeightsMm.header * 4}px` }}
                          >
                            <span className="truncate">{col.label}</span>
                            <button
                              type="button"
                              onPointerDown={(event) => startColumnResize(event, col.key)}
                              aria-label={`${col.label} Breite ändern`}
                              className="absolute -right-1 top-0 z-10 h-full w-2 cursor-col-resize rounded-sm bg-primary/0 transition-colors hover:bg-primary/35"
                            />
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onPointerDown={(event) => startRowResize(event, "header")}
                        aria-label="Tabellenkopf Höhe ändern"
                        className="block h-2 w-full cursor-row-resize bg-primary/10 transition-colors hover:bg-primary/35"
                      />

                      {[0, 1, 2].map((rowIndex) => (
                        <div
                          key={rowIndex}
                          className="relative grid border-t border-border/80 text-[10px]"
                          style={{
                            gridTemplateColumns: TABLE_COLUMNS.map((col) => `${pdfLayout.table.columnWidthsMm[col.key]}fr`).join(" "),
                            height: `${pdfLayout.table.rowHeightsMm.item * 4}px`,
                          }}
                        >
                          {TABLE_COLUMNS.map((col, colIndex) => (
                            <div key={col.key} className="min-w-0 border-r border-border/60 px-1.5 py-1 last:border-r-0">
                              <div className={cn(
                                "h-1.5 rounded-sm bg-muted-foreground/30",
                                colIndex === 1 ? "w-full" : "ml-auto w-2/3",
                              )} />
                            </div>
                          ))}
                          {rowIndex === 2 && (
                            <button
                              type="button"
                              onPointerDown={(event) => startRowResize(event, "item")}
                              aria-label="Positionszeilen Höhe ändern"
                              className="absolute -bottom-1 left-0 z-10 h-2 w-full cursor-row-resize rounded-sm bg-primary/0 transition-colors hover:bg-primary/35"
                            />
                          )}
                        </div>
                      ))}

                      <div
                        className="relative grid border-t border-border/80 bg-muted/30 text-[10px] font-semibold"
                        style={{
                          gridTemplateColumns: TABLE_COLUMNS.map((col) => `${pdfLayout.table.columnWidthsMm[col.key]}fr`).join(" "),
                          height: `${pdfLayout.table.rowHeightsMm.total * 4}px`,
                        }}
                      >
                        {TABLE_COLUMNS.map((col, index) => (
                          <div key={col.key} className="min-w-0 border-r border-border/60 px-1.5 py-1 last:border-r-0">
                            {index >= 4 && <div className="ml-auto h-1.5 w-3/4 rounded-sm bg-foreground/45" />}
                          </div>
                        ))}
                        <button
                          type="button"
                          onPointerDown={(event) => startRowResize(event, "total")}
                          aria-label="Summenzeile Höhe ändern"
                          className="absolute -bottom-1 left-0 z-10 h-2 w-full cursor-row-resize rounded-sm bg-primary/0 transition-colors hover:bg-primary/35"
                        />
                      </div>

                    </div>

                    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-xs">Tabellenkopf</Label>
                        <Badge variant="outline" className="font-mono text-[10px]">{pdfLayout.table.rowHeightsMm.header} mm</Badge>
                      </div>
                      <Slider
                        min={5}
                        max={13}
                        step={1}
                        value={[pdfLayout.table.rowHeightsMm.header]}
                        onValueChange={([value]) => updateTableRows({ header: value })}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {TABLE_COLUMNS.map((col) => (
                        <Badge key={col.key} variant="outline" className="justify-center font-mono text-[10px]">
                          {col.label} {pdfLayout.table.columnWidthsMm[col.key]} mm
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className={cn("grid gap-3", layoutCategory !== "basis" && "hidden")}>
                    <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 p-3">
                      <span className="text-sm">Infoblock rechts anzeigen</span>
                      <Switch
                        checked={pdfLayout.showMetaBlock}
                        onCheckedChange={(checked) => updatePdfLayout({ showMetaBlock: checked })}
                        aria-label="Infoblock rechts anzeigen"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 p-3">
                      <span className="text-sm">Footer anzeigen</span>
                      <Switch
                        checked={pdfLayout.showFooter}
                        onCheckedChange={(checked) => updatePdfLayout({ showFooter: checked })}
                        aria-label="Footer anzeigen"
                      />
                    </label>
                  </div>

                  <label className={cn("flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 p-3", layoutCategory !== "fuss" && "hidden")}>
                    <span className="text-sm">Fußzeile anzeigen</span>
                    <Switch
                      checked={pdfLayout.showFooter}
                      onCheckedChange={(checked) => updatePdfLayout({ showFooter: checked })}
                      aria-label="Fußzeile anzeigen"
                    />
                  </label>

                  {pdfLayout.showFooter && (
                    <div className={cn("space-y-3 rounded-lg border border-border bg-background/30 p-3", layoutCategory !== "fuss" && "hidden")}>
                      <div>
                        <Label className="text-xs">Fußzeile</Label>
                        <p className="mt-1 text-[11px] text-muted-foreground">Stil, Inhalte und Position der Fußzeile.</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {FOOTER_STYLES.map((style) => (
                          <button
                            key={style.key}
                            type="button"
                            onClick={() => updateFooterLayout({ style: style.key })}
                            className={cn(
                              "rounded-lg border px-2 py-2 text-sm transition-smooth",
                              pdfLayout.footer.style === style.key
                                ? "border-primary/50 bg-primary/10 text-primary"
                                : "border-border bg-card hover:border-primary/40",
                            )}
                          >
                            {style.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        {([
                          ["showBank", "Bank"],
                          ["showCompany", "Unternehmen"],
                          ["showTax", "Steuer"],
                          ["showContact", "Kontakt"],
                          ["showLine", "Trennlinie"],
                          ["showPageNumber", "Seitenzahl"],
                        ] as const).map(([key, label]) => (
                          <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
                            <span className="text-xs">{label}</span>
                            <Switch
                              checked={pdfLayout.footer[key]}
                              onCheckedChange={(checked) => updateFooterLayout({ [key]: checked })}
                              aria-label={`Fußzeile ${label}`}
                            />
                          </label>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <Label className="text-xs">Footer-Höhe</Label>
                          <Badge variant="outline" className="font-mono text-[10px]">{pdfLayout.footer.yOffsetMm} mm</Badge>
                        </div>
                        <Slider
                          min={-18}
                          max={12}
                          step={1}
                          value={[pdfLayout.footer.yOffsetMm]}
                          onValueChange={([value]) => updateFooterLayout({ yOffsetMm: value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <Label className="text-xs">Footer-Schrift</Label>
                          <Badge variant="outline" className="font-mono text-[10px]">{Math.round(pdfLayout.footer.fontScale * 100)}%</Badge>
                        </div>
                        <Slider
                          min={85}
                          max={115}
                          step={1}
                          value={[Math.round(pdfLayout.footer.fontScale * 100)]}
                          onValueChange={([value]) => updateFooterLayout({ fontScale: value / 100 })}
                        />
                      </div>
                    </div>
                  )}

                  {layoutPageMode === "first" ? (
                  <div className={cn("space-y-3 rounded-lg border border-border bg-background/30 p-3", layoutCategory !== "positionen" && "hidden")}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Label className="text-xs">Feinjustierung</Label>
                        <p className="mt-1 text-[11px] text-muted-foreground">{selectedBlock.hint}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={resetSelectedBlock} className="h-8 px-2 text-xs">
                        Reset
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {LAYOUT_BLOCKS.map((block) => (
                        <button
                          key={block.key}
                          type="button"
                          onClick={() => setSelectedLayoutBlock(block.key)}
                          className={cn(
                            "rounded-lg border px-2 py-2 text-left text-xs transition-smooth",
                            selectedBlock.key === block.key
                              ? "border-primary/50 bg-primary/10 text-primary"
                              : "border-border bg-card hover:border-primary/40",
                          )}
                        >
                          {block.label}
                        </button>
                      ))}
                    </div>

                    {selectedBlock.x && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <Label className="text-xs">Horizontal</Label>
                          <Badge variant="outline" className="font-mono text-[10px]">{selectedOffset.x} mm</Badge>
                        </div>
                        <Slider
                          min={-40}
                          max={40}
                          step={1}
                          value={[selectedOffset.x]}
                          onValueChange={([value]) => updateLayoutBlock(selectedBlock.key, { x: value })}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-xs">Vertikal</Label>
                        <Badge variant="outline" className="font-mono text-[10px]">{selectedOffset.y} mm</Badge>
                      </div>
                      <Slider
                        min={-40}
                        max={40}
                        step={1}
                        value={[selectedOffset.y]}
                        onValueChange={([value]) => updateLayoutBlock(selectedBlock.key, { y: value })}
                      />
                    </div>
                  </div>
                  ) : (
                    <div className={cn("space-y-3 rounded-lg border border-border bg-background/30 p-3", layoutCategory !== "positionen" && "hidden")}>
                      <div>
                        <Label className="text-xs">Folgeseiten</Label>
                        <p className="mt-1 text-[11px] text-muted-foreground">Der Kopfbereich entspricht der ersten Seite. Hier stellst du nur ein, wo der fortlaufende Inhalt startet.</p>
                      </div>

                      <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
                        <span className="text-sm">Kopfzeile anzeigen</span>
                        <Switch
                          checked={pdfLayout.followingPage.showHeader}
                          onCheckedChange={(checked) => updateFollowingPageLayout({ showHeader: checked })}
                          aria-label="Kopfzeile auf Folgeseiten anzeigen"
                        />
                      </label>


                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <Label className="text-xs">Inhalt beginnt bei</Label>
                          <Badge variant="outline" className="font-mono text-[10px]">{pdfLayout.followingPage.contentStartMm} mm</Badge>
                        </div>
                        <Slider
                          min={28}
                          max={90}
                          step={1}
                          value={[pdfLayout.followingPage.contentStartMm]}
                          onValueChange={([value]) => updateFollowingPageLayout({ contentStartMm: value })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-muted/25 p-4 lg:sticky lg:top-4 lg:h-full lg:self-start lg:overflow-hidden">
                  <div className="mx-auto grid w-full max-w-[900px] gap-4 xl:grid-cols-2">
                  <div className={cn(
                    "rounded-lg border bg-white p-4 text-slate-900 shadow-card transition-smooth",
                    layoutPageMode === "first" ? "border-primary/50 ring-2 ring-primary/15" : "border-border",
                  )}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold text-slate-700">Erste Seite</span>
                      <span className="text-slate-400">Anschrift + Infoblock</span>
                    </div>
                    <div className="relative aspect-[210/297] overflow-hidden bg-white">
                      <div
                        className="absolute inset-0 border border-slate-200"
                        style={{ margin: `${pdfLayout.marginMm / 2}px` }}
                      />
                      {pdfLayout.logoPosition !== "hidden" && (
                        <div
                          className="absolute top-5 grid place-items-center text-xs font-semibold text-white"
                          style={{
                            background: accent.rgb,
                            width: `${pdfLayout.logoSize.widthMm * 1.8}px`,
                            height: `${pdfLayout.logoSize.heightMm * 2}px`,
                            top: `${20 + pdfLayout.blockOffsets.logo.y * 0.8}px`,
                            left: pdfLayout.logoPosition === "left" ? `${pdfLayout.marginMm / 2 + 10 + pdfLayout.blockOffsets.logo.x * 0.8}px` : undefined,
                            right: pdfLayout.logoPosition === "right" ? `${pdfLayout.marginMm / 2 + 10 - pdfLayout.blockOffsets.logo.x * 0.8}px` : undefined,
                          }}
                        >
                          {settings.companyLogoUrl ? (
                            <img src={settings.companyLogoUrl} alt="Firmenlogo" className="h-full w-full object-fill" />
                          ) : (
                            "LOGO"
                          )}
                        </div>
                      )}
                      <div
                        className="absolute top-5 space-y-1"
                        style={{
                          top: `${20 + pdfLayout.blockOffsets.sender.y * 0.8}px`,
                          left: pdfLayout.logoPosition === "left" ? `${pdfLayout.marginMm / 2 + 26 + pdfLayout.logoSize.widthMm * 1.8 + pdfLayout.blockOffsets.sender.x * 0.8}px` : `${pdfLayout.marginMm / 2 + 10 + pdfLayout.blockOffsets.sender.x * 0.8}px`,
                          right: pdfLayout.logoPosition === "right" ? `${pdfLayout.logoSize.widthMm * 1.8 + 54}px` : `${pdfLayout.marginMm / 2 + 10}px`,
                          transform: `scale(${pdfLayout.fontScale})`,
                          transformOrigin: "left top",
                        }}
                      >
                        <div className="h-3 w-32 rounded-sm bg-slate-800" />
                        <div className="h-2 w-44 rounded-sm bg-slate-300" />
                      </div>
                      <div
                        className="absolute space-y-2"
                        style={{
                          left: `${32 + pdfLayout.blockOffsets.address.x * 0.8}px`,
                          top: `${96 + pdfLayout.blockOffsets.address.y * 0.8}px`,
                        }}
                      >
                        <div className="h-2 w-48 rounded-sm bg-slate-300" />
                        <div className="h-3 w-32 rounded-sm bg-slate-800" />
                        <div className="h-2 w-40 rounded-sm bg-slate-400" />
                        <div className="h-2 w-28 rounded-sm bg-slate-300" />
                      </div>
                      {pdfLayout.showMetaBlock && (
                        <div
                          className="absolute grid w-28 gap-1.5"
                          style={{
                            right: `${32 - pdfLayout.blockOffsets.meta.x * 0.8}px`,
                            top: `${96 + pdfLayout.blockOffsets.meta.y * 0.8}px`,
                          }}
                        >
                          {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="flex justify-between gap-2">
                              <span className="h-1.5 w-9 rounded-sm bg-slate-300" />
                              <span className="h-1.5 w-12 rounded-sm bg-slate-500" />
                            </div>
                          ))}
                        </div>
                      )}
                      <div
                        className="absolute h-4 w-32 rounded-sm bg-slate-900"
                        style={{
                          left: `${32 + pdfLayout.blockOffsets.title.x * 0.8}px`,
                          top: `${160 + pdfLayout.blockOffsets.title.y * 0.8}px`,
                        }}
                      />
                      <div
                        className="absolute left-8 right-8 space-y-3"
                        style={{
                          top: `${184 + pdfLayout.blockOffsets.vehicle.y * 0.8}px`,
                          transform: `translateX(${pdfLayout.blockOffsets.vehicle.x * 0.8}px)`,
                        }}
                      >
                        <div className="h-14 rounded-sm border border-slate-200 bg-slate-50" />
                        <div className="overflow-hidden rounded-sm border border-slate-200">
                          <div
                            className="grid"
                            style={{
                              gridTemplateColumns: TABLE_COLUMNS.map((col) => `${pdfLayout.table.columnWidthsMm[col.key]}fr`).join(" "),
                              height: `${pdfLayout.table.rowHeightsMm.header * 1.8}px`,
                              background: accent.rgb,
                            }}
                          >
                            {TABLE_COLUMNS.map((col) => (
                              <div key={col.key} className="border-r border-white/25 last:border-r-0" />
                            ))}
                          </div>
                          {[0, 1, 2].map((rowIndex) => (
                            <div
                              key={rowIndex}
                              className={cn("grid border-t border-slate-200", rowIndex % 2 === 0 ? "bg-slate-50" : "bg-white")}
                              style={{
                                gridTemplateColumns: TABLE_COLUMNS.map((col) => `${pdfLayout.table.columnWidthsMm[col.key]}fr`).join(" "),
                                height: `${pdfLayout.table.rowHeightsMm.item * 1.8}px`,
                              }}
                            >
                              {TABLE_COLUMNS.map((col, colIndex) => (
                                <div key={col.key} className="border-r border-slate-100 px-1 py-1 last:border-r-0">
                                  <div className={cn("h-1 rounded-sm bg-slate-300", colIndex === 1 ? "w-full" : "ml-auto w-2/3")} />
                                </div>
                              ))}
                            </div>
                          ))}
                          <div
                            className="grid border-t border-slate-200 bg-slate-100"
                            style={{
                              gridTemplateColumns: TABLE_COLUMNS.map((col) => `${pdfLayout.table.columnWidthsMm[col.key]}fr`).join(" "),
                              height: `${pdfLayout.table.rowHeightsMm.total * 1.8}px`,
                            }}
                          >
                            {TABLE_COLUMNS.map((col, index) => (
                              <div key={col.key} className="border-r border-slate-200 px-1 py-1 last:border-r-0">
                                {index >= 4 && <div className="ml-auto h-1 rounded-sm bg-slate-500" />}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div
                          className="ml-auto h-9 w-32 rounded-sm bg-slate-100"
                          style={{ transform: `translateY(${pdfLayout.blockOffsets.content.y * 0.8}px)` }}
                        />
                      </div>
                      {pdfLayout.showFooter && (
                        <div
                          className={cn(
                            "absolute left-8 right-8 pt-2",
                            pdfLayout.footer.showLine && "border-t border-slate-200",
                          )}
                          style={{
                            bottom: `${28 - pdfLayout.footer.yOffsetMm * 0.7}px`,
                            transform: `scale(${pdfLayout.footer.fontScale})`,
                            transformOrigin: "left bottom",
                          }}
                        >
                          {pdfLayout.footer.style === "columns" && (
                            <div
                              className="grid gap-3"
                              style={{
                                gridTemplateColumns: `repeat(${[
                                  pdfLayout.footer.showBank,
                                  pdfLayout.footer.showCompany,
                                  pdfLayout.footer.showTax,
                                  pdfLayout.footer.showContact,
                                ].filter(Boolean).length || 1}, minmax(0, 1fr))`,
                              }}
                            >
                              {[
                                pdfLayout.footer.showBank,
                                pdfLayout.footer.showCompany,
                                pdfLayout.footer.showTax,
                                pdfLayout.footer.showContact,
                              ].filter(Boolean).map((_, index) => (
                                <div key={index} className="space-y-1">
                                  <div className="h-1.5 w-10 rounded-sm bg-slate-500" />
                                  <div className="h-1.5 w-full rounded-sm bg-slate-300" />
                                  <div className="h-1.5 w-3/4 rounded-sm bg-slate-300" />
                                </div>
                              ))}
                            </div>
                          )}
                          {pdfLayout.footer.style === "compact" && (
                            <div className="space-y-1">
                              <div className="h-1.5 w-full rounded-sm bg-slate-400" />
                              <div className="h-1.5 w-3/4 rounded-sm bg-slate-300" />
                            </div>
                          )}
                          {pdfLayout.footer.style === "minimal" && (
                            <div className="h-1.5 w-2/3 rounded-sm bg-slate-400" />
                          )}
                          {pdfLayout.footer.showPageNumber && (
                            <div className="absolute bottom-[-12px] right-0 h-1.5 w-10 rounded-sm bg-slate-300" />
                          )}
                        </div>
                      )}
                      {renderPreviewFocus("first")}
                    </div>
                  </div>
                  <div className={cn(
                    "rounded-lg border bg-white p-4 text-slate-900 shadow-card transition-smooth",
                    layoutPageMode === "following" ? "border-primary/50 ring-2 ring-primary/15" : "border-border",
                  )}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold text-slate-700">Folgeseite</span>
                      <span className="text-slate-400">fortlaufender Inhalt</span>
                    </div>
                    <div className="relative aspect-[210/297] overflow-hidden bg-white">
                      <div
                        className="absolute inset-0 border border-slate-200"
                        style={{ margin: `${pdfLayout.marginMm / 2}px` }}
                      />
                      {pdfLayout.followingPage.showHeader && (
                        <>
                          {pdfLayout.logoPosition !== "hidden" && (
                            <div
                              className="absolute top-5 grid place-items-center text-xs font-semibold text-white"
                              style={{
                                background: accent.rgb,
                                width: `${pdfLayout.logoSize.widthMm * 1.8}px`,
                                height: `${pdfLayout.logoSize.heightMm * 2}px`,
                                top: `${20 + pdfLayout.blockOffsets.logo.y * 0.8}px`,
                                left: pdfLayout.logoPosition === "left" ? `${pdfLayout.marginMm / 2 + 10 + pdfLayout.blockOffsets.logo.x * 0.8}px` : undefined,
                                right: pdfLayout.logoPosition === "right" ? `${pdfLayout.marginMm / 2 + 10 - pdfLayout.blockOffsets.logo.x * 0.8}px` : undefined,
                              }}
                            >
                              {settings.companyLogoUrl ? (
                                <img src={settings.companyLogoUrl} alt="Firmenlogo" className="h-full w-full object-fill" />
                              ) : (
                                "LOGO"
                              )}
                            </div>
                          )}
                          <div
                            className="absolute top-5 space-y-1"
                            style={{
                              top: `${20 + pdfLayout.blockOffsets.sender.y * 0.8}px`,
                              left: pdfLayout.logoPosition === "left" ? `${pdfLayout.marginMm / 2 + 26 + pdfLayout.logoSize.widthMm * 1.8 + pdfLayout.blockOffsets.sender.x * 0.8}px` : `${pdfLayout.marginMm / 2 + 10 + pdfLayout.blockOffsets.sender.x * 0.8}px`,
                              right: pdfLayout.logoPosition === "right" ? `${pdfLayout.logoSize.widthMm * 1.8 + 54}px` : `${pdfLayout.marginMm / 2 + 10}px`,
                              transform: `scale(${pdfLayout.fontScale})`,
                              transformOrigin: "left top",
                            }}
                          >
                            <div className="h-3 w-32 rounded-sm bg-slate-800" />
                            <div className="h-2 w-44 rounded-sm bg-slate-300" />
                          </div>
                          <div
                            className="absolute left-8 right-8 border-b border-slate-200"
                            style={{ top: `${24 + pdfLayout.logoSize.heightMm * 2 + pdfLayout.blockOffsets.logo.y * 0.8}px` }}
                          />
                        </>
                      )}
                      <div
                        className="absolute left-8 right-8 grid gap-2"
                        style={{ top: `${pdfLayout.followingPage.contentStartMm * 1.55}px` }}
                      >
                        <div className="overflow-hidden rounded-sm border border-slate-200">
                          <div
                            className="grid bg-slate-200"
                            style={{
                              gridTemplateColumns: TABLE_COLUMNS.map((col) => `${pdfLayout.table.columnWidthsMm[col.key]}fr`).join(" "),
                              height: `${pdfLayout.table.rowHeightsMm.header * 1.8}px`,
                            }}
                          >
                            {TABLE_COLUMNS.map((col) => (
                              <div key={col.key} className="border-r border-slate-100 last:border-r-0" />
                            ))}
                          </div>
                          {Array.from({ length: 8 }).map((_, rowIndex) => (
                            <div
                              key={rowIndex}
                              className={cn("grid border-t border-slate-200", rowIndex % 2 === 0 ? "bg-slate-50" : "bg-white")}
                              style={{
                                gridTemplateColumns: TABLE_COLUMNS.map((col) => `${pdfLayout.table.columnWidthsMm[col.key]}fr`).join(" "),
                                height: `${pdfLayout.table.rowHeightsMm.item * 1.8}px`,
                              }}
                            >
                              {TABLE_COLUMNS.map((col, colIndex) => (
                                <div key={col.key} className="border-r border-slate-100 px-1 py-1 last:border-r-0">
                                  <div className={cn("h-1 rounded-sm bg-slate-300", colIndex === 1 ? "w-full" : "ml-auto w-2/3")} />
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 h-14 rounded-sm border border-slate-200 bg-slate-50" />
                      </div>
                      {pdfLayout.showFooter && (
                        <div
                          className={cn(
                            "absolute left-8 right-8 pt-2",
                            pdfLayout.footer.showLine && "border-t border-slate-200",
                          )}
                          style={{
                            bottom: `${28 - pdfLayout.footer.yOffsetMm * 0.7}px`,
                            transform: `scale(${pdfLayout.footer.fontScale})`,
                            transformOrigin: "left bottom",
                          }}
                        >
                          {pdfLayout.footer.style === "columns" && (
                            <div
                              className="grid gap-3"
                              style={{
                                gridTemplateColumns: `repeat(${[
                                  pdfLayout.footer.showBank,
                                  pdfLayout.footer.showCompany,
                                  pdfLayout.footer.showTax,
                                  pdfLayout.footer.showContact,
                                ].filter(Boolean).length || 1}, minmax(0, 1fr))`,
                              }}
                            >
                              {[
                                pdfLayout.footer.showBank,
                                pdfLayout.footer.showCompany,
                                pdfLayout.footer.showTax,
                                pdfLayout.footer.showContact,
                              ].filter(Boolean).map((_, index) => (
                                <div key={index} className="space-y-1">
                                  <div className="h-1.5 w-10 rounded-sm bg-slate-500" />
                                  <div className="h-1.5 w-full rounded-sm bg-slate-300" />
                                  <div className="h-1.5 w-3/4 rounded-sm bg-slate-300" />
                                </div>
                              ))}
                            </div>
                          )}
                          {pdfLayout.footer.style === "compact" && (
                            <div className="space-y-1">
                              <div className="h-1.5 w-full rounded-sm bg-slate-400" />
                              <div className="h-1.5 w-3/4 rounded-sm bg-slate-300" />
                            </div>
                          )}
                          {pdfLayout.footer.style === "minimal" && (
                            <div className="h-1.5 w-2/3 rounded-sm bg-slate-400" />
                          )}
                          {pdfLayout.footer.showPageNumber && (
                            <div className="absolute bottom-[-12px] right-0 h-1.5 w-10 rounded-sm bg-slate-300" />
                          )}
                        </div>
                      )}
                      {renderPreviewFocus("following")}
                    </div>
                  </div>
                  </div>
                </div>
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
