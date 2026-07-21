import { beforeEach, describe, expect, it, vi } from "vitest";

const supaMocks = vi.hoisted(() => ({
  selectResult: { data: null as unknown, error: null as { message: string } | null },
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(async () => supaMocks.selectResult),
      })),
    })),
    rpc: supaMocks.rpc,
  },
}));

import { useWorkshopProgressStore } from "@/store/workshopProgressStore";

describe("workshop progress local fallback", () => {
  const userId = "11111111-1111-1111-1111-111111111111";

  beforeEach(() => {
    localStorage.clear();
    // Simuliert den aktuellen Produktionsstand: Tabelle/RPC existieren serverseitig (noch) nicht.
    supaMocks.selectResult = { data: null, error: { message: "relation \"workshop_progress\" does not exist" } };
    supaMocks.rpc.mockReset().mockResolvedValue({ error: { message: "function not found" } });
    useWorkshopProgressStore.setState({ progress: {}, loaded: false, loadedForUserId: null, currentUserId: null });
  });

  it("keeps chapter progress in localStorage even when the server call fails", async () => {
    await useWorkshopProgressStore.getState().loadFromServer(userId);
    useWorkshopProgressStore.getState().recordStep("dashboard", 1, 5);
    useWorkshopProgressStore.getState().markCompleted("fleet", 3);

    expect(useWorkshopProgressStore.getState().progress.dashboard?.stepsCompleted).toBe(2);
    expect(useWorkshopProgressStore.getState().progress.fleet?.completed).toBe(true);

    const stored = JSON.parse(localStorage.getItem(`vinflow-workshop-progress:${userId}`)!);
    expect(stored.dashboard.stepsCompleted).toBe(2);
    expect(stored.fleet.completed).toBe(true);
  });

  it("restores progress from localStorage after a reload instead of starting at 0", async () => {
    await useWorkshopProgressStore.getState().loadFromServer(userId);
    useWorkshopProgressStore.getState().markCompleted("dashboard", 5);

    // Simuliert einen Seiten-Reload: frischer Store, Server weiterhin nicht erreichbar.
    useWorkshopProgressStore.setState({ progress: {}, loaded: false, loadedForUserId: null, currentUserId: null });
    await useWorkshopProgressStore.getState().loadFromServer(userId);

    expect(useWorkshopProgressStore.getState().progress.dashboard?.completed).toBe(true);
    expect(useWorkshopProgressStore.getState().progress.dashboard?.stepsCompleted).toBe(5);
  });

  it("keeps each user's cache separate", async () => {
    await useWorkshopProgressStore.getState().loadFromServer(userId);
    useWorkshopProgressStore.getState().markCompleted("dashboard", 5);

    const otherUserId = "22222222-2222-2222-2222-222222222222";
    useWorkshopProgressStore.setState({ progress: {}, loaded: false, loadedForUserId: null, currentUserId: null });
    await useWorkshopProgressStore.getState().loadFromServer(otherUserId);

    expect(useWorkshopProgressStore.getState().progress.dashboard).toBeUndefined();
  });
});
