import { create } from "zustand";
import {
  MOCK_PROCESSES,
  MOCK_VEHICLES,
  MOCK_CUSTOMERS,
  MOCK_OFFERS,
  MOCK_PURCHASE_PLANS,
  PROCESS_STEPS,
  Process,
  Vehicle,
  Customer,
  Offer,
  PurchasePlan,
  ProcessStepKey,
  ProcessFields,
  buildEmptySteps,
  DEFAULT_CHECKLIST,
  stepIndex,
} from "@/data/process";

interface ProcessState {
  vehicles: Vehicle[];
  customers: Customer[];
  offers: Offer[];
  purchasePlans: PurchasePlan[];
  processes: Process[];

  // Selectors
  getProcess: (id: string) => Process | undefined;
  getVehicle: (id: string) => Vehicle | undefined;
  getCustomer: (id: string) => Customer | undefined;
  getOffer: (id: string) => Offer | undefined;
  getOffersForVehicle: (vehicleId: string) => Offer[];
  getProcessForVehicle: (vehicleId: string) => Process | undefined;

  // Mutations – Process
  completeStep: (processId: string, stepKey: ProcessStepKey) => void;
  toggleChecklistItem: (processId: string, itemId: string) => void;
  updateProcessFields: (processId: string, patch: Partial<ProcessFields>) => void;

  // Mutations – Vehicle
  addVehicle: (v: Omit<Vehicle, "id" | "status"> & { status?: Vehicle["status"] }) => Vehicle;

  // Mutations – Customer
  addCustomer: (c: Omit<Customer, "id">) => Customer;

  // Mutations – Offer
  addOffer: (o: Omit<Offer, "id" | "createdAt" | "status"> & { status?: Offer["status"] }) => Offer;
  updateOfferStatus: (offerId: string, status: Offer["status"]) => void;
  acceptOffer: (offerId: string) => Process | undefined;

  // Mutations – Purchase plan
  addPurchasePlan: (p: Omit<PurchasePlan, "id" | "createdAt" | "status"> & { status?: PurchasePlan["status"] }) => PurchasePlan;
  updatePurchasePlanStatus: (id: string, status: PurchasePlan["status"]) => void;
  convertPlanToVehicle: (planId: string, vin: string) => Vehicle | undefined;
}

const nextId = (prefix: string, list: { id: string }[]) => {
  const nums = list
    .map((i) => parseInt(i.id.replace(/\D+/g, "").slice(-4) || "0", 10))
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
};

export const useProcessStore = create<ProcessState>((set, get) => ({
  vehicles: MOCK_VEHICLES,
  customers: MOCK_CUSTOMERS,
  offers: MOCK_OFFERS,
  purchasePlans: MOCK_PURCHASE_PLANS,
  processes: MOCK_PROCESSES,

  getProcess: (id) => get().processes.find((p) => p.id === id),
  getVehicle: (id) => get().vehicles.find((v) => v.id === id),
  getCustomer: (id) => get().customers.find((c) => c.id === id),
  getOffer: (id) => get().offers.find((o) => o.id === id),
  getOffersForVehicle: (vehicleId) => get().offers.filter((o) => o.vehicleId === vehicleId),
  getProcessForVehicle: (vehicleId) => get().processes.find((p) => p.vehicleId === vehicleId),

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
            [stepKey]: {
              ...p.steps[stepKey],
              status: "completed" as const,
              completedAt: new Date().toISOString(),
              documentArchived: true,
            },
            ...(nextStep ? { [nextStep.key]: { status: "active" as const } } : {}),
          },
        };
      });

      // Wenn Lieferung abgeschlossen → Fahrzeug auf "sold"
      const updatedVehicles = isLastStep
        ? state.vehicles.map((v) => (v.id === process.vehicleId ? { ...v, status: "sold" as const } : v))
        : state.vehicles;

      return { ...state, processes: updatedProcesses, vehicles: updatedVehicles };
    }),

  toggleChecklistItem: (processId, itemId) =>
    set((state) => ({
      processes: state.processes.map((p) =>
        p.id !== processId
          ? p
          : {
              ...p,
              checklist: p.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)),
            }
      ),
    })),

  updateProcessFields: (processId, patch) =>
    set((state) => ({
      processes: state.processes.map((p) =>
        p.id !== processId
          ? p
          : { ...p, fields: { ...p.fields, ...patch }, updatedAt: new Date().toISOString() }
      ),
    })),

  addVehicle: (v) => {
    const id = nextId("V", get().vehicles);
    const vehicle: Vehicle = { id, status: v.status ?? "in_stock", ...v };
    set((s) => ({ vehicles: [vehicle, ...s.vehicles] }));
    return vehicle;
  },

  addCustomer: (c) => {
    const id = nextId("C", get().customers);
    const customer: Customer = { id, ...c };
    set((s) => ({ customers: [customer, ...s.customers] }));
    return customer;
  },

  addOffer: (o) => {
    const id = `OFR-${new Date().getFullYear()}-${String(get().offers.length + 1).padStart(4, "0")}`;
    const offer: Offer = {
      id,
      createdAt: new Date().toISOString(),
      status: o.status ?? "sent",
      ...o,
    };
    set((s) => ({ offers: [offer, ...s.offers] }));
    return offer;
  },

  updateOfferStatus: (offerId, status) =>
    set((state) => ({
      offers: state.offers.map((o) => (o.id === offerId ? { ...o, status } : o)),
    })),

  acceptOffer: (offerId) => {
    const state = get();
    const offer = state.offers.find((o) => o.id === offerId);
    if (!offer) return undefined;

    // Bereits ein Vorgang für dieses Fahrzeug? Dann nicht doppelt anlegen.
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
      checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c })),
      fields: { finalPrice: offer.price },
    };

    set((s) => ({
      processes: [newProcess, ...s.processes],
      offers: s.offers.map((o) => {
        if (o.id === offerId) return { ...o, status: "accepted" };
        // Andere offene Angebote für das gleiche Fahrzeug ablehnen
        if (o.vehicleId === offer.vehicleId && o.status === "sent") return { ...o, status: "rejected" };
        return o;
      }),
      vehicles: s.vehicles.map((v) =>
        v.id === offer.vehicleId ? { ...v, status: "reserved" } : v
      ),
    }));

    return newProcess;
  },

  addPurchasePlan: (p) => {
    const id = `PP-${new Date().getFullYear()}-${String(get().purchasePlans.length + 1).padStart(3, "0")}`;
    const plan: PurchasePlan = {
      id,
      createdAt: new Date().toISOString(),
      status: p.status ?? "open",
      ...p,
    };
    set((s) => ({ purchasePlans: [plan, ...s.purchasePlans] }));
    return plan;
  },

  updatePurchasePlanStatus: (id, status) =>
    set((state) => ({
      purchasePlans: state.purchasePlans.map((p) => (p.id === id ? { ...p, status } : p)),
    })),

  convertPlanToVehicle: (planId, vin) => {
    const plan = get().purchasePlans.find((p) => p.id === planId);
    if (!plan) return undefined;
    const vehicle = get().addVehicle({
      vin,
      make: plan.make,
      model: plan.model,
      year: plan.year,
      color: "—",
      mileage: 0,
      listPrice: Math.round(plan.targetPrice * 1.2),
      purchasePrice: plan.targetPrice,
      status: "in_stock",
      arrivedAt: new Date().toISOString(),
    });
    set((state) => ({
      purchasePlans: state.purchasePlans.map((p) =>
        p.id === planId ? { ...p, status: "received", vin } : p
      ),
    }));
    return vehicle;
  },
}));
