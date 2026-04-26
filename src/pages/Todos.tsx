import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  Plus, Trash2, X, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useProcessStore } from "@/store/processStore";
import {
  Todo, TodoPriority, TodoScope, formatDate,
} from "@/data/process";
import { useTopbarSearch } from "@/context/TopbarSearchContext";
import { DataTableShell } from "@/components/shared/DataTableShell";
import { SortableTh, SortState } from "@/components/shared/SortableTh";

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
  const todos = useProcessStore((s) => s.todos);
  const vehicles = useProcessStore((s) => s.vehicles);
  const processes = useProcessStore((s) => s.processes);
  const addTodo = useProcessStore((s) => s.addTodo);
  const toggleTodo = useProcessStore((s) => s.toggleTodo);
  const removeTodo = useProcessStore((s) => s.removeTodo);
  const updateTodo = useProcessStore((s) => s.updateTodo);

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

  // ---- Topbar-Suche -------------------------------------------------------
  const topbarSearch = useMemo(() => ({
    placeholder: "To-Dos durchsuchen…",
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
  }), [query, searchField]);
  useTopbarSearch(topbarSearch);

  // ---- Helpers ------------------------------------------------------------
  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles]);
  const processMap = useMemo(() => Object.fromEntries(processes.map((p) => [p.id, p])), [processes]);

  const todayISO = toISO(new Date());
  const isOverdue = (t: Todo) => !t.done && !!t.dueDate && t.dueDate < todayISO;
  const isToday   = (t: Todo) => !t.done && t.dueDate === todayISO;

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
  }, [todos, statusFilter, scopeFilter, priorityFilter, dueFilter, dueRange, query, searchField, todayISO]);

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
  }, [filtered, sort, todayISO]);

  // ---- Stats --------------------------------------------------------------
  const stats = useMemo(() => ({
    open:    todos.filter((t) => !t.done).length,
    today:   todos.filter((t) => isToday(t)).length,
    overdue: todos.filter((t) => isOverdue(t)).length,
    done:    todos.filter((t) => t.done).length,
    all:     todos.length,
  }), [todos, todayISO]);

  // ---- Render -------------------------------------------------------------
  return (
    <AppShell>
      <div className="space-y-3 animate-fade-in">
        {/* Header — kompakt */}
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">To-Dos</h1>
            <p className="text-xs text-muted-foreground">Eigenständige Aufgaben · sortier- und filterbar</p>
          </div>
          <Button
            size="sm"
            className="bg-gradient-brand hover:opacity-90 shadow-elegant gap-2"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" /> Neues To-Do
          </Button>
        </div>

        {/* KPI-Strip kompakt */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0">
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
        <Card className="px-3 py-2 flex items-center gap-2 flex-wrap shrink-0">
          <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as typeof scopeFilter)}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Bereich" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Bereiche</SelectItem>
              {(Object.keys(SCOPE_META) as TodoScope[]).map((s) => (
                <SelectItem key={s} value={s}>{SCOPE_META[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as typeof priorityFilter)}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Priorität" /></SelectTrigger>
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
            <SelectTrigger className="w-[170px] h-8 text-xs gap-1">
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
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
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
          <div className="flex gap-1.5 flex-wrap">
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
                className="h-8 text-xs"
                onClick={() => setStatusFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </Card>

        {sorted.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">Keine To-Dos gefunden.</Card>
        ) : (
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
                        </button>
                      </td>
                      <td>
                        <Badge variant="outline" className={cn(scope.className, "text-[10px] px-1.5 py-0")}>
                          {scope.label}
                        </Badge>
                      </td>
                      <td>
                        <Select value={t.priority} onValueChange={(v) => updateTodo(t.id, { priority: v as TodoPriority })}>
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
                        {veh ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/bestand/${veh.id}`)}
                            className="inline-flex items-center gap-1 text-primary-glow hover:underline truncate max-w-[160px]"
                          >
                            <Car className="size-3 shrink-0" />
                            <span className="truncate">{veh.make} {veh.model}</span>
                          </button>
                        ) : proc ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/vorgaenge/${proc.id}`)}
                            className="font-mono text-primary-glow hover:underline"
                          >
                            {proc.id}
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>To-Do bearbeiten</DialogTitle></DialogHeader>
          {editTodo && (
            <TodoForm
              key={editTodo.id}
              initial={editTodo}
              submitLabel="Speichern"
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

type TodoFormData = Omit<Todo, "id" | "createdAt" | "createdBy" | "done">;

const TodoForm = ({
  initial, submitLabel = "Anlegen", onSubmit, onCancel, onDelete,
}: {
  initial?: Todo;
  submitLabel?: string;
  onSubmit: (data: TodoFormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
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

      <div className="grid grid-cols-2 gap-3">
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Fällig am</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Zuständig</Label>
          <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="z. B. Max" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
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

