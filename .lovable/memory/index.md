# Project Memory

## Core
VINflow: VIN-zentrierte SaaS für Fahrzeughändler. Datenmodell: Vehicle (VIN-Stammobjekt) → Einkaufsplanung (separat, vor Flotte) → Flotte (Bestand) → mehrere Offers pro Vehicle möglich → ein Vorgang ab Angebotsannahme.
Vorgangskette (6 Schritte ab Angebot): Angebot → Anzahlung → Auftragsbestätigung → Ausgangskontrolle (Checkliste) → Rechnung → Lieferbestätigung. Sequenziell, jeder Schritt erzeugt einen archivierten PDF-Beleg (jsPDF).
Sidebar-Menü: Einkaufsplanung, Flotte, Vorgänge (mit Belegen), Kunden. Logo führt zum Dashboard.
Pflichtfelder pro Schritt mit Validierung; PDFs downloadbar via src/lib/pdf.ts (Midnight Indigo Branding).
Design: Midnight Indigo (#0a0a1a, #141432, #1e1e5a, #4f46e5), Sora + Manrope, Dashboard-Layout, horizontale Stepper-Leiste.
Sprache UI: Deutsch.
