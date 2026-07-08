type LinkCandidate = {
  label: string;
  url: string;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const markdownProtectedPattern = /(\[[^\]]+\]\([^)]+\)|`[^`]*`)/g;
const isProtectedMarkdownSegment = (segment: string) => /^(\[[^\]]+\]\([^)]+\)|`[^`]*`)$/.test(segment);

const isUsefulLabel = (label: string) => {
  const trimmed = label.trim();
  if (trimmed.length >= 4) return true;
  return /^[A-Z]{1,4}-\d{1,}$/i.test(trimmed);
};

const addCandidate = (candidates: LinkCandidate[], label: unknown, url: unknown) => {
  if (typeof label !== "string" || typeof url !== "string") return;
  const trimmedLabel = label.trim();
  if (!isUsefulLabel(trimmedLabel) || !url.startsWith("/")) return;
  candidates.push({ label: trimmedLabel, url });
};

const asRecords = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item)) : [];

export function extractVincentLinkCandidates(context: unknown): LinkCandidate[] {
  if (!context || typeof context !== "object" || Array.isArray(context)) return [];
  const root = context as Record<string, unknown>;
  const candidates: LinkCandidate[] = [];

  const todos = root.todos && typeof root.todos === "object" && !Array.isArray(root.todos)
    ? root.todos as Record<string, unknown>
    : {};
  asRecords(todos.items).forEach((todo) => {
    addCandidate(candidates, todo.title, todo.url);
    addCandidate(candidates, todo.id, todo.url);
    addCandidate(candidates, todo.vehicle, todo.vehicleUrl);
    addCandidate(candidates, todo.process, todo.processUrl);
  });

  asRecords(root.stock).forEach((vehicle) => {
    const make = typeof vehicle.make === "string" ? vehicle.make : "";
    const model = typeof vehicle.model === "string" ? vehicle.model : "";
    const year = typeof vehicle.year === "number" || typeof vehicle.year === "string" ? String(vehicle.year) : "";
    addCandidate(candidates, [make, model, year ? `(${year})` : ""].filter(Boolean).join(" "), vehicle.url);
    addCandidate(candidates, [make, model].filter(Boolean).join(" "), vehicle.url);
    addCandidate(candidates, vehicle.id, vehicle.url);
  });

  asRecords(root.processes).forEach((process) => {
    addCandidate(candidates, process.id, process.url);
    addCandidate(candidates, process.vehicle, process.vehicleUrl);
  });

  asRecords(root.kpis).forEach((kpi) => {
    addCandidate(candidates, kpi.label, kpi.url);
  });

  const unique = new Map<string, LinkCandidate>();
  candidates.forEach((candidate) => {
    const key = `${candidate.label.toLocaleLowerCase("de-DE")}::${candidate.url}`;
    if (!unique.has(key)) unique.set(key, candidate);
  });
  return [...unique.values()].sort((a, b) => b.label.length - a.label.length);
}

const linkifyPlainSegment = (segment: string, candidates: LinkCandidate[]) => {
  let next = segment;
  const placeholders: string[] = [];
  candidates.forEach(({ label, url }) => {
    const pattern = new RegExp(`(^|[\\s([{/"'„“])(${escapeRegExp(label)})(?=$|[\\s\\])}.,;:!?"'“”])`, "giu");
    next = next.replace(pattern, (match, prefix: string, text: string) => {
      if (match.includes("](")) return match;
      const placeholder = `\uE000${placeholders.length}\uE001`;
      placeholders.push(`[${text}](${url})`);
      return `${prefix}${placeholder}`;
    });
  });
  return placeholders.reduce((value, markdown, index) => value.replace(`\uE000${index}\uE001`, markdown), next);
};

export function linkifyVincentAnswer(answer: string, context: unknown) {
  const candidates = extractVincentLinkCandidates(context);
  if (!answer || candidates.length === 0) return answer;

  return answer
    .split(markdownProtectedPattern)
    .map((segment) => isProtectedMarkdownSegment(segment) ? segment : linkifyPlainSegment(segment, candidates))
    .join("");
}
