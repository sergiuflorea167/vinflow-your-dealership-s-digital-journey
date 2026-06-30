import { supabase } from "@/integrations/supabase/client";
import type { Customer, Offer, Process, Vehicle } from "@/data/process";
import { buildCustomerAccessCode } from "@/lib/customerCode";

// Erzeugt einen Token, der die Process-ID enthält, damit der Kunde den Link
// auch auf einem anderen Gerät / Browser öffnen kann.

export interface ContactPerson {
  name: string;
  email: string;
  phone: string;
  role?: string;
}

export interface CustomerTrackingSnapshot {
  process: Process;
  vehicle: Vehicle;
  customer: Customer;
  offer?: Offer | null;
  companyName: string;
  contact?: ContactPerson | null;
  savedAt: string;
}

const SALT = "vinflow-customer-portal-2026";

const hash = (input: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
};

const b64decode = (s: string): string => {
  try {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    return decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad)));
  } catch {
    return "";
  }
};

export const buildCustomerTrackingUrl = (token: string): string => {
  return `${window.location.origin}/track/${token}`;
};

export const saveCustomerTrackingSnapshot = async (
  snapshot: Omit<CustomerTrackingSnapshot, "savedAt">,
  existingToken?: string,
): Promise<string> => {
  const safeProcess: Process = {
    ...snapshot.process,
    fields: { ...snapshot.process.fields, customerPortalToken: undefined },
  };
  const { data, error } = await supabase.functions.invoke("customer-tracking", {
    body: {
      action: "save",
      token: existingToken,
      processId: snapshot.process.id,
      accessCode: buildCustomerAccessCode(snapshot.customer),
      snapshot: { ...snapshot, process: safeProcess, savedAt: new Date().toISOString() },
    },
  });
  if (error) throw error;
  if (typeof data?.token !== "string") throw new Error("Kundenportal-Token fehlt");
  return data.token;
};

export const loadCustomerTrackingSnapshot = async (token: string, accessCode: string): Promise<CustomerTrackingSnapshot | null> => {
  const { data, error } = await supabase.functions.invoke("customer-tracking", {
    body: { action: "load", token, accessCode },
  });
  if (error) throw error;
  return (data?.snapshot ?? null) as CustomerTrackingSnapshot | null;
};

// Versucht zuerst, den Token zu dekodieren (geräteübergreifend).
// Fallback: alter Hash-only-Token → Suche unter bekannten IDs (gleicher Browser).
export const findProcessIdForToken = (token: string, processIds: string[]): string | undefined => {
  if (token.includes(".")) {
    const [encId, sig] = token.split(".");
    const id = b64decode(encId);
    if (id && hash(`${SALT}:${id}`) === sig) return id;
  }
  // Legacy-Format
  const legacyHash = (id: string) => {
    const a = hash(`${SALT}:${id}`);
    const b = hash(`${a}:${id}:${SALT}`);
    return `${a}${b}`;
  };
  return processIds.find((id) => legacyHash(id) === token);
};
