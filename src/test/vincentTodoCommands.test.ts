import { describe, expect, it } from "vitest";
import { parseVincentTodoCommand } from "@/lib/vincentTodoCommands";

describe("VINcent To-Do commands", () => {
  const now = new Date("2026-07-08T12:00:00.000Z");

  it("asks for missing important data before creating a To-Do", () => {
    const result = parseVincentTodoCommand("Erstelle ein To-Do: Inserat prüfen", { now });
    expect(result?.draft.title).toBe("Inserat prüfen");
    expect(result?.missing).toEqual(["dueDate"]);
  });

  it("merges a follow-up answer into a pending To-Do draft", () => {
    const result = parseVincentTodoCommand("morgen, hoch", {
      now,
      pending: { title: "Inserat prüfen" },
    });
    expect(result?.missing).toEqual([]);
    expect(result?.draft).toMatchObject({
      title: "Inserat prüfen",
      dueDate: "2026-07-09",
      priority: "high",
    });
  });

  it("links vehicle context when the command names a vehicle", () => {
    const result = parseVincentTodoCommand("Erstelle To-Do für Audi A4 morgen: Fotos machen", {
      now,
      vehicles: [{ id: "V-1", make: "Audi", model: "A4" } as never],
    });
    expect(result?.draft.vehicleId).toBe("V-1");
    expect(result?.draft.scope).toBe("internal_fleet");
  });
});
