import { useProcessStore } from "@/store/processStore";
import { KPI_CATALOG } from "@/lib/kpis";
import { PROCESS_STEPS, vehicleTotalCostsGross } from "@/data/process";

const appLink = (path: string) => path.startsWith("/") ? path : `/${path}`;

/**
 * Erstellt ausschließlich den für die konkrete Frage notwendigen Kontext.
 * Direkte Kundenkennungen, VIN und Kontaktdaten verlassen den Browser nicht.
 * Die vollständige To-Do-Liste wird transparent als Arbeitskontext übertragen.
 */
export function buildVincentContext(question = "") {
  const state = useProcessStore.getState();
  const { vehicles, processes, offers, customers, todos, calendarEvents, settings } = state;
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const range = { from: yearStart, to: now, label: `YTD ${now.getFullYear()}` };
  const kpiContext = { vehicles, processes, offers, customers, processStepKeys: settings.processStepKeys, range };
  const normalizedQuestion = question.toLocaleLowerCase("de-DE");
  const wantsStock = /(bestand|fahrzeug|standzeit|lager|modell|verkauf)/.test(normalizedQuestion);
  const wantsProcesses = /(vorgang|prozess|pipeline|auftrag|schritt|abschluss)/.test(normalizedQuestion);
  const wantsTodos = /(todo|to-do|termin|heute|priorit|aufgabe|kalender)/.test(normalizedQuestion);
  const wantsKpis = /(kpi|umsatz|marge|rendite|gewinn|quote|performance|kennzahl|kosten)/.test(normalizedQuestion);

  const kpis = wantsKpis || (!wantsStock && !wantsProcesses && !wantsTodos)
    ? KPI_CATALOG.map((kpi) => {
        try {
          const result = kpi.compute(kpiContext);
          return {
            id: kpi.id,
            label: kpi.label,
            category: kpi.category,
            url: appLink("/kpis"),
            value: result.value,
            display: result.display,
            sub: result.sub,
            interpretation: kpi.interpretation,
          };
        } catch {
          return null;
        }
      }).filter(Boolean)
    : undefined;

  const pipeline = PROCESS_STEPS.map((step) => ({
    key: step.key,
    label: step.label,
    count: processes.filter((process) => process.currentStep === step.key && process.steps[step.key].status !== "completed").length,
  }));

  const stock = wantsStock
    ? vehicles
        .filter((vehicle) => vehicle.status === "in_stock" || vehicle.status === "reserved")
        .slice(0, 20)
        .map((vehicle) => ({
          id: vehicle.id,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          url: appLink(`/bestand/${encodeURIComponent(vehicle.id)}`),
          km: vehicle.mileage,
          status: vehicle.status,
          purchasePrice: vehicle.purchasePrice,
          listPrice: vehicle.listPrice,
          costs: vehicleTotalCostsGross(vehicle),
          arrivedAt: vehicle.arrivedAt,
        }))
    : undefined;

  const processOverview = wantsProcesses
    ? processes.slice(0, 20).map((process) => {
        const vehicle = vehicles.find((item) => item.id === process.vehicleId);
        return {
          id: process.id,
          step: process.currentStep,
          url: appLink(`/vorgaenge/${encodeURIComponent(process.id)}`),
          vehicle: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : null,
          vehicleUrl: vehicle ? appLink(`/bestand/${encodeURIComponent(vehicle.id)}`) : null,
          finalPrice: process.fields.finalPrice ?? null,
          createdAt: process.createdAt,
        };
      })
    : undefined;

  const today = now.toISOString().slice(0, 10);
  const todoOverview = {
    total: todos.filter((todo) => !todo.done).length,
    overdue: todos.filter((todo) => !todo.done && !!todo.dueDate && todo.dueDate < today).length,
    today: todos.filter((todo) => !todo.done && todo.dueDate === today).length,
    highPriority: todos.filter((todo) => !todo.done && todo.priority === "high").length,
    items: todos.map((todo) => {
      const vehicle = todo.vehicleId ? vehicles.find((item) => item.id === todo.vehicleId) : undefined;
      const process = todo.processId ? processes.find((item) => item.id === todo.processId) : undefined;
      return {
        id: todo.id,
        title: todo.title,
        url: appLink(`/todos?todo=${encodeURIComponent(todo.id)}`),
        description: todo.description ?? null,
        priority: todo.priority,
        done: todo.done,
        dueDate: todo.dueDate ?? null,
        startTime: todo.startTime ?? null,
        endTime: todo.endTime ?? null,
        scope: todo.scope,
        tags: todo.tags ?? [],
        assignee: todo.assignee ?? null,
        createdAt: todo.createdAt,
        completedAt: todo.completedAt ?? null,
        createdBy: todo.createdBy,
        vehicle: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : null,
        vehicleUrl: vehicle ? appLink(`/bestand/${encodeURIComponent(vehicle.id)}`) : null,
        process: process?.id ?? null,
        processUrl: process ? appLink(`/vorgaenge/${encodeURIComponent(process.id)}`) : null,
      };
    }),
  };
  const eventOverview = wantsTodos
    ? calendarEvents.filter((event) => event.date === today).reduce<Record<string, number>>((acc, event) => {
        acc[event.type] = (acc[event.type] ?? 0) + 1;
        return acc;
      }, {})
    : undefined;

  return {
    generatedAt: now.toISOString(),
    range: { from: range.from.toISOString(), to: range.to.toISOString(), label: range.label },
    counts: {
      vehicles: vehicles.length,
      processes: processes.length,
      offers: offers.length,
      customers: customers.length,
      openTodos: todos.filter((todo) => !todo.done).length,
    },
    links: {
      dashboard: appLink("/"),
      todos: appLink("/todos"),
      stock: appLink("/bestand"),
      processes: appLink("/vorgaenge"),
      kpis: appLink("/kpis"),
      calendar: appLink("/kalender"),
    },
    pipeline,
    ...(kpis ? { kpis } : {}),
    ...(stock ? { stock } : {}),
    ...(processOverview ? { processes: processOverview } : {}),
    todos: todoOverview,
    ...(eventOverview ? { todayEvents: eventOverview } : {}),
  };
}
