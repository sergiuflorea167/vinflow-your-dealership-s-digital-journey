// Erzeugt einen deterministischen, schwer zu erratenden Token aus einer Process-ID.
// Damit kann der Kunde unter /track/:token alle Belege & den Status seines Vorgangs einsehen.

const SALT = "vinflow-customer-portal-2026";

const hash = (input: string): string => {
  // Einfacher, deterministischer Hash (FNV-1a 32-bit, hex). Reicht für Demo / Mock.
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
};

export const tokenForProcess = (processId: string): string => {
  // Zwei Hash-Runden mit Salt → 16-stelliger Token.
  const a = hash(`${SALT}:${processId}`);
  const b = hash(`${a}:${processId}:${SALT}`);
  return `${a}${b}`;
};

export const buildCustomerTrackingUrl = (processId: string): string => {
  const token = tokenForProcess(processId);
  return `${window.location.origin}/track/${token}`;
};

export const findProcessIdForToken = (token: string, processIds: string[]): string | undefined =>
  processIds.find((id) => tokenForProcess(id) === token);
