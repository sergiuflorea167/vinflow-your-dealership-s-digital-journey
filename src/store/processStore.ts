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
  MOCK_CALENDAR_EVENTS,
  DEFAULT_DAY_TEMPLATES,
  DEFAULT_SETTINGS,
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
  updateVehicle: (vehicleId: string, patch: Partial<Vehicle>) => void;
  changeVehicleLocation: (vehicleId: string, location: VehicleLocation) => void;
  addVehicleCost: (vehicleId: string, cost: Omit<CostEntry, "id" | "createdAt" | "createdBy">) => void;
  removeVehicleCost: (vehicleId: string, costId: string) => void;
  /** Setzt den Inseratstatus. Erstellt / schließt automatisch das To-Do „Inserat erstellen". */
  setVehicleListed: (vehicleId: string, listed: boolean) => void;

  // ------- Customer -------
  addCustomer: (c: Omit<Customer, "id">) => Customer;

  // ------- Offer -------
  addOffer: (o: Omit<Offer, "id" | "createdAt" | "status" | "customerTodos"> & { status?: Offer["status"]; customerTodos?: Offer["customerTodos"] }) => Offer;
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
          // Wenn das Fahrzeug noch nicht inseriert ist, auto-To-Do erzeugen.
          const needsListingTodo = !vehicle.listed?.active;
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

        startProcessForVehicle: ({ vehicleId, customerId, price }) => {
          const state = get();
          const vehicle = state.vehicles.find((v) => v.id === vehicleId);
          const customer = state.customers.find((c) => c.id === customerId);
          if (!vehicle || !customer) return undefined;

          const existing = state.processes.find((p) => p.vehicleId === vehicleId);
          if (existing) return existing;

          const processId = `VF-${new Date().getFullYear()}-${String(state.processes.length + 142).padStart(4, "0")}`;
          const newProcess: Process = {
            id: processId,
            vehicleId,
            customerId,
            acceptedOfferId: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Angebot wird übersprungen, wir starten direkt bei Anzahlung
            currentStep: "down_payment",
            steps: buildEmptySteps("down_payment"),
            fields: { finalPrice: price },
            customerTodosOC: [],
            outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST(),
          };
          newProcess.steps.offer = { status: "skipped", completedAt: new Date().toISOString() };

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
            const willBeDone = todo ? !todo.done : false;
            const nowIso = new Date().toISOString();

            const updatedTodos = state.todos.map((t) =>
              t.id === id
                ? { ...t, done: !t.done, completedAt: !t.done ? nowIso : undefined }
                : t,
            );

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
              vehicles: updatedVehicles,
              activities,
            };
          }),

        updateTodo: (id, patch) =>
          set((state) => ({
            ...state,
            todos: state.todos.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          })),

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
    },
    {
      name: "vinflow-store-v5",
      version: 5,
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
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // ---- Migration: PurchasePlan-Schema v5 ----
        // Alte Pläne können noch alte Status-Werte ("open"/"ordered") haben
        // und kein source/noteEntries-Feld – defensiv auffüllen.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        state.purchasePlans = (state.purchasePlans ?? []).map((p: any) => {
          const legacyStatusMap: Record<string, PurchasePlan["status"]> = {
            open: "tracking",
            ordered: "won",
          };
          const status: PurchasePlan["status"] =
            legacyStatusMap[p.status as string] ?? p.status ?? "tracking";

          const noteEntries: PurchasePlanNote[] = Array.isArray(p.noteEntries)
            ? p.noteEntries
            : p.notes
              ? [{ id: `pn-legacy-${p.id}`, text: String(p.notes), createdAt: p.createdAt ?? new Date().toISOString(), createdBy: "System" }]
              : [];

          return {
            ...p,
            status,
            source: p.source ?? "other",
            supplier: p.supplier ?? "–",
            noteEntries,
          } as PurchasePlan;
        });

        // ---- Auto-To-Do „Inserat erstellen" sicherstellen ----
        const nowIso = new Date().toISOString();
        const newTodos: Todo[] = [];
        let counter = state.todos.length;
        state.vehicles.forEach((v) => {
          if (v.status === "sold") return;
          if (v.listed?.active) return;
          const exists = state.todos.some(
            (t) =>
              t.vehicleId === v.id &&
              !t.done &&
              t.title === "Inserat erstellen" &&
              (t.tags ?? []).includes("auto")
          );
          if (exists) return;
          counter += 1;
          const due = new Date();
          due.setDate(due.getDate() + 3);
          newTodos.push({
            id: `TD-${String(counter).padStart(3, "0")}`,
            title: "Inserat erstellen",
            description: `Online-Inserat für ${v.make} ${v.model} (${v.id}) anlegen.`,
            priority: "medium",
            scope: "internal_fleet",
            done: false,
            vehicleId: v.id,
            dueDate: due.toISOString(),
            tags: ["inserat", "auto"],
            createdAt: nowIso,
            createdBy: state.settings.userName || "System",
          });
        });
        if (newTodos.length > 0) {
          state.todos = [...newTodos, ...state.todos];
        }
      },
    }
  )
);
