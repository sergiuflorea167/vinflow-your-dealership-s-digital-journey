export const VINCENT_NOTICE_VERSION = "2026-07-14-vehicle-access-v1";
export const VINCENT_RETENTION_DAYS = 30;
export const VINCENT_MAX_INPUT_LENGTH = 4_000;

export const getVincentClientTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export const getVincentLocalDate = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: getVincentClientTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

const SPECIAL_CATEGORY_TERMS = [
  "gesundheit", "krankheit", "diagnose", "behinderung", "religion", "weltanschauung",
  "gewerkschaft", "ethnisch", "herkunft", "rasse", "politisch", "sexuell", "biometr", "genetisch",
  "health", "disease", "diagnosis", "disability", "religion", "ethnic", "racial", "political",
  "trade union", "sexual orientation", "biometric", "genetic",
];

export const containsSpecialCategoryHint = (value: string) => {
  const normalized = value.toLocaleLowerCase("de-DE");
  return SPECIAL_CATEGORY_TERMS.some((term) => normalized.includes(term));
};

export const redactSensitiveText = (value: string): { text: string; redacted: boolean } => {
  let text = value;
  text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[E-Mail entfernt]");
  text = text.replace(/\b[A-Z]{2}\d{2}(?:[\s-]?[A-Z0-9]){11,30}\b/gi, "[IBAN entfernt]");
  text = text.replace(/\b[A-HJ-NPR-Z0-9]{17}\b/gi, "[VIN entfernt]");
  text = text.replace(/(?:\+\d{1,3}[\s()/.-]*)?(?:\d[\s()/.-]*){8,}/g, (match) => {
    const digits = match.replace(/\D/g, "");
    const looksLikePhone = digits.length >= 8 && (/^\+/.test(match.trim()) || /[()/]/.test(match));
    return looksLikePhone ? "[Telefonnummer entfernt]" : match;
  });
  return { text, redacted: text !== value };
};

export const conversationTitle = (value: string) => {
  const cleaned = redactSensitiveText(value).text.replace(/\s+/g, " ").trim();
  return (cleaned || "Neuer Chat").slice(0, 80);
};
