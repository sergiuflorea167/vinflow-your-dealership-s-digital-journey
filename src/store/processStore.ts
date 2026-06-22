import { create } from "zustand";
import {
  MOCK_PROCESSES,
  MOCK_VEHICLES,
  MOCK_CUSTOMERS,
  MOCK_OFFERS,
  MOCK_PURCHASE_PLANS,
  MOCK_TODOS,
  MOCK_ACTIVITIES,
  MOCK_GOALS,
  MOCK_CALENDAR_EVENTS,
  DEFAULT_DAY_TEMPLATES,
  DEFAULT_SETTINGS,
  DEMO_DELIVERY_ANCHORS,
  PROCESS_STEPS,
  Process,
  Vehicle,
  Customer,
  Offer,
  PurchasePlan,
  PurchasePlanNote,
  ProcessStepKey,
  ProcessFields,
  VehicleLocation,
  CostEntry,
  Todo,
  TodoScope,
  TodoPriority,
  Activity,
  ActivityType,
  Goal,
  Settings,
  Partner,
  CalendarEvent,
  CalendarEventType,
  DayTemplate,
  buildEmptySteps,
  DEFAULT_OUTBOUND_CHECKLIST,
  getFirstProcessStepKey,
  getLastProcessStepKey,
  getNextProcessStepKey,
  normalizeProcessStepKeys,
  stepIndex,
} from "@/data/process";

interface State {
  dataVersion: string;
  vehicles: Vehicle[];
  customers: Customer[];
  offers: Offer[];
  purchasePlans: PurchasePlan[];
  processes: Process[];
  todos: Todo[];
  activities: Activity[];
  goals: Goal[];
  calendarEvents: CalendarEvent[];
  dayTemplates: DayTemplate[];
  settings: Settings;

  // ------- Selectors -------
  getProcess: (id: string) => Process | undefined;
  getVehicle: (id: string) => Vehicle | undefined;
  getCustomer: (id: string) => Customer | undefined;
  getOffer: (id: string) => Offer | undefined;
  getOffersForVehicle: (vehicleId: string) => Offer[];
  getProcessForVehicle: (vehicleId: string) => Process | undefined;
  getActivitiesFor: (q: { vehicleId?: string; processId?: string; customerId?: string }) => Activity[];
  getTodosFor: (q: { vehicleId?: string; processId?: string; scope?: TodoScope }) => Todo[];

  // ------- Process -------
  /** Schritt verbindlich „buchen" (Validierung in UI). Pflichtfelder werden fixiert, Beleg ist aber noch nicht erzeugt. */
  bookStep: (processId: string, stepKey: ProcessStepKey) => void;
  /** Buchung wieder lösen (z. B. um Felder zu korrigieren). */
  unbookStep: (processId: string, stepKey: ProcessStepKey) => void;
  completeStep: (processId: string, stepKey: ProcessStepKey) => void;
  skipStep: (processId: string, stepKey: ProcessStepKey) => void;
  cancelStep: (processId: string, stepKey: ProcessStepKey) => void;
  updateProcessFields: (processId: string, patch: Partial<ProcessFields>) => void;

  // Customer-To-Dos auf AB
  addProcessCustomerTodo: (processId: string, title: string) => void;
  removeProcessCustomerTodo: (processId: string, todoId: string) => void;
  toggleProcessCustomerTodo: (processId: string, todoId: string) => void;
  setProcessCustomerTodoDueDate: (processId: string, todoId: string, dueDate?: string) => void;

  // Outbound checklist
  toggleOutboundChecklistItem: (processId: string, itemId: string) => void;
  addOutboundChecklistItem: (processId: string, label: string) => void;
  removeOutboundChecklistItem: (processId: string, itemId: string) => void;
  setOutboundChecklistItemDueDate: (processId: string, itemId: string, dueDate?: string) => void;

  // ------- Vehicle -------
  addVehicle: (v: Omit<Vehicle, "id" | "status" | "locationHistory" | "costs"> & { status?: Vehicle["status"]; locationHistory?: VehicleLocation[]; costs?: CostEntry[] }) => Vehicle;
  updateVehicle: (vehicleId: string, patch: Partial<Vehicle>) => void;
  changeVehicleLocation: (vehicleId: string, location: VehicleLocation) => void;
  addVehicleCost: (vehicleId: string, cost: Omit<CostEntry, "id" | "createdAt" | "createdBy">) => void;
  removeVehicleCost: (vehicleId: string, costId: string) => void;
  /** Setzt den Inseratstatus. Erstellt / schließt automatisch das To-Do „Inserat erstellen". */
  setVehicleListed: (vehicleId: string, listed: boolean) => void;

  // ------- Customer -------
  addCustomer: (c: Omit<Customer, "id">) => Customer;
  updateCustomer: (id: string, patch: Partial<Omit<Customer, "id">>) => void;

  // ------- Offer -------
  addOffer: (o: Omit<Offer, "id" | "createdAt" | "status" | "customerTodos"> & { status?: Offer["status"]; customerTodos?: Offer["customerTodos"] }) => Offer;
  updateOffer: (offerId: string, patch: Partial<Omit<Offer, "id" | "createdAt" | "vehicleId">>) => void;
  updateOfferStatus: (offerId: string, status: Offer["status"]) => void;
  addOfferCustomerTodo: (offerId: string, title: string) => void;
  removeOfferCustomerTodo: (offerId: string, todoId: string) => void;
  acceptOffer: (offerId: string) => Process | undefined;
  /** Direkter Verkauf ohne formelles Angebot. */
  startProcessForVehicle: (args: { vehicleId: string; customerId: string; price: number }) => Process | undefined;

  // ------- Purchase plan -------
  addPurchasePlan: (p: Omit<PurchasePlan, "id" | "createdAt" | "status" | "noteEntries"> & { status?: PurchasePlan["status"]; initialNote?: string }) => PurchasePlan;
  updatePurchasePlan: (id: string, patch: Partial<Omit<PurchasePlan, "id" | "createdAt" | "noteEntries">>) => void;
  updatePurchasePlanStatus: (id: string, status: PurchasePlan["status"]) => void;
  addPurchasePlanNote: (id: string, text: string) => void;
  removePurchasePlanNote: (id: string, noteId: string) => void;
  removePurchasePlan: (id: string) => void;
  convertPlanToVehicle: (planId: string, vehicle: Omit<Vehicle, "id" | "status" | "locationHistory" | "costs">) => Vehicle | undefined;

  // ------- Todos -------
  addTodo: (t: Omit<Todo, "id" | "createdAt" | "createdBy" | "done">) => Todo;
  toggleTodo: (id: string) => void;
  updateTodo: (id: string, patch: Partial<Omit<Todo, "id" | "createdAt" | "createdBy">>) => void;
  removeTodo: (id: string) => void;

  // ------- Calendar -------
  addCalendarEvent: (e: Omit<CalendarEvent, "id" | "createdAt" | "createdBy">) => CalendarEvent;
  updateCalendarEvent: (id: string, patch: Partial<Omit<CalendarEvent, "id" | "createdAt" | "createdBy">>) => void;
  removeCalendarEvent: (id: string) => void;
  toggleCalendarEventDone: (id: string) => void;
  /** Tagesstruktur aus einem Template erzeugen (überschreibt vorhandene Blöcke des Tages). */
  applyDayTemplate: (templateId: string, date: string) => void;
  /** Day-Template anlegen / aktualisieren / löschen. */
  upsertDayTemplate: (tpl: DayTemplate) => void;
  removeDayTemplate: (id: string) => void;

  // ------- Goals & Settings -------
  addGoal: (g: Omit<Goal, "id">) => Goal;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addSettingsLocation: (name: string) => void;
  removeSettingsLocation: (name: string) => void;

  // ------- Partner -------
  addPartner: (p: Omit<Partner, "id" | "createdAt">) => Partner;
  updatePartner: (id: string, patch: Partial<Omit<Partner, "id" | "createdAt">>) => void;
  removePartner: (id: string) => void;
}

const nextNumericId = (prefix: string, list: { id: string }[]) => {
  const nums = list.map((i) => parseInt(i.id.replace(/\D+/g, "").slice(-4) || "0", 10)).filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
};

const randomId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const DATA_VERSION = "2026-05-30-supabase-v1";

// Vollständig leerer Startzustand. Daten kommen ausschließlich aus Supabase.
// Frisch registrierte Organisationen starten ohne Inhalte.
const LEGACY_STORE_NAMES = ["vinflow-store-v1","vinflow-store-v2","vinflow-store-v3","vinflow-store-v4","vinflow-store-v5","vinflow-store-v6","vinflow-store-v7","vinflow-store-v8"];
if (typeof window !== "undefined") {
  LEGACY_STORE_NAMES.forEach((key) => window.localStorage.removeItem(key));
}

export const seedDataState = (): Pick<State, "dataVersion" | "vehicles" | "customers" | "offers" | "purchasePlans" | "processes" | "todos" | "activities" | "goals" | "calendarEvents" | "dayTemplates" | "settings"> => ({
  dataVersion: DATA_VERSION,
  vehicles: [],
  customers: [],
  offers: [],
  purchasePlans: [],
  processes: [],
  todos: [],
  activities: [],
  goals: [],
  calendarEvents: [],
  dayTemplates: DEFAULT_DAY_TEMPLATES,
  settings: DEFAULT_SETTINGS,
});

// Felder, die in Supabase persistiert werden
export const PERSISTED_KEYS = [
  "dataVersion","vehicles","customers","offers","purchasePlans","processes",
  "todos","activities","goals","calendarEvents","dayTemplates","settings",
] as const;

/**
 * Mirrored-Todo IDs sind virtuelle IDs für To-Dos, die aus Vorgängen abgeleitet sind.
 * Format: mir|<kind>|<processId>|<itemId>
 * kind: "ct" = customerTodosOC (AB-To-Do), "oc" = outboundChecklist (Ausgangskontrolle)
 */
export const mirroredTodoId = (kind: "ct" | "oc", processId: string, itemId: string) =>
  `mir|${kind}|${processId}|${itemId}`;

const parseMirroredId = (id: string): { kind: "ct" | "oc"; processId: string; itemId: string } | null => {
  if (!id.startsWith("mir|")) return null;
  const parts = id.split("|");
  if (parts.length !== 4) return null;
  const kind = parts[1] as "ct" | "oc";
  if (kind !== "ct" && kind !== "oc") return null;
  return { kind, processId: parts[2], itemId: parts[3] };
};

export const useProcessStore = create<State>()(
  (set, get) => {
      // Helper: Activity-Log einfügen (state-mutator)
      const logActivity = (
        state: State,
        type: ActivityType,
        message: string,
        extra: { vehicleId?: string; processId?: string; customerId?: string; meta?: Record<string, string | number | boolean> } = {}
      ): Activity[] => {
        const activity: Activity = {
          id: randomId("A"),
          type,
          message,
          timestamp: new Date().toISOString(),
          user: state.settings.userName || "Admin",
          ...extra,
        };
        return [activity, ...state.activities].slice(0, 1000);
      };

      return {
        ...seedDataState(),

        getProcess: (id) => get().processes.find((p) => p.id === id),
        getVehicle: (id) => get().vehicles.find((v) => v.id === id),
        getCustomer: (id) => get().customers.find((c) => c.id === id),
        getOffer: (id) => get().offers.find((o) => o.id === id),
        getOffersForVehicle: (vehicleId) => get().offers.filter((o) => o.vehicleId === vehicleId),
        getProcessForVehicle: (vehicleId) => get().processes.find((p) => p.vehicleId === vehicleId),
        getActivitiesFor: ({ vehicleId, processId, customerId }) =>
          get().activities.filter((a) =>
            (vehicleId ? a.vehicleId === vehicleId : true) &&
            (processId ? a.processId === processId : true) &&
            (customerId ? a.customerId === customerId : true)
          ),
        getTodosFor: ({ vehicleId, processId, scope }) =>
          get().todos.filter((t) =>
            (vehicleId ? t.vehicleId === vehicleId : true) &&
            (processId ? t.processId === processId : true) &&
            (scope ? t.scope === scope : true)
          ),

        // ------- Process -------
        bookStep: (processId, stepKey) =>
          set((state) => {
            const process = state.processes.find((p) => p.id === processId);
            if (!process) return state;
            const rec = process.steps[stepKey];
            // Nur den aktuell aktiven Schritt buchen, sofern noch nicht erledigt.
            if (!rec || rec.status !== "active" || rec.bookedAt) return state;
            return {
              ...state,
              processes: state.processes.map((p) =>
                p.id !== processId
                  ? p
                  : {
                      ...p,
                      updatedAt: new Date().toISOString(),
                      steps: { ...p.steps, [stepKey]: { ...rec, bookedAt: new Date().toISOString() } },
                    }
              ),
              activities: logActivity(
                state,
                "process_step_completed",
                `Schritt „${PROCESS_STEPS[stepIndex(stepKey)].label}" gebucht – bereit zur Belegerzeugung`,
                { processId, vehicleId: process.vehicleId, meta: { step: stepKey, action: "booked" } }
              ),
            };
          }),

        unbookStep: (processId, stepKey) =>
          set((state) => {
            const process = state.processes.find((p) => p.id === processId);
            if (!process) return state;
            const rec = process.steps[stepKey];
            if (!rec || !rec.bookedAt) return state;
            return {
              ...state,
              processes: state.processes.map((p) =>
                p.id !== processId
                  ? p
                  : {
                      ...p,
                      updatedAt: new Date().toISOString(),
                      steps: { ...p.steps, [stepKey]: { ...rec, bookedAt: undefined } },
                    }
              ),
            };
          }),

        completeStep: (processId, stepKey) =>
          set((state) => {
            const process = state.processes.find((p) => p.id === processId);
            if (!process) return state;
            const idx = stepIndex(stepKey);
            const activeStepKeys = normalizeProcessStepKeys(state.settings.processStepKeys);
            const nextStepKey = getNextProcessStepKey(stepKey, activeStepKeys);
            const nextStep = nextStepKey ? PROCESS_STEPS.find((s) => s.key === nextStepKey) : undefined;
            const isLastStep = !nextStepKey;

            const updatedProcesses = state.processes.map((p) => {
              if (p.id !== processId) return p;
              return {
                ...p,
                currentStep: nextStepKey ?? p.currentStep,
                updatedAt: new Date().toISOString(),
                steps: {
                  ...p.steps,
                  [stepKey]: { ...p.steps[stepKey], status: "completed" as const, completedAt: new Date().toISOString(), documentArchived: true },
                  ...(nextStepKey ? { [nextStepKey]: { ...p.steps[nextStepKey], status: "active" as const } } : {}),
                },
              };
            });

            const updatedVehicles = isLastStep
              ? state.vehicles.map((v) => (v.id === process.vehicleId ? { ...v, status: "sold" as const } : v))
              : state.vehicles;

            return {
              ...state,
              processes: updatedProcesses,
              vehicles: updatedVehicles,
              activities: logActivity(state, "process_step_completed", `Schritt „${PROCESS_STEPS[idx].label}" abgeschlossen`, { processId, vehicleId: process.vehicleId, meta: { step: stepKey } }),
            };
          }),

        skipStep: (processId, stepKey) =>
          set((state) => {
            const process = state.processes.find((p) => p.id === processId);
            if (!process) return state;
            const idx = stepIndex(stepKey);
            const activeStepKeys = normalizeProcessStepKeys(state.settings.processStepKeys);
            const nextStepKey = getNextProcessStepKey(stepKey, activeStepKeys);
            if (!nextStepKey) return state;

            const updatedProcesses = state.processes.map((p) => {
              if (p.id !== processId) return p;
              return {
                ...p,
                currentStep: nextStepKey,
                updatedAt: new Date().toISOString(),
                steps: {
                  ...p.steps,
                  [stepKey]: { ...p.steps[stepKey], status: "skipped" as const, completedAt: new Date().toISOString() },
                  [nextStepKey]: { ...p.steps[nextStepKey], status: "active" as const },
                },
              };
            });

            return {
              ...state,
              processes: updatedProcesses,
              activities: logActivity(state, "process_step_skipped", `Schritt „${PROCESS_STEPS[idx].label}" übersprungen`, { processId, vehicleId: process.vehicleId, meta: { step: stepKey } }),
            };
          }),

        cancelStep: (processId, stepKey) =>
          set((state) => {
            const process = state.processes.find((p) => p.id === processId);
            if (!process) return state;
            const idx = stepIndex(stepKey);
            // Only allow cancelling steps that were completed or skipped.
            const record = process.steps[stepKey];
            if (!record || (record.status !== "completed" && record.status !== "skipped")) return state;
            const activeStepKeys = normalizeProcessStepKeys(state.settings.processStepKeys);
            const activeSet = new Set(activeStepKeys);

            const updatedProcesses = state.processes.map((p) => {
              if (p.id !== processId) return p;
              const newSteps = { ...p.steps };
              // Reset selected step to active and all later steps to pending.
              PROCESS_STEPS.forEach((s, i) => {
                if (i < idx) return; // keep earlier steps as-is
                if (!activeSet.has(s.key)) {
                  newSteps[s.key] = { ...newSteps[s.key], status: "skipped" };
                  return;
                }
                if (i === idx) {
                  newSteps[s.key] = { status: "active" };
                } else {
                  newSteps[s.key] = { status: "pending" };
                }
              });
              return {
                ...p,
                currentStep: stepKey,
                updatedAt: new Date().toISOString(),
                steps: newSteps,
              };
            });

            // If the final step had been completed, the vehicle was marked sold.
            // Reverting any step → vehicle should go back to "reserved".
            const updatedVehicles = state.vehicles.map((v) =>
              v.id === process.vehicleId && v.status === "sold" ? { ...v, status: "reserved" as const } : v
            );

            return {
              ...state,
              processes: updatedProcesses,
              vehicles: updatedVehicles,
              activities: logActivity(
                state,
                "process_step_cancelled",
                `Beleg „${PROCESS_STEPS[idx].label}" storniert – Schritt zur Bearbeitung freigegeben`,
                { processId, vehicleId: process.vehicleId, meta: { step: stepKey } }
              ),
            };
          }),

        updateProcessFields: (processId, patch) =>
          set((state) => ({
            processes: state.processes.map((p) =>
              p.id !== processId ? p : { ...p, fields: { ...p.fields, ...patch }, updatedAt: new Date().toISOString() }
            ),
          })),

        addProcessCustomerTodo: (processId, title) =>
          set((state) => ({
            processes: state.processes.map((p) =>
              p.id !== processId ? p : {
                ...p,
                customerTodosOC: [...p.customerTodosOC, { id: randomId("ct"), title }],
                updatedAt: new Date().toISOString(),
              }
            ),
          })),

        removeProcessCustomerTodo: (processId, todoId) =>
          set((state) => ({
            processes: state.processes.map((p) =>
              p.id !== processId ? p : { ...p, customerTodosOC: p.customerTodosOC.filter((t) => t.id !== todoId), updatedAt: new Date().toISOString() }
            ),
          })),

        toggleOutboundChecklistItem: (processId, itemId) =>
          set((state) => ({
            processes: state.processes.map((p) =>
              p.id !== processId ? p : { ...p, outboundChecklist: p.outboundChecklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) }
            ),
          })),

        addOutboundChecklistItem: (processId, label) =>
          set((state) => ({
            processes: state.processes.map((p) =>
              p.id !== processId ? p : { ...p, outboundChecklist: [...p.outboundChecklist, { id: randomId("c"), label, done: false }] }
            ),
          })),

        removeOutboundChecklistItem: (processId, itemId) =>
          set((state) => ({
            processes: state.processes.map((p) =>
              p.id !== processId ? p : { ...p, outboundChecklist: p.outboundChecklist.filter((c) => c.id !== itemId) }
            ),
          })),

        toggleProcessCustomerTodo: (processId, todoId) =>
          set((state) => ({
            processes: state.processes.map((p) =>
              p.id !== processId ? p : {
                ...p,
                customerTodosOC: p.customerTodosOC.map((t) =>
                  t.id === todoId ? { ...t, done: !t.done } : t
                ),
                updatedAt: new Date().toISOString(),
              }
            ),
          })),

        setProcessCustomerTodoDueDate: (processId, todoId, dueDate) =>
          set((state) => ({
            processes: state.processes.map((p) =>
              p.id !== processId ? p : {
                ...p,
                customerTodosOC: p.customerTodosOC.map((t) =>
                  t.id === todoId ? { ...t, dueDate } : t
                ),
                updatedAt: new Date().toISOString(),
              }
            ),
          })),

        setOutboundChecklistItemDueDate: (processId, itemId, dueDate) =>
          set((state) => ({
            processes: state.processes.map((p) =>
              p.id !== processId ? p : {
                ...p,
                outboundChecklist: p.outboundChecklist.map((c) =>
                  c.id === itemId ? { ...c, dueDate } : c
                ),
                updatedAt: new Date().toISOString(),
              }
            ),
          })),

        // ------- Vehicle -------
        addVehicle: (v) => {
          const id = nextNumericId("V", get().vehicles);
          const vehicle: Vehicle = {
            id,
            status: v.status ?? "in_stock",
            locationHistory: v.locationHistory ?? [],
            costs: v.costs ?? [],
            ...v,
          };
          // Wenn das Fahrzeug noch nicht inseriert ist UND nicht verkauft, auto-To-Do erzeugen.
          const needsListingTodo = !vehicle.listed?.active && vehicle.status !== "sold";
          set((state) => {
            const todoId = `TD-${String(state.todos.length + 1).padStart(3, "0")}`;
            const nowIso = new Date().toISOString();
            const due = new Date();
            due.setDate(due.getDate() + 3);
            const autoTodo: Todo | null = needsListingTodo
              ? {
                  id: todoId,
                  title: "Inserat erstellen",
                  description: `Online-Inserat für ${vehicle.make} ${vehicle.model} (${vehicle.id}) anlegen.`,
                  priority: "medium",
                  scope: "internal_fleet",
                  done: false,
                  vehicleId: id,
                  dueDate: due.toISOString(),
                  tags: ["inserat", "auto"],
                  createdAt: nowIso,
                  createdBy: state.settings.userName || "System",
                }
              : null;
            const baseActivities = logActivity(state, "vehicle_added", `${vehicle.make} ${vehicle.model} aufgenommen`, { vehicleId: id });
            return {
              vehicles: [vehicle, ...state.vehicles],
              todos: autoTodo ? [autoTodo, ...state.todos] : state.todos,
              activities: autoTodo
                ? logActivity({ ...state, activities: baseActivities }, "todo_created", `To-Do automatisch erstellt: Inserat für ${vehicle.make} ${vehicle.model}`, { vehicleId: id })
                : baseActivities,
            };
          });
          return vehicle;
        },

        changeVehicleLocation: (vehicleId, location) =>
          set((state) => {
            const vehicle = state.vehicles.find((v) => v.id === vehicleId);
            if (!vehicle) return state;
            return {
              ...state,
              vehicles: state.vehicles.map((v) =>
                v.id !== vehicleId ? v : { ...v, location, locationHistory: [vehicle.location, ...v.locationHistory] }
              ),
              activities: logActivity(state, "vehicle_location_changed", `${vehicle.make} ${vehicle.model} → ${location.name}`, { vehicleId }),
            };
          }),

        updateVehicle: (vehicleId, patch) =>
          set((state) => {
            const vehicle = state.vehicles.find((v) => v.id === vehicleId);
            if (!vehicle) return state;
            return {
              ...state,
              vehicles: state.vehicles.map((v) => (v.id === vehicleId ? { ...v, ...patch } : v)),
              activities: logActivity(
                state,
                "vehicle_updated",
                `${vehicle.make} ${vehicle.model} aktualisiert`,
                { vehicleId, meta: { fields: Object.keys(patch).join(", ") } }
              ),
            };
          }),

        addVehicleCost: (vehicleId, cost) =>
          set((state) => {
            const vehicle = state.vehicles.find((v) => v.id === vehicleId);
            if (!vehicle) return state;
            const entry: CostEntry = {
              id: randomId("K"),
              createdAt: new Date().toISOString(),
              createdBy: state.settings.userName || "Admin",
              ...cost,
            };
            return {
              ...state,
              vehicles: state.vehicles.map((v) => (v.id !== vehicleId ? v : { ...v, costs: [entry, ...v.costs] })),
              activities: logActivity(state, "vehicle_cost_added", `Kosten ${entry.description} (${entry.netAmount.toFixed(2)} € netto)`, { vehicleId, meta: { category: cost.category } }),
            };
          }),

        removeVehicleCost: (vehicleId, costId) =>
          set((state) => ({
            vehicles: state.vehicles.map((v) => (v.id !== vehicleId ? v : { ...v, costs: v.costs.filter((c) => c.id !== costId) })),
          })),

        setVehicleListed: (vehicleId, listed) =>
          set((state) => {
            const vehicle = state.vehicles.find((v) => v.id === vehicleId);
            if (!vehicle) return state;

            const nowIso = new Date().toISOString();
            const updatedVehicles = state.vehicles.map((v) =>
              v.id !== vehicleId
                ? v
                : {
                    ...v,
                    listed: listed
                      ? { active: true, listedAt: nowIso, portals: v.listed?.portals }
                      : { active: false, listedAt: v.listed?.listedAt, portals: v.listed?.portals },
                  }
            );

            // Auto-To-Do „Inserat erstellen" finden (offen, am Fahrzeug, mit Tag „auto").
            const findAutoTodo = (todos: Todo[]) =>
              todos.find(
                (t) =>
                  t.vehicleId === vehicleId &&
                  !t.done &&
                  t.title === "Inserat erstellen" &&
                  (t.tags ?? []).includes("auto")
              );

            let updatedTodos = state.todos;
            if (listed) {
              const open = findAutoTodo(state.todos);
              if (open) {
                updatedTodos = state.todos.map((t) =>
                  t.id === open.id ? { ...t, done: true, completedAt: nowIso } : t
                );
              }
            } else {
              if (!findAutoTodo(state.todos)) {
                const due = new Date();
                due.setDate(due.getDate() + 3);
                const newTodo: Todo = {
                  id: `TD-${String(state.todos.length + 1).padStart(3, "0")}`,
                  title: "Inserat erstellen",
                  description: `Online-Inserat für ${vehicle.make} ${vehicle.model} (${vehicle.id}) anlegen.`,
                  priority: "medium",
                  scope: "internal_fleet",
                  done: false,
                  vehicleId,
                  dueDate: due.toISOString(),
                  tags: ["inserat", "auto"],
                  createdAt: nowIso,
                  createdBy: state.settings.userName || "System",
                };
                updatedTodos = [newTodo, ...state.todos];
              }
            }

            return {
              ...state,
              vehicles: updatedVehicles,
              todos: updatedTodos,
              activities: logActivity(
                state,
                "vehicle_updated",
                listed
                  ? `${vehicle.make} ${vehicle.model} als inseriert markiert`
                  : `${vehicle.make} ${vehicle.model} nicht mehr inseriert`,
                { vehicleId, meta: { listed } }
              ),
            };
          }),

        // ------- Customer -------
        addCustomer: (c) => {
          const id = nextNumericId("C", get().customers);
          const customer: Customer = { id, ...c };
          set((state) => ({
            customers: [customer, ...state.customers],
            activities: logActivity(state, "customer_added", `Neuer Kunde ${customer.name}`, { customerId: id }),
          }));
          return customer;
        },

        updateCustomer: (id, patch) => {
          set((state) => ({
            customers: state.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          }));
        },

        // ------- Offer -------
        addOffer: (o) => {
          const id = `OFR-${new Date().getFullYear()}-${String(get().offers.length + 1).padStart(4, "0")}`;
          const offer: Offer = {
            id,
            createdAt: new Date().toISOString(),
            status: o.status ?? "sent",
            customerTodos: o.customerTodos ?? [],
            ...o,
          };
          set((state) => ({
            offers: [offer, ...state.offers],
            activities: logActivity(state, "offer_created", `Angebot ${id} erstellt`, { vehicleId: o.vehicleId, customerId: o.customerId }),
          }));
          return offer;
        },

        updateOffer: (offerId, patch) =>
          set((state) => {
            const offer = state.offers.find((o) => o.id === offerId);
            if (!offer) return state;
            return {
              ...state,
              offers: state.offers.map((o) => (o.id === offerId ? { ...o, ...patch } : o)),
            };
          }),

        updateOfferStatus: (offerId, status) =>
          set((state) => {
            const offer = state.offers.find((o) => o.id === offerId);
            return {
              ...state,
              offers: state.offers.map((o) => (o.id === offerId ? { ...o, status } : o)),
              activities: status === "rejected" && offer
                ? logActivity(state, "offer_rejected", `Angebot ${offerId} abgelehnt`, { vehicleId: offer.vehicleId, customerId: offer.customerId })
                : state.activities,
            };
          }),

        addOfferCustomerTodo: (offerId, title) =>
          set((state) => ({
            offers: state.offers.map((o) =>
              o.id !== offerId ? o : { ...o, customerTodos: [...o.customerTodos, { id: randomId("ot"), title }] }
            ),
          })),

        removeOfferCustomerTodo: (offerId, todoId) =>
          set((state) => ({
            offers: state.offers.map((o) =>
              o.id !== offerId ? o : { ...o, customerTodos: o.customerTodos.filter((t) => t.id !== todoId) }
            ),
          })),

        acceptOffer: (offerId) => {
          const state = get();
          const offer = state.offers.find((o) => o.id === offerId);
          if (!offer) return undefined;

          const existing = state.processes.find((p) => p.vehicleId === offer.vehicleId);
          if (existing) return existing;

          const activeStepKeys = normalizeProcessStepKeys(state.settings.processStepKeys);
          const currentStep = activeStepKeys.includes("offer")
            ? getNextProcessStepKey("offer", activeStepKeys) ?? "offer"
            : getFirstProcessStepKey(activeStepKeys);
          const processId = `VF-${new Date().getFullYear()}-${String(state.processes.length + 142).padStart(4, "0")}`;
          const newProcess: Process = {
            id: processId,
            vehicleId: offer.vehicleId,
            customerId: offer.customerId,
            acceptedOfferId: offer.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            currentStep,
            steps: buildEmptySteps(currentStep, activeStepKeys),
            fields: { finalPrice: offer.price },
            // Übernehme Kunden-To-Dos aus dem Angebot
            customerTodosOC: offer.customerTodos.map((t) => ({ id: randomId("ct"), title: t.title })),
            outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST(),
          };
          // Markiere das Angebot als abgeschlossen + setze "offer"-Step
          newProcess.steps.offer = activeStepKeys.includes("offer")
            ? { status: "completed", completedAt: new Date().toISOString(), documentArchived: true }
            : { status: "skipped", completedAt: new Date().toISOString() };

          set((s) => ({
            processes: [newProcess, ...s.processes],
            offers: s.offers.map((o) => {
              if (o.id === offerId) return { ...o, status: "accepted" };
              if (o.vehicleId === offer.vehicleId && o.status === "sent") return { ...o, status: "rejected" };
              return o;
            }),
            vehicles: s.vehicles.map((v) => (v.id === offer.vehicleId ? { ...v, status: "reserved" } : v)),
            activities: [
              {
                id: randomId("A"),
                type: "process_created" as ActivityType,
                message: `Vorgang ${processId} angelegt`,
                timestamp: new Date().toISOString(),
                user: s.settings.userName || "Admin",
                processId,
                vehicleId: offer.vehicleId,
                customerId: offer.customerId,
              },
              {
                id: randomId("A"),
                type: "offer_accepted" as ActivityType,
                message: `Angebot ${offerId} angenommen`,
                timestamp: new Date().toISOString(),
                user: s.settings.userName || "Admin",
                vehicleId: offer.vehicleId,
                customerId: offer.customerId,
              },
              ...s.activities,
            ],
          }));

          return newProcess;
        },

        startProcessForVehicle: ({ vehicleId, customerId, price }) => {
          const state = get();
          const vehicle = state.vehicles.find((v) => v.id === vehicleId);
          const customer = state.customers.find((c) => c.id === customerId);
          if (!vehicle || !customer) return undefined;

          const existing = state.processes.find((p) => p.vehicleId === vehicleId);
          if (existing) return existing;

          const activeStepKeys = normalizeProcessStepKeys(state.settings.processStepKeys);
          const currentStep = activeStepKeys.includes("offer")
            ? getNextProcessStepKey("offer", activeStepKeys) ?? getLastProcessStepKey(activeStepKeys)
            : getFirstProcessStepKey(activeStepKeys);
          const processId = `VF-${new Date().getFullYear()}-${String(state.processes.length + 142).padStart(4, "0")}`;
          const newProcess: Process = {
            id: processId,
            vehicleId,
            customerId,
            acceptedOfferId: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Angebot wird übersprungen, wir starten direkt bei Anzahlung
            currentStep,
            steps: buildEmptySteps(currentStep, activeStepKeys),
            fields: { finalPrice: price },
            customerTodosOC: [],
            outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST(),
          };
          newProcess.steps.offer = activeStepKeys.length === 1 && activeStepKeys[0] === "offer"
            ? { status: "completed", completedAt: new Date().toISOString(), documentArchived: false }
            : { status: "skipped", completedAt: new Date().toISOString() };

          set((s) => ({
            processes: [newProcess, ...s.processes],
            vehicles: s.vehicles.map((v) => (v.id === vehicleId ? { ...v, status: "reserved" } : v)),
            activities: [
              {
                id: randomId("A"),
                type: "process_created" as ActivityType,
                message: `Direkter Verkauf ${processId} an ${customer.name} (Angebot übersprungen)`,
                timestamp: new Date().toISOString(),
                user: s.settings.userName || "Admin",
                processId,
                vehicleId,
                customerId,
              },
              ...s.activities,
            ],
          }));
          return newProcess;
        },

        // ------- Purchase plan -------
        addPurchasePlan: (p) => {
          const id = `PP-${new Date().getFullYear()}-${String(get().purchasePlans.length + 1).padStart(3, "0")}`;
          const nowIso = new Date().toISOString();
          const userName = get().settings.userName || "Admin";
          const { initialNote, ...rest } = p;
          const noteEntries: PurchasePlanNote[] = initialNote && initialNote.trim()
            ? [{ id: randomId("pn"), text: initialNote.trim(), createdAt: nowIso, createdBy: userName }]
            : [];
          const plan: PurchasePlan = {
            id,
            createdAt: nowIso,
            status: rest.status ?? "tracking",
            noteEntries,
            ...rest,
          };
          set((state) => ({
            purchasePlans: [plan, ...state.purchasePlans],
            activities: logActivity(state, "purchase_planned", `Einkauf verfolgt: ${plan.make} ${plan.model} (${id})`),
          }));
          return plan;
        },

        updatePurchasePlan: (id, patch) =>
          set((state) => ({
            purchasePlans: state.purchasePlans.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          })),

        updatePurchasePlanStatus: (id, status) =>
          set((state) => ({
            purchasePlans: state.purchasePlans.map((p) => (p.id === id ? { ...p, status } : p)),
          })),

        addPurchasePlanNote: (id, text) =>
          set((state) => {
            const trimmed = text.trim();
            if (!trimmed) return state;
            const note: PurchasePlanNote = {
              id: randomId("pn"),
              text: trimmed,
              createdAt: new Date().toISOString(),
              createdBy: state.settings.userName || "Admin",
            };
            return {
              purchasePlans: state.purchasePlans.map((p) =>
                p.id !== id ? p : { ...p, noteEntries: [...p.noteEntries, note] }
              ),
            };
          }),

        removePurchasePlanNote: (id, noteId) =>
          set((state) => ({
            purchasePlans: state.purchasePlans.map((p) =>
              p.id !== id ? p : { ...p, noteEntries: p.noteEntries.filter((n) => n.id !== noteId) }
            ),
          })),

        removePurchasePlan: (id) =>
          set((state) => ({
            purchasePlans: state.purchasePlans.filter((p) => p.id !== id),
          })),

        convertPlanToVehicle: (planId, vehicle) => {
          const plan = get().purchasePlans.find((p) => p.id === planId);
          if (!plan) return undefined;
          const newVehicle = get().addVehicle({ ...vehicle, status: "in_stock" });
          set((state) => ({
            purchasePlans: state.purchasePlans.map((p) => (p.id === planId ? { ...p, status: "received", vin: vehicle.vin } : p)),
            activities: logActivity(state, "purchase_received", `Einkauf ${planId} → Bestand: ${vehicle.make} ${vehicle.model}`, { vehicleId: newVehicle.id }),
          }));
          return newVehicle;
        },

        // ------- Todos -------
        addTodo: (t) => {
          const id = `TD-${String(get().todos.length + 1).padStart(3, "0")}`;
          const nowIso = new Date().toISOString();
          const createdBy = get().settings.userName || "Admin";

          // Optional: Verlinkten Kalender-Eintrag erzeugen
          let calendarEventId: string | undefined;
          let newEvent: CalendarEvent | undefined;
          if (t.dueDate && t.startTime && t.endTime) {
            calendarEventId = randomId("EV");
            newEvent = {
              id: calendarEventId,
              title: t.title,
              description: t.description,
              date: t.dueDate,
              startTime: t.startTime,
              endTime: t.endTime,
              type: "todo",
              vehicleId: t.vehicleId,
              processId: t.processId,
              todoId: id,
              done: false,
              createdAt: nowIso,
              createdBy,
            };
          }

          const todo: Todo = {
            id,
            createdAt: nowIso,
            createdBy,
            done: false,
            calendarEventId,
            ...t,
          };
          set((state) => ({
            todos: [todo, ...state.todos],
            calendarEvents: newEvent ? [newEvent, ...state.calendarEvents] : state.calendarEvents,
            activities: logActivity(state, "todo_created", `To-Do: ${todo.title}`, { vehicleId: t.vehicleId, processId: t.processId }),
          }));
          return todo;
        },

        toggleTodo: (id) => {
          // Mirrored process todos: id like mir-ct-<processId>-<itemId> or mir-oc-<processId>-<itemId>
          const mir = parseMirroredId(id);
          if (mir) {
            if (mir.kind === "ct") get().toggleProcessCustomerTodo(mir.processId, mir.itemId);
            else get().toggleOutboundChecklistItem(mir.processId, mir.itemId);
            return;
          }
          return (
          set((state) => {
            const todo = state.todos.find((t) => t.id === id);
            const willBeDone = todo ? !todo.done : false;
            const nowIso = new Date().toISOString();

            const updatedTodos = state.todos.map((t) =>
              t.id === id
                ? { ...t, done: !t.done, completedAt: !t.done ? nowIso : undefined }
                : t,
            );

            // Verlinktes Kalender-Event mit-aktualisieren
            const updatedEvents = todo?.calendarEventId
              ? state.calendarEvents.map((e) =>
                  e.id === todo.calendarEventId ? { ...e, done: willBeDone } : e,
                )
              : state.calendarEvents;

            // Sync: „Inserat erstellen"-Auto-To-Do ↔ Fahrzeug-Inseratstatus
            const isListingTodo =
              !!todo &&
              !!todo.vehicleId &&
              todo.title === "Inserat erstellen" &&
              (todo.tags ?? []).includes("auto");

            const updatedVehicles = isListingTodo
              ? state.vehicles.map((v) =>
                  v.id !== todo!.vehicleId
                    ? v
                    : {
                        ...v,
                        listed: willBeDone
                          ? { active: true, listedAt: nowIso, portals: v.listed?.portals }
                          : { active: false, listedAt: v.listed?.listedAt, portals: v.listed?.portals },
                      },
                )
              : state.vehicles;

            let activities = state.activities;
            if (todo && willBeDone) {
              activities = logActivity(state, "todo_completed", `To-Do erledigt: ${todo.title}`, { vehicleId: todo.vehicleId, processId: todo.processId });
            }
            if (isListingTodo) {
              const veh = state.vehicles.find((v) => v.id === todo!.vehicleId);
              if (veh) {
                activities = logActivity(
                  { ...state, activities },
                  "vehicle_updated",
                  willBeDone
                    ? `${veh.make} ${veh.model} automatisch als inseriert markiert`
                    : `${veh.make} ${veh.model} nicht mehr inseriert`,
                  { vehicleId: veh.id, meta: { listed: willBeDone } },
                );
              }
            }

            return {
              ...state,
              todos: updatedTodos,
              calendarEvents: updatedEvents,
              vehicles: updatedVehicles,
              activities,
            };
          }));
        },

        updateTodo: (id, patch) => {
          const mir = parseMirroredId(id);
          if (mir) {
            if (patch.dueDate !== undefined) {
              if (mir.kind === "ct") get().setProcessCustomerTodoDueDate(mir.processId, mir.itemId, patch.dueDate || undefined);
              else get().setOutboundChecklistItemDueDate(mir.processId, mir.itemId, patch.dueDate || undefined);
            }
            if (patch.done !== undefined) {
              if (mir.kind === "ct") get().toggleProcessCustomerTodo(mir.processId, mir.itemId);
              else get().toggleOutboundChecklistItem(mir.processId, mir.itemId);
            }
            return;
          }
          return (
          set((state) => {
            const prev = state.todos.find((t) => t.id === id);
            if (!prev) return state;
            const next: Todo = { ...prev, ...patch };
            const nowIso = new Date().toISOString();
            const createdBy = state.settings.userName || "Admin";

            // Kalender-Event synchronisieren / erzeugen / entfernen
            let calendarEvents = state.calendarEvents;
            let calendarEventId = next.calendarEventId;
            const hasSlot = !!(next.dueDate && next.startTime && next.endTime);

            if (hasSlot) {
              if (calendarEventId && calendarEvents.some((e) => e.id === calendarEventId)) {
                calendarEvents = calendarEvents.map((e) =>
                  e.id !== calendarEventId
                    ? e
                    : {
                        ...e,
                        title: next.title,
                        description: next.description,
                        date: next.dueDate!,
                        startTime: next.startTime!,
                        endTime: next.endTime!,
                        vehicleId: next.vehicleId,
                        processId: next.processId,
                        done: next.done,
                      },
                );
              } else {
                calendarEventId = randomId("EV");
                calendarEvents = [
                  {
                    id: calendarEventId,
                    title: next.title,
                    description: next.description,
                    date: next.dueDate!,
                    startTime: next.startTime!,
                    endTime: next.endTime!,
                    type: "todo",
                    vehicleId: next.vehicleId,
                    processId: next.processId,
                    todoId: id,
                    done: next.done,
                    createdAt: nowIso,
                    createdBy,
                  },
                  ...calendarEvents,
                ];
              }
            } else if (calendarEventId) {
              // Slot entfernt → Event löschen
              calendarEvents = calendarEvents.filter((e) => e.id !== calendarEventId);
              calendarEventId = undefined;
            }

            return {
              ...state,
              todos: state.todos.map((t) => (t.id === id ? { ...next, calendarEventId } : t)),
              calendarEvents,
            };
          }));
        },

        removeTodo: (id) => {
          const mir = parseMirroredId(id);
          if (mir) {
            if (mir.kind === "ct") get().removeProcessCustomerTodo(mir.processId, mir.itemId);
            else get().removeOutboundChecklistItem(mir.processId, mir.itemId);
            return;
          }
          return (
          set((state) => {
            const todo = state.todos.find((t) => t.id === id);
            return {
              ...state,
              todos: state.todos.filter((t) => t.id !== id),
              calendarEvents: todo?.calendarEventId
                ? state.calendarEvents.filter((e) => e.id !== todo.calendarEventId)
                : state.calendarEvents,
              activities: todo
                ? logActivity(state, "todo_deleted", `To-Do gelöscht: ${todo.title}`, { vehicleId: todo.vehicleId, processId: todo.processId })
                : state.activities,
            };
          }));
        },

        // ------- Calendar -------
        addCalendarEvent: (e) => {
          const event: CalendarEvent = {
            id: randomId("EV"),
            createdAt: new Date().toISOString(),
            createdBy: get().settings.userName || "Admin",
            ...e,
          };
          set((state) => ({ calendarEvents: [event, ...state.calendarEvents] }));
          return event;
        },

        updateCalendarEvent: (id, patch) => {
          const safePatch = Object.fromEntries(
            Object.entries(patch).filter(([, value]) => value !== undefined),
          ) as typeof patch;
          set((state) => ({
            calendarEvents: state.calendarEvents.map((e) => (e.id === id ? { ...e, ...safePatch } : e)),
            // Wenn Event mit To-Do verlinkt: Titel/Beschreibung/Slot zurück synchronisieren
            todos: state.todos.map((t) => {
              const ev = state.calendarEvents.find((e) => e.id === id);
              if (!ev || ev.todoId !== t.id) return t;
              return {
                ...t,
                title: safePatch.title ?? t.title,
                description: safePatch.description ?? t.description,
                dueDate: safePatch.date ?? t.dueDate,
                startTime: safePatch.startTime ?? t.startTime,
                endTime: safePatch.endTime ?? t.endTime,
              };
            }),
          }));
        },

        removeCalendarEvent: (id) =>
          set((state) => {
            const ev = state.calendarEvents.find((e) => e.id === id);
            return {
              calendarEvents: state.calendarEvents.filter((e) => e.id !== id),
              // Verlinkung am To-Do entfernen, To-Do selbst bleibt
              todos: ev?.todoId
                ? state.todos.map((t) => (t.id === ev.todoId ? { ...t, calendarEventId: undefined, startTime: undefined, endTime: undefined } : t))
                : state.todos,
            };
          }),

        toggleCalendarEventDone: (id) =>
          set((state) => {
            const ev = state.calendarEvents.find((e) => e.id === id);
            if (!ev) return state;
            const willBeDone = !ev.done;
            return {
              ...state,
              calendarEvents: state.calendarEvents.map((e) => (e.id === id ? { ...e, done: willBeDone } : e)),
              todos: ev.todoId
                ? state.todos.map((t) =>
                    t.id === ev.todoId ? { ...t, done: willBeDone, completedAt: willBeDone ? new Date().toISOString() : undefined } : t,
                  )
                : state.todos,
            };
          }),

        applyDayTemplate: (templateId, date) =>
          set((state) => {
            const tpl = state.dayTemplates.find((t) => t.id === templateId);
            if (!tpl) return state;
            const nowIso = new Date().toISOString();
            const createdBy = state.settings.userName || "Admin";
            // Nur Block-Events des gewählten Tages entfernen, Termine bleiben unangetastet
            const cleaned = state.calendarEvents.filter((e) => !(e.date === date && e.type === "block"));
            const newBlocks: CalendarEvent[] = tpl.blocks.map((b) => ({
              id: randomId("EV"),
              title: b.title,
              date,
              startTime: b.startTime,
              endTime: b.endTime,
              type: "block",
              createdAt: nowIso,
              createdBy,
            }));
            return { ...state, calendarEvents: [...newBlocks, ...cleaned] };
          }),

        upsertDayTemplate: (tpl) =>
          set((state) => ({
            dayTemplates: state.dayTemplates.some((t) => t.id === tpl.id)
              ? state.dayTemplates.map((t) => (t.id === tpl.id ? tpl : t))
              : [...state.dayTemplates, tpl],
          })),

        removeDayTemplate: (id) =>
          set((state) => ({
            dayTemplates: state.dayTemplates.filter((t) => t.id !== id),
          })),

        // ------- Goals -------
        addGoal: (g) => {
          const id = randomId("G");
          const goal: Goal = { id, ...g };
          set((state) => ({
            goals: [...state.goals, goal],
            activities: logActivity(state, "goal_updated", `Neues Ziel: ${goal.label}`),
          }));
          return goal;
        },

        updateGoal: (id, patch) =>
          set((state) => ({
            goals: state.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
            activities: logActivity(state, "goal_updated", `Ziel aktualisiert: ${patch.label ?? id}`),
          })),

        removeGoal: (id) =>
          set((state) => ({ goals: state.goals.filter((g) => g.id !== id) })),

        // ------- Settings -------
        updateSettings: (patch) =>
          set((state) => ({
            settings: { ...state.settings, ...patch },
            activities: logActivity(state, "settings_updated", `Einstellungen aktualisiert`),
          })),

        addSettingsLocation: (name) =>
          set((state) => ({
            settings: { ...state.settings, locations: Array.from(new Set([...state.settings.locations, name])) },
          })),

        removeSettingsLocation: (name) =>
          set((state) => ({
            settings: { ...state.settings, locations: state.settings.locations.filter((l) => l !== name) },
          })),

        // ------- Partner -------
        addPartner: (p) => {
          const id = nextNumericId("P", get().settings.partners ?? []);
          const partner: Partner = { id, createdAt: new Date().toISOString(), ...p };
          set((state) => ({
            settings: { ...state.settings, partners: [partner, ...(state.settings.partners ?? [])] },
          }));
          return partner;
        },

        updatePartner: (id, patch) =>
          set((state) => ({
            settings: {
              ...state.settings,
              partners: (state.settings.partners ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
            },
          })),

        removePartner: (id) =>
          set((state) => ({
            settings: {
              ...state.settings,
              partners: (state.settings.partners ?? []).filter((p) => p.id !== id),
            },
          })),
      };
    }
);
