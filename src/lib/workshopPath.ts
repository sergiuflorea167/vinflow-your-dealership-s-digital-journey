/** Hängt "/workshop" vor einen internen Pfad, wenn wir gerade in der Workshop-Unterwebseite sind — verhindert, dass interne Links (Fahrzeug, Vorgang, Angebot …) aus /workshop/* ins echte Live-System herausführen. */
export const withWorkshopPrefix = (path: string, inWorkshop: boolean) =>
  inWorkshop && !path.startsWith("/workshop") ? `/workshop${path}` : path;
