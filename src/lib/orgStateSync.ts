import { supabase } from "@/integrations/supabase/client";
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
let suppressNextSave = false;

/** Sofort speichern (umgeht Debounce). Wird z. B. nach „Demo-Daten laden" verwendet. */
export const flushOrgStateNow = async () => {
  if (!activeOrgId) return;
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  await flushSave(activeOrgId, activeUserId);
};

const SAVE_DEBOUNCE_MS = 800;

const flushSave = async (orgId: string, userId: string | null) => {
  const snap = pickPersisted(useProcessStore.getState() as unknown as Record<string, unknown>);
  const json = JSON.stringify(snap);
  if (json === lastPushedJson) return;
  lastPushedJson = json;
  const { error } = await supabase
    .from("organization_state")
    .upsert(
      {
        organization_id: orgId,
        data: snap as any,
        data_version: DATA_VERSION,
        updated_by: userId,
      },
      { onConflict: "organization_id" }
    );
  if (error) console.error("[orgStateSync] save error", error);
};

const scheduleSave = (orgId: string, userId: string | null) => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flushSave(orgId, userId);
  }, SAVE_DEBOUNCE_MS);
};

export const stopOrgStateSync = () => {
  activeOrgId = null;
  if (unsubStore) { unsubStore(); unsubStore = null; }
  if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  lastPushedJson = "";
  // Lokalen State auf Seed zurücksetzen
  applySnapshot(seedDataState() as unknown as Snapshot);
};

export const startOrgStateSync = async (orgId: string, userId: string) => {
  if (activeOrgId === orgId) return;
  stopOrgStateSync();
  activeOrgId = orgId;

  // 1) Initial laden
  const { data, error } = await supabase
    .from("organization_state")
    .select("data")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) console.error("[orgStateSync] load error", error);

  if (data?.data && typeof data.data === "object") {
    suppressNextSave = true;
    applySnapshot(data.data as Snapshot);
    lastPushedJson = JSON.stringify(pickPersisted(data.data as Snapshot));
  } else {
    // Noch kein Datensatz → leeren State anlegen
    const seed = pickPersisted(seedDataState() as unknown as Record<string, unknown>);
    suppressNextSave = true;
    applySnapshot(seed);
    lastPushedJson = JSON.stringify(seed);
    await supabase.from("organization_state").insert({
      organization_id: orgId,
      data: seed as any,
      data_version: DATA_VERSION,
      updated_by: userId,
    });
  }

  // 2) Store-Änderungen → debounced speichern
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
        const row = (payload.new ?? payload.old) as { data?: Snapshot; updated_by?: string } | null;
        if (!row?.data) return;
        // Eigene Schreibvorgänge ignorieren
        if (row.updated_by === userId) {
          lastPushedJson = JSON.stringify(pickPersisted(row.data));
          return;
        }
        const incomingJson = JSON.stringify(pickPersisted(row.data));
        if (incomingJson === lastPushedJson) return;
        suppressNextSave = true;
        applySnapshot(row.data);
        lastPushedJson = incomingJson;
      }
    )
    .subscribe();
};
