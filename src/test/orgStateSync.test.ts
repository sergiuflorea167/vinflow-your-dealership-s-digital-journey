import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const syncMocks = vi.hoisted(() => ({
  loadResult: { data: null as { data: Record<string, unknown> } | null, error: null as unknown },
  upsert: vi.fn(),
  insert: vi.fn(),
  removeChannel: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  const channel: Record<string, ReturnType<typeof vi.fn>> = {};
  channel.on = vi.fn(() => channel);
  channel.subscribe = vi.fn(() => channel);
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => syncMocks.loadResult),
            single: vi.fn(async () => syncMocks.loadResult),
          })),
        })),
        upsert: syncMocks.upsert,
        insert: syncMocks.insert,
      })),
      channel: vi.fn(() => channel),
      removeChannel: syncMocks.removeChannel,
    },
  };
});

import { seedDataState, useProcessStore } from "@/store/processStore";
import { startOrgStateSync, stopOrgStateSync } from "@/lib/orgStateSync";

describe("organization state synchronization", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stopOrgStateSync();
    const seed = seedDataState();
    syncMocks.loadResult = { data: { data: seed as unknown as Record<string, unknown> }, error: null };
    syncMocks.upsert.mockReset().mockResolvedValue({ error: null });
    syncMocks.insert.mockReset().mockResolvedValue({ error: null });
    syncMocks.removeChannel.mockClear();
  });

  afterEach(() => {
    stopOrgStateSync();
    vi.useRealTimers();
  });

  it("persists the first user change after initial hydration", async () => {
    await startOrgStateSync("00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002");
    useProcessStore.getState().updateSettings({ companyName: "Erste Änderung" });
    await vi.advanceTimersByTimeAsync(801);

    expect(syncMocks.upsert).toHaveBeenCalledTimes(1);
    expect(syncMocks.upsert.mock.calls[0][0].data.settings.companyName).toBe("Erste Änderung");
  });

  it("retries a failed save instead of marking it as synchronized", async () => {
    syncMocks.upsert
      .mockResolvedValueOnce({ error: { message: "temporär" } })
      .mockResolvedValueOnce({ error: null });
    await startOrgStateSync("00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002");
    useProcessStore.getState().updateSettings({ companyName: "Muss gespeichert werden" });

    await vi.advanceTimersByTimeAsync(801);
    expect(syncMocks.upsert).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3001);
    expect(syncMocks.upsert).toHaveBeenCalledTimes(2);
  });
});
