import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useProcessStore, seedDataState, PERSISTED_KEYS, DATA_VERSION } from "@/store/processStore";

type Snapshot = Record<string, unknown>;

const pickPersisted = (state: Record<string, unknown>): Snapshot => {
  const out: Snapshot = {};
  for (const k of PERSISTED_KEYS) out[k] = state[k];
  return out;
};

const applySnapshot = (snapshot: Snapshot) => {
  // Vollständiges Hydrieren: nur persistierte Felder ersetzen, Aktionen bleiben.
  useProcessStore.setState({ ...seedDataState(), ...snapshot } as Partial<ReturnType<typeof useProcessStore.getState>>);
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
    applySnapshot(data.data as Snapshot);
    lastPushedJson = JSON.stringify(pickPersisted(data.data as Snapshot));
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
        applySnapshot(existing.data as Snapshot);
        lastPushedJson = JSON.stringify(pickPersisted(existing.data as Snapshot));
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
