import type { Todo, TodoProgressPeriod } from "@/data/process";

export const TODO_PROGRESS_PERIODS: Array<{
  value: TodoProgressPeriod;
  label: string;
  description: string;
}> = [
  { value: "today", label: "Heute", description: "Tagesfokus für heute relevante Aufgaben" },
  { value: "week", label: "Diese Woche", description: "Montag bis Sonntag im Blick behalten" },
  { value: "month", label: "Dieser Monat", description: "Fortschritt über den laufenden Monat" },
  { value: "all", label: "Gesamt", description: "Alle vorhandenen To-Dos einbeziehen" },
];

const toISO = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodoReferenceDate = (todo: Todo) =>
  todo.dueDate ?? (todo.done ? todo.completedAt?.slice(0, 10) : undefined) ?? todo.createdAt.slice(0, 10);

export const getTodoProgressRange = (period: TodoProgressPeriod, now = new Date()) => {
  if (period === "all") return undefined;
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "today") {
    const iso = toISO(day);
    return { from: iso, to: iso };
  }
  if (period === "week") {
    const weekday = day.getDay() === 0 ? 7 : day.getDay();
    const monday = new Date(day);
    monday.setDate(day.getDate() - weekday + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: toISO(monday), to: toISO(sunday) };
  }
  return {
    from: toISO(new Date(day.getFullYear(), day.getMonth(), 1)),
    to: toISO(new Date(day.getFullYear(), day.getMonth() + 1, 0)),
  };
};

export const calculateTodoProgress = (todos: Todo[], period: TodoProgressPeriod, now = new Date()) => {
  const range = getTodoProgressRange(period, now);
  const relevant = range
    ? todos.filter((todo) => {
        const date = getTodoReferenceDate(todo);
        return date >= range.from && date <= range.to;
      })
    : todos;
  const done = relevant.filter((todo) => todo.done).length;
  const total = relevant.length;
  return {
    done,
    open: total - done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0,
    range,
  };
};

export const todoProgressPeriodLabel = (period: TodoProgressPeriod) =>
  TODO_PROGRESS_PERIODS.find((option) => option.value === period)?.label ?? "Diese Woche";
