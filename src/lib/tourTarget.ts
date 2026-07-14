// Coach-mark / tour target resolution shared by TutorialPilot and WorkshopPilot.
// Nav items exist in both a desktop (`hidden md:flex`) and a mobile variant sharing
// the same `data-tour` selector — querySelector alone would always return the first
// DOM match, which on a phone is the hidden desktop one (zero-size rect). Prefer the
// first match that's actually rendered on screen.
export function findVisibleTourTarget(selector: string): HTMLElement | null {
  const matches = document.querySelectorAll<HTMLElement>(selector);
  if (matches.length === 0) return null;
  for (const el of matches) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}
