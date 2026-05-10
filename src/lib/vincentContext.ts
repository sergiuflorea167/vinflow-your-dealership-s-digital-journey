// Baut einen kompakten Daten-Snapshot, den Vincent als Kontext bekommt.
import { useProcessStore } from "@/store/processStore";
import { KPI_CATALOG } from "@/lib/kpis";
import { PROCESS_STEPS, vehicleTotalCostsGross } from "@/data/process";

export function buildVincentContext() {
  const s = useProcessStore.getState();
  const { vehicles, processes, offers, customers, todos, calendarEvents } = s;

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const range = { from: yearStart, to: now, label: `YTD ${now.getFullYear()}` };
  const ctx = { vehicles, processes, offers, customers, range };

  const kpis = KPI_CATALOG.map((k) => {
    try {
      const r = k.compute(ctx);
      return {
        id: k.id,
        label: k.label,
        category: k.category,
        value: r.value,
        display: r.display,
        sub: r.sub,
        description: k.description,
        interpretation: k.interpretation,
      };
    } catch {
      return null;
    }
  }).filter(Boolean);

  const stepCounts = PROCESS_STEPS.map((step) => ({
    key: step.key,
    label: step.label,
    count: processes.filter(
      (p) => p.currentStep === step.key && p.steps[step.key].status !== "completed",
    ).length,
  }));

  const stockSlim = vehicles
    .filter((v) => v.status === "in_stock" || v.status === "reserved")
    .slice(0, 60)
    .map((v) => ({
      id: v.id,
      vin: v.vin,
      make: v.make,
      model: v.model,
      year: v.year,
      km: v.mileage,
      status: v.status,
      ek: v.purchasePrice,
      list: v.listPrice,
      kosten: vehicleTotalCostsGross(v),
      arrivedAt: v.arrivedAt,
    }));

  const processesSlim = processes.slice(0, 60).map((p) => {
    const v = vehicles.find((x) => x.id === p.vehicleId);
    const c = customers.find((x) => x.id === p.customerId);
    return {
      id: p.id,
      step: p.currentStep,
      vehicle: v ? `${v.make} ${v.model} (${v.year})` : null,
      customer: c ? c.name : null,
      finalPrice: p.fields.finalPrice ?? null,
      downPayment: p.fields.downPayment ?? null,
      createdAt: p.createdAt,
    };
  });

  const todoToday = new Date().toISOString().slice(0, 10);
  const openTodos = todos
    .filter((t) => !t.done)
    .slice(0, 40)
    .map((t) => ({
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate,
      assignee: t.assignee,
      overdue: t.dueDate && t.dueDate < todoToday,
    }));

  const todayEvents = calendarEvents
    .filter((e) => e.date === todoToday)
    .map((e) => ({ title: e.title, type: e.type, time: `${e.startTime}–${e.endTime}` }));

  return {
    generatedAt: now.toISOString(),
    range: { from: range.from.toISOString(), to: range.to.toISOString(), label: range.label },
    counts: {
      vehicles: vehicles.length,
      processes: processes.length,
      offers: offers.length,
      customers: customers.length,
      openTodos: todos.filter((t) => !t.done).length,
    },
    kpis,
    pipeline: stepCounts,
    todayEvents,
    openTodos,
    stock: stockSlim,
    processes: processesSlim,
  };
}
