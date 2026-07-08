import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useProcessStore, seedDataState, PERSISTED_KEYS, DATA_VERSION } from "@/store/processStore";

type Snapshot = Record<string, unknown>;

const VEHICLE_STATUSES = new Set(["planned", "in_stock", "reserved", "sold"]);

const toNumber = (value: unknown, fallback = 0) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toStringValue = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const normalizeIso = (value: unknown, fallback?: string) => {
  if (!value) return fallback;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? fallback : d.toISOString();
};

const normalizeSnapshot = (snapshot: Snapshot): Snapshot => {
  const seed = seedDataState() as unknown as Snapshot;
  const normalized: Snapshot = { ...seed, ...snapshot };
  const usedVehicleIds = new Set<string>();
  const vehicles = Array.isArray(snapshot.vehicles) ? snapshot.vehicles : [];

  normalized.vehicles = vehicles
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((vehicle, index) => {
      let id = toStringValue(vehicle.id).trim();
      if (!id || usedVehicleIds.has(id)) id = `V-${String(index + 1).padStart(4, "0")}`;
      while (usedVehicleIds.has(id)) id = `V-${String(usedVehicleIds.size + 1).padStart(4, "0")}`;
      usedVehicleIds.add(id);

      const status = toStringValue(vehicle.status);
      const locationRaw = vehicle.location && typeof vehicle.location === "object"
        ? vehicle.location as Record<string, unknown>
        : {};
      const locationSince = normalizeIso(locationRaw.since, normalizeIso(vehicle.arrivedAt, new Date().toISOString()))!;
      const location = {
        name: toStringValue(locationRaw.name, "Hof A · Platz 01"),
        kind: toStringValue(locationRaw.kind, "lot"),
        since: locationSince,
        note: toStringValue(locationRaw.note) || undefined,
      };

      return {
        ...vehicle,
        id,
        vin: toStringValue(vehicle.vin, `LEGACY-${String(index + 1).padStart(6, "0")}`),
        type: toStringValue(vehicle.type, "limousine"),
        make: toStringValue(vehicle.make, "Unbekannte Marke"),
        model: toStringValue(vehicle.model, "Unbekanntes Modell"),
        year: toNumber(vehicle.year, new Date().getFullYear()),
        color: toStringValue(vehicle.color),
        mileage: toNumber(vehicle.mileage),
        fuel: toStringValue(vehicle.fuel, "Benzin"),
        transmission: toStringValue(vehicle.transmission, "Automatik"),
        power_hp: toNumber(vehicle.power_hp),
        power_kw: toNumber(vehicle.power_kw, Math.round(toNumber(vehicle.power_hp) * 0.7355)),
        listPrice: toNumber(vehicle.listPrice),
        purchasePrice: toNumber(vehicle.purchasePrice),
        status: VEHICLE_STATUSES.has(status) ? status : "in_stock",
        firstRegistration: toStringValue(vehicle.firstRegistration) || undefined,
        hu: toStringValue(vehicle.hu) || undefined,
        arrivedAt: normalizeIso(vehicle.arrivedAt, new Date().toISOString()),
        soldAt: normalizeIso(vehicle.soldAt),
        location,
        locationHistory: Array.isArray(vehicle.locationHistory) ? vehicle.locationHistory : [],
        costs: Array.isArray(vehicle.costs) ? vehicle.costs : [],
        features: Array.isArray(vehicle.features) ? vehicle.features : undefined,
      };
    });

  normalized.todos = Array.isArray(snapshot.todos) ? snapshot.todos : [];
  normalized.offers = Array.isArray(snapshot.offers) ? snapshot.offers : [];
  normalized.processes = Array.isArray(snapshot.processes) ? snapshot.processes : [];
  normalized.customers = Array.isArray(snapshot.customers) ? snapshot.customers : [];
  normalized.purchasePlans = Array.isArray(snapshot.purchasePlans) ? snapshot.purchasePlans : [];
  normalized.activities = Array.isArray(snapshot.activities) ? snapshot.activities : [];
  normalized.goals = Array.isArray(snapshot.goals) ? snapshot.goals : [];
  normalized.calendarEvents = Array.isArray(snapshot.calendarEvents) ? snapshot.calendarEvents : [];
  normalized.dayTemplates = Array.isArray(snapshot.dayTemplates) ? snapshot.dayTemplates : seed.dayTemplates;
  normalized.settings = snapshot.settings && typeof snapshot.settings === "object" ? snapshot.settings : seed.settings;
  normalized.dataVersion = DATA_VERSION;

  return normalized;
};

const pickPersisted = (state: Record<string, unknown>): Snapshot => {
  const out: Snapshot = {};
  for (const k of PERSISTED_KEYS) out[k] = state[k];
  return out;
};

const applySnapshot = (snapshot: Snapshot) => {
  // Vollständiges Hydrieren: nur persistierte Felder ersetzen, Aktionen bleiben.
  useProcessStore.setState({ ...seedDataState(), ...normalizeSnapshot(snapshot) } as Partial<ReturnType<typeof useProcessStore.getState>>);
};

let activeOrgId: string | null = null;
let activeUserId: string | null = null;
let unsubStore: (() => void) | null = null;
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastPushedJson = "";
let pendingPushJson = "";
let suppressNextSave = false;
let syncGeneration = 0;

/** Sofort speichern (umgeht Debounce). Wird z. B. nach „Demo-Daten laden" verwendet. */
export const flushOrgStateNow = async () => {
  if (!activeOrgId) return;
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  await flushSave(activeOrgId, activeUserId);
};

const SAVE_DEBOUNCE_MS = 800;

const flushSave = async (orgId: string, userId: string | null) => {
  if (activeOrgId !== orgId) return;
  const snap = pickPersisted(useProcessStore.getState() as unknown as Record<string, unknown>);
  const json = JSON.stringify(snap);
  if (json === lastPushedJson || json === pendingPushJson) return;
  pendingPushJson = json;
  const { error } = await supabase
    .from("organization_state")
    .upsert(
      {
        organization_id: orgId,
        data: snap as unknown as Json,
        data_version: DATA_VERSION,
        updated_by: userId,
      },
      { onConflict: "organization_id" }
    );
  pendingPushJson = "";
  if (error) {
    console.error("[orgStateSync] save error", error);
    if (activeOrgId === orgId && !saveTimer) {
      saveTimer = setTimeout(() => {
        saveTimer = null;
        void flushSave(orgId, userId);
      }, 3000);
    }
    return;
  }
  lastPushedJson = json;
};

const scheduleSave = (orgId: string, userId: string | null) => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flushSave(orgId, userId);
  }, SAVE_DEBOUNCE_MS);
};

export const stopOrgStateSync = () => {
  syncGeneration++;
  activeOrgId = null;
  activeUserId = null;
  if (unsubStore) { unsubStore(); unsubStore = null; }
  if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  lastPushedJson = "";
  pendingPushJson = "";
  suppressNextSave = false;
  // Lokalen State auf Seed zurücksetzen
  applySnapshot(seedDataState() as unknown as Snapshot);
};

export const startOrgStateSync = async (orgId: string, userId: string) => {
  if (activeOrgId === orgId && activeUserId === userId) return;
  stopOrgStateSync();
  const generation = syncGeneration;
  activeOrgId = orgId;
  activeUserId = userId;

  // 1) Initial laden
  const { data, error } = await supabase
    .from("organization_state")
    .select("data")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (activeOrgId !== orgId || syncGeneration !== generation) return;
  if (error) {
    stopOrgStateSync();
    throw error;
  }

  if (data?.data && typeof data.data === "object") {
    const rawSnapshot = data.data as Snapshot;
    const normalizedSnapshot = normalizeSnapshot(rawSnapshot);
    applySnapshot(normalizedSnapshot);
    const rawJson = JSON.stringify(pickPersisted(rawSnapshot));
    const normalizedJson = JSON.stringify(pickPersisted(normalizedSnapshot));
    lastPushedJson = normalizedJson;
    if (rawJson !== normalizedJson) {
      await supabase
        .from("organization_state")
        .upsert(
          {
            organization_id: orgId,
            data: pickPersisted(normalizedSnapshot) as unknown as Json,
            data_version: DATA_VERSION,
            updated_by: userId,
          },
          { onConflict: "organization_id" }
        );
    }
  } else {
    // Noch kein Datensatz → leeren State anlegen
    const seed = pickPersisted(seedDataState() as unknown as Record<string, unknown>);
    applySnapshot(seed);
    lastPushedJson = JSON.stringify(seed);
    const { error: insertError } = await supabase.from("organization_state").insert({
      organization_id: orgId,
      data: seed as unknown as Json,
      data_version: DATA_VERSION,
      updated_by: userId,
    });
    if (activeOrgId !== orgId || syncGeneration !== generation) return;
    if (insertError && insertError.code !== "23505") {
      stopOrgStateSync();
      throw insertError;
    }
    if (insertError?.code === "23505") {
      const { data: existing, error: reloadError } = await supabase
        .from("organization_state")
        .select("data")
        .eq("organization_id", orgId)
        .single();
      if (reloadError) {
        stopOrgStateSync();
        throw reloadError;
      }
      if (existing?.data && typeof existing.data === "object") {
        const normalizedSnapshot = normalizeSnapshot(existing.data as Snapshot);
        applySnapshot(normalizedSnapshot);
        lastPushedJson = JSON.stringify(pickPersisted(normalizedSnapshot));
      }
    }
  }

  // 2) Store-Änderungen → debounced speichern
  if (activeOrgId !== orgId || activeUserId !== userId || syncGeneration !== generation) return;
  suppressNextSave = false;
  unsubStore = useProcessStore.subscribe((state) => {
    if (activeOrgId !== orgId) return;
    if (suppressNextSave) { suppressNextSave = false; return; }
    const snap = pickPersisted(state as unknown as Record<string, unknown>);
    const json = JSON.stringify(snap);
    if (json === lastPushedJson) return;
    scheduleSave(orgId, userId);
  });

  // 3) Realtime: Änderungen anderer Nutzer der Org übernehmen
  realtimeChannel = supabase
    .channel(`org-state-${orgId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "organization_state", filter: `organization_id=eq.${orgId}` },
      (payload) => {
        const row = (payload.new ?? payload.old) as { data?: Snapshot } | null;
        if (!row?.data) return;
        const incomingJson = JSON.stringify(pickPersisted(row.data));
        if (incomingJson === lastPushedJson || incomingJson === pendingPushJson) return;
        suppressNextSave = true;
        applySnapshot(row.data);
        lastPushedJson = incomingJson;
      }
    )
    .subscribe();
};
