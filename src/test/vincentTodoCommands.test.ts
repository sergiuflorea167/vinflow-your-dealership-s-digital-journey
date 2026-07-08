import { describe, expect, it } from "vitest";
import { parseVincentTodoCommand, todoQuestionForMissing } from "@/lib/vincentTodoCommands";

describe("VINcent To-Do commands", () => {
  const now = new Date("2026-07-08T12:00:00.000Z");

  it("asks for missing important data before creating a general To-Do", () => {
    const result = parseVincentTodoCommand("Erstelle ein To-Do: Büro prüfen", { now });
    expect(result?.draft.title).toBe("Büro prüfen");
    expect(result?.missing).toEqual(["dueDate"]);
  });

  it("asks for vehicle context when the task needs a vehicle reference", () => {
    const result = parseVincentTodoCommand("Erstelle ein To-Do: Inserat prüfen morgen", { now });
    expect(result?.draft.title).toBe("Inserat prüfen");
    expect(result?.draft.scope).toBe("internal_fleet");
    expect(result?.missing).toEqual(["vehicle"]);
    expect(todoQuestionForMissing(result?.missing ?? [])).toContain("Zu welchem Fahrzeug");
  });

  it("asks for process context when the task needs a process reference", () => {
    const result = parseVincentTodoCommand("Erstelle ein To-Do: Rechnung prüfen morgen", { now });
    expect(result?.missing).toEqual(["process"]);
    expect(todoQuestionForMissing(result?.missing ?? [])).toContain("Zu welchem Vorgang");
  });

  it("merges a follow-up answer into a pending To-Do draft", () => {
    const result = parseVincentTodoCommand("morgen, hoch", {
      now,
      pending: { title: "Büro prüfen" },
    });
    expect(result?.missing).toEqual([]);
    expect(result?.draft).toMatchObject({
      title: "Büro prüfen",
      dueDate: "2026-07-09",
      priority: "high",
    });
  });

  it("keeps asking for a vehicle when a vehicle-related draft has no vehicle yet", () => {
    const result = parseVincentTodoCommand("morgen, hoch", {
      now,
      pending: { title: "Inserat prüfen", scope: "internal_fleet" },
    });
    expect(result?.missing).toEqual(["vehicle"]);
  });

  it("lets the user intentionally make a suspected vehicle task general", () => {
    const result = parseVincentTodoCommand("allgemein, morgen, hoch", {
      now,
      pending: { title: "Inserat prüfen", scope: "internal_fleet" },
    });
    expect(result?.missing).toEqual([]);
    expect(result?.draft.scope).toBe("general");
  });

  it("links vehicle context when the command names a vehicle", () => {
    const result = parseVincentTodoCommand("Erstelle To-Do für Audi A4 morgen: Fotos machen", {
      now,
      vehicles: [{ id: "V-1", make: "Audi", model: "A4" } as never],
    });
    expect(result?.draft.vehicleId).toBe("V-1");
    expect(result?.draft.scope).toBe("internal_fleet");
    expect(result?.missing).toEqual([]);
  });
});
