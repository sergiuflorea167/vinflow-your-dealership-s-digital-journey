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

// VINflow PDF generator – clean, standard business document layout (DIN-5008 inspired).
// White background, minimal accent color, generous whitespace, consistent grid.

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
    primary: [79, 70, 229], primaryDark: [30, 30, 90], ink: [20, 22, 36],
    muted: [120, 124, 145], light: [244, 245, 251], border: [225, 227, 238],
    success: [38, 168, 110],
  },
  {
    key: "graphite",
    label: "Graphit & Stahl",
    description: "Klassisch-seriös – passt zu Mehrmarkenhändlern und Werkstätten.",
    primary: [55, 65, 81], primaryDark: [17, 24, 39], ink: [22, 24, 28],
    muted: [115, 120, 130], light: [244, 246, 248], border: [225, 228, 233],
    success: [38, 168, 110],
  },
  {
    key: "navy_gold",
    label: "Navy & Gold",
    description: "Hochwertig & exklusiv – passt zu Luxus-, Oldtimer- oder Premium-Häusern.",
    primary: [168, 132, 50], primaryDark: [15, 27, 61], ink: [18, 24, 42],
    muted: [125, 128, 142], light: [250, 247, 240], border: [228, 222, 205],
    success: [38, 168, 110],
  },
  {
    key: "racing_red",
    label: "Racing Red",
    description: "Sportlich & dynamisch – passt zu Performance- und Sportwagen-Händlern.",
    primary: [192, 32, 44], primaryDark: [40, 12, 16], ink: [24, 22, 24],
    muted: [122, 122, 128], light: [251, 243, 244], border: [232, 222, 222],
    success: [38, 168, 110],
  },
  {
    key: "forest",
    label: "Forest & Sage",
    description: "Wertig & nachhaltig – passt zu E-Mobilität, Familienbetrieben.",
    primary: [45, 106, 79], primaryDark: [20, 50, 36], ink: [20, 28, 24],
    muted: [122, 130, 124], light: [240, 246, 242], border: [220, 230, 224],
    success: [38, 168, 110],
  },
  {
    key: "porcelain",
    label: "Porzellan",
    description: "Minimalistisch & ruhig – passt überall, neutral & zeitlos.",
    primary: [70, 70, 80], primaryDark: [22, 22, 28], ink: [18, 18, 22],
    muted: [130, 130, 138], light: [247, 247, 250], border: [228, 228, 234],
    success: [38, 168, 110],
  },
];

export type PdfThemeKey = string;

let BRAND: Omit<PdfTheme, "key" | "label" | "description"> = PDF_THEMES[0];

const applyPdfTheme = (key?: PdfThemeKey) => {
  const t = PDF_THEMES.find((th) => th.key === key) ?? PDF_THEMES[0];
  BRAND = t;
};

const PAGE = { w: 210, h: 297, margin: 20 };
export const BANK = { iban: "DE89 3704 0044 0532 0130 00", bic: "COBADEFFXXX", bank: "Commerzbank" };

const setColor = (doc: jsPDF, c: RGB, type: "fill" | "draw" | "text" = "text") => {
  if (type === "fill") doc.setFillColor(c[0], c[1], c[2]);
  if (type === "draw") doc.setDrawColor(c[0], c[1], c[2]);
  if (type === "text") doc.setTextColor(c[0], c[1], c[2]);
};

// ---------- Header / Footer ----------

const drawHeader = (doc: jsPDF, title: string, docNumber: string, companyName: string) => {
  // Sender line (small, top-left – DIN 5008 Absenderzeile)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(doc, BRAND.muted);
  doc.text(`${companyName} · vinflow.app`, PAGE.margin, 14);

  // Brand mark + name (left)
  setColor(doc, BRAND.primary, "fill");
  doc.roundedRect(PAGE.margin, 18, 9, 9, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setColor(doc, [255, 255, 255]);
  doc.text("V", PAGE.margin + 4.5, 24.3, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  setColor(doc, BRAND.ink);
  doc.text(companyName, PAGE.margin + 13, 24.5);

  // Document title (right, large)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  setColor(doc, BRAND.ink);
  doc.text(title, PAGE.w - PAGE.margin, 24, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(doc, BRAND.muted);
  doc.text(docNumber, PAGE.w - PAGE.margin, 30, { align: "right" });

  // Thin accent rule
  setColor(doc, BRAND.primary, "draw");
  doc.setLineWidth(0.6);
  doc.line(PAGE.margin, 34, PAGE.w - PAGE.margin, 34);
};

const drawFooter = (doc: jsPDF, companyName: string) => {
  const y = PAGE.h - 22;
  setColor(doc, BRAND.border, "draw");
  doc.setLineWidth(0.3);
  doc.line(PAGE.margin, y, PAGE.w - PAGE.margin, y);

  const colW = (PAGE.w - 2 * PAGE.margin) / 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setColor(doc, BRAND.muted);
  doc.text("UNTERNEHMEN", PAGE.margin, y + 4);
  doc.text("BANKVERBINDUNG", PAGE.margin + colW, y + 4);
  doc.text("KONTAKT", PAGE.margin + 2 * colW, y + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(doc, BRAND.ink);
  doc.text(companyName, PAGE.margin, y + 8);
  doc.text("USt-IdNr.: DE—", PAGE.margin, y + 11);
  doc.text(`HRB —`, PAGE.margin, y + 14);

  doc.text(BANK.bank, PAGE.margin + colW, y + 8);
  doc.text(`IBAN ${BANK.iban}`, PAGE.margin + colW, y + 11);
  doc.text(`BIC ${BANK.bic}`, PAGE.margin + colW, y + 14);

  doc.text("vinflow.app", PAGE.margin + 2 * colW, y + 8);
  doc.text("info@vinflow.app", PAGE.margin + 2 * colW, y + 11);

  setColor(doc, BRAND.muted);
  doc.setFontSize(6.5);
  doc.text(
    `Erstellt am ${formatDate(new Date().toISOString())} · Seite 1`,
    PAGE.w - PAGE.margin, PAGE.h - 8, { align: "right" }
  );
};

// ---------- Building blocks ----------

const drawAddressBlock = (doc: jsPDF, customer: Customer, y: number, label = "RECHNUNGSEMPFÄNGER") => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(doc, BRAND.muted);
  doc.text(label, PAGE.margin, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setColor(doc, BRAND.ink);
  doc.text(customer.name, PAGE.margin, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setColor(doc, BRAND.ink);
  let ay = y + 11;
  if (customer.street) { doc.text(customer.street, PAGE.margin, ay); ay += 5; }
  doc.text(`${customer.zip ?? ""} ${customer.city}`.trim(), PAGE.margin, ay); ay += 6;

  doc.setFontSize(8);
  setColor(doc, BRAND.muted);
  if (customer.email) { doc.text(customer.email, PAGE.margin, ay); ay += 4; }
  if (customer.phone) doc.text(customer.phone, PAGE.margin, ay);
};

const drawMetaBlock = (doc: jsPDF, rows: Array<[string, string]>, y: number) => {
  const w = 72;
  const x = PAGE.w - PAGE.margin - w;
  rows.forEach(([label, value], i) => {
    const ry = y + i * 5.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setColor(doc, BRAND.muted);
    doc.text(label, x, ry);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setColor(doc, BRAND.ink);
    doc.text(value, x + w, ry, { align: "right" });
    if (i < rows.length - 1) {
      setColor(doc, BRAND.border, "draw");
      doc.setLineWidth(0.2);
      doc.line(x, ry + 1.8, x + w, ry + 1.8);
    }
  });
};

const drawVehicleCard = (doc: jsPDF, vehicle: Vehicle, y: number) => {
  const w = PAGE.w - 2 * PAGE.margin;
  const h = 30;
  setColor(doc, BRAND.light, "fill");
  setColor(doc, BRAND.border, "draw");
  doc.setLineWidth(0.3);
  doc.roundedRect(PAGE.margin, y, w, h, 2, 2, "FD");

  // Left accent bar
  setColor(doc, BRAND.primary, "fill");
  doc.rect(PAGE.margin, y, 1.5, h, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(doc, BRAND.muted);
  doc.text("FAHRZEUG", PAGE.margin + 6, y + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setColor(doc, BRAND.ink);
  const title = [vehicle.make, vehicle.model, vehicle.modelDetail].filter(Boolean).join(" ");
  doc.text(title, PAGE.margin + 6, y + 13);

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  setColor(doc, BRAND.muted);
  doc.text(`VIN ${vehicle.vin}`, PAGE.margin + 6, y + 19);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(doc, BRAND.ink);
  doc.text(
    `${vehicle.year} · ${vehicle.color} · ${vehicle.mileage.toLocaleString("de-DE")} km · ${vehicle.fuel} · ${vehicle.transmission} · ${vehicle.power_hp} PS`,
    PAGE.margin + 6, y + 25
  );

  // Right side: first registration
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(doc, BRAND.muted);
  doc.text("ERSTZULASSUNG", PAGE.w - PAGE.margin - 6, y + 6, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setColor(doc, BRAND.ink);
  doc.text(vehicle.firstRegistration ? formatDate(vehicle.firstRegistration) : "—",
    PAGE.w - PAGE.margin - 6, y + 13, { align: "right" });

  return y + h + 8;
};

interface LineItem {
  description: string;
  qty: string;
  unitPrice: number;
  total: number;
}

const drawTable = (doc: jsPDF, items: LineItem[], y: number, totalLabel = "Gesamtsumme") => {
  const x = PAGE.margin;
  const w = PAGE.w - 2 * PAGE.margin;
  const rowH = 8.5;

  // Header (no fill, just text + bottom rule)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setColor(doc, BRAND.muted);
  doc.text("BESCHREIBUNG", x, y + 4);
  doc.text("MENGE", x + 110, y + 4);
  doc.text("EINZELPREIS", x + 132, y + 4);
  doc.text("BETRAG", x + w, y + 4, { align: "right" });
  setColor(doc, BRAND.ink, "draw");
  doc.setLineWidth(0.4);
  doc.line(x, y + 6, x + w, y + 6);

  let cy = y + 6;
  items.forEach((it) => {
    cy += rowH;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    setColor(doc, BRAND.ink);
    doc.text(it.description, x, cy - 2);
    doc.text(it.qty, x + 110, cy - 2);
    doc.text(formatCurrency(it.unitPrice), x + 132, cy - 2);
    doc.text(formatCurrency(it.total), x + w, cy - 2, { align: "right" });
    setColor(doc, BRAND.border, "draw");
    doc.setLineWidth(0.2);
    doc.line(x, cy, x + w, cy);
  });

  // Total row – minimal: heavy rule + bold right-aligned amount
  cy += 6;
  const total = items.reduce((s, i) => s + i.total, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(doc, BRAND.muted);
  doc.text(totalLabel, x + 110, cy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setColor(doc, BRAND.ink);
  doc.text(formatCurrency(total), x + w, cy, { align: "right" });
  setColor(doc, BRAND.primary, "draw");
  doc.setLineWidth(0.8);
  doc.line(x + 100, cy + 2.5, x + w, cy + 2.5);

  return cy + 8;
};

const drawSectionTitle = (doc: jsPDF, title: string, y: number) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setColor(doc, BRAND.primary);
  doc.text(title.toUpperCase(), PAGE.margin, y);
  setColor(doc, BRAND.border, "draw");
  doc.setLineWidth(0.3);
  doc.line(PAGE.margin, y + 1.8, PAGE.w - PAGE.margin, y + 1.8);
  return y + 6;
};

const drawTextBlock = (doc: jsPDF, text: string, y: number, options?: { fontSize?: number; muted?: boolean }) => {
  const fs = options?.fontSize ?? 9.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fs);
  setColor(doc, options?.muted ? BRAND.muted : BRAND.ink);
  const lines = doc.splitTextToSize(text, PAGE.w - 2 * PAGE.margin);
  doc.text(lines, PAGE.margin, y);
  return y + lines.length * fs * 0.42;
};

const drawDeliveryCallout = (doc: jsPDF, deliveryDate: string | undefined, y: number) => {
  const w = PAGE.w - 2 * PAGE.margin;
  const h = 14;
  setColor(doc, BRAND.light, "fill");
  setColor(doc, BRAND.primary, "draw");
  doc.setLineWidth(0.3);
  doc.roundedRect(PAGE.margin, y, w, h, 1.5, 1.5, "FD");
  setColor(doc, BRAND.primary, "fill");
  doc.rect(PAGE.margin, y, 1.5, h, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(doc, BRAND.muted);
  doc.text("LIEFERTERMIN", PAGE.margin + 6, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  setColor(doc, BRAND.ink);
  doc.text(deliveryDate ? formatDate(deliveryDate) : "nach Vereinbarung", PAGE.margin + 6, y + 11);
  return y + h + 6;
};

const drawTodos = (doc: jsPDF, todos: { title: string }[], y: number, title: string) => {
  if (!todos.length) return y;
  y = drawSectionTitle(doc, title, y);
  y += 2;
  todos.forEach((t) => {
    setColor(doc, BRAND.primary, "fill");
    doc.circle(PAGE.margin + 1.2, y - 1, 0.8, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    setColor(doc, BRAND.ink);
    doc.text(t.title, PAGE.margin + 5, y);
    y += 5.5;
  });
  return y + 2;
};

// ---------- Tax ----------

export const isMarginTaxed = (vehicle: Vehicle): boolean => {
  if (vehicle.vatReportable === true) return false;
  if (vehicle.vatReportable === false) return true;
  if (vehicle.condition === "Neu" || vehicle.condition === "Tageszulassung") return false;
  return true;
};

export const taxationLine = (vehicle: Vehicle): string =>
  isMarginTaxed(vehicle)
    ? "Differenzbesteuert gemäß § 25a UStG · Umsatzsteuer wird nicht gesondert ausgewiesen."
    : "Alle Preise verstehen sich inkl. 19 % gesetzlicher Umsatzsteuer.";

// ---------- Public API ----------

export interface SellerInfo {
  street?: string;
  zip?: string;
  city?: string;
  representative?: string;
  vatId?: string;
  taxNumber?: string;
  email?: string;
  phone?: string;
  registration?: string;
}

export interface GeneratePdfArgs {
  process: Process;
  vehicle: Vehicle;
  customer: Customer;
  offer?: Offer;
  stepKey: ProcessStepKey;
  companyName?: string;
  /** Unternehmensdaten des Nutzers – werden als Verkäuferdaten im Kaufvertrag verwendet. */
  seller?: SellerInfo;
  pdfTheme?: PdfThemeKey;
}

const STANDARD_LAYOUT_START_Y = 110;

const drawStandardChrome = (
  doc: jsPDF,
  args: { title: string; docNumber: string; companyName: string; customer: Customer; vehicle: Vehicle; meta: Array<[string, string]>; addressLabel?: string }
) => {
  drawHeader(doc, args.title, args.docNumber, args.companyName);
  drawAddressBlock(doc, args.customer, 46, args.addressLabel);
  drawMetaBlock(doc, args.meta, 46);
  const cursor = drawVehicleCard(doc, args.vehicle, 78);
  return cursor;
};

export const generateBelegPdf = ({ process, vehicle, customer, offer, stepKey, companyName = "VINflow Autohaus GmbH", seller, pdfTheme }: GeneratePdfArgs): jsPDF => {
  applyPdfTheme(pdfTheme);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const step = PROCESS_STEPS.find((s) => s.key === stepKey)!;
  const finalPrice = process.fields.finalPrice ?? vehicle.listPrice;

  // Kaufvertrag: spezielles, längeres Layout
  if (stepKey === "purchase_contract") {
    return buildKaufvertrag(doc, { process, vehicle, customer, companyName, seller, finalPrice });
  }

  const docNumber = `${process.id} · ${step.shortLabel}`;
  let cursor = drawStandardChrome(doc, {
    title: step.documentName,
    docNumber,
    companyName,
    customer,
    vehicle,
    meta: [
      ["Vorgangs-Nr.", process.id],
      ["Beleg-Datum", formatDate(new Date().toISOString())],
      ["Erstellt am", formatDate(process.createdAt)],
    ],
  });
  cursor = Math.max(cursor, STANDARD_LAYOUT_START_Y);

  // To-Dos für genau diesen Beleg (jedes To-Do trägt sein Druckziel)
  const todosForThisStep = process.customerTodosOC.filter(
    (t) => (t.printOnStep ?? "order_confirmation") === stepKey,
  );
  const drawProcessTodos = (c: number) => {
    if (!todosForThisStep.length) return c;
    return drawTodos(doc, todosForThisStep, c + 6, "Vereinbarte Leistungen");
  };

  switch (stepKey) {
    case "offer": {
      cursor = drawTextBlock(doc,
        `Sehr geehrte/r ${customer.name}, vielen Dank für Ihr Interesse. Wir freuen uns, Ihnen für das oben genannte Fahrzeug folgendes verbindliches Angebot unterbreiten zu dürfen.`,
        cursor);
      cursor += 6;
      cursor = drawTable(doc, [
        { description: `${vehicle.make} ${vehicle.model} (${vehicle.year})`, qty: "1", unitPrice: offer?.price ?? vehicle.listPrice, total: offer?.price ?? vehicle.listPrice },
      ], cursor, "Angebotspreis");
      cursor = drawSectionTitle(doc, "Konditionen", cursor);
      cursor = drawTextBlock(doc,
        `Gültigkeit: bis ${offer ? formatDate(offer.validUntil) : "—"}\nLieferung: nach Vereinbarung\nGewährleistung: 12 Monate gemäß BGB\n${taxationLine(vehicle)}`,
        cursor);
      if (offer?.customerTodos.length) {
        cursor += 6;
        cursor = drawTodos(doc, offer.customerTodos, cursor, "Vereinbarte Leistungen");
      }
      cursor = drawProcessTodos(cursor);
      break;
    }
    case "down_payment": {
      const dp = process.fields.downPayment;
      const ocDp = process.fields.orderConfirmation;
      const down = dp?.amount ?? Math.round(finalPrice * 0.15);
      cursor = drawTextBlock(doc,
        `Hiermit stellen wir Ihnen die vereinbarte Anzahlung für das oben genannte Fahrzeug in Rechnung. Bitte überweisen Sie den Betrag bis zum vereinbarten Termin auf das angegebene Konto.`,
        cursor);
      cursor += 4;
      cursor = drawDeliveryCallout(doc, ocDp?.deliveryDate, cursor);
      cursor = drawTable(doc, [
        { description: "Anzahlung Fahrzeugkauf", qty: "1", unitPrice: down, total: down },
      ], cursor, "Zu zahlender Betrag");
      cursor = drawSectionTitle(doc, "Zahlungsdaten", cursor);
      cursor = drawTextBlock(doc,
        `Empfänger: ${companyName}\nIBAN: ${BANK.iban}\nBIC: ${BANK.bic}\nVerwendungszweck: ${dp?.invoiceNumber ?? process.id}\nRechnungsdatum: ${dp?.invoiceDate ? formatDate(dp.invoiceDate) : "—"}\nZahlungsbedingung: ${dp?.paymentTerms ?? (dp?.dueDate ? `Fällig am ${formatDate(dp.dueDate)}` : "Sofort fällig nach Erhalt der Rechnung")}${dp?.received ? `\nZahlung eingegangen am: ${dp.receivedDate ? formatDate(dp.receivedDate) : "—"}` : ""}\n${taxationLine(vehicle)}`,
        cursor);
      cursor = drawProcessTodos(cursor);
      break;
    }
    case "order_confirmation": {
      const oc = process.fields.orderConfirmation;
      cursor = drawTextBlock(doc,
        `Wir bestätigen Ihnen hiermit den verbindlichen Kaufauftrag für das oben aufgeführte Fahrzeug zu folgenden Konditionen:`,
        cursor);
      cursor += 4;
      cursor = drawDeliveryCallout(doc, oc?.deliveryDate, cursor);
      cursor = drawTable(doc, [
        { description: `${vehicle.make} ${vehicle.model}`, qty: "1", unitPrice: finalPrice, total: finalPrice },
      ], cursor, "Kaufpreis");
      cursor = drawSectionTitle(doc, "Eckdaten", cursor);
      cursor = drawTextBlock(doc,
        `Auftragsdatum: ${oc?.orderDate ? formatDate(oc.orderDate) : "—"}\nZahlungsbedingungen: ${oc?.paymentTerms ?? "Restzahlung bei Übergabe"}\nBereits geleistete Anzahlung: ${formatCurrency(process.fields.downPayment?.amount ?? 0)}\n${taxationLine(vehicle)}`,
        cursor);
      cursor = drawProcessTodos(cursor);
      break;
    }
    case "outbound_check": {
      const checklist = process.outboundChecklist;
      const doneCount = checklist.filter((i) => i.done).length;
      const allDone = doneCount === checklist.length && checklist.length > 0;
      cursor = drawTextBlock(doc,
        allDone
          ? `Vor Übergabe des Fahrzeugs wurde folgende Ausgangskontrolle vollständig durchgeführt und dokumentiert:`
          : `Stand der Ausgangskontrolle (${doneCount} von ${checklist.length} Punkten erledigt):`,
        cursor);
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
        doc.setFontSize(9.5);
        setColor(doc, BRAND.ink);
        doc.text(item.label, PAGE.margin + 7, cursor + 3);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        setColor(doc, item.done ? BRAND.success : BRAND.muted);
        doc.text(item.done ? "erledigt" : "offen", PAGE.w - PAGE.margin, cursor + 3, { align: "right" });
        cursor += 6;
      });
      cursor += 4;
      cursor = drawTextBlock(doc,
        allDone ? `Das Fahrzeug ist übergabebereit.` : `Hinweis: Es sind noch ${checklist.length - doneCount} Punkte offen. Das Fahrzeug ist noch nicht vollständig übergabebereit.`,
        cursor, { muted: true });
      cursor = drawProcessTodos(cursor);
      break;
    }
    case "invoicing": {
      const inv = process.fields.invoicing;
      const ocInv = process.fields.orderConfirmation;
      const down = process.fields.downPayment?.amount ?? 0;
      const remaining = finalPrice - down;
      cursor = drawTextBlock(doc,
        `Für das oben aufgeführte Fahrzeug stellen wir Ihnen hiermit den Kaufpreis in Rechnung. Eine bereits geleistete Anzahlung wird verrechnet.`,
        cursor);
      cursor += 4;
      cursor = drawDeliveryCallout(doc, ocInv?.deliveryDate, cursor);
      cursor = drawTable(doc, [
        { description: `${vehicle.make} ${vehicle.model} (${vehicle.year})`, qty: "1", unitPrice: finalPrice, total: finalPrice },
        ...(down > 0 ? [{ description: "abzgl. geleistete Anzahlung", qty: "1", unitPrice: -down, total: -down }] : []),
      ], cursor, inv?.paid ? "Bezahlt" : "Restbetrag");
      cursor = drawSectionTitle(doc, "Zahlungsdaten", cursor);
      cursor = drawTextBlock(doc,
        `Rechnungs-Nr.: ${inv?.invoiceNumber ?? "—"}\nRechnungsdatum: ${inv?.invoiceDate ? formatDate(inv.invoiceDate) : formatDate(new Date().toISOString())}\nZahlungsbedingung: ${inv?.paymentTerms ?? (inv?.dueDate ? `Fällig am ${formatDate(inv.dueDate)}` : "Sofort fällig nach Erhalt der Rechnung")}\nIBAN: ${BANK.iban} · BIC: ${BANK.bic}\nVerwendungszweck: ${process.id}${inv?.paid ? `\nZahlungsstatus: Bezahlt${inv.paidDate ? ` am ${formatDate(inv.paidDate)}` : ""} – Vielen Dank!` : `\nDer Restbetrag von ${formatCurrency(remaining)} ist bei Fahrzeugübergabe fällig.`}\n${taxationLine(vehicle)}`,
        cursor);
      cursor = drawProcessTodos(cursor);
      break;
    }
    case "delivery_confirmation": {
      const del = process.fields.delivery;
      cursor = drawTextBlock(doc, `Hiermit bestätigt der Kunde die ordnungsgemäße Übergabe des Fahrzeugs in technisch und optisch einwandfreiem Zustand.`, cursor);
      cursor += 6;
      cursor = drawSectionTitle(doc, "Übergabedaten", cursor);
      cursor = drawTextBlock(doc,
        `Übergabedatum: ${del?.handoverDate ? formatDate(del.handoverDate) : formatDate(new Date().toISOString())}\nÜbergabeort: ${del?.handoverLocation ?? "Filiale"}\nKilometerstand bei Übergabe: ${del?.finalMileage?.toLocaleString("de-DE") ?? vehicle.mileage.toLocaleString("de-DE")} km\nTankfüllung: ${del?.fuelLevel ?? "voll"}\nMitgegeben: 2 Schlüssel, Zulassungsbescheinigung Teil I & II, Service-Heft`,
        cursor);
      cursor = drawProcessTodos(cursor);
      cursor = drawSignatureRow(doc, cursor + 20, "Unterschrift Kunde", `Unterschrift ${companyName}`);
      break;
    }
  }

  drawFooter(doc, companyName);
  return doc;
};

const drawSignatureRow = (doc: jsPDF, y: number, leftLabel: string, rightLabel: string) => {
  const colW = (PAGE.w - 2 * PAGE.margin - 10) / 2;
  setColor(doc, BRAND.ink, "draw");
  doc.setLineWidth(0.4);
  doc.line(PAGE.margin, y, PAGE.margin + colW, y);
  doc.line(PAGE.margin + colW + 10, y, PAGE.w - PAGE.margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(doc, BRAND.muted);
  doc.text(leftLabel, PAGE.margin, y + 4);
  doc.text(rightLabel, PAGE.margin + colW + 10, y + 4);
  return y + 10;
};

// ---------- Kaufvertrag (ausführlich) ----------

const drawKvParty = (doc: jsPDF, label: string, lines: string[], x: number, y: number, w: number) => {
  setColor(doc, BRAND.light, "fill");
  setColor(doc, BRAND.border, "draw");
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, 30, 2, 2, "FD");
  setColor(doc, BRAND.primary, "fill");
  doc.rect(x, y, 1.5, 30, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setColor(doc, BRAND.primary);
  doc.text(label.toUpperCase(), x + 5, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(doc, BRAND.ink);
  lines.slice(0, 5).forEach((l, i) => {
    doc.setFont("helvetica", i === 0 ? "bold" : "normal");
    doc.setFontSize(i === 0 ? 10 : 8.5);
    doc.text(l || "—", x + 5, y + 11 + i * 4.5);
  });
};

const drawKvSpecsTable = (doc: jsPDF, vehicle: Vehicle, y: number, kv?: any) => {
  const w = PAGE.w - 2 * PAGE.margin;
  const colW = w / 2;
  const rows: Array<[string, string]> = [
    ["Marke / Modell", `${vehicle.make} ${vehicle.model}${vehicle.modelDetail ? " " + vehicle.modelDetail : ""}`],
    ["Fahrzeug-Ident.-Nr. (VIN)", vehicle.vin],
    ["HSN / TSN", `${vehicle.hsn ?? "—"} / ${vehicle.tsn ?? "—"}`],
    ["Amtl. Kennzeichen", vehicle.licensePlate ?? "—"],
    ["Erstzulassung", vehicle.firstRegistration ? formatDate(vehicle.firstRegistration) : "—"],
    ["Baujahr", String(vehicle.year)],
    ["Kilometerstand", `${vehicle.mileage.toLocaleString("de-DE")} km`],
    ["Vorbesitzer", vehicle.previousOwners != null ? String(vehicle.previousOwners) : "—"],
    ["Kraftstoff", vehicle.fuel],
    ["Getriebe", vehicle.transmission],
    ["Leistung", `${vehicle.power_kw} kW (${vehicle.power_hp} PS)`],
    ["Hubraum", vehicle.displacement_ccm ? `${vehicle.displacement_ccm} ccm` : "—"],
    ["Farbe (außen)", `${vehicle.color}${vehicle.paintCode ? ` (${vehicle.paintCode})` : ""}`],
    ["Innenraum", `${vehicle.interiorColor ?? "—"}${vehicle.interiorMaterial ? `, ${vehicle.interiorMaterial}` : ""}`],
    ["HU/AU gültig bis", vehicle.hu ? formatDate(vehicle.hu) : "—"],
    ["Scheckheft / Unfallfrei", `${(vehicle.serviceBookComplete || kv?.docServiceBook) ? "ja" : "nein"} / ${(kv?.accidentVehicle !== undefined ? !kv.accidentVehicle : vehicle.accidentFree) ? "ja" : "nein"}`],
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  let cy = y;
  const rowH = 5.5;
  for (let i = 0; i < rows.length; i += 2) {
    const left = rows[i];
    const right = rows[i + 1];
    setColor(doc, BRAND.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(left[0], PAGE.margin, cy);
    if (right) doc.text(right[0], PAGE.margin + colW, cy);
    setColor(doc, BRAND.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(left[1], PAGE.margin, cy + 4);
    if (right) doc.text(right[1], PAGE.margin + colW, cy + 4);
    setColor(doc, BRAND.border, "draw");
    doc.setLineWidth(0.2);
    doc.line(PAGE.margin, cy + 6, PAGE.w - PAGE.margin, cy + 6);
    cy += rowH + 3;
  }
  return cy + 2;
};

const buildKaufvertrag = (
  doc: jsPDF,
  { process, vehicle, customer, companyName, seller, finalPrice }: { process: Process; vehicle: Vehicle; customer: Customer; companyName: string; seller?: SellerInfo; finalPrice: number }
): jsPDF => {
  const kv = process.fields.purchaseContract;
  const down = process.fields.downPayment?.amount ?? 0;
  const remaining = finalPrice - down;
  const margin = isMarginTaxed(vehicle);
  const place = kv?.place ?? customer.city ?? "—";
  const contractDate = kv?.contractDate ? formatDate(kv.contractDate) : formatDate(new Date().toISOString());

  // Verkäuferdaten: Unternehmensdaten aus den Einstellungen, mit optionalem Override am Vertrag
  const sStreet = kv?.sellerStreet || seller?.street;
  const sZip = kv?.sellerZip || seller?.zip;
  const sCity = kv?.sellerCity || seller?.city;
  const sRep = kv?.sellerRepresentative || seller?.representative;
  const sVat = kv?.sellerVatId || seller?.vatId;
  const sReg = kv?.sellerRegistration || seller?.registration;

  drawHeader(doc, "Kaufvertrag", `Vertrags-Nr. ${kv?.contractNumber ?? process.id}`, companyName);

  // Meta line directly under header
  let cursor = 42;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(doc, BRAND.muted);
  doc.text(`Geschlossen am ${contractDate} in ${place}`, PAGE.margin, cursor);
  doc.text(`Vertrags-Nr. ${kv?.contractNumber ?? process.id}`, PAGE.w - PAGE.margin, cursor, { align: "right" });
  cursor += 6;

  // Parties
  const w = (PAGE.w - 2 * PAGE.margin - 6) / 2;
  const sellerLines = [
    companyName,
    sStreet || "—",
    [sZip, sCity].filter(Boolean).join(" ") || "—",
    sRep ? `vertreten durch ${sRep}` : "vertreten durch —",
    [sVat ? `USt-IdNr.: ${sVat}` : null, sReg ?? null].filter(Boolean).join(" · ") || "USt-IdNr.: — · HRB —",
  ];
  drawKvParty(doc, "Verkäufer", sellerLines, PAGE.margin, cursor, w);
  const isB2B = kv?.customerType === "b2b";
  drawKvParty(doc, isB2B ? "Käufer (Unternehmer · B2B)" : "Käufer (Verbraucher · B2C)", [
    customer.name,
    customer.street ?? "—",
    `${customer.zip ?? ""} ${customer.city}`.trim(),
    customer.email ?? "",
    customer.birthDate ? `geb. ${formatDate(customer.birthDate)}` : "",
  ], PAGE.margin + w + 6, cursor, w);
  cursor += 36;

  // Preamble
  cursor = drawTextBlock(doc,
    `Zwischen den vorstehenden Parteien wird hiermit folgender Kaufvertrag über ein gebrauchtes Kraftfahrzeug geschlossen.`,
    cursor, { muted: true });
  cursor += 4;

  // § 1 Kaufgegenstand
  cursor = drawSectionTitle(doc, "§ 1  Kaufgegenstand", cursor);
  cursor = drawTextBlock(doc, "Der Verkäufer verkauft an den Käufer das nachstehend bezeichnete Fahrzeug:", cursor, { muted: true });
  cursor += 3;
  cursor = drawKvSpecsTable(doc, vehicle, cursor, kv);

  if (vehicle.features && vehicle.features.length) {
    cursor += 2;
    setColor(doc, BRAND.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("AUSSTATTUNG", PAGE.margin, cursor);
    cursor += 3;
    cursor = drawTextBlock(doc, vehicle.features.join(" · "), cursor, { fontSize: 8.5 });
  }
  cursor += 4;

  // § 2 Kaufpreis
  cursor = drawSectionTitle(doc, "§ 2  Kaufpreis und Zahlung", cursor);
  cursor = drawTable(doc, [
    { description: `${vehicle.make} ${vehicle.model} (${vehicle.year})`, qty: "1", unitPrice: finalPrice, total: finalPrice },
    ...(down > 0 ? [{ description: "geleistete Anzahlung", qty: "1", unitPrice: -down, total: -down }] : []),
    ...(remaining > 0 ? [{ description: "geleistete Restzahlung", qty: "1", unitPrice: -remaining, total: -remaining }] : []),
  ], cursor, "Offener Betrag");
  const dpTerms = process.fields.downPayment?.paymentTerms
    ?? (process.fields.downPayment?.dueDate ? `Fällig am ${formatDate(process.fields.downPayment.dueDate)}` : "Sofort fällig nach Vertragsabschluss");
  const restTerms = process.fields.orderConfirmation?.paymentTerms
    ?? process.fields.invoicing?.paymentTerms
    ?? (process.fields.invoicing?.dueDate ? `Fällig am ${formatDate(process.fields.invoicing.dueDate)}` : "Restzahlung bei Fahrzeugübergabe");
  const dpMethod = process.fields.downPayment?.method ?? "Überweisung";
  cursor = drawTextBlock(doc,
    `Der vereinbarte Kaufpreis in Höhe von ${formatCurrency(finalPrice)} setzt sich wie folgt zusammen:\n` +
    `• Anzahlung: ${formatCurrency(down)} – Zahlungsbedingung: ${dpTerms}. Zahlungsweise: ${dpMethod}.\n` +
    `• Restzahlung: ${formatCurrency(remaining)} – Zahlungsbedingung: ${restTerms}.\n` +
    `${down + remaining >= finalPrice
      ? `Der Verkäufer bestätigt hiermit den vollständigen Erhalt des Kaufpreises. Eine weitere Zahlungsverpflichtung des Käufers besteht nicht.`
      : `Der offene Betrag ist gemäß der oben genannten Zahlungsbedingung für die Restzahlung zu entrichten.`} ` +
    `${taxationLine(vehicle)}`,
    cursor, { fontSize: 9 });
  cursor += 4;

  // Page 2 if needed
  if (cursor > 230) {
    drawFooter(doc, companyName);
    doc.addPage();
    drawHeader(doc, "Kaufvertrag (Fortsetzung)", `Vertrags-Nr. ${kv?.contractNumber ?? process.id}`, companyName);
    cursor = 44;
  }

  // Helper: page break if needed
  const ensureSpace = (minRemaining = 230) => {
    if (cursor > minRemaining) {
      drawFooter(doc, companyName);
      doc.addPage();
      drawHeader(doc, "Kaufvertrag (Fortsetzung)", `Vertrags-Nr. ${kv?.contractNumber ?? process.id}`, companyName);
      cursor = 44;
    }
  };

  // § 3 Übergabe und übergebene Unterlagen
  cursor = drawSectionTitle(doc, "§ 3  Übergabe, Gefahrübergang und übergebene Unterlagen", cursor);
  cursor = drawTextBlock(doc,
    `Die Übergabe des Fahrzeugs erfolgt nach vollständiger Bezahlung des Kaufpreises ` +
    `am ${process.fields.orderConfirmation?.deliveryDate ? formatDate(process.fields.orderConfirmation.deliveryDate) : "vereinbarten Termin"} ` +
    `am Sitz des Verkäufers. Mit der Übergabe geht die Gefahr eines zufälligen Untergangs oder einer zufälligen Verschlechterung des Fahrzeugs auf den Käufer über. ` +
    `Bis zur vollständigen Bezahlung des Kaufpreises bleibt das Fahrzeug Eigentum des Verkäufers (Eigentumsvorbehalt).`,
    cursor, { fontSize: 9 });
  cursor += 2;
  const docsList: Array<[string, boolean]> = [
    ["Zulassungsbescheinigung Teil I (ZB I / Fahrzeugschein)", !!kv?.docZB1],
    ["Zulassungsbescheinigung Teil II (ZB II / Fahrzeugbrief)", !!kv?.docZB2],
    ["HU/AU-Bericht", !!kv?.docHuAu],
    ["Scheckheft / Serviceheft", !!kv?.docServiceBook],
    ["Bedienungsanleitung", !!kv?.docOwnerManual],
    ["COC-Papiere (EG-Übereinstimmungsbescheinigung)", !!kv?.docCocPapers],
    [`Fahrzeugschlüssel (Anzahl: ${kv?.keysCount ?? "—"})`, (kv?.keysCount ?? 0) > 0],
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(doc, BRAND.ink);
  doc.text("Übergebene Unterlagen / Gegenstände:", PAGE.margin, cursor);
  cursor += 4;
  docsList.forEach(([label, ok]) => {
    setColor(doc, ok ? BRAND.primary : BRAND.border, "draw");
    doc.setLineWidth(0.4);
    doc.rect(PAGE.margin, cursor - 2.6, 2.6, 2.6);
    if (ok) {
      setColor(doc, BRAND.primary);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("✓", PAGE.margin + 0.5, cursor - 0.4);
    }
    setColor(doc, BRAND.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(label, PAGE.margin + 5, cursor);
    cursor += 4.5;
  });
  cursor += 4;

  ensureSpace();

  // § 4 Zustand, bekannte Mängel und Vorschäden
  cursor = drawSectionTitle(doc, "§ 4  Zustand, bekannte Mängel und Unfallschäden", cursor);
  const isAccident = kv?.accidentVehicle ?? !vehicle.accidentFree;
  cursor = drawTextBlock(doc,
    `Unfallfahrzeug im Sinne dieses Vertrages: ${isAccident ? "JA" : "NEIN"}. ` +
    (isAccident
      ? `Der Verkäufer offenbart, dass das Fahrzeug Unfallschäden erlitten hat, die über bloße Bagatellschäden hinausgehen. Einzelheiten sind nachstehend dokumentiert.`
      : `Nach Kenntnis des Verkäufers hat das Fahrzeug während seiner Besitzzeit keine Unfallschäden erlitten, die über bloße Bagatellschäden (kleine Lack-/Blechschäden) hinausgehen.`),
    cursor, { fontSize: 9 });
  cursor += 2;
  if (kv?.knownDefects && kv.knownDefects.trim()) {
    cursor = drawTextBlock(doc, `Bekannte Mängel zum Zeitpunkt des Vertragsschlusses: ${kv.knownDefects.trim()}`, cursor, { fontSize: 9 });
  } else {
    cursor = drawTextBlock(doc, `Bekannte Mängel zum Zeitpunkt des Vertragsschlusses: keine über den altersgemäßen Gebrauchszustand hinausgehenden Mängel bekannt.`, cursor, { fontSize: 9, muted: true });
  }
  if (kv?.preDamage && kv.preDamage.trim()) {
    cursor = drawTextBlock(doc, `Vorschäden / Reparaturhistorie: ${kv.preDamage.trim()}`, cursor, { fontSize: 9 });
  } else {
    cursor = drawTextBlock(doc, `Vorschäden / Reparaturhistorie: keine Vorschäden bekannt.`, cursor, { fontSize: 9, muted: true });
  }
  cursor += 4;

  ensureSpace();

  // § 5 Sachmängelhaftung (B2C vs. B2B differenziert)
  cursor = drawSectionTitle(doc, "§ 5  Sachmängelhaftung", cursor);
  if (isB2B && kv?.warrantyExcluded) {
    cursor = drawTextBlock(doc,
      `Da der Käufer Unternehmer im Sinne des § 14 BGB ist und das Fahrzeug im Rahmen seiner gewerblichen oder selbständigen beruflichen Tätigkeit erwirbt, wird die Sachmängelhaftung für das gebrauchte Fahrzeug hiermit vollständig ausgeschlossen. ` +
      `Dieser Ausschluss gilt nicht für Schadensersatzansprüche aus der Verletzung des Lebens, des Körpers oder der Gesundheit, die auf einer fahrlässigen Pflichtverletzung des Verkäufers oder einer vorsätzlichen oder fahrlässigen Pflichtverletzung eines gesetzlichen Vertreters oder Erfüllungsgehilfen des Verkäufers beruhen, sowie für sonstige Schäden, die auf einer grob fahrlässigen Pflichtverletzung des Verkäufers oder auf einer vorsätzlichen oder grob fahrlässigen Pflichtverletzung eines gesetzlichen Vertreters oder Erfüllungsgehilfen des Verkäufers beruhen. ` +
      `Ebenfalls unberührt bleibt die Haftung für arglistig verschwiegene Mängel sowie aus übernommenen Garantien (§ 444 BGB).`,
      cursor, { fontSize: 9 });
  } else if (isB2B) {
    cursor = drawTextBlock(doc,
      `Da der Käufer Unternehmer im Sinne des § 14 BGB ist, verjähren die Ansprüche wegen Sachmängeln in ${kv?.warrantyMonths ?? 12} Monaten ab Übergabe des Fahrzeugs. ` +
      `Schadensersatzansprüche bei Verletzung von Leben, Körper oder Gesundheit sowie bei grob fahrlässiger oder vorsätzlicher Pflichtverletzung des Verkäufers, seiner gesetzlichen Vertreter oder Erfüllungsgehilfen bleiben hiervon unberührt; ebenso Ansprüche aus übernommenen Garantien und wegen arglistig verschwiegener Mängel.`,
      cursor, { fontSize: 9 });
  } else {
    cursor = drawTextBlock(doc,
      `Der Käufer ist Verbraucher im Sinne des § 13 BGB. Die Ansprüche des Käufers wegen Sachmängeln verjähren in ${kv?.warrantyMonths ?? 12} Monaten ab Übergabe des Fahrzeugs. Die Verkürzung auf weniger als 12 Monate ist nach § 476 Abs. 2 BGB unzulässig und gilt insoweit nicht. ` +
      `Von dieser Haftungsbegrenzung ausgenommen sind Schadensersatzansprüche aus der Verletzung des Lebens, des Körpers oder der Gesundheit, die auf einer fahrlässigen Pflichtverletzung des Verkäufers oder einer vorsätzlichen oder fahrlässigen Pflichtverletzung eines gesetzlichen Vertreters oder Erfüllungsgehilfen des Verkäufers beruhen, sowie sonstige Schäden, die auf einer grob fahrlässigen Pflichtverletzung des Verkäufers oder auf einer vorsätzlichen oder grob fahrlässigen Pflichtverletzung eines gesetzlichen Vertreters oder Erfüllungsgehilfen des Verkäufers beruhen. ` +
      `Ansprüche aus arglistig verschwiegenen Mängeln sowie aus übernommenen Garantien (§ 444 BGB) bleiben unberührt. Eine darüber hinausgehende Garantie für die Beschaffenheit oder Haltbarkeit des Fahrzeugs wird vom Verkäufer nicht übernommen.`,
      cursor, { fontSize: 9 });
  }
  cursor += 4;

  ensureSpace();

  // § 6 Erklärungen des Verkäufers
  cursor = drawSectionTitle(doc, "§ 6  Erklärungen des Verkäufers", cursor);
  const assurances = [
    `Anzahl der Vorbesitzer laut Zulassungsbescheinigung Teil II: ${vehicle.previousOwners ?? "—"}.`,
    `Das Scheckheft ist ${(vehicle.serviceBookComplete || kv?.docServiceBook) ? "lückenlos geführt und wird mit dem Fahrzeug übergeben" : "nicht lückenlos geführt bzw. nicht vorhanden"}.`,
    `Der angegebene Kilometerstand von ${vehicle.mileage.toLocaleString("de-DE")} km entspricht nach Kenntnis des Verkäufers der tatsächlichen Gesamtfahrleistung; eine Garantie für die Richtigkeit wird nicht übernommen.`,
    `Das Fahrzeug ist frei von Rechten Dritter, insbesondere von Pfandrechten und Sicherungseigentum.`,
  ];
  assurances.forEach((a) => {
    setColor(doc, BRAND.primary, "fill");
    doc.circle(PAGE.margin + 1.2, cursor - 1, 0.8, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(doc, BRAND.ink);
    const lines = doc.splitTextToSize(a, PAGE.w - 2 * PAGE.margin - 5);
    doc.text(lines, PAGE.margin + 5, cursor);
    cursor += lines.length * 4 + 1.5;
  });
  cursor += 4;

  ensureSpace();

  // § 7 Erklärungen des Käufers
  cursor = drawSectionTitle(doc, "§ 7  Erklärungen des Käufers", cursor);
  cursor = drawTextBlock(doc,
    `Der Käufer hat das Fahrzeug vor Abschluss dieses Vertrages eingehend besichtigt und Probe gefahren. Der gegenwärtige Zustand des Fahrzeugs einschließlich aller offen erkennbaren Mängel sowie der unter § 4 dokumentierten bekannten Mängel und Vorschäden ist ihm bekannt. ` +
    `Der Käufer verpflichtet sich, das Fahrzeug unverzüglich nach Übergabe auf seinen Namen umzumelden bzw. abzumelden und den Verkäufer von etwaigen Halterpflichten (Kfz-Steuer, Versicherung, Bußgelder) ab dem Tag der Übergabe freizustellen.`,
    cursor, { fontSize: 9 });
  cursor += 4;

  // § 8 Umsatzsteuerliche Behandlung
  cursor = drawSectionTitle(doc, "§ 8  Umsatzsteuerliche Behandlung", cursor);
  cursor = drawTextBlock(doc,
    margin
      ? `Der Verkauf erfolgt nach der Differenzbesteuerung gemäß § 25a UStG. Die Umsatzsteuer wird nicht gesondert ausgewiesen und kann vom Käufer nicht als Vorsteuer geltend gemacht werden.`
      : `Der Kaufpreis enthält die gesetzliche Umsatzsteuer in Höhe von 19 %. Diese wird in der separaten Rechnung gesondert ausgewiesen.`,
    cursor, { fontSize: 9 });
  cursor += 4;

  ensureSpace();

  // § 9 Datenschutz (DSGVO)
  cursor = drawSectionTitle(doc, "§ 9  Datenschutz / DSGVO-Einwilligung", cursor);
  cursor = drawTextBlock(doc,
    `Der Käufer willigt ein, dass der Verkäufer die im Rahmen dieses Vertrages erhobenen personenbezogenen Daten (Name, Anschrift, Kontaktdaten, Geburtsdatum, Vertrags- und Fahrzeugdaten) zum Zweck der Vertragsdurchführung, der Erfüllung gesetzlicher Aufbewahrungs- und Nachweispflichten (insb. § 147 AO, § 257 HGB) sowie zur Abwicklung etwaiger Gewährleistungs-, Garantie- und Rückrufmaßnahmen verarbeitet und speichert. ` +
    `Rechtsgrundlage ist Art. 6 Abs. 1 lit. b und lit. c DSGVO. Eine Weitergabe an Dritte erfolgt nur, soweit dies zur Vertragsabwicklung erforderlich ist oder eine gesetzliche Verpflichtung besteht. Dem Käufer stehen die Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch gemäß Art. 15–21 DSGVO zu. ` +
    `Eine ausführliche Datenschutzerklärung ist beim Verkäufer erhältlich. Mit seiner Unterschrift bestätigt der Käufer die Kenntnisnahme dieser Datenschutzhinweise${kv?.dsgvoConsent ? " und willigt ausdrücklich in die Verarbeitung ein" : ""}.`,
    cursor, { fontSize: 9 });
  cursor += 4;

  ensureSpace();

  // § 10 Schlussbestimmungen
  cursor = drawSectionTitle(doc, "§ 10  Schlussbestimmungen", cursor);
  cursor = drawTextBlock(doc,
    `Mündliche Nebenabreden bestehen nicht. Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform; dies gilt auch für eine Änderung dieser Schriftformklausel. ` +
    `Sollten einzelne Bestimmungen dieses Vertrages unwirksam sein oder werden, so wird die Wirksamkeit der übrigen Bestimmungen hiervon nicht berührt. ` +
    `Erfüllungsort und – soweit gesetzlich zulässig – Gerichtsstand ist der Sitz des Verkäufers. Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.`,
    cursor, { fontSize: 9 });
  cursor += 6;

  ensureSpace(245);

  // § 11 Unterschriften
  cursor = drawSectionTitle(doc, "§ 11  Unterschriften", cursor);
  cursor += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(doc, BRAND.ink);
  doc.text(`Ort, Datum: ${place}, ${contractDate}`, PAGE.margin, cursor);
  cursor += 16;
  drawSignatureRow(doc, cursor, `Käufer · ${customer.name}`, `Verkäufer · ${companyName}${sRep ? ` (${sRep})` : ""}`);

  drawFooter(doc, companyName);
  return doc;
};

export const downloadBelegPdf = async (args: GeneratePdfArgs) => {
  const doc = generateBelegPdf(args);
  const step = PROCESS_STEPS.find((s) => s.key === args.stepKey)!;
  const baseName = `${args.process.id}_${step.documentName.replace(/[^A-Za-z0-9]/g, "_")}`;

  const inv = args.process.fields.invoicing;
  const isB2B = args.process.fields.purchaseContract?.customerType === "b2b";
  const wantsEInvoice = args.stepKey === "invoicing" && !!inv?.eInvoice && isB2B;

  if (!wantsEInvoice) {
    doc.save(`${baseName}.pdf`);
    return;
  }

  // E-Rechnung: factur-x.xml an PDF anhängen
  const { buildZugferdXml, attachZugferdXml } = await import("./eInvoice");
  const pdfBytes = doc.output("arraybuffer");
  const finalPrice = args.process.fields.finalPrice ?? args.vehicle.listPrice;
  const xml = buildZugferdXml({
    process: args.process,
    vehicle: args.vehicle,
    customer: args.customer,
    companyName: args.companyName ?? "VINflow Autohaus GmbH",
    seller: args.seller,
    finalPrice,
  });
  const merged = await attachZugferdXml(pdfBytes, xml);
  const blob = new Blob([merged as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName}_E-Rechnung.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ---------- Standalone Angebot ----------

export interface GenerateOfferPdfArgs {
  offer: Offer;
  vehicle: Vehicle;
  customer: Customer;
  companyName?: string;
  pdfTheme?: PdfThemeKey;
}

export const generateOfferPdf = ({ offer, vehicle, customer, companyName = "VINflow Autohaus GmbH", pdfTheme }: GenerateOfferPdfArgs): jsPDF => {
  applyPdfTheme(pdfTheme);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawHeader(doc, "Angebot", `Angebots-Nr. ${offer.id}`, companyName);
  drawAddressBlock(doc, customer, 46, "ANGEBOTSEMPFÄNGER");
  drawMetaBlock(doc, [
    ["Angebots-Nr.", offer.id],
    ["Erstellt am", formatDate(offer.createdAt)],
    ["Gültig bis", formatDate(offer.validUntil)],
  ], 46);
  let cursor = drawVehicleCard(doc, vehicle, 78);
  cursor = Math.max(cursor, STANDARD_LAYOUT_START_Y);

  cursor = drawTextBlock(doc,
    `Sehr geehrte/r ${customer.name}, vielen Dank für Ihr Interesse. Wir freuen uns, Ihnen für das oben genannte Fahrzeug folgendes verbindliches Angebot unterbreiten zu dürfen.`,
    cursor);
  cursor += 6;

  const items: LineItem[] = [
    { description: `${vehicle.make} ${vehicle.model} (${vehicle.year})`, qty: "1", unitPrice: offer.price, total: offer.price },
  ];
  if (offer.discount && offer.discount > 0) {
    items.push({ description: "Rabatt", qty: "1", unitPrice: -offer.discount, total: -offer.discount });
  }
  cursor = drawTable(doc, items, cursor, "Angebotspreis");

  cursor = drawSectionTitle(doc, "Konditionen", cursor);
  cursor = drawTextBlock(doc,
    `Gültigkeit: bis ${formatDate(offer.validUntil)}\nLieferung: nach Vereinbarung\nGewährleistung: 12 Monate gemäß BGB\n${taxationLine(vehicle)}`,
    cursor);

  if (offer.customerTodos.length) {
    cursor += 6;
    cursor = drawTodos(doc, offer.customerTodos, cursor, "Vereinbarte Leistungen");
  }
  if (offer.notes && offer.notes.trim()) {
    cursor += 4;
    cursor = drawSectionTitle(doc, "Hinweise", cursor);
    cursor = drawTextBlock(doc, offer.notes, cursor, { muted: true });
  }

  drawFooter(doc, companyName);
  return doc;
};

export const downloadOfferPdf = (args: GenerateOfferPdfArgs) => {
  const doc = generateOfferPdf(args);
  doc.save(`${args.offer.id}_Angebot.pdf`);
};
