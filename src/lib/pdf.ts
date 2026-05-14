import jsPDF from "jspdf";
import {
  Process,
  Vehicle,
  Customer,
  Offer,
  PROCESS_STEPS,
  ProcessStepKey,
  formatCurrency,
  formatDate,
} from "@/data/process";

// VINflow PDF generator – premium layout with brand identity.
// Midnight Indigo on white, Helvetica (jsPDF default), strict grid.

type RGB = [number, number, number];

export interface PdfTheme {
  key: string;
  label: string;
  description: string;
  primary: RGB;
  primaryDark: RGB;
  ink: RGB;
  muted: RGB;
  light: RGB;
  border: RGB;
  success: RGB;
}

export const PDF_THEMES: PdfTheme[] = [
  {
    key: "indigo",
    label: "Midnight Indigo",
    description: "Modern & technisch – passt zu Tech, Premium-Marken, jüngeren Händlern.",
    primary: [79, 70, 229], primaryDark: [30, 30, 90], ink: [10, 10, 26],
    muted: [120, 124, 145], light: [240, 241, 248], border: [220, 222, 235],
    success: [38, 168, 110],
  },
  {
    key: "graphite",
    label: "Graphit & Stahl",
    description: "Klassisch-seriös – passt zu Mehrmarkenhändlern und Werkstätten.",
    primary: [55, 65, 81], primaryDark: [17, 24, 39], ink: [17, 17, 17],
    muted: [115, 120, 130], light: [241, 243, 246], border: [220, 224, 230],
    success: [38, 168, 110],
  },
  {
    key: "navy_gold",
    label: "Navy & Gold",
    description: "Hochwertig & exklusiv – passt zu Luxus-, Oldtimer- oder Premium-Häusern.",
    primary: [201, 168, 76], primaryDark: [15, 27, 61], ink: [12, 18, 36],
    muted: [120, 124, 145], light: [248, 244, 232], border: [225, 218, 195],
    success: [38, 168, 110],
  },
  {
    key: "racing_red",
    label: "Racing Red",
    description: "Sportlich & dynamisch – passt zu Performance- und Sportwagen-Händlern.",
    primary: [203, 35, 47], primaryDark: [40, 12, 16], ink: [20, 20, 22],
    muted: [120, 120, 125], light: [250, 235, 236], border: [230, 215, 215],
    success: [38, 168, 110],
  },
  {
    key: "forest",
    label: "Forest & Sage",
    description: "Wertig & nachhaltig – passt zu E-Mobilität, Familienbetrieben.",
    primary: [45, 106, 79], primaryDark: [20, 50, 36], ink: [16, 24, 20],
    muted: [120, 130, 122], light: [235, 244, 238], border: [215, 228, 220],
    success: [38, 168, 110],
  },
  {
    key: "porcelain",
    label: "Porzellan",
    description: "Minimalistisch & ruhig – passt überall, neutral & zeitlos.",
    primary: [60, 60, 70], primaryDark: [20, 20, 26], ink: [10, 10, 14],
    muted: [130, 130, 138], light: [245, 245, 248], border: [225, 225, 230],
    success: [38, 168, 110],
  },
];

export type PdfThemeKey = string;

let BRAND: Omit<PdfTheme, "key" | "label" | "description"> = PDF_THEMES[0];

const applyPdfTheme = (key?: PdfThemeKey) => {
  const t = PDF_THEMES.find((th) => th.key === key) ?? PDF_THEMES[0];
  BRAND = t;
};

const PAGE = { w: 210, h: 297, margin: 18 };

const setColor = (doc: jsPDF, c: [number, number, number], type: "fill" | "draw" | "text" = "text") => {
  if (type === "fill") doc.setFillColor(c[0], c[1], c[2]);
  if (type === "draw") doc.setDrawColor(c[0], c[1], c[2]);
  if (type === "text") doc.setTextColor(c[0], c[1], c[2]);
};

const drawHeader = (doc: jsPDF, title: string, subtitle: string, docNumber: string, companyName: string) => {
  setColor(doc, BRAND.primaryDark, "fill");
  doc.rect(0, 0, PAGE.w, 38, "F");
  setColor(doc, BRAND.primary, "fill");
  doc.rect(0, 36, PAGE.w, 2, "F");

  setColor(doc, BRAND.primary, "fill");
  doc.roundedRect(PAGE.margin, 12, 14, 14, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setColor(doc, [255, 255, 255]);
  doc.text("V", PAGE.margin + 7, 22, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  setColor(doc, [255, 255, 255]);
  doc.text("VINflow", PAGE.margin + 19, 19);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(doc, [200, 205, 230]);
  doc.text(companyName.toUpperCase(), PAGE.margin + 19, 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setColor(doc, [255, 255, 255]);
  doc.text(title.toUpperCase(), PAGE.w - PAGE.margin, 19, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(doc, [200, 205, 230]);
  doc.text(subtitle, PAGE.w - PAGE.margin, 24, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(doc, [255, 255, 255]);
  doc.text(docNumber, PAGE.w - PAGE.margin, 30, { align: "right" });
};

const drawFooter = (doc: jsPDF, footerText: string, companyName: string) => {
  const y = PAGE.h - 15;
  setColor(doc, BRAND.border, "draw");
  doc.setLineWidth(0.3);
  doc.line(PAGE.margin, y, PAGE.w - PAGE.margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(doc, BRAND.muted);
  doc.text(footerText, PAGE.margin, y + 5);
  doc.text(`${companyName} · vinflow.app`, PAGE.w - PAGE.margin, y + 5, { align: "right" });
  doc.text(`Erstellt am ${formatDate(new Date().toISOString())}`, PAGE.w / 2, y + 5, { align: "center" });
};

const drawAddressBlock = (doc: jsPDF, customer: Customer, y: number, label = "RECHNUNGSEMPFÄNGER") => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(doc, BRAND.muted);
  doc.text(label, PAGE.margin, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setColor(doc, BRAND.ink);
  doc.text(customer.name, PAGE.margin, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(doc, BRAND.ink);
  if (customer.street) doc.text(customer.street, PAGE.margin, y + 11);
  doc.text(`${customer.zip ?? ""} ${customer.city}`.trim(), PAGE.margin, y + 16);

  doc.setFontSize(8);
  setColor(doc, BRAND.muted);
  doc.text(customer.email, PAGE.margin, y + 22);
  doc.text(customer.phone, PAGE.margin, y + 26);
};

const drawMetaBlock = (doc: jsPDF, rows: Array<[string, string]>, y: number) => {
  const x = PAGE.w - PAGE.margin - 70;
  const w = 70;
  setColor(doc, BRAND.light, "fill");
  doc.roundedRect(x, y - 2, w, rows.length * 6 + 6, 2, 2, "F");
  rows.forEach(([label, value], i) => {
    const ry = y + 4 + i * 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setColor(doc, BRAND.muted);
    doc.text(label.toUpperCase(), x + 4, ry);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setColor(doc, BRAND.ink);
    doc.text(value, x + w - 4, ry, { align: "right" });
  });
};

const drawVehicleCard = (doc: jsPDF, vehicle: Vehicle, y: number) => {
  setColor(doc, BRAND.primaryDark, "fill");
  doc.roundedRect(PAGE.margin, y, PAGE.w - 2 * PAGE.margin, 32, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setColor(doc, [180, 185, 220]);
  doc.text("FAHRZEUG", PAGE.margin + 6, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setColor(doc, [255, 255, 255]);
  doc.text(`${vehicle.make} ${vehicle.model}`, PAGE.margin + 6, y + 14);

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  setColor(doc, [200, 205, 230]);
  doc.text(`VIN ${vehicle.vin}`, PAGE.margin + 6, y + 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(doc, [200, 205, 230]);
  doc.text(
    `${vehicle.year}  ·  ${vehicle.color}  ·  ${vehicle.mileage.toLocaleString("de-DE")} km  ·  ${vehicle.fuel}  ·  ${vehicle.transmission}  ·  ${vehicle.power_hp} PS`,
    PAGE.margin + 6,
    y + 26
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(doc, [200, 205, 230]);
  doc.text("ERSTZULASSUNG", PAGE.w - PAGE.margin - 6, y + 7, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setColor(doc, [255, 255, 255]);
  doc.text(vehicle.firstRegistration ? formatDate(vehicle.firstRegistration) : "—", PAGE.w - PAGE.margin - 6, y + 14, { align: "right" });
};

interface LineItem {
  description: string;
  qty: string;
  unitPrice: number;
  total: number;
}

const drawTable = (doc: jsPDF, items: LineItem[], y: number, totalLabel = "GESAMTSUMME") => {
  const headerH = 8;
  const rowH = 9;
  const x = PAGE.margin;
  const w = PAGE.w - 2 * PAGE.margin;
  setColor(doc, BRAND.ink, "fill");
  doc.rect(x, y, w, headerH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(doc, [255, 255, 255]);
  doc.text("BESCHREIBUNG", x + 3, y + 5.5);
  doc.text("MENGE", x + 110, y + 5.5);
  doc.text("EINZELPREIS", x + 135, y + 5.5);
  doc.text("BETRAG", x + w - 3, y + 5.5, { align: "right" });

  let cy = y + headerH;
  items.forEach((it, i) => {
    if (i % 2 === 0) {
      setColor(doc, BRAND.light, "fill");
      doc.rect(x, cy, w, rowH, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(doc, BRAND.ink);
    doc.text(it.description, x + 3, cy + 6);
    doc.text(it.qty, x + 110, cy + 6);
    doc.text(formatCurrency(it.unitPrice), x + 135, cy + 6);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(it.total), x + w - 3, cy + 6, { align: "right" });
    cy += rowH;
  });

  cy += 3;
  setColor(doc, BRAND.primary, "fill");
  doc.roundedRect(x, cy, w, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setColor(doc, [255, 255, 255]);
  doc.text(totalLabel, x + 4, cy + 7.5);
  const total = items.reduce((s, i) => s + i.total, 0);
  doc.setFontSize(13);
  doc.text(formatCurrency(total), x + w - 4, cy + 8, { align: "right" });

  return cy + 14;
};

const drawSectionTitle = (doc: jsPDF, title: string, y: number) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setColor(doc, BRAND.ink);
  doc.text(title, PAGE.margin, y);
  setColor(doc, BRAND.primary, "draw");
  doc.setLineWidth(0.8);
  doc.line(PAGE.margin, y + 1.5, PAGE.margin + 18, y + 1.5);
};

const drawTextBlock = (doc: jsPDF, text: string, y: number, options?: { fontSize?: number; muted?: boolean }) => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(options?.fontSize ?? 9);
  setColor(doc, options?.muted ? BRAND.muted : BRAND.ink);
  const lines = doc.splitTextToSize(text, PAGE.w - 2 * PAGE.margin);
  doc.text(lines, PAGE.margin, y);
  return y + lines.length * (options?.fontSize ?? 9) * 0.4;
};

const drawDeliveryCallout = (doc: jsPDF, deliveryDate: string | undefined, y: number) => {
  const w = PAGE.w - 2 * PAGE.margin;
  const h = 16;
  setColor(doc, BRAND.primary, "fill");
  doc.roundedRect(PAGE.margin, y, 3, h, 1, 1, "F");
  setColor(doc, [243, 244, 252], "fill");
  doc.roundedRect(PAGE.margin + 3, y, w - 3, h, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(doc, BRAND.primary);
  doc.text("LIEFERTERMIN", PAGE.margin + 8, y + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setColor(doc, BRAND.ink);
  doc.text(deliveryDate ? formatDate(deliveryDate) : "nach Vereinbarung", PAGE.margin + 8, y + 13);
  return y + h + 4;
};


const drawTodos = (doc: jsPDF, todos: { title: string }[], y: number, title: string) => {
  if (!todos.length) return y;
  drawSectionTitle(doc, title, y);
  y += 6;
  todos.forEach((t) => {
    setColor(doc, BRAND.primary, "draw");
    doc.setLineWidth(0.5);
    doc.rect(PAGE.margin, y - 2, 3, 3, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(doc, BRAND.ink);
    doc.text(t.title, PAGE.margin + 6, y);
    y += 5.5;
  });
  return y + 2;
};

// ---------- Public API ----------

export interface GeneratePdfArgs {
  process: Process;
  vehicle: Vehicle;
  customer: Customer;
  offer?: Offer;
  stepKey: ProcessStepKey;
  companyName?: string;
  pdfTheme?: PdfThemeKey;
}

export const generateBelegPdf = ({ process, vehicle, customer, offer, stepKey, companyName = "VINflow Autohaus GmbH", pdfTheme }: GeneratePdfArgs): jsPDF => {
  applyPdfTheme(pdfTheme);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const step = PROCESS_STEPS.find((s) => s.key === stepKey)!;
  const docNumber = `${process.id} · ${step.shortLabel.toUpperCase()}`;

  drawHeader(doc, step.documentName, `Vorgang ${process.id}`, docNumber, companyName);
  drawAddressBlock(doc, customer, 50);
  drawMetaBlock(doc, [
    ["Vorgangs-Nr.", process.id],
    ["Beleg-Datum", formatDate(new Date().toISOString())],
    ["Erstellt am", formatDate(process.createdAt)],
  ], 50);

  drawVehicleCard(doc, vehicle, 88);

  let cursor = 130;
  const finalPrice = process.fields.finalPrice ?? vehicle.listPrice;

  switch (stepKey) {
    case "offer": {
      drawSectionTitle(doc, "Angebot", cursor);
      cursor += 8;
      cursor = drawTextBlock(doc,
        `Sehr geehrte/r ${customer.name}, vielen Dank für Ihr Interesse. Wir freuen uns, Ihnen für das oben genannte Fahrzeug folgendes verbindliches Angebot unterbreiten zu dürfen.`,
        cursor, { muted: true });
      cursor += 6;
      cursor = drawTable(doc, [
        { description: `${vehicle.make} ${vehicle.model} (${vehicle.year})`, qty: "1", unitPrice: offer?.price ?? vehicle.listPrice, total: offer?.price ?? vehicle.listPrice },
      ], cursor, "ANGEBOTSPREIS");
      cursor += 6;
      drawSectionTitle(doc, "Konditionen", cursor); cursor += 6;
      cursor = drawTextBlock(doc,
        `Gültigkeit: bis ${offer ? formatDate(offer.validUntil) : "—"}\nLieferung: nach Vereinbarung\nGewährleistung: 12 Monate gemäß BGB\nPreis inkl. 19% MwSt.`,
        cursor);
      if (offer?.customerTodos.length) {
        cursor += 6;
        cursor = drawTodos(doc, offer.customerTodos, cursor, "Vereinbarte Leistungen");
      }
      break;
    }
    case "down_payment": {
      const dp = process.fields.downPayment;
      const ocDp = process.fields.orderConfirmation;
      drawSectionTitle(doc, `Anzahlungsrechnung ${dp?.invoiceNumber ?? ""}`.trim(), cursor); cursor += 8;
      const down = dp?.amount ?? Math.round(finalPrice * 0.15);
      cursor = drawTextBlock(doc,
        `Hiermit stellen wir Ihnen die vereinbarte Anzahlung für das oben genannte Fahrzeug in Rechnung. Bitte überweisen Sie den Betrag bis zum vereinbarten Termin auf das angegebene Konto.`,
        cursor, { muted: true });
      cursor += 6;
      cursor = drawDeliveryCallout(doc, ocDp?.deliveryDate, cursor);
      cursor += 2;
      cursor = drawTable(doc, [{ description: "Anzahlung Fahrzeugkauf", qty: "1", unitPrice: down, total: down }], cursor, "ZU ZAHLENDER BETRAG");
      cursor += 6;
      drawSectionTitle(doc, "Zahlungsdaten", cursor); cursor += 6;
      cursor = drawTextBlock(doc,
        `Empfänger: ${companyName}\nIBAN: DE89 3704 0044 0532 0130 00\nBIC: COBADEFFXXX\nVerwendungszweck: ${dp?.invoiceNumber ?? process.id}\nRechnungsdatum: ${dp?.invoiceDate ? formatDate(dp.invoiceDate) : "—"}\nFällig: ${dp?.dueDate ? formatDate(dp.dueDate) : "sofort"}${dp?.received ? `\nZahlung eingegangen am: ${dp.receivedDate ? formatDate(dp.receivedDate) : "—"}` : ""}`,
        cursor);
      break;
    }
    case "order_confirmation": {
      drawSectionTitle(doc, "Auftragsbestätigung", cursor); cursor += 8;
      cursor = drawTextBlock(doc,
        `Wir bestätigen Ihnen hiermit den verbindlichen Kaufauftrag für das oben aufgeführte Fahrzeug zu folgenden Konditionen:`,
        cursor, { muted: true });
      cursor += 6;
      const oc = process.fields.orderConfirmation;
      cursor = drawDeliveryCallout(doc, oc?.deliveryDate, cursor);
      cursor += 2;
      cursor = drawTable(doc, [
        { description: `${vehicle.make} ${vehicle.model}`, qty: "1", unitPrice: finalPrice, total: finalPrice },
      ], cursor, "KAUFPREIS");
      cursor += 6;
      drawSectionTitle(doc, "Eckdaten", cursor); cursor += 6;
      cursor = drawTextBlock(doc,
        `Auftragsdatum: ${oc?.orderDate ? formatDate(oc.orderDate) : "—"}\nZahlungsbedingungen: ${oc?.paymentTerms ?? "Restzahlung bei Übergabe"}\nBereits geleistete Anzahlung: ${formatCurrency(process.fields.downPayment?.amount ?? 0)}`,
        cursor);
      if (process.customerTodosOC.length) {
        cursor += 6;
        cursor = drawTodos(doc, process.customerTodosOC, cursor, "Vereinbarte Leistungen");
      }
      break;
    }
    case "outbound_check": {
      drawSectionTitle(doc, "Ausgangsprotokoll", cursor); cursor += 8;
      const checklist = process.outboundChecklist;
      const doneCount = checklist.filter((i) => i.done).length;
      const allDone = doneCount === checklist.length && checklist.length > 0;
      cursor = drawTextBlock(doc,
        allDone
          ? `Vor Übergabe des Fahrzeugs wurde folgende Ausgangskontrolle vollständig durchgeführt und dokumentiert:`
          : `Stand der Ausgangskontrolle (${doneCount} von ${checklist.length} Punkten erledigt):`,
        cursor, { muted: true });
      cursor += 4;
      checklist.forEach((item) => {
        if (item.done) {
          setColor(doc, BRAND.success, "fill");
          doc.circle(PAGE.margin + 2, cursor + 2, 1.5, "F");
        } else {
          setColor(doc, BRAND.muted, "draw");
          doc.setLineWidth(0.4);
          doc.circle(PAGE.margin + 2, cursor + 2, 1.5, "S");
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setColor(doc, BRAND.ink);
        doc.text(item.label, PAGE.margin + 7, cursor + 3);
        doc.setFont("helvetica", "bold");
        setColor(doc, item.done ? BRAND.success : BRAND.muted);
        doc.text(item.done ? "erledigt" : "offen", PAGE.w - PAGE.margin, cursor + 3, { align: "right" });
        cursor += 6;
      });
      cursor += 4;
      cursor = drawTextBlock(doc,
        allDone ? `Das Fahrzeug ist übergabebereit.` : `Hinweis: Es sind noch ${checklist.length - doneCount} Punkte offen. Das Fahrzeug ist noch nicht vollständig übergabebereit.`,
        cursor, { muted: true });
      break;
    }
    case "invoicing": {
      drawSectionTitle(doc, "Rechnung", cursor); cursor += 8;
      const inv = process.fields.invoicing;
      const ocInv = process.fields.orderConfirmation;
      const down = process.fields.downPayment?.amount ?? 0;
      const remaining = finalPrice - down;
      cursor = drawDeliveryCallout(doc, ocInv?.deliveryDate, cursor);
      cursor += 2;
      cursor = drawTable(doc, [
        { description: `${vehicle.make} ${vehicle.model} (${vehicle.year})`, qty: "1", unitPrice: finalPrice, total: finalPrice },
        ...(down > 0 ? [{ description: "abzgl. geleistete Anzahlung", qty: "1", unitPrice: -down, total: -down }] : []),
      ], cursor, "RESTBETRAG");
      cursor += 6;
      drawSectionTitle(doc, "Zahlungsdaten", cursor); cursor += 6;
      cursor = drawTextBlock(doc,
        `Rechnungs-Nr.: ${inv?.invoiceNumber ?? "—"}\nRechnungsdatum: ${inv?.invoiceDate ? formatDate(inv.invoiceDate) : formatDate(new Date().toISOString())}\nFällig: ${inv?.dueDate ? formatDate(inv.dueDate) : "sofort"}\nIBAN: DE89 3704 0044 0532 0130 00 · Verwendungszweck: ${process.id}\nDer Restbetrag von ${formatCurrency(remaining)} ist bei Fahrzeugübergabe fällig.`,
        cursor);
      break;
    }
    case "purchase_contract": {
      drawSectionTitle(doc, "Kaufvertrag", cursor); cursor += 8;
      const kv = process.fields.purchaseContract;
      cursor = drawTextBlock(doc,
        `Zwischen ${companyName} (Verkäufer) und ${customer.name} (Käufer) wird folgender Kaufvertrag über das oben bezeichnete Fahrzeug geschlossen.`,
        cursor, { muted: true });
      cursor += 6;
      cursor = drawTable(doc, [
        { description: `${vehicle.make} ${vehicle.model} (${vehicle.year})`, qty: "1", unitPrice: finalPrice, total: finalPrice },
      ], cursor, "KAUFPREIS GESAMT");
      cursor += 6;
      drawSectionTitle(doc, "Vertragsdaten", cursor); cursor += 6;
      cursor = drawTextBlock(doc,
        `Vertrags-Nr.: ${kv?.contractNumber ?? "—"}\nVertragsdatum: ${kv?.contractDate ? formatDate(kv.contractDate) : "—"}\nVertragsort: ${kv?.place ?? "—"}\nGewährleistung: ${kv?.warrantyMonths ?? 12} Monate gemäß BGB\nPreis inkl. 19% MwSt.\n\nDer Käufer erkennt mit seiner Unterschrift den Erhalt des Fahrzeuges samt Schlüsseln, Fahrzeugschein und Fahrzeugbrief sowie alle vereinbarten Leistungen an.`,
        cursor);
      cursor += 14;
      const colW = (PAGE.w - 2 * PAGE.margin - 10) / 2;
      setColor(doc, BRAND.ink, "draw");
      doc.setLineWidth(0.4);
      doc.line(PAGE.margin, cursor, PAGE.margin + colW, cursor);
      doc.line(PAGE.margin + colW + 10, cursor, PAGE.w - PAGE.margin, cursor);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); setColor(doc, BRAND.muted);
      doc.text("Käufer", PAGE.margin, cursor + 4);
      doc.text("Verkäufer", PAGE.margin + colW + 10, cursor + 4);
      break;
    }
    case "delivery_confirmation": {
      drawSectionTitle(doc, "Übergabeprotokoll", cursor); cursor += 8;
      const del = process.fields.delivery;
      cursor = drawTextBlock(doc, `Hiermit bestätigt der Kunde die ordnungsgemäße Übergabe des Fahrzeugs.`, cursor, { muted: true });
      cursor += 6;
      cursor = drawTextBlock(doc,
        `Übergabedatum: ${del?.handoverDate ? formatDate(del.handoverDate) : formatDate(new Date().toISOString())}\nÜbergabeort: ${del?.handoverLocation ?? "Filiale"}\nKilometerstand bei Übergabe: ${del?.finalMileage?.toLocaleString("de-DE") ?? vehicle.mileage.toLocaleString("de-DE")} km\nTankfüllung: ${del?.fuelLevel ?? "voll"}`,
        cursor);
      cursor += 14;
      const colW = (PAGE.w - 2 * PAGE.margin - 10) / 2;
      setColor(doc, BRAND.ink, "draw");
      doc.setLineWidth(0.4);
      doc.line(PAGE.margin, cursor, PAGE.margin + colW, cursor);
      doc.line(PAGE.margin + colW + 10, cursor, PAGE.w - PAGE.margin, cursor);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); setColor(doc, BRAND.muted);
      doc.text("Unterschrift Kunde", PAGE.margin, cursor + 4);
      doc.text(`Unterschrift ${companyName}`, PAGE.margin + colW + 10, cursor + 4);
      break;
    }
  }

  drawFooter(doc, `${step.documentName} · ${process.id}`, companyName);
  return doc;
};

export const downloadBelegPdf = (args: GeneratePdfArgs) => {
  const doc = generateBelegPdf(args);
  const step = PROCESS_STEPS.find((s) => s.key === args.stepKey)!;
  doc.save(`${args.process.id}_${step.documentName.replace(/[^A-Za-z0-9]/g, "_")}.pdf`);
};

// ---------- Standalone Angebot PDF (vor Vorgangs-Erstellung) ----------

export interface GenerateOfferPdfArgs {
  offer: Offer;
  vehicle: Vehicle;
  customer: Customer;
  companyName?: string;
}

export const generateOfferPdf = ({ offer, vehicle, customer, companyName = "VINflow Autohaus GmbH" }: GenerateOfferPdfArgs): jsPDF => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const docNumber = `${offer.id} · ANGEBOT`;
  drawHeader(doc, "Angebot", `Angebots-Nr. ${offer.id}`, docNumber, companyName);
  drawAddressBlock(doc, customer, 50, "ANGEBOTSEMPFÄNGER");
  drawMetaBlock(doc, [
    ["Angebots-Nr.", offer.id],
    ["Erstellt am", formatDate(offer.createdAt)],
    ["Gültig bis", formatDate(offer.validUntil)],
  ], 50);
  drawVehicleCard(doc, vehicle, 88);

  let cursor = 130;
  drawSectionTitle(doc, "Angebot", cursor);
  cursor += 8;
  cursor = drawTextBlock(doc,
    `Sehr geehrte/r ${customer.name}, vielen Dank für Ihr Interesse. Wir freuen uns, Ihnen für das oben genannte Fahrzeug folgendes verbindliches Angebot unterbreiten zu dürfen.`,
    cursor, { muted: true });
  cursor += 6;

  const items: LineItem[] = [
    { description: `${vehicle.make} ${vehicle.model} (${vehicle.year})`, qty: "1", unitPrice: offer.price, total: offer.price },
  ];
  if (offer.discount && offer.discount > 0) {
    items.push({ description: "Rabatt", qty: "1", unitPrice: -offer.discount, total: -offer.discount });
  }
  cursor = drawTable(doc, items, cursor, "ANGEBOTSPREIS");
  cursor += 6;

  drawSectionTitle(doc, "Konditionen", cursor); cursor += 6;
  cursor = drawTextBlock(doc,
    `Gültigkeit: bis ${formatDate(offer.validUntil)}\nLieferung: nach Vereinbarung\nGewährleistung: 12 Monate gemäß BGB\nPreis inkl. 19% MwSt.`,
    cursor);

  if (offer.customerTodos.length) {
    cursor += 6;
    cursor = drawTodos(doc, offer.customerTodos, cursor, "Vereinbarte Leistungen");
  }
  if (offer.notes && offer.notes.trim()) {
    cursor += 6;
    drawSectionTitle(doc, "Hinweise", cursor); cursor += 6;
    cursor = drawTextBlock(doc, offer.notes, cursor, { muted: true });
  }

  drawFooter(doc, `Angebot · ${offer.id}`, companyName);
  return doc;
};

export const downloadOfferPdf = (args: GenerateOfferPdfArgs) => {
  const doc = generateOfferPdf(args);
  doc.save(`${args.offer.id}_Angebot.pdf`);
};
