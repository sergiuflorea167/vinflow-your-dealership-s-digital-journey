// Erzeugt einen Token, der die Process-ID enthält, damit der Kunde den Link
// auch auf einem anderen Gerät / Browser öffnen kann (Demo: kein Server-Lookup nötig).

const SALT = "vinflow-customer-portal-2026";

const hash = (input: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
};

// URL-safe base64
const b64encode = (s: string): string =>
  btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const b64decode = (s: string): string => {
  try {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    return decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad)));
  } catch {
    return "";
  }
};

export const tokenForProcess = (processId: string): string => {
  const sig = hash(`${SALT}:${processId}`);
  // Format: <base64(processId)>.<sig>
  return `${b64encode(processId)}.${sig}`;
};

export const buildCustomerTrackingUrl = (processId: string): string => {
  const token = tokenForProcess(processId);
  return `${window.location.origin}/track/${token}`;
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
