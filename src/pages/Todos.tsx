import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  AlertTriangle, Calendar, Car, CheckCircle2, Flag, Inbox,
  Plus, Trash2, X, CalendarDays, Target, Sparkles, Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useProcessStore, mirroredTodoId } from "@/store/processStore";
import {
  StoredDocument, Todo, TodoPriority, TodoProgressPeriod, TodoScope, formatDate,
} from "@/data/process";
import { useTopbarSearch } from "@/context/TopbarSearchContext";
import { DataTableShell } from "@/components/shared/DataTableShell";
import { SortableTh, SortDir, SortState } from "@/components/shared/SortableTh";
import {
  calculateTodoProgress, TODO_PROGRESS_PERIODS, todoProgressPeriodLabel,
} from "@/lib/todoProgress";
import { DocumentManager } from "@/components/shared/DocumentManager";
import { useWorkshopStore } from "@/store/workshopStore";
import { WORKSHOP_DEMO } from "@/data/workshopDemo";
import { withWorkshopGuard } from "@/lib/workshopGuard";
import { useWorkshopPath } from "@/hooks/useWorkshopPath";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITY_META: Record<TodoPriority, { label: string; className: string; dot: string; weight: number }> = {
  high:   { label: "Hoch",     className: "bg-destructive/15 text-destructive border-destructive/30", dot: "bg-destructive", weight: 0 },
  medium: { label: "Mittel",   className: "bg-warning/15 text-warning border-warning/30",             dot: "bg-warning",     weight: 1 },
  low:    { label: "Niedrig",  className: "bg-info/15 text-info border-info/30",                       dot: "bg-info",        weight: 2 },
};

const SCOPE_META: Record<TodoScope, { label: string; className: string }> = {
  general:              { label: "Allgemein",        className: "bg-secondary text-secondary-foreground border-border" },
  internal_pre_purchase:{ label: "Vor Einkauf",      className: "bg-info/10 text-info border-info/30" },
  internal_fleet:       { label: "Bestand",          className: "bg-primary/10 text-primary-glow border-primary/30" },
  offer:                { label: "Angebot",          className: "bg-accent/10 text-accent-foreground border-accent/30" },
  order_confirmation:   { label: "Auftragsbest.",    className: "bg-success/10 text-success border-success/30" },
  outbound_check:       { label: "Ausgangskontrolle",className: "bg-warning/10 text-warning border-warning/30" },
};

type StatusFilter = "all" | "open" | "today" | "overdue" | "done";
type DueFilter = "any" | "today" | "tomorrow" | "this_week" | "next_7" | "no_date" | "custom";
type TodoSortKey = "title" | "scope" | "priority" | "dueDate" | "assignee" | "status" | "createdAt";

const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const Todos = () => {
  const navigate = useNavigate();
  const wp = useWorkshopPath();
  const [searchParams] = useSearchParams();
  const linkedTodoId = searchParams.get("todo");
  const workshopActive = useWorkshopStore((s) => s.activeKey === "todos");
  const realRawTodos = useProcessStore((s) => s.todos);
  const realVehicles = useProcessStore((s) => s.vehicles);
  const realOffers = useProcessStore((s) => s.offers);
  const realProcesses = useProcessStore((s) => s.processes);
  const realAddTodo = useProcessStore((s) => s.addTodo);
  const realToggleTodo = useProcessStore((s) => s.toggleTodo);
  const realRemoveTodo = useProcessStore((s) => s.removeTodo);
  const realUpdateTodo = useProcessStore((s) => s.updateTodo);
  const settings = useProcessStore((s) => s.settings);
  const updateSettings = useProcessStore((s) => s.updateSettings);
  const [section, setSection] = useState<"todos" | "agreements">("todos");

  const rawTodos = workshopActive ? WORKSHOP_DEMO.todos : realRawTodos;
  const vehicles = workshopActive ? WORKSHOP_DEMO.vehicles : realVehicles;
  const offers = workshopActive ? WORKSHOP_DEMO.offers : realOffers;
  const processes = workshopActive ? WORKSHOP_DEMO.processes : realProcesses;
  const addTodo = withWorkshopGuard(workshopActive, realAddTodo);
  const toggleTodo = withWorkshopGuard(workshopActive, realToggleTodo);
  const removeTodo = withWorkshopGuard(workshopActive, realRemoveTodo);
  const updateTodo = withWorkshopGuard(workshopActive, realUpdateTodo);

  const todoGroups = useMemo(() => {
    const operational: Todo[] = [...rawTodos];
    const agreements: Todo[] = [];
    processes.forEach((p) => {
      p.customerTodosOC.forEach((it) => {
        agreements.push({
          id: mirroredTodoId("ct", p.id, it.id),
          title: it.title,
          priority: "medium",
          scope: "order_confirmation",
          done: !!it.done,
          dueDate: it.dueDate,
          processId: p.id,
          vehicleId: p.vehicleId,
          tags: ["Kundenvereinbarung", p.id],
          createdAt: p.createdAt,
          createdBy: "Kundenvereinbarung",
        });
      });
      p.outboundChecklist.forEach((it) => {
        operational.push({
          id: mirroredTodoId("oc", p.id, it.id),
          title: it.label,
          priority: "medium",
          scope: "outbound_check",
          done: it.done,
          dueDate: it.dueDate,
          processId: p.id,
          vehicleId: p.vehicleId,
          tags: ["Vorgang", p.id, "Ausgangskontrolle"],
          createdAt: p.createdAt,
          createdBy: "Vorgang",
        });
      });
    });
    const acceptedOfferIds = new Set(processes.map((process) => process.acceptedOfferId).filter(Boolean));
    offers.forEach((offer) => {
      if (acceptedOfferIds.has(offer.id) || (offer.status !== "draft" && offer.status !== "sent")) return;
      offer.customerTodos.forEach((agreement) => {
        agreements.push({
          id: mirroredTodoId("of", offer.id, agreement.id),
          title: agreement.title,
          priority: "medium",
          scope: "offer",
          done: !!agreement.done,
          dueDate: agreement.dueDate,
          vehicleId: offer.vehicleId,
          tags: ["Kundenvereinbarung", offer.id],
          createdAt: offer.createdAt,
          createdBy: "Angebot",
        });
      });
    });
    return { operational, agreements };
  }, [rawTodos, processes, offers]);
  const todos = section === "agreements" ? todoGroups.agreements : todoGroups.operational;

  useEffect(() => {
    if (!linkedTodoId) return;
    const linkedSection = searchParams.get("section");
    if (linkedSection === "agreements" || linkedTodoId.startsWith("ct:") || linkedTodoId.startsWith("of:")) {
      setSection("agreements");
    } else {
      setSection("todos");
    }
  }, [linkedTodoId, searchParams]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [scopeFilter, setScopeFilter] = useState<"all" | TodoScope>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TodoPriority>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("any");
  const [customDue, setCustomDue] = useState<Date | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [searchField, setSearchField] = useState<"all" | "title" | "tag" | "assignee">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  const [sort, setSort] = useState<SortState<TodoSortKey>>({ key: "dueDate", dir: "asc" });

  useEffect(() => {
    if (!linkedTodoId) return;
    const linkedTodo = [...todoGroups.operational, ...todoGroups.agreements].find((todo) => todo.id === linkedTodoId);
    if (!linkedTodo) return;
    setStatusFilter("all");
    setEditTodo(linkedTodo);
  }, [linkedTodoId, todoGroups]);

  // ---- Topbar-Suche -------------------------------------------------------
  const topbarSearch = useMemo(() => ({
    placeholder: section === "agreements" ? "Kundenvereinbarungen durchsuchen…" : "To-Dos durchsuchen…",
    value: query,
    onChange: setQuery,
    field: searchField,
    onFieldChange: (f: string) => setSearchField(f as typeof searchField),
    fields: [
      { key: "all",      label: "Alle Felder" },
      { key: "title",    label: "Titel" },
      { key: "tag",      label: "Tag" },
      { key: "assignee", label: "Zuständig" },
    ],
  }), [query, searchField, section]);
  useTopbarSearch(topbarSearch);

  // ---- Helpers ------------------------------------------------------------
  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles]);
  const processMap = useMemo(() => Object.fromEntries(processes.map((p) => [p.id, p])), [processes]);

  const todayISO = toISO(new Date());
  const isOverdue = useCallback((t: Todo) => !t.done && !!t.dueDate && t.dueDate < todayISO, [todayISO]);
  const isToday = useCallback((t: Todo) => !t.done && t.dueDate === todayISO, [todayISO]);

  // Fälligkeits-Range basierend auf dueFilter
  const dueRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (dueFilter === "today") {
      return { from: toISO(start), to: toISO(start) };
    }
    if (dueFilter === "tomorrow") {
      const t = new Date(start); t.setDate(t.getDate() + 1);
      return { from: toISO(t), to: toISO(t) };
    }
    if (dueFilter === "this_week") {
      // Mo–So (ISO: Montag = 1)
      const day = start.getDay() === 0 ? 7 : start.getDay();
      const monday = new Date(start); monday.setDate(start.getDate() - (day - 1));
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      return { from: toISO(monday), to: toISO(sunday) };
    }
    if (dueFilter === "next_7") {
      const end = new Date(start); end.setDate(start.getDate() + 6);
      return { from: toISO(start), to: toISO(end) };
    }
    if (dueFilter === "custom" && customDue) {
      return { from: toISO(customDue), to: toISO(customDue) };
    }
    return null;
  }, [dueFilter, customDue]);

  // ---- Filter -------------------------------------------------------------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return todos.filter((t) => {
      if (statusFilter === "open"    && t.done) return false;
      if (statusFilter === "done"    && !t.done) return false;
      if (statusFilter === "today"   && !isToday(t)) return false;
      if (statusFilter === "overdue" && !isOverdue(t)) return false;

      if (scopeFilter !== "all" && t.scope !== scopeFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;

      // Fälligkeitsdatum-Filter
      if (dueFilter === "no_date") {
        if (t.dueDate) return false;
      } else if (dueRange) {
        if (!t.dueDate) return false;
        if (t.dueDate < dueRange.from || t.dueDate > dueRange.to) return false;
      }

      if (q) {
        const fields: string[] = [];
        if (searchField === "all" || searchField === "title")    fields.push(t.title.toLowerCase(), (t.description ?? "").toLowerCase());
        if (searchField === "all" || searchField === "tag")      fields.push(...(t.tags ?? []).map((x) => x.toLowerCase()));
        if (searchField === "all" || searchField === "assignee") fields.push((t.assignee ?? "").toLowerCase());
        if (!fields.some((f) => f.includes(q))) return false;
      }
      return true;
    });
  }, [todos, statusFilter, scopeFilter, priorityFilter, dueFilter, dueRange, query, searchField, isToday, isOverdue]);

  // ---- Sortierung ---------------------------------------------------------
  const sorted = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    const cmp = (a: string | number | undefined | null, b: string | number | undefined | null) => {
      const av = a ?? (typeof b === "number" ? Number.POSITIVE_INFINITY : "");
      const bv = b ?? (typeof a === "number" ? Number.POSITIVE_INFINITY : "");
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    };
    return [...filtered].sort((a, b) => {
      switch (sort.key) {
        case "title":     return cmp(a.title.toLowerCase(), b.title.toLowerCase());
        case "scope":     return cmp(SCOPE_META[a.scope].label, SCOPE_META[b.scope].label);
        case "priority":  return cmp(PRIORITY_META[a.priority].weight, PRIORITY_META[b.priority].weight);
        case "dueDate":   return cmp(a.dueDate ?? "9999-99-99", b.dueDate ?? "9999-99-99");
        case "assignee":  return cmp((a.assignee ?? "").toLowerCase(), (b.assignee ?? "").toLowerCase());
        case "status": {
          const rank = (t: Todo) => t.done ? 3 : isOverdue(t) ? 0 : isToday(t) ? 1 : 2;
          return cmp(rank(a), rank(b));
        }
        case "createdAt": return cmp(a.createdAt, b.createdAt);
        default: return 0;
      }
    });
  }, [filtered, sort, isOverdue, isToday]);

  // ---- Stats --------------------------------------------------------------
  const stats = useMemo(() => ({
    open:    todos.filter((t) => !t.done).length,
    today:   todos.filter((t) => isToday(t)).length,
    overdue: todos.filter((t) => isOverdue(t)).length,
    done:    todos.filter((t) => t.done).length,
    all:     todos.length,
  }), [todos, isToday, isOverdue]);
  const progressPeriod = settings.todoProgressPeriod ?? "week";
  const progressStats = useMemo(
    () => calculateTodoProgress(todos, progressPeriod),
    [todos, progressPeriod],
  );
  const progressMessage = progressStats.total === 0
    ? "In diesem Zeitraum stehen keine To-Dos an."
    : progressStats.percent === 100
      ? "Alles erledigt – sauber abgeschlossen."
      : progressStats.percent >= 75
        ? "Fast geschafft – der Rest ist überschaubar."
        : progressStats.percent >= 40
          ? "Guter Lauf – weiter im Fokus bleiben."
          : "Der nächste Haken bringt sofort Bewegung rein.";

  // ---- Render -------------------------------------------------------------
  return (
    <AppShell>
      <div className="space-y-3 animate-fade-in">
        {/* Header — kompakt */}
        <div data-tour="tt-header" className="flex flex-col gap-3 shrink-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">To-Dos</h1>
            <p className="text-xs text-muted-foreground">
              {section === "agreements" ? "Schriftliche Zusagen an Kunden · mit den Vorgängen synchronisiert" : "Eigenständige Aufgaben · sortier- und filterbar"}
            </p>
          </div>
          {section === "todos" && <div data-tour="tt-new">
            <Button
              size="sm"
              className="bg-gradient-brand hover:opacity-90 shadow-elegant gap-2"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" /> Neues To-Do
            </Button>
          </div>}
        </div>

        <Tabs value={section} onValueChange={(value) => {
          setSection(value as typeof section);
          setStatusFilter("open");
          setScopeFilter("all");
          setPriorityFilter("all");
          setDueFilter("any");
          setCustomDue(undefined);
          setQuery("");
        }}>
          <TabsList className="grid h-auto w-full grid-cols-2 p-1">
            <TabsTrigger value="todos" className="py-2.5">To-Dos</TabsTrigger>
            <TabsTrigger value="agreements" className="py-2.5">
              Kundenvereinbarungen ({todoGroups.agreements.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Card data-tour="tt-progress" className="relative overflow-hidden p-4">
          <div className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-primary/5" />
          <div className="relative flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Target className="size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-sm font-semibold">Erledigungsfokus</h2>
                    {progressStats.percent === 100 && progressStats.total > 0 && <Sparkles className="size-3.5 text-warning" />}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Fortschritt für {todoProgressPeriodLabel(progressPeriod).toLowerCase()} · nach Fälligkeit, ersatzweise Erledigungs- oder Erstelltag
                  </p>
                </div>
              </div>
              <Select
                value={progressPeriod}
                onValueChange={(value) => updateSettings({ todoProgressPeriod: value as TodoProgressPeriod })}
              >
                <SelectTrigger className="h-8 w-full text-xs sm:w-[160px]">
                  <CalendarDays className="size-3.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TODO_PROGRESS_PERIODS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid items-center gap-3 sm:grid-cols-[72px_1fr_auto]">
              <div className="font-display text-3xl font-bold tracking-tight text-foreground">{progressStats.percent}%</div>
              <div className="space-y-1.5">
                <Progress value={progressStats.percent} className="h-2.5 bg-muted" />
                <p className="text-[11px] text-muted-foreground">{progressMessage}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm font-semibold">{progressStats.done} von {progressStats.total} erledigt</p>
                <p className="text-[11px] text-muted-foreground">{progressStats.open} noch offen</p>
              </div>
            </div>
          </div>
        </Card>

        {/* KPI-Strip kompakt */}
        <div data-tour="tt-kpis" className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0">
          {[
            { label: "Offen",        value: stats.open,    icon: Inbox,          accent: "text-info" },
            { label: "Heute fällig", value: stats.today,   icon: Calendar,       accent: "text-warning" },
            { label: "Überfällig",   value: stats.overdue, icon: AlertTriangle,  accent: "text-destructive" },
            { label: "Erledigt",     value: stats.done,    icon: CheckCircle2,   accent: "text-success" },
          ].map(({ label, value, icon: Icon, accent }) => (
            <Card key={label} className="px-3 py-2 flex items-center gap-3">
              <Icon className={cn("size-4", accent)} />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none">{label}</p>
                <p className="font-display text-lg font-bold leading-tight">{value}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Filter-Leiste kompakt */}
        <Card data-tour="tt-filters" className="px-3 py-2 flex flex-col gap-2 shrink-0 sm:flex-row sm:flex-wrap sm:items-center">
          <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as typeof scopeFilter)}>
            <SelectTrigger className="w-full text-xs sm:h-8 sm:w-[160px]"><SelectValue placeholder="Bereich" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Bereiche</SelectItem>
              {(Object.keys(SCOPE_META) as TodoScope[]).map((s) => (
                <SelectItem key={s} value={s}>{SCOPE_META[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as typeof priorityFilter)}>
            <SelectTrigger className="w-full text-xs sm:h-8 sm:w-[140px]"><SelectValue placeholder="Priorität" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Prioritäten</SelectItem>
              <SelectItem value="high">Hoch</SelectItem>
              <SelectItem value="medium">Mittel</SelectItem>
              <SelectItem value="low">Niedrig</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={dueFilter}
            onValueChange={(v) => {
              setDueFilter(v as DueFilter);
              if (v !== "custom") setCustomDue(undefined);
            }}
          >
            <SelectTrigger className="w-full text-xs gap-1 sm:h-8 sm:w-[170px]">
              <CalendarDays className="size-3.5 text-muted-foreground" />
              <SelectValue placeholder="Fälligkeit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Alle Fälligkeiten</SelectItem>
              <SelectItem value="today">Heute fällig</SelectItem>
              <SelectItem value="tomorrow">Morgen fällig</SelectItem>
              <SelectItem value="this_week">Diese Woche</SelectItem>
              <SelectItem value="next_7">Nächste 7 Tage</SelectItem>
              <SelectItem value="no_date">Ohne Datum</SelectItem>
              <SelectItem value="custom">Bestimmtes Datum…</SelectItem>
            </SelectContent>
          </Select>
          {dueFilter === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1.5 sm:h-8">
                  <Calendar className="size-3.5" />
                  {customDue ? formatDate(toISO(customDue)) : "Datum wählen"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={customDue}
                  onSelect={setCustomDue}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          )}
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {([
              { key: "open",    label: `Offen (${stats.open})` },
              { key: "today",   label: `Heute (${stats.today})` },
              { key: "overdue", label: `Überfällig (${stats.overdue})` },
              { key: "done",    label: `Erledigt (${stats.done})` },
              { key: "all",     label: `Alle (${stats.all})` },
            ] as const).map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={statusFilter === f.key ? "default" : "outline"}
                className="text-xs sm:h-8"
                onClick={() => setStatusFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <Select
            value={`${sort.key}:${sort.dir}`}
            onValueChange={(v) => {
              const [key, dir] = v.split(":") as [TodoSortKey, SortDir];
              setSort({ key, dir });
            }}
          >
            <SelectTrigger className="w-full text-xs sm:hidden">
              <SelectValue placeholder="Sortieren nach…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dueDate:asc">Fällig (bald zuerst)</SelectItem>
              <SelectItem value="priority:asc">Priorität (hoch zuerst)</SelectItem>
              <SelectItem value="status:asc">Status</SelectItem>
              <SelectItem value="title:asc">Titel (A → Z)</SelectItem>
              <SelectItem value="createdAt:desc">Erstellt (neueste zuerst)</SelectItem>
            </SelectContent>
          </Select>
        </Card>

        {sorted.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            {section === "agreements" ? "Keine Kundenvereinbarungen gefunden." : "Keine To-Dos gefunden."}
          </Card>
        ) : (
          <div data-tour="tt-table">
          <div className="hidden sm:block">
          <DataTableShell footer={<>{sorted.length} {sorted.length === 1 ? "Eintrag" : "Einträge"}</>}>
            <table>
              <thead>
                <tr>
                  <th className="px-3 py-2 w-8" />
                  <SortableTh label="Titel" sortKey="title" state={sort} onChange={setSort} />
                  <SortableTh label="Bereich" sortKey="scope" state={sort} onChange={setSort} />
                  <SortableTh label="Priorität" sortKey="priority" state={sort} onChange={setSort} />
                  <SortableTh label="Fällig" sortKey="dueDate" state={sort} onChange={setSort} />
                  <SortableTh label="Zuständig" sortKey="assignee" state={sort} onChange={setSort} />
                  <th className="px-3 py-2">Bezug</th>
                  <SortableTh label="Status" sortKey="status" state={sort} onChange={setSort} />
                  <SortableTh label="Erstellt" sortKey="createdAt" state={sort} onChange={setSort} />
                  <th className="px-3 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => {
                  const overdue = isOverdue(t);
                  const today = isToday(t);
                  const prio = PRIORITY_META[t.priority];
                  const scope = SCOPE_META[t.scope];
                  const veh = t.vehicleId ? vehicleMap[t.vehicleId] : undefined;
                  const proc = t.processId && processMap[t.processId] ? processMap[t.processId] : undefined;
                  return (
                    <tr
                      key={t.id}
                      className={cn(
                        "transition-smooth hover:bg-surface-elevated/40",
                        t.done && "opacity-60",
                        !t.done && overdue && "bg-destructive/5",
                        !t.done && today && "bg-warning/5",
                      )}
                    >
                      <td>
                        <Checkbox
                          checked={t.done}
                          onCheckedChange={() => toggleTodo(t.id)}
                          aria-label={t.done ? "Als offen markieren" : "Als erledigt markieren"}
                        />
                      </td>
                      <td className="max-w-[280px]">
                        <button
                          type="button"
                          onClick={() => setEditTodo(t)}
                          className="block text-left w-full group/title"
                        >
                          <p className={cn(
                            "font-medium text-foreground truncate leading-tight group-hover/title:text-primary-glow transition-smooth",
                            t.done && "line-through text-muted-foreground",
                          )}>
                            {t.title}
                          </p>
                          {t.tags && t.tags.length > 0 && (
                            <p className="text-[10px] text-muted-foreground truncate leading-tight">
                              {t.tags.map((x) => `#${x}`).join(" ")}
                            </p>
                          )}
                          {!!t.documents?.length && (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-primary-glow">
                              <Paperclip className="size-3" /> {t.documents.length} {t.documents.length === 1 ? "Dokument" : "Dokumente"}
                            </span>
                          )}
                        </button>
                      </td>
                      <td>
                        <Badge variant="outline" className={cn(scope.className, "text-[10px] px-1.5 py-0")}>
                          {scope.label}
                        </Badge>
                      </td>
                      <td>
                        <Select value={t.priority} onValueChange={(v) => updateTodo(t.id, { priority: v as TodoPriority })} disabled={section === "agreements"}>
                          <SelectTrigger className={cn("h-6 px-1.5 text-[10px] gap-1 border w-auto", prio.className)}>
                            <span className={cn("size-1.5 rounded-full", prio.dot)} />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">Hoch</SelectItem>
                            <SelectItem value="medium">Mittel</SelectItem>
                            <SelectItem value="low">Niedrig</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className={cn(
                        "whitespace-nowrap",
                        overdue ? "text-destructive font-medium" : today ? "text-warning font-medium" : "text-muted-foreground",
                      )}>
                        {t.dueDate ? (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="size-3" />
                            {formatDate(t.dueDate)}
                            {overdue && <span className="text-[10px]">· überfällig</span>}
                            {today && <span className="text-[10px]">· heute</span>}
                          </span>
                        ) : "–"}
                      </td>
                      <td className="text-muted-foreground truncate max-w-[120px]">{t.assignee ?? "–"}</td>
                      <td>
                        {proc ? (
                          <button
                            type="button"
                            onClick={() => navigate(wp(`/vorgaenge/${proc.id}`))}
                            className="font-mono text-primary-glow hover:underline"
                          >
                            {proc.id}
                          </button>
                        ) : veh ? (
                          <button
                            type="button"
                            onClick={() => navigate(wp(`/bestand/${veh.id}`))}
                            className="inline-flex items-center gap-1 text-primary-glow hover:underline truncate max-w-[160px]"
                          >
                            <Car className="size-3 shrink-0" />
                            <span className="truncate">{veh.make} {veh.model}</span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </td>
                      <td>
                        {t.done ? (
                          <Badge className="bg-success/15 text-success border-success/30 text-[10px] px-1.5 py-0">Erledigt</Badge>
                        ) : overdue ? (
                          <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] px-1.5 py-0">Überfällig</Badge>
                        ) : today ? (
                          <Badge className="bg-warning/15 text-warning border-warning/30 text-[10px] px-1.5 py-0">Heute</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">Offen</Badge>
                        )}
                      </td>
                      <td className="text-muted-foreground whitespace-nowrap text-[10px]">{formatDate(t.createdAt)}</td>
                      <td>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground hover:text-destructive"
                          onClick={() => { removeTodo(t.id); toast.success("To-Do gelöscht."); }}
                          aria-label="Löschen"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTableShell>
          </div>

          <div className="sm:hidden space-y-2">
            {sorted.map((t) => {
              const overdue = isOverdue(t);
              const today = isToday(t);
              const prio = PRIORITY_META[t.priority];
              const scope = SCOPE_META[t.scope];
              const veh = t.vehicleId ? vehicleMap[t.vehicleId] : undefined;
              const proc = t.processId && processMap[t.processId] ? processMap[t.processId] : undefined;
              return (
                <Card
                  key={t.id}
                  className={cn(
                    "p-3",
                    t.done && "opacity-60",
                    !t.done && overdue && "border-destructive/30 bg-destructive/5",
                    !t.done && today && "border-warning/30 bg-warning/5",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      checked={t.done}
                      onCheckedChange={() => toggleTodo(t.id)}
                      aria-label={t.done ? "Als offen markieren" : "Als erledigt markieren"}
                      className="mt-1 shrink-0"
                    />
                    <button type="button" onClick={() => setEditTodo(t)} className="flex-1 min-w-0 text-left">
                      <p className={cn(
                        "font-medium text-foreground leading-tight text-sm",
                        t.done && "line-through text-muted-foreground",
                      )}>
                        {t.title}
                      </p>
                      {t.tags && t.tags.length > 0 && (
                        <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                          {t.tags.map((x) => `#${x}`).join(" ")}
                        </p>
                      )}
                      {!!t.documents?.length && (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-primary-glow">
                          <Paperclip className="size-3" /> {t.documents.length} {t.documents.length === 1 ? "Dokument" : "Dokumente"}
                        </span>
                      )}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => { removeTodo(t.id); toast.success("To-Do gelöscht."); }}
                      aria-label="Löschen"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className={cn(scope.className, "text-[10px] px-1.5 py-0")}>{scope.label}</Badge>
                    <Badge variant="outline" className={cn(prio.className, "text-[10px] px-1.5 py-0 gap-1")}>
                      <span className={cn("size-1.5 rounded-full", prio.dot)} /> {prio.label}
                    </Badge>
                    {t.done ? (
                      <Badge className="bg-success/15 text-success border-success/30 text-[10px] px-1.5 py-0">Erledigt</Badge>
                    ) : overdue ? (
                      <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] px-1.5 py-0">Überfällig</Badge>
                    ) : today ? (
                      <Badge className="bg-warning/15 text-warning border-warning/30 text-[10px] px-1.5 py-0">Heute</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">Offen</Badge>
                    )}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-2 text-xs border-t border-border/50 pt-2.5">
                    <span className={cn(
                      "inline-flex items-center gap-1",
                      overdue ? "text-destructive font-medium" : today ? "text-warning font-medium" : "text-muted-foreground",
                    )}>
                      {t.dueDate ? <><Calendar className="size-3" /> {formatDate(t.dueDate)}</> : "Kein Datum"}
                    </span>
                    {proc ? (
                      <button type="button" onClick={() => navigate(wp(`/vorgaenge/${proc.id}`))} className="font-mono text-primary-glow hover:underline">
                        {proc.id}
                      </button>
                    ) : veh ? (
                      <button type="button" onClick={() => navigate(wp(`/bestand/${veh.id}`))} className="inline-flex items-center gap-1 text-primary-glow hover:underline truncate max-w-[160px]">
                        <Car className="size-3 shrink-0" />
                        <span className="truncate">{veh.make} {veh.model}</span>
                      </button>
                    ) : t.assignee ? (
                      <span className="text-muted-foreground truncate">{t.assignee}</span>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Neues To-Do</DialogTitle></DialogHeader>
          <TodoForm
            onSubmit={(data) => {
              addTodo(data);
              toast.success("To-Do angelegt.");
              setCreateOpen(false);
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTodo} onOpenChange={(o) => !o && setEditTodo(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{section === "agreements" ? "Kundenvereinbarung bearbeiten" : "To-Do bearbeiten"}</DialogTitle>
          </DialogHeader>
          {editTodo && (
            section === "agreements" ? (
              <AgreementForm
                key={editTodo.id}
                initial={editTodo}
                onSubmit={(data) => {
                  updateTodo(editTodo.id, data);
                  toast.success("Kundenvereinbarung aktualisiert.");
                  setEditTodo(null);
                }}
                onCancel={() => setEditTodo(null)}
                onDelete={() => {
                  removeTodo(editTodo.id);
                  toast.success("Kundenvereinbarung gelöscht.");
                  setEditTodo(null);
                }}
              />
            ) : (
              <TodoForm
                key={editTodo.id}
                initial={editTodo}
                submitLabel="Speichern"
                onDocumentsChange={(documents) => {
                  updateTodo(editTodo.id, { documents });
                  setEditTodo((current) => current ? { ...current, documents } : current);
                }}
                onSubmit={(data) => {
                  updateTodo(editTodo.id, data);
                  toast.success("To-Do aktualisiert.");
                  setEditTodo(null);
                }}
                onCancel={() => setEditTodo(null)}
                onDelete={() => {
                  removeTodo(editTodo.id);
                  toast.success("To-Do gelöscht.");
                  setEditTodo(null);
                }}
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default Todos;

// ---------------------------------------------------------------------------
// Todo Form (Create + Edit)
// ---------------------------------------------------------------------------

const AgreementForm = ({
  initial, onSubmit, onCancel, onDelete,
}: {
  initial: Todo;
  onSubmit: (data: Pick<Todo, "title" | "dueDate">) => void;
  onCancel: () => void;
  onDelete: () => void;
}) => {
  const [title, setTitle] = useState(initial.title);
  const [dueDate, setDueDate] = useState(initial.dueDate ?? "");

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Vereinbarung *</Label>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Fällig am</Label>
        <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
      </div>
      <DialogFooter className="gap-2 sm:justify-between">
        <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="size-4 mr-1.5" /> Löschen
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
          <Button
            onClick={() => {
              if (!title.trim()) {
                toast.error("Bitte eine Vereinbarung eingeben.");
                return;
              }
              onSubmit({ title: title.trim(), dueDate: dueDate || undefined });
            }}
          >
            Speichern
          </Button>
        </div>
      </DialogFooter>
    </div>
  );
};

type TodoFormData = Omit<Todo, "id" | "createdAt" | "createdBy" | "done">;

const TodoForm = ({
  initial, submitLabel = "Anlegen", onSubmit, onCancel, onDelete, onDocumentsChange,
}: {
  initial?: Todo;
  submitLabel?: string;
  onSubmit: (data: TodoFormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onDocumentsChange?: (documents: StoredDocument[]) => void;
}) => {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priority, setPriority] = useState<TodoPriority>(initial?.priority ?? "medium");
  const [scope, setScope] = useState<TodoScope>(initial?.scope ?? "general");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "");
  const [assignee, setAssignee] = useState(initial?.assignee ?? "");
  const [tagsRaw, setTagsRaw] = useState((initial?.tags ?? []).join(", "));
  const [documents, setDocuments] = useState<StoredDocument[]>(initial?.documents ?? []);

  const submit = () => {
    if (!title.trim()) {
      toast.error("Bitte einen Titel eingeben.");
      return;
    }
    if ((startTime || endTime) && !dueDate) {
      toast.error("Für Uhrzeiten bitte auch ein Datum angeben.");
      return;
    }
    if (startTime && endTime && endTime <= startTime) {
      toast.error("Endzeit muss nach Startzeit liegen.");
      return;
    }
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      scope,
      dueDate: dueDate || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      assignee: assignee.trim() || undefined,
      tags: tagsRaw.split(",").map((t) => t.trim()).filter(Boolean),
      vehicleId: initial?.vehicleId,
      processId: initial?.processId,
      documents,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Titel *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Was muss getan werden?" autoFocus />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Beschreibung</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Optionale Details…" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Priorität</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TodoPriority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high">Hoch</SelectItem>
              <SelectItem value="medium">Mittel</SelectItem>
              <SelectItem value="low">Niedrig</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Bereich</Label>
          <Select value={scope} onValueChange={(v) => setScope(v as TodoScope)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(SCOPE_META) as TodoScope[]).map((s) => (
                <SelectItem key={s} value={s}>{SCOPE_META[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Fällig am</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Zuständig</Label>
          <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="z. B. Max" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Von (optional)</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={!dueDate} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Bis (optional)</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={!dueDate} />
        </div>
      </div>
      {dueDate && startTime && endTime && (
        <p className="text-[10px] text-muted-foreground -mt-2">
          Bei Speichern wird automatisch ein verknüpfter Kalendereintrag erzeugt.
        </p>
      )}

      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Tags (Komma-getrennt)</Label>
        <Input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="büro, dringend, telefon" />
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-background/30 p-4">
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Dokumentenablage</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            {initial ? "Unterlagen zu diesem To-do hochladen oder hineinziehen." : "Dokumente können direkt nach dem Anlegen im To-do ergänzt werden."}
          </p>
        </div>
        {initial && (
          <DocumentManager
            documents={documents}
            entityType="todo"
            entityId={initial.id}
            onChange={(next) => {
              setDocuments(next);
              onDocumentsChange?.(next);
            }}
            compact
          />
        )}
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        {onDelete ? (
          <Button variant="outline" onClick={onDelete} className="gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10">
            <Trash2 className="size-3.5" /> Löschen
          </Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="gap-1.5"><X className="size-3.5" /> Abbrechen</Button>
          <Button onClick={submit} className="bg-gradient-brand gap-1.5"><Flag className="size-3.5" /> {submitLabel}</Button>
        </div>
      </DialogFooter>
    </div>
  );
};

