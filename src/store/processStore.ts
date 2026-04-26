import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  MOCK_PROCESSES,
  MOCK_VEHICLES,
  MOCK_CUSTOMERS,
  MOCK_OFFERS,
  MOCK_PURCHASE_PLANS,
  MOCK_TODOS,
  MOCK_ACTIVITIES,
  MOCK_GOALS,
  DEFAULT_SETTINGS,
  PROCESS_STEPS,
  Process,
  Vehicle,
  Customer,
  Offer,
  PurchasePlan,
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
  buildEmptySteps,
  DEFAULT_OUTBOUND_CHECKLIST,
  stepIndex,
} from "@/data/process";

interface State {
  vehicles: Vehicle[];
  customers: Customer[];
  offers: Offer[];
  purchasePlans: PurchasePlan[];
  processes: Process[];
  todos: Todo[];
  activities: Activity[];
  goals: Goal[];
  settings: Settings;

  // ------- Selectors -------
  getProcess: (id: string) => Process | undefined;
  getVehicle: (id: string) => Vehicle | undefined;
  getCustomer: (id: string) => Customer | undefined;
  getOffer: (id: string) => Offer | undefined;
  getOffersForVehicle: (vehicleId: string) => Offer[];
  getProcessForVehicle: (vehicleId: string) => Process | undefined;
  getActivitiesFor: (q: { vehicleId?: string; processId?: string }) => Activity[];
  getTodosFor: (q: { vehicleId?: string; processId?: string; scope?: TodoScope }) => Todo[];

  // ------- Process -------
  completeStep: (processId: string, stepKey: ProcessStepKey) => void;
  skipStep: (processId: string, stepKey: ProcessStepKey) => void;
  cancelStep: (processId: string, stepKey: ProcessStepKey) => void;
  updateProcessFields: (processId: string, patch: Partial<ProcessFields>) => void;

  // Customer-To-Dos auf AB
  addProcessCustomerTodo: (processId: string, title: string) => void;
  removeProcessCustomerTodo: (processId: string, todoId: string) => void;

  // Outbound checklist
  toggleOutboundChecklistItem: (processId: string, itemId: string) => void;
  addOutboundChecklistItem: (processId: string, label: string) => void;
  removeOutboundChecklistItem: (processId: string, itemId: string) => void;

  // ------- Vehicle -------
  addVehicle: (v: Omit<Vehicle, "id" | "status" | "locationHistory" | "costs"> & { status?: Vehicle["status"]; locationHistory?: VehicleLocation[]; costs?: CostEntry[] }) => Vehicle;
  changeVehicleLocation: (vehicleId: string, location: VehicleLocation) => void;
  addVehicleCost: (vehicleId: string, cost: Omit<CostEntry, "id" | "createdAt" | "createdBy">) => void;
  removeVehicleCost: (vehicleId: string, costId: string) => void;

  // ------- Customer -------
  addCustomer: (c: Omit<Customer, "id">) => Customer;

  // ------- Offer -------
  addOffer: (o: Omit<Offer, "id" | "createdAt" | "status" | "customerTodos"> & { status?: Offer["status"]; customerTodos?: Offer["customerTodos"] }) => Offer;
  updateOfferStatus: (offerId: string, status: Offer["status"]) => void;
  addOfferCustomerTodo: (offerId: string, title: string) => void;
  removeOfferCustomerTodo: (offerId: string, todoId: string) => void;
  acceptOffer: (offerId: string) => Process | undefined;

  // ------- Purchase plan -------
  addPurchasePlan: (p: Omit<PurchasePlan, "id" | "createdAt" | "status"> & { status?: PurchasePlan["status"] }) => PurchasePlan;
  updatePurchasePlanStatus: (id: string, status: PurchasePlan["status"]) => void;
  convertPlanToVehicle: (planId: string, vehicle: Omit<Vehicle, "id" | "status" | "locationHistory" | "costs">) => Vehicle | undefined;

  // ------- Todos -------
  addTodo: (t: Omit<Todo, "id" | "createdAt" | "createdBy" | "done">) => Todo;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;

  // ------- Goals & Settings -------
  addGoal: (g: Omit<Goal, "id">) => Goal;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addSettingsLocation: (name: string) => void;
  removeSettingsLocation: (name: string) => void;
}

const nextNumericId = (prefix: string, list: { id: string }[]) => {
  const nums = list.map((i) => parseInt(i.id.replace(/\D+/g, "").slice(-4) || "0", 10)).filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
};

const randomId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const useProcessStore = create<State>()(
  persist(
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
        vehicles: MOCK_VEHICLES,
        customers: MOCK_CUSTOMERS,
        offers: MOCK_OFFERS,
        purchasePlans: MOCK_PURCHASE_PLANS,
        processes: MOCK_PROCESSES,
        todos: MOCK_TODOS,
        activities: MOCK_ACTIVITIES,
        goals: MOCK_GOALS,
        settings: DEFAULT_SETTINGS,

        getProcess: (id) => get().processes.find((p) => p.id === id),
        getVehicle: (id) => get().vehicles.find((v) => v.id === id),
        getCustomer: (id) => get().customers.find((c) => c.id === id),
        getOffer: (id) => get().offers.find((o) => o.id === id),
        getOffersForVehicle: (vehicleId) => get().offers.filter((o) => o.vehicleId === vehicleId),
        getProcessForVehicle: (vehicleId) => get().processes.find((p) => p.vehicleId === vehicleId),
        getActivitiesFor: ({ vehicleId, processId }) =>
          get().activities.filter((a) => (vehicleId ? a.vehicleId === vehicleId : true) && (processId ? a.processId === processId : true)),
        getTodosFor: ({ vehicleId, processId, scope }) =>
          get().todos.filter((t) =>
            (vehicleId ? t.vehicleId === vehicleId : true) &&
            (processId ? t.processId === processId : true) &&
            (scope ? t.scope === scope : true)
          ),

        // ------- Process -------
        completeStep: (processId, stepKey) =>
          set((state) => {
            const process = state.processes.find((p) => p.id === processId);
            if (!process) return state;
            const idx = stepIndex(stepKey);
            const nextStep = PROCESS_STEPS[idx + 1];
            const isLastStep = !nextStep;

            const updatedProcesses = state.processes.map((p) => {
              if (p.id !== processId) return p;
              return {
                ...p,
                currentStep: nextStep ? nextStep.key : p.currentStep,
                updatedAt: new Date().toISOString(),
                steps: {
                  ...p.steps,
                  [stepKey]: { ...p.steps[stepKey], status: "completed" as const, completedAt: new Date().toISOString(), documentArchived: true },
                  ...(nextStep ? { [nextStep.key]: { status: "active" as const } } : {}),
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
            const nextStep = PROCESS_STEPS[idx + 1];
            if (!nextStep) return state;

            const updatedProcesses = state.processes.map((p) => {
              if (p.id !== processId) return p;
              return {
                ...p,
                currentStep: nextStep.key,
                updatedAt: new Date().toISOString(),
                steps: {
                  ...p.steps,
                  [stepKey]: { ...p.steps[stepKey], status: "skipped" as const, completedAt: new Date().toISOString() },
                  [nextStep.key]: { status: "active" as const },
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

            const updatedProcesses = state.processes.map((p) => {
              if (p.id !== processId) return p;
              const newSteps = { ...p.steps };
              // Reset selected step to active and all later steps to pending.
              PROCESS_STEPS.forEach((s, i) => {
                if (i < idx) return; // keep earlier steps as-is
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
          set((state) => ({
            vehicles: [vehicle, ...state.vehicles],
            activities: logActivity(state, "vehicle_added", `${vehicle.make} ${vehicle.model} aufgenommen`, { vehicleId: id }),
          }));
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

          const processId = `VF-${new Date().getFullYear()}-${String(state.processes.length + 142).padStart(4, "0")}`;
          const newProcess: Process = {
            id: processId,
            vehicleId: offer.vehicleId,
            customerId: offer.customerId,
            acceptedOfferId: offer.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            currentStep: "down_payment",
            steps: buildEmptySteps("down_payment"),
            fields: { finalPrice: offer.price },
            // Übernehme Kunden-To-Dos aus dem Angebot
            customerTodosOC: offer.customerTodos.map((t) => ({ id: randomId("ct"), title: t.title })),
            outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST(),
          };
          // Markiere das Angebot als abgeschlossen + setze "offer"-Step
          newProcess.steps.offer = { status: "completed", completedAt: new Date().toISOString(), documentArchived: true };

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

        // ------- Purchase plan -------
        addPurchasePlan: (p) => {
          const id = `PP-${new Date().getFullYear()}-${String(get().purchasePlans.length + 1).padStart(3, "0")}`;
          const plan: PurchasePlan = { id, createdAt: new Date().toISOString(), status: p.status ?? "open", ...p };
          set((state) => ({
            purchasePlans: [plan, ...state.purchasePlans],
            activities: logActivity(state, "purchase_planned", `Einkaufsplan ${id}: ${plan.make} ${plan.model}`),
          }));
          return plan;
        },

        updatePurchasePlanStatus: (id, status) =>
          set((state) => ({
            purchasePlans: state.purchasePlans.map((p) => (p.id === id ? { ...p, status } : p)),
          })),

        convertPlanToVehicle: (planId, vehicle) => {
          const plan = get().purchasePlans.find((p) => p.id === planId);
          if (!plan) return undefined;
          const newVehicle = get().addVehicle({ ...vehicle, status: "in_stock" });
          set((state) => ({
            purchasePlans: state.purchasePlans.map((p) => (p.id === planId ? { ...p, status: "received", vin: vehicle.vin } : p)),
            activities: logActivity(state, "purchase_received", `Einkaufsplan ${planId} eingetroffen → ${vehicle.make} ${vehicle.model}`, { vehicleId: newVehicle.id }),
          }));
          return newVehicle;
        },

        // ------- Todos -------
        addTodo: (t) => {
          const id = `TD-${String(get().todos.length + 1).padStart(3, "0")}`;
          const todo: Todo = { id, createdAt: new Date().toISOString(), createdBy: get().settings.userName || "Admin", done: false, ...t };
          set((state) => ({
            todos: [todo, ...state.todos],
            activities: logActivity(state, "todo_created", `To-Do: ${todo.title}`, { vehicleId: t.vehicleId, processId: t.processId }),
          }));
          return todo;
        },

        toggleTodo: (id) =>
          set((state) => {
            const todo = state.todos.find((t) => t.id === id);
            return {
              ...state,
              todos: state.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
              activities: todo && !todo.done
                ? logActivity(state, "todo_completed", `To-Do erledigt: ${todo.title}`, { vehicleId: todo.vehicleId, processId: todo.processId })
                : state.activities,
            };
          }),

        removeTodo: (id) =>
          set((state) => {
            const todo = state.todos.find((t) => t.id === id);
            return {
              ...state,
              todos: state.todos.filter((t) => t.id !== id),
              activities: todo
                ? logActivity(state, "todo_deleted", `To-Do gelöscht: ${todo.title}`, { vehicleId: todo.vehicleId, processId: todo.processId })
                : state.activities,
            };
          }),

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
      };
    },
    {
      name: "vinflow-store-v2",
      partialize: (s) => ({
        vehicles: s.vehicles,
        customers: s.customers,
        offers: s.offers,
        purchasePlans: s.purchasePlans,
        processes: s.processes,
        todos: s.todos,
        activities: s.activities,
        goals: s.goals,
        settings: s.settings,
      }),
    }
  )
);
