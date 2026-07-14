import { cn } from "@/lib/utils";
import { useVincentUIStore } from "@/store/vincentUIStore";
import { VincentFace } from "./VincentFace";

/**
 * Immer sichtbarer runder Auslöser für VINcent, unten rechts, auf Desktop
 * und Mobile gleichermaßen. Verschwindet, sobald das Chat-Fenster offen ist
 * (das bringt seinen eigenen Schließen-Button mit).
 */
export const VincentLauncher = () => {
  const open = useVincentUIStore((s) => s.open);
  if (open) return null;

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("vincent:open"))}
      aria-label="VINcent fragen"
      data-tour="vincent"
      className={cn(
        "fixed z-[125] right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:right-6 sm:bottom-6",
        "grid size-14 place-items-center rounded-full shadow-elegant",
        "transition-smooth hover:scale-105 hover:shadow-glow active:scale-95",
        "animate-fade-in",
      )}
    >
      <VincentFace className="size-14" />
    </button>
  );
};
