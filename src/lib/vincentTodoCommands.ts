import type { TodoPriority, TodoScope, Vehicle, Process } from "@/data/process";

export type VincentTodoDraft = {
  title?: string;
  description?: string;
  priority?: TodoPriority;
  scope?: TodoScope;
  dueDate?: string;
  noDueDate?: boolean;
  assignee?: string;
  vehicleId?: string;
  processId?: string;
};

type CommandResult = {
  draft: VincentTodoDraft;
  missing: Array<"title" | "dueDate">;
};

const TODO_COMMAND_PATTERN = /\b(to-?do|todo|aufgabe)\b.*\b(erstell|anleg|mach|hinzufüg|speicher)|\b(erstell|leg|mach|speicher|füg).*\b(to-?do|todo|aufgabe)\b/i;

const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (base: Date, days: number) => {
  const next = new Date(base);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
};

const parsePriority = (text: string): TodoPriority | undefined => {
  const normalized = text.toLocaleLowerCase("de-DE");
  if (/\b(hoch|high|dringend|wichtig|prio\s*hoch)\b/.test(normalized)) return "high";
  if (/\b(niedrig|low|später|spaeter|prio\s*niedrig)\b/.test(normalized)) return "low";
  if (/\b(mittel|medium|normal|prio\s*mittel)\b/.test(normalized)) return "medium";
  return undefined;
};

const parseScope = (text: string): TodoScope | undefined => {
  const normalized = text.toLocaleLowerCase("de-DE");
  if (/\b(einkauf|vor einkauf|pre purchase)\b/.test(normalized)) return "internal_pre_purchase";
  if (/\b(bestand|fahrzeug|fleet|inserat|aufbereitung)\b/.test(normalized)) return "internal_fleet";
  if (/\b(angebot)\b/.test(normalized)) return "offer";
  if (/\b(auftragsbest|ab|order confirmation)\b/.test(normalized)) return "order_confirmation";
  if (/\b(ausgangskontrolle|übergabecheck|uebergabecheck|outbound)\b/.test(normalized)) return "outbound_check";
  if (/\b(allgemein|general)\b/.test(normalized)) return "general";
  return undefined;
};

const parseDueDate = (text: string, now = new Date()): { dueDate?: string; noDueDate?: boolean } => {
  const normalized = text.toLocaleLowerCase("de-DE");
  if (/\b(ohne datum|kein datum|keine fälligkeit|keine faelligkeit|ohne fälligkeit|ohne faelligkeit)\b/.test(normalized)) {
    return { noDueDate: true };
  }
  if (/\b(heute|today)\b/.test(normalized)) return { dueDate: toISODate(now) };
  if (/\b(morgen|tomorrow)\b/.test(normalized)) return { dueDate: toISODate(addDays(now, 1)) };
  if (/\b(übermorgen|uebermorgen)\b/.test(normalized)) return { dueDate: toISODate(addDays(now, 2)) };

  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return { dueDate: iso[0] };

  const german = text.match(/\b(\d{1,2})\.(\d{1,2})\.(?:(20\d{2})|\d{2})?\b/);
  if (german) {
    const day = Number(german[1]);
    const month = Number(german[2]);
    const year = german[3] ? Number(german[3]) : now.getFullYear();
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return { dueDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
    }
  }
  return {};
};

const cleanTitle = (text: string) => {
  let title = text
    .replace(TODO_COMMAND_PATTERN, " ")
    .replace(/\b(bitte|kannst du|erstelle|erstellen|anlegen|lege|leg|mach|mache|speicher|füge|fuege|hinzufügen|hinzufuegen|als|ein|eine|to-?do|todo|aufgabe)\b/gi, " ")
    .replace(/\b(heute|morgen|übermorgen|uebermorgen|ohne datum|kein datum|keine fälligkeit|keine faelligkeit|hoch|high|dringend|wichtig|mittel|medium|normal|niedrig|low|prio)\b/gi, " ")
    .replace(/\b(20\d{2}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.(?:20\d{2}|\d{2})?)\b/g, " ")
    .replace(/[:;,.]+$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  title = title
    .replace(/^["'„“]|["'“”]$/g, "")
    .replace(/^[\s,;:.-]+|[\s,;:.-]+$/g, "")
    .trim();

  if (!/[A-Za-zÀ-ÿ0-9]/.test(title)) {
    return undefined;
  }

  return title || undefined;
};

const parseTitle = (text: string) => {
  const quoted = text.match(/["„“]([^"“”]{3,160})["“”]/);
  if (quoted?.[1]) return quoted[1].trim();
  const afterColon = text.match(/(?:to-?do|todo|aufgabe)\s*[:-]\s*(.+)$/i);
  if (afterColon?.[1]) return cleanTitle(afterColon[1]);
  return cleanTitle(text);
};

const findVehicle = (text: string, vehicles: Vehicle[]) => {
  const normalized = text.toLocaleLowerCase("de-DE");
  return vehicles.find((vehicle) => {
    const label = `${vehicle.make} ${vehicle.model}`.toLocaleLowerCase("de-DE");
    return normalized.includes(vehicle.id.toLocaleLowerCase("de-DE")) || normalized.includes(label);
  });
};

const findProcess = (text: string, processes: Process[]) => {
  const normalized = text.toLocaleLowerCase("de-DE");
  return processes.find((process) => normalized.includes(process.id.toLocaleLowerCase("de-DE")));
};

export function parseVincentTodoCommand(
  text: string,
  options: { pending?: VincentTodoDraft | null; vehicles?: Vehicle[]; processes?: Process[]; now?: Date } = {},
): CommandResult | null {
  const isContinuation = Boolean(options.pending);
  if (!isContinuation && !TODO_COMMAND_PATTERN.test(text)) return null;

  const due = parseDueDate(text, options.now);
  const vehicle = findVehicle(text, options.vehicles ?? []);
  const process = findProcess(text, options.processes ?? []);
  const draft: VincentTodoDraft = {
    ...options.pending,
    title: parseTitle(text) ?? options.pending?.title,
    priority: parsePriority(text) ?? options.pending?.priority,
    scope: parseScope(text) ?? options.pending?.scope,
    dueDate: due.dueDate ?? options.pending?.dueDate,
    noDueDate: due.noDueDate ?? options.pending?.noDueDate,
    vehicleId: vehicle?.id ?? options.pending?.vehicleId,
    processId: process?.id ?? options.pending?.processId,
  };

  if (draft.vehicleId && !draft.scope) draft.scope = "internal_fleet";

  const missing: CommandResult["missing"] = [];
  if (!draft.title) missing.push("title");
  if (!draft.dueDate && !draft.noDueDate) missing.push("dueDate");
  return { draft, missing };
}

export const todoQuestionForMissing = (missing: Array<"title" | "dueDate">) => {
  if (missing.includes("title") && missing.includes("dueDate")) {
    return "Gerne. Wie soll das To-Do heißen und bis wann ist es fällig? Du kannst z. B. schreiben: „Inserat prüfen, morgen, hoch“.";
  }
  if (missing.includes("title")) return "Gerne. Wie soll das To-Do heißen?";
  return "Gerne. Bis wann soll das To-Do fällig sein? Schreib z. B. „heute“, „morgen“, „15.07.“ oder „ohne Datum“. ";
};
