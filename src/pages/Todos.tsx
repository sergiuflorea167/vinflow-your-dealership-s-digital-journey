import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
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
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  AlertTriangle, Calendar, Car, CheckCircle2, Clock, Flag, Inbox,
  ListChecks, Plus, Tag as TagIcon, Trash2, User as UserIcon, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useProcessStore } from "@/store/processStore";
import {
  Todo, TodoPriority, TodoScope, formatDate,
} from "@/data/process";
import { useTopbarSearch } from "@/context/TopbarSearchContext";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITY_META: Record<TodoPriority, { label: string; className: string; dot: string }> = {
  high:   { label: "Hoch",     className: "bg-destructive/15 text-destructive border-destructive/30", dot: "bg-destructive" },
  medium: { label: "Mittel",   className: "bg-warning/15 text-warning border-warning/30",             dot: "bg-warning" },
  low:    { label: "Niedrig",  className: "bg-info/15 text-info border-info/30",                       dot: "bg-info" },
};

const SCOPE_META: Record<TodoScope, { label: string; className: string }> = {
  general:              { label: "Allgemein",        className: "bg-secondary text-secondary-foreground border-border" },
  internal_pre_purchase:{ label: "Vor Einkauf",      className: "bg-info/10 text-info border-info/30" },
  internal_fleet:       { label: "Bestand",          className: "bg-primary/10 text-primary-glow border-primary/30" },
  offer:                { label: "Angebot",          className: "bg-accent/10 text-accent-foreground border-accent/30" },
  order_confirmation:   { label: "Auftragsbest.",    className: "bg-success/10 text-success border-success/30" },
  outbound_check:       { label: "Ausgangskontrolle",className: "bg-warning/10 text-warning border-warning/30" },
};

type FilterTab = "open" | "today" | "overdue" | "done" | "all";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const Todos = () => {
  const todos = useProcessStore((s) => s.todos);
  const vehicles = useProcessStore((s) => s.vehicles);
  const processes = useProcessStore((s) => s.processes);
  const addTodo = useProcessStore((s) => s.addTodo);
  const toggleTodo = useProcessStore((s) => s.toggleTodo);
  const removeTodo = useProcessStore((s) => s.removeTodo);
  const updateTodo = useProcessStore((s) => s.updateTodo);

  const [tab, setTab] = useState<FilterTab>("open");
  const [scopeFilter, setScopeFilter] = useState<"all" | TodoScope>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TodoPriority>("all");
  const [query, setQuery] = useState("");
  const [searchField, setSearchField] = useState<"all" | "title" | "tag" | "assignee">("all");
  const [createOpen, setCreateOpen] = useState(false);

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

  const todayISO = new Date().toISOString().slice(0, 10);

  const isOverdue = (t: Todo) => !t.done && !!t.dueDate && t.dueDate < todayISO;
  const isToday   = (t: Todo) => !t.done && t.dueDate === todayISO;

  // ---- Filterung ----------------------------------------------------------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return todos.filter((t) => {
      // Tab
      if (tab === "open"    && t.done) return false;
      if (tab === "done"    && !t.done) return false;
      if (tab === "today"   && !isToday(t)) return false;
      if (tab === "overdue" && !isOverdue(t)) return false;

      if (scopeFilter !== "all" && t.scope !== scopeFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;

      if (q) {
        const fields: string[] = [];
        if (searchField === "all" || searchField === "title")    fields.push(t.title.toLowerCase(), (t.description ?? "").toLowerCase());
        if (searchField === "all" || searchField === "tag")      fields.push(...(t.tags ?? []).map((x) => x.toLowerCase()));
        if (searchField === "all" || searchField === "assignee") fields.push((t.assignee ?? "").toLowerCase());
        if (!fields.some((f) => f.includes(q))) return false;
      }
      return true;
    });
  }, [todos, tab, scopeFilter, priorityFilter, query, searchField, todayISO]);

  // Sortierung: überfällig → heute → datiert (asc) → undatiert; innerhalb prio (high→low)
  const sorted = useMemo(() => {
    const prioWeight: Record<TodoPriority, number> = { high: 0, medium: 1, low: 2 };
    return [...filtered].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const ao = isOverdue(a) ? 0 : isToday(a) ? 1 : a.dueDate ? 2 : 3;
      const bo = isOverdue(b) ? 0 : isToday(b) ? 1 : b.dueDate ? 2 : 3;
      if (ao !== bo) return ao - bo;
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
      if (prioWeight[a.priority] !== prioWeight[b.priority]) return prioWeight[a.priority] - prioWeight[b.priority];
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  }, [filtered]);

  // ---- Stats für Tab-Badges ----------------------------------------------
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
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-gradient-brand grid place-items-center shadow-glow">
              <ListChecks className="size-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold tracking-tight">To-Dos</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Eigenständige Aufgaben — unabhängig von Kunden oder Fahrzeugen.
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-gradient-brand gap-2">
            <Plus className="size-4" /> Neues To-Do
          </Button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Inbox className="size-4 text-info" />}              label="Offen"       value={stats.open}    accent="bg-info/15" />
          <StatCard icon={<Calendar className="size-4 text-warning" />}        label="Heute fällig" value={stats.today}   accent="bg-warning/15" />
          <StatCard icon={<AlertTriangle className="size-4 text-destructive" />} label="Überfällig"  value={stats.overdue} accent="bg-destructive/15" />
          <StatCard icon={<CheckCircle2 className="size-4 text-success" />}    label="Erledigt"    value={stats.done}    accent="bg-success/15" />
        </div>

        {/* Tabs + Filter */}
        <Card className="p-5 bg-card border-border shadow-card">
          <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <TabsList className="bg-background/40">
                <TabsTrigger value="open">
                  Offen <Badge variant="outline" className="ml-2">{stats.open}</Badge>
                </TabsTrigger>
                <TabsTrigger value="today">
                  Heute <Badge variant="outline" className="ml-2">{stats.today}</Badge>
                </TabsTrigger>
                <TabsTrigger value="overdue">
                  Überfällig <Badge variant="outline" className="ml-2">{stats.overdue}</Badge>
                </TabsTrigger>
                <TabsTrigger value="done">
                  Erledigt <Badge variant="outline" className="ml-2">{stats.done}</Badge>
                </TabsTrigger>
                <TabsTrigger value="all">
                  Alle <Badge variant="outline" className="ml-2">{stats.all}</Badge>
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2 flex-wrap">
                <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as typeof scopeFilter)}>
                  <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Bereich" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Bereiche</SelectItem>
                    {(Object.keys(SCOPE_META) as TodoScope[]).map((s) => (
                      <SelectItem key={s} value={s}>{SCOPE_META[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as typeof priorityFilter)}>
                  <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Priorität" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Prioritäten</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="low">Niedrig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value={tab} className="mt-5">
              {sorted.length === 0 ? (
                <EmptyState onCreate={() => setCreateOpen(true)} />
              ) : (
                <ul className="space-y-2">
                  {sorted.map((t) => (
                    <TodoRow
                      key={t.id}
                      todo={t}
                      vehicleName={t.vehicleId ? `${vehicleMap[t.vehicleId]?.make ?? ""} ${vehicleMap[t.vehicleId]?.model ?? ""}`.trim() : undefined}
                      processId={t.processId && processMap[t.processId] ? t.processId : undefined}
                      overdue={isOverdue(t)}
                      today={isToday(t)}
                      onToggle={() => toggleTodo(t.id)}
                      onDelete={() => { removeTodo(t.id); toast.success("To-Do gelöscht."); }}
                      onUpdate={(p) => updateTodo(t.id, p)}
                    />
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Neues To-Do</DialogTitle></DialogHeader>
          <CreateTodoForm
            onSubmit={(data) => {
              addTodo(data);
              toast.success("To-Do angelegt.");
              setCreateOpen(false);
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default Todos;

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

const StatCard = ({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) => (
  <Card className="p-4 bg-card border-border shadow-card flex items-center gap-3">
    <div className={cn("size-9 rounded-lg grid place-items-center shrink-0", accent)}>{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-2xl font-display font-bold leading-tight">{value}</p>
    </div>
  </Card>
);

const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div className="text-center py-12 border border-dashed border-border rounded-xl">
    <div className="size-12 rounded-2xl bg-secondary mx-auto grid place-items-center mb-3">
      <ListChecks className="size-6 text-muted-foreground" />
    </div>
    <p className="text-sm text-muted-foreground mb-4">Hier ist gerade nichts zu tun.</p>
    <Button onClick={onCreate} variant="outline" className="gap-2">
      <Plus className="size-4" /> To-Do erstellen
    </Button>
  </div>
);

// ---- Row ------------------------------------------------------------------

const TodoRow = ({
  todo, vehicleName, processId, overdue, today, onToggle, onDelete, onUpdate,
}: {
  todo: Todo;
  vehicleName?: string;
  processId?: string;
  overdue: boolean;
  today: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (p: Partial<Todo>) => void;
}) => {
  const prio = PRIORITY_META[todo.priority];
  const scope = SCOPE_META[todo.scope];

  return (
    <li
      className={cn(
        "group rounded-xl border p-4 transition-smooth flex items-start gap-3",
        todo.done
          ? "bg-background/30 border-border opacity-70"
          : overdue
            ? "bg-destructive/5 border-destructive/30 hover:border-destructive/50"
            : today
              ? "bg-warning/5 border-warning/30 hover:border-warning/50"
              : "bg-background/40 border-border hover:border-primary/40",
      )}
    >
      <Checkbox
        checked={todo.done}
        onCheckedChange={onToggle}
        className="mt-1 shrink-0"
        aria-label={todo.done ? "Als offen markieren" : "Als erledigt markieren"}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className={cn("font-display font-semibold text-foreground break-words", todo.done && "line-through text-muted-foreground")}>
              {todo.title}
            </p>
            {todo.description && (
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line break-words">{todo.description}</p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Select value={todo.priority} onValueChange={(v) => onUpdate({ priority: v as TodoPriority })}>
              <SelectTrigger className={cn("h-7 px-2 text-xs gap-1.5 border", prio.className)}>
                <span className={cn("size-1.5 rounded-full", prio.dot)} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">Hoch</SelectItem>
                <SelectItem value="medium">Mittel</SelectItem>
                <SelectItem value="low">Niedrig</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={onDelete} aria-label="Löschen">
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Meta-Zeile */}
        <div className="flex items-center gap-2 mt-2.5 flex-wrap text-xs">
          <Badge variant="outline" className={scope.className}>{scope.label}</Badge>

          {todo.dueDate && (
            <span className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 border",
              overdue ? "border-destructive/40 text-destructive bg-destructive/10"
                : today ? "border-warning/40 text-warning bg-warning/10"
                : "border-border text-muted-foreground bg-background/40",
            )}>
              <Calendar className="size-3" />
              {formatDate(todo.dueDate)}
              {overdue && <span className="font-semibold">· überfällig</span>}
              {today && <span className="font-semibold">· heute</span>}
            </span>
          )}

          {todo.assignee && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <UserIcon className="size-3" /> {todo.assignee}
            </span>
          )}

          {vehicleName && (
            <RouterLink
              to={`/bestand/${todo.vehicleId}`}
              className="inline-flex items-center gap-1 text-primary-glow hover:underline"
            >
              <Car className="size-3" /> {vehicleName}
            </RouterLink>
          )}

          {processId && (
            <RouterLink
              to={`/vorgaenge/${processId}`}
              className="inline-flex items-center gap-1 text-primary-glow hover:underline font-mono"
            >
              {processId}
            </RouterLink>
          )}

          {todo.tags?.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-secondary text-secondary-foreground px-1.5 py-0.5">
              <TagIcon className="size-3" /> {tag}
            </span>
          ))}

          <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground/70">
            <Clock className="size-3" /> {formatDate(todo.createdAt)}
          </span>
        </div>
      </div>
    </li>
  );
};

// ---- Create Form ----------------------------------------------------------

const CreateTodoForm = ({
  onSubmit, onCancel,
}: {
  onSubmit: (data: Omit<Todo, "id" | "createdAt" | "createdBy" | "done">) => void;
  onCancel: () => void;
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("medium");
  const [scope, setScope] = useState<TodoScope>("general");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");

  const submit = () => {
    if (!title.trim()) {
      toast.error("Bitte einen Titel eingeben.");
      return;
    }
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      scope,
      dueDate: dueDate || undefined,
      assignee: assignee.trim() || undefined,
      tags: tagsRaw.split(",").map((t) => t.trim()).filter(Boolean),
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

      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Tags (Komma-getrennt)</Label>
        <Input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="büro, dringend, telefon" />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} className="gap-1.5"><X className="size-3.5" /> Abbrechen</Button>
        <Button onClick={submit} className="bg-gradient-brand gap-1.5"><Flag className="size-3.5" /> Anlegen</Button>
      </DialogFooter>
    </div>
  );
};
