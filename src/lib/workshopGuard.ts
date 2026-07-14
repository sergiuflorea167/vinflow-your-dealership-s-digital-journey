import { toast } from "sonner";

/**
 * Wraps a store-mutating function so that, while a workshop is active on the page
 * that owns it, calls become a harmless no-op with a toast instead of writing to
 * the real (customer) database. Pass the real function straight through otherwise.
 */
export function withWorkshopGuard<F extends (...args: never[]) => unknown>(active: boolean, fn: F): F {
  if (!active) return fn;
  return ((..._args: unknown[]) => {
    toast.info("Workshop-Modus: Hier wird nichts gespeichert.");
    return undefined;
  }) as F;
}
