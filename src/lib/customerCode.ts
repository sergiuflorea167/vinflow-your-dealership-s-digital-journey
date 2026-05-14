import type { Customer } from "@/data/process";

const hashStr = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
};

const pad = (n: number) => n.toString().padStart(2, "0");

/** Deterministisches Pseudo-Geburtsdatum, falls am Kunden keines hinterlegt ist. */
export const getCustomerBirthDate = (customer: Pick<Customer, "id" | "birthDate">): string => {
  if (customer.birthDate) return customer.birthDate;
  const h = hashStr(customer.id || "anon");
  const year = 1960 + (h % 45); // 1960..2004
  const month = 1 + ((h >>> 8) % 12);
  const day = 1 + ((h >>> 16) % 28);
  return `${year}-${pad(month)}-${pad(day)}`;
};

/**
 * Code-Aufbau:
 * [erster Buchstabe Vorname][Erster Buchstabe Nachname][erste Ziffer PLZ]
 * [Geburtsmonat XX][Geburtsjahr XXXX][letzter Buchstabe/Ziffer PLZ]
 */
export const buildCustomerAccessCode = (
  customer: Pick<Customer, "id" | "name" | "zip" | "birthDate">
): string => {
  const parts = (customer.name || "").trim().split(/\s+/).filter(Boolean);
  const first = (parts[0]?.[0] ?? "X").toUpperCase();
  const last = (parts.length > 1 ? parts[parts.length - 1][0] : "X").toUpperCase();
  const zipRaw = (customer.zip ?? "").trim();
  const zipDigits = zipRaw.replace(/\D/g, "");
  const zipFirst = zipDigits[0] ?? "0";
  const zipLast = (zipRaw[zipRaw.length - 1] ?? "0").toUpperCase();
  const [y, m] = getCustomerBirthDate(customer).split("-");
  return `${first}${last}${zipFirst}${m}${y}${zipLast}`;
};

export const normalizeAccessCode = (input: string): string =>
  input.replace(/\s+/g, "").toUpperCase();

export const matchesCustomerAccessCode = (
  input: string,
  customer: Pick<Customer, "id" | "name" | "zip" | "birthDate">
): boolean => normalizeAccessCode(input) === buildCustomerAccessCode(customer);
