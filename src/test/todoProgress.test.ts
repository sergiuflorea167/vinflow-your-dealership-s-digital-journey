import { describe, expect, it } from "vitest";
import type { Todo } from "@/data/process";
import { calculateTodoProgress, getTodoProgressRange } from "@/lib/todoProgress";

const todo = (
  id: string,
  dueDate: string | undefined,
  done: boolean,
  completedAt?: string,
): Todo => ({
  id,
  title: id,
  priority: "medium",
  done,
  dueDate,
  scope: "general",
  createdAt: "2026-06-01T08:00:00.000Z",
  completedAt,
  createdBy: "Test",
});

describe("todo progress", () => {
  const now = new Date(2026, 5, 29, 12);

  it("uses Monday through Sunday for the weekly period", () => {
    expect(getTodoProgressRange("week", now)).toEqual({ from: "2026-06-29", to: "2026-07-05" });
  });

  it("calculates completed todos for today", () => {
    const result = calculateTodoProgress([
      todo("done-today", "2026-06-29", true, "2026-06-29T09:00:00.000Z"),
      todo("open-today", "2026-06-29", false),
      todo("tomorrow", "2026-06-30", false),
    ], "today", now);

    expect(result).toMatchObject({ done: 1, open: 1, total: 2, percent: 50 });
  });

  it("falls back to completion date when no due date exists", () => {
    const result = calculateTodoProgress([
      todo("done-without-date", undefined, true, "2026-07-02T10:00:00.000Z"),
      todo("outside-week", "2026-07-10", true, "2026-07-02T10:00:00.000Z"),
    ], "week", now);

    expect(result).toMatchObject({ done: 1, total: 1, percent: 100 });
  });
});
