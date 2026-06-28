import jsPDF from "jspdf";
import {
  Process,
  Vehicle,
  Customer,
  Offer,
  PROCESS_STEPS,
  VEHICLE_TYPE_LABELS,
  CUSTOMER_AGREEMENT_STEP_KEYS,
  ProcessStepKey,
  formatCurrencyPrecise as formatCurrency,
  formatDate,
} from "@/data/process";
import { getContractClauses, type ContractClauseContext } from "@/lib/contractClauses";

// VINflow PDF generator – clean, standard business document layout (DIN-5008 inspired).
// White background, neutral grayscale, generous whitespace, consistent grid.

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

const PROFESSIONAL_DOCUMENT_THEME: Omit<PdfTheme, "key" | "label" | "description"> = {
  primary: [45, 45, 45],
  primaryDark: [20, 20, 20],
  ink: [25, 25, 25],
  muted: [105, 105, 105],
  light: [248, 248, 248],
  border: [210, 210, 210],
  success: [45, 45, 45],
};

let BRAND = PROFESSIONAL_DOCUMENT_THEME;

const applyPdfTheme = (_key?: PdfThemeKey) => {
  // Geschäftsdokumente bleiben bewusst neutral und unabhängig vom App-Farbthema.
  BRAND = PROFESSIONAL_DOCUMENT_THEME;
};

const PAGE = { w: 210, h: 297, margin: 20 };
export const BANK = { iban: "DE89 3704 0044 0532 0130 00", bic: "COBADEFFXXX", bank: "Commerzbank" };

const setColor = (doc: jsPDF, c: RGB, type: "fill" | "draw" | "text" = "text") => {
  if (type === "fill") doc.setFillColor(c[0], c[1], c[2]);
  if (type === "draw") doc.setDrawColor(c[0], c[1], c[2]);
  if (type === "text") doc.setTextColor(c[0], c[1], c[2]);
};

const fitSingleLine = (doc: jsPDF, value: string, maxWidth: number) => {
  if (doc.getTextWidth(value) <= maxWidth) return value;
  let shortened = value;
  while (shortened.length > 1 && doc.getTextWidth(`${shortened}...`) > maxWidth) shortened = shortened.slice(0, -1);
  return `${shortened.trim()}...`;
};

// ---------- Header / Footer ----------

const companyAddress = (seller?: SellerInfo) => [seller?.street, [seller?.zip, seller?.city].filter(Boolean).join(" ")].filter(Boolean).join(" · ");

const drawHeader = (doc: jsPDF, _title: string, _docNumber: string, companyName: string, seller?: SellerInfo) => {
  // Reiner Briefkopf; Dokumenttitel und Belegnummer folgen weiter unten wie in der Referenz.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  setColor(doc, BRAND.ink);
  doc.text(fitSingleLine(doc, companyName, 105), PAGE.margin, 16.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(doc, BRAND.muted);
  const address = companyAddress(seller);
  doc.text(fitSingleLine(doc, address || "Fahrzeughandel & Service", 105), PAGE.margin, 20.5);

  doc.setFontSize(7.5);
  setColor(doc, BRAND.muted);
  if (seller?.phone) doc.text(fitSingleLine(doc, `Tel. ${seller.phone}`, 55), PAGE.w - PAGE.margin, 16.5, { align: "right" });
  if (seller?.email) doc.text(fitSingleLine(doc, seller.email, 55), PAGE.w - PAGE.margin, 20.5, { align: "right" });

  setColor(doc, BRAND.border, "draw");
  doc.setLineWidth(0.3);
  doc.line(PAGE.margin, 27, PAGE.w - PAGE.margin, 27);
};

const drawDocumentHeading = (doc: jsPDF, title: string, docNumber: string, y: number) => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(18);
  setColor(doc, BRAND.ink);
  doc.text(title, PAGE.margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(doc, BRAND.muted);
  doc.text(docNumber, PAGE.w - PAGE.margin, y, { align: "right" });

  setColor(doc, BRAND.border, "draw");
  doc.setLineWidth(0.3);
  doc.line(PAGE.margin, y + 3, PAGE.w - PAGE.margin, y + 3);
  return y + 9;
};

const drawFooter = (doc: jsPDF, companyName: string, seller?: SellerInfo) => {
  const y = PAGE.h - 27;
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
  const addressLines = [seller?.street, [seller?.zip, seller?.city].filter(Boolean).join(" ")].filter(Boolean);
  if (addressLines[0]) doc.text(addressLines[0], PAGE.margin, y + 11);
  if (addressLines[1]) doc.text(addressLines[1], PAGE.margin, y + 14);
  const taxLine = seller?.vatId ? `USt-IdNr. ${seller.vatId}` : seller?.taxNumber ? `St.-Nr. ${seller.taxNumber}` : "USt-IdNr. —";
  doc.text(taxLine, PAGE.margin, y + 17);
  if (seller?.registration) doc.text(seller.registration, PAGE.margin, y + 20);

  doc.text(BANK.bank, PAGE.margin + colW, y + 8);
  doc.text(`IBAN ${BANK.iban}`, PAGE.margin + colW, y + 11);
  doc.text(`BIC ${BANK.bic}`, PAGE.margin + colW, y + 14);

  doc.text(seller?.phone ? `Tel. ${seller.phone}` : "Telefon —", PAGE.margin + 2 * colW, y + 8);
  doc.text(seller?.email ? `E-Mail ${seller.email}` : "E-Mail —", PAGE.margin + 2 * colW, y + 11);
  if (seller?.representative) doc.text(`Ansprechpartner: ${seller.representative}`, PAGE.margin + 2 * colW, y + 14);

  setColor(doc, BRAND.muted);
  doc.setFontSize(6.5);
  doc.text(
    `Erstellt am ${formatDate(new Date().toISOString())} · Seite ${doc.internal.getNumberOfPages()}`,
    PAGE.w - PAGE.margin, PAGE.h - 7, { align: "right" }
  );
};

// ---------- Building blocks ----------

const drawAddressBlock = (doc: jsPDF, customer: Customer, y: number, companyName: string, seller?: SellerInfo, _label = "EMPFÄNGER") => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  setColor(doc, BRAND.muted);
  const senderLine = [companyName, seller?.street, [seller?.zip, seller?.city].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
  doc.text(senderLine, PAGE.margin, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  setColor(doc, BRAND.ink);
  doc.text(customer.name, PAGE.margin, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setColor(doc, BRAND.ink);
  let ay = y + 13;
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
  });
};

const drawVehicleCard = (doc: jsPDF, vehicle: Vehicle, y: number) => {
  const w = PAGE.w - 2 * PAGE.margin;
  const h = 29;
  setColor(doc, [255, 255, 255], "fill");
  setColor(doc, BRAND.border, "draw");
  doc.setLineWidth(0.3);
  doc.rect(PAGE.margin, y, w, h, "FD");

  setColor(doc, [244, 244, 244], "fill");
  doc.rect(PAGE.margin, y, w, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setColor(doc, BRAND.ink);
  doc.text("FAHRZEUGDATEN", PAGE.margin + 4, y + 4.8);
  doc.text(`ERSTZULASSUNG  ${vehicle.firstRegistration ? formatDate(vehicle.firstRegistration) : "—"}`, PAGE.w - PAGE.margin - 4, y + 4.8, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  setColor(doc, BRAND.ink);
  const title = [vehicle.make, vehicle.model, vehicle.modelDetail].filter(Boolean).join(" ");
  doc.text(title, PAGE.margin + 4, y + 13.5);

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  setColor(doc, BRAND.muted);
  doc.text(`VIN ${vehicle.vin}`, PAGE.margin + 4, y + 19);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(doc, BRAND.ink);
  doc.text(
    `${vehicle.year} · ${vehicle.color} · ${vehicle.mileage.toLocaleString("de-DE")} km · ${vehicle.fuel} · ${vehicle.transmission} · ${vehicle.power_hp} PS`,
    PAGE.margin + 4, y + 25
  );

  return y + h + 8;
};

interface LineItem {
  description: string;
  qty: string;
  unitPrice: number;
  total: number;
}

const drawTable = (doc: jsPDF, items: LineItem[], y: number, totalLabel = "Gesamtsumme", options?: { showVat?: boolean }) => {
  const x = PAGE.margin;
  const w = PAGE.w - 2 * PAGE.margin;
  const rowH = 9;

  // Neutrale Sechs-Spalten-Tabelle wie in der Referenzvorlage.
  setColor(doc, [240, 240, 240], "fill");
  doc.rect(x, y, w, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setColor(doc, BRAND.ink);
  doc.text("POS.", x + 3, y + 5.2);
  doc.text("MENGE", x + 25, y + 5.2, { align: "center" });
  doc.text("EINHEIT", x + 39, y + 5.2);
  doc.text("BEZEICHNUNG", x + 58, y + 5.2);
  doc.text("EINZELPREIS", x + 138, y + 5.2, { align: "right" });
  doc.text("GESAMTPREIS", x + w - 3, y + 5.2, { align: "right" });
  setColor(doc, BRAND.ink, "draw");
  doc.setLineWidth(0.35);
  doc.line(x, y + 8, x + w, y + 8);

  let cy = y + 8;
  items.forEach((it, index) => {
    if (index % 2 === 0) {
      setColor(doc, BRAND.light, "fill");
      doc.rect(x, cy, w, rowH, "F");
    }
    cy += rowH;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    setColor(doc, BRAND.ink);
    doc.text(`${index + 1}.`, x + 3, cy - 3);
    doc.text(it.qty, x + 25, cy - 3, { align: "center" });
    doc.text("Stk.", x + 39, cy - 3);
    const description = doc.splitTextToSize(it.description, 74)[0];
    doc.text(description, x + 58, cy - 3);
    doc.text(formatCurrency(it.unitPrice), x + 138, cy - 3, { align: "right" });
    doc.text(formatCurrency(it.total), x + w - 3, cy - 3, { align: "right" });
    setColor(doc, BRAND.border, "draw");
    doc.setLineWidth(0.2);
    doc.line(x, cy, x + w, cy);
  });

  cy += 3;
  const total = items.reduce((s, i) => s + i.total, 0);
  const net = options?.showVat ? total / 1.19 : total;
  const vat = total - net;
  const summaryRows: Array<{ label: string; value: number; total?: boolean }> = options?.showVat
    ? [
        { label: "Nettosumme", value: net },
        { label: "zzgl. 19 % USt.", value: vat },
        { label: totalLabel, value: total, total: true },
      ]
    : [{ label: totalLabel, value: total, total: true }];
  const summaryH = summaryRows.length * 6 + 4;
  setColor(doc, BRAND.light, "fill");
  doc.rect(x + 93, cy, w - 93, summaryH, "F");
  summaryRows.forEach((row, index) => {
    const rowY = cy + 6 + index * 6;
    doc.setFont("helvetica", row.total ? "bold" : "normal");
    doc.setFontSize(row.total ? 10 : 8.5);
    setColor(doc, BRAND.ink);
    doc.text(row.label, x + 97, rowY);
    doc.text(formatCurrency(row.value), x + w - 3, rowY, { align: "right" });
  });
  setColor(doc, BRAND.ink, "draw");
  doc.setLineWidth(0.5);
  doc.line(x + 93, cy + summaryH, x + w, cy + summaryH);

  return cy + summaryH + 7;
};

const drawSectionTitle = (doc: jsPDF, title: string, y: number) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  setColor(doc, BRAND.ink);
  doc.text(title, PAGE.margin, y);
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
  setColor(doc, BRAND.border, "draw");
  doc.setLineWidth(0.3);
  doc.rect(PAGE.margin, y, w, h, "FD");

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

const drawTodos = (doc: jsPDF, todos: { title: string; done?: boolean; dueDate?: string }[], y: number, title: string) => {
  if (!todos.length) return y;
  y = drawSectionTitle(doc, title, y);
  y += 2;
  todos.forEach((t) => {
    setColor(doc, BRAND.ink, "fill");
    doc.circle(PAGE.margin + 1.2, y - 1, 0.8, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    setColor(doc, BRAND.ink);
    const lines = doc.splitTextToSize(t.title, PAGE.w - 2 * PAGE.margin - 48);
    doc.text(lines, PAGE.margin + 5, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    setColor(doc, BRAND.muted);
    const status = t.done ? "Erledigt" : t.dueDate ? `Offen · fällig ${formatDate(t.dueDate)}` : "Offen";
    doc.text(status, PAGE.w - PAGE.margin, y, { align: "right" });
    y += Math.max(5.5, lines.length * 4);
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

const STANDARD_LAYOUT_START_Y = 124;

const drawStandardChrome = (
  doc: jsPDF,
  args: { title: string; docNumber: string; companyName: string; seller?: SellerInfo; customer: Customer; vehicle: Vehicle; meta: Array<[string, string]>; addressLabel?: string }
) => {
  drawHeader(doc, args.title, args.docNumber, args.companyName, args.seller);
  drawAddressBlock(doc, args.customer, 36, args.companyName, args.seller, args.addressLabel);
  drawMetaBlock(doc, args.meta, 42);
  drawDocumentHeading(doc, args.title, args.docNumber, 76);
  const cursor = drawVehicleCard(doc, args.vehicle, 86);
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

  const resolvedNumber = stepKey === "invoicing"
    ? process.fields.invoicing?.invoiceNumber ?? process.id
    : stepKey === "down_payment"
      ? process.fields.downPayment?.invoiceNumber ?? process.id
      : stepKey === "offer"
        ? offer?.id ?? process.id
        : process.id;
  const numberLabel = stepKey === "invoicing" || stepKey === "down_payment"
    ? "Rechnungs-Nr."
    : stepKey === "offer"
      ? "Angebots-Nr."
      : "Vorgangs-Nr.";
  const documentDate = stepKey === "invoicing"
    ? process.fields.invoicing?.invoiceDate
    : stepKey === "down_payment"
      ? process.fields.downPayment?.invoiceDate
      : stepKey === "order_confirmation"
        ? process.fields.orderConfirmation?.orderDate
        : stepKey === "delivery_confirmation"
          ? process.fields.delivery?.handoverDate
          : undefined;
  const docNumber = `${numberLabel} ${resolvedNumber}`;
  let cursor = drawStandardChrome(doc, {
    title: step.documentName,
    docNumber,
    companyName,
    seller,
    customer,
    vehicle,
    meta: [
      [numberLabel, resolvedNumber],
      ["Belegdatum", formatDate(documentDate ?? new Date().toISOString())],
      ["Vorgangs-Nr.", process.id],
    ],
  });
  cursor = Math.max(cursor, STANDARD_LAYOUT_START_Y);

  const drawCustomerAgreements = (c: number) => {
    if (!CUSTOMER_AGREEMENT_STEP_KEYS.includes(stepKey) || !process.customerTodosOC.length) return c;
    return drawTodos(doc, process.customerTodosOC, c + 6, "Kundenvereinbarungen");
  };

  switch (stepKey) {
    case "offer": {
      cursor = drawTextBlock(doc,
        `Sehr geehrte/r ${customer.name}, vielen Dank für Ihr Interesse. Wir freuen uns, Ihnen für das oben genannte Fahrzeug folgendes verbindliches Angebot unterbreiten zu dürfen.`,
        cursor);
      cursor += 6;
      cursor = drawTable(doc, [
        { description: `${vehicle.make} ${vehicle.model} (${vehicle.year})`, qty: "1", unitPrice: offer?.price ?? vehicle.listPrice, total: offer?.price ?? vehicle.listPrice },
      ], cursor, "Angebotspreis", { showVat: !isMarginTaxed(vehicle) });
      cursor = drawSectionTitle(doc, "Konditionen", cursor);
      cursor = drawTextBlock(doc,
        `Gültigkeit: bis ${offer ? formatDate(offer.validUntil) : "—"}\nLieferung: nach Vereinbarung\nGewährleistung: 12 Monate gemäß BGB\n${taxationLine(vehicle)}`,
        cursor);
      const agreements = process.customerTodosOC.length ? process.customerTodosOC : offer?.customerTodos ?? [];
      if (agreements.length) {
        cursor += 6;
        cursor = drawTodos(doc, agreements, cursor, "Kundenvereinbarungen");
      }
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
      ], cursor, "Zu zahlender Betrag", { showVat: !isMarginTaxed(vehicle) });
      cursor = drawSectionTitle(doc, "Zahlungsdaten", cursor);
      cursor = drawTextBlock(doc,
        `Empfänger: ${companyName}\nIBAN: ${BANK.iban}\nBIC: ${BANK.bic}\nVerwendungszweck: ${dp?.invoiceNumber ?? process.id}\nRechnungsdatum: ${dp?.invoiceDate ? formatDate(dp.invoiceDate) : "—"}\nZahlungsbedingung: ${dp?.paymentTerms ?? (dp?.dueDate ? `Fällig am ${formatDate(dp.dueDate)}` : "Sofort fällig nach Erhalt der Rechnung")}${dp?.received ? `\nZahlung eingegangen am: ${dp.receivedDate ? formatDate(dp.receivedDate) : "—"}` : ""}\n${taxationLine(vehicle)}`,
        cursor);
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
      ], cursor, "Kaufpreis", { showVat: !isMarginTaxed(vehicle) });
      cursor = drawSectionTitle(doc, "Eckdaten", cursor);
      cursor = drawTextBlock(doc,
        `Auftragsdatum: ${oc?.orderDate ? formatDate(oc.orderDate) : "—"}\nZahlungsbedingungen: ${oc?.paymentTerms ?? "Restzahlung bei Übergabe"}\nBereits geleistete Anzahlung: ${formatCurrency(process.fields.downPayment?.amount ?? 0)}\n${taxationLine(vehicle)}`,
        cursor);
      cursor = drawCustomerAgreements(cursor);
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
          setColor(doc, BRAND.ink, "fill");
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
        setColor(doc, BRAND.muted);
        doc.text(item.done ? "erledigt" : "offen", PAGE.w - PAGE.margin, cursor + 3, { align: "right" });
        cursor += 6;
      });
      cursor += 4;
      cursor = drawTextBlock(doc,
        allDone ? `Das Fahrzeug ist übergabebereit.` : `Hinweis: Es sind noch ${checklist.length - doneCount} Punkte offen. Das Fahrzeug ist noch nicht vollständig übergabebereit.`,
        cursor, { muted: true });
      cursor = drawCustomerAgreements(cursor);
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
      ], cursor, inv?.paid ? "Bezahlt" : "Restbetrag", { showVat: !isMarginTaxed(vehicle) });
      cursor = drawSectionTitle(doc, "Zahlungsdaten", cursor);
      cursor = drawTextBlock(doc,
        `Rechnungs-Nr.: ${inv?.invoiceNumber ?? "—"}\nRechnungsdatum: ${inv?.invoiceDate ? formatDate(inv.invoiceDate) : formatDate(new Date().toISOString())}\nZahlungsbedingung: ${inv?.paymentTerms ?? (inv?.dueDate ? `Fällig am ${formatDate(inv.dueDate)}` : "Sofort fällig nach Erhalt der Rechnung")}\nIBAN: ${BANK.iban} · BIC: ${BANK.bic}\nVerwendungszweck: ${process.id}${inv?.paid ? `\nZahlungsstatus: Bezahlt${inv.paidDate ? ` am ${formatDate(inv.paidDate)}` : ""} – Vielen Dank!` : `\nDer Restbetrag von ${formatCurrency(remaining)} ist bei Fahrzeugübergabe fällig.`}\n${taxationLine(vehicle)}`,
        cursor);
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
      cursor = drawSignatureRow(doc, cursor + 20, "Unterschrift Kunde", `Unterschrift ${companyName}`);
      break;
    }
  }

  drawFooter(doc, companyName, seller);
  return doc;
};

const drawSignatureRow = (doc: jsPDF, y: number, leftLabel: string, rightLabel: string) => {
  const colW = (PAGE.w - 2 * PAGE.margin - 10) / 2;
  setColor(doc, BRAND.ink, "draw");
  doc.setLineWidth(0.4);
  doc.line(PAGE.margin, y, PAGE.margin + colW, y);
  doc.line(PAGE.margin + colW + 10, y, PAGE.w - PAGE.margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setColor(doc, BRAND.muted);
  const leftLines = doc.splitTextToSize(leftLabel, colW);
  const rightLines = doc.splitTextToSize(rightLabel, colW);
  doc.text(leftLines, PAGE.margin, y + 4);
  doc.text(rightLines, PAGE.margin + colW + 10, y + 4);
  return y + 7 + Math.max(leftLines.length, rightLines.length) * 3.5;
};

// ---------- Kaufvertrag (ausführlich) ----------

const measureKvPartyHeight = (doc: jsPDF, lines: string[], w: number) => {
  let bodyLines = 0;
  lines.filter(Boolean).forEach((line, index) => {
    doc.setFont("helvetica", index === 0 ? "bold" : "normal");
    doc.setFontSize(index === 0 ? 9.5 : 8);
    bodyLines += doc.splitTextToSize(line || "—", w - 10).length;
  });
  return Math.max(30, 13 + bodyLines * 3.8);
};

const drawKvParty = (doc: jsPDF, label: string, lines: string[], x: number, y: number, w: number, h: number) => {
  setColor(doc, BRAND.border, "draw");
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setColor(doc, BRAND.muted);
  doc.text(label.toUpperCase(), x + 5, y + 5);
  let cursor = y + 11;
  lines.filter(Boolean).forEach((line, index) => {
    doc.setFont("helvetica", index === 0 ? "bold" : "normal");
    doc.setFontSize(index === 0 ? 9.5 : 8);
    setColor(doc, BRAND.ink);
    const wrapped = doc.splitTextToSize(line || "—", w - 10);
    doc.text(wrapped, x + 5, cursor);
    cursor += wrapped.length * 3.8;
  });
};

const drawKvSpecsTable = (doc: jsPDF, vehicle: Vehicle, y: number, kv?: any) => {
  const w = PAGE.w - 2 * PAGE.margin;
  const colW = w / 2;
  const rows: Array<[string, string]> = [
    ["Marke / Modell", `${vehicle.make} ${vehicle.model}${vehicle.modelDetail ? " " + vehicle.modelDetail : ""}`],
    ["Fahrzeug-Ident.-Nr. (VIN)", vehicle.vin],
    ["Fahrzeugart", VEHICLE_TYPE_LABELS[vehicle.type]],
    ["Anzahl Schlüssel", kv?.keysCount != null ? String(kv.keysCount) : "—"],
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
    ["Serviceheft", (vehicle.serviceBookComplete || kv?.docServiceBook) ? "vollständig / vorhanden" : "nicht angegeben"],
    ["Unfallfreiheit", kv?.accidentVehicle ? "nein" : vehicle.accidentFree === true ? "ja" : "nicht zugesichert"],
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  let cy = y;
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
    doc.setFontSize(8.5);
    const leftValue = doc.splitTextToSize(left[1], colW - 6);
    const rightValue = right ? doc.splitTextToSize(right[1], colW - 6) : [];
    doc.text(leftValue, PAGE.margin, cy + 4);
    if (right) doc.text(rightValue, PAGE.margin + colW, cy + 4);
    const rowH = 7 + Math.max(leftValue.length, rightValue.length, 1) * 3.8;
    setColor(doc, BRAND.border, "draw");
    doc.setLineWidth(0.2);
    doc.line(PAGE.margin, cy + rowH - 1, PAGE.w - PAGE.margin, cy + rowH - 1);
    cy += rowH + 1.5;
  }
  return cy + 2;
};

const CustomerSection = (
  doc: jsPDF,
  y: number,
  args: { companyName: string; seller: SellerInfo; customer: Customer; customerType: "b2c" | "b2b" }
) => {
  const w = (PAGE.w - 2 * PAGE.margin - 6) / 2;
  const sellerLines = [
    args.companyName,
    args.seller.street || "—",
    [args.seller.zip, args.seller.city].filter(Boolean).join(" ") || "—",
    args.seller.representative ? `Ansprechpartner: ${args.seller.representative}` : "Ansprechpartner: —",
    [args.seller.phone, args.seller.email, args.seller.vatId ? `USt-IdNr.: ${args.seller.vatId}` : null, args.seller.taxNumber ? `St.-Nr.: ${args.seller.taxNumber}` : null, args.seller.registration].filter(Boolean).join(" · ") || "—",
  ];

  const businessDetails = args.customerType === "b2b"
    ? [args.customer.legalForm, args.customer.contactPerson ? `Ansprechpartner: ${args.customer.contactPerson}` : null, args.customer.vatId ? `USt-IdNr.: ${args.customer.vatId}` : null].filter(Boolean).join(" · ")
    : args.customer.birthDate ? `Geburtsdatum: ${formatDate(args.customer.birthDate)}` : "";
  const customerLines = [
    args.customer.name,
    args.customer.street ?? "—",
    `${args.customer.zip ?? ""} ${args.customer.city}`.trim(),
    [args.customer.phone, args.customer.email].filter(Boolean).join(" · "),
    businessDetails,
  ];
  const h = Math.max(measureKvPartyHeight(doc, sellerLines, w), measureKvPartyHeight(doc, customerLines, w));
  drawKvParty(doc, "Verkäufer", sellerLines, PAGE.margin, y, w, h);
  drawKvParty(doc, args.customerType === "b2b" ? "Käufer · Gewerbekunde" : "Käufer · Privatkunde", customerLines, PAGE.margin + w + 6, y, w, h);
  return y + h + 6;
};

const VehicleSection = (doc: jsPDF, vehicle: Vehicle, y: number, kv?: Process["fields"]["purchaseContract"]) => {
  let cursor = drawSectionTitle(doc, "1. Fahrzeug", y);
  cursor = drawKvSpecsTable(doc, vehicle, cursor + 3, kv);
  if (vehicle.features?.length) {
    cursor = drawTextBlock(doc, `Sonderausstattung / Zubehör: ${vehicle.features.join(" · ")}`, cursor + 2, { fontSize: 8.5 });
  }
  return cursor + 4;
};

const PriceSection = (
  doc: jsPDF,
  y: number,
  args: { vehicle: Vehicle; finalPrice: number; downPayment: number; paymentStatus: "paid" | "deposit" | "open"; paymentAmount: number; paymentDate?: string; paymentMethod?: string }
) => {
  let cursor = drawSectionTitle(doc, "2. Kaufpreis und Zahlung", y);
  const net = isMarginTaxed(args.vehicle) ? undefined : args.finalPrice / 1.19;
  const vat = net == null ? undefined : args.finalPrice - net;
  const priceItems: LineItem[] = net == null
    ? [{ description: "Kaufpreis (Differenzbesteuerung)", qty: "1", unitPrice: args.finalPrice, total: args.finalPrice }]
    : [
        { description: "Kaufpreis netto", qty: "1", unitPrice: net, total: net },
        { description: "Umsatzsteuer 19 %", qty: "1", unitPrice: vat ?? 0, total: vat ?? 0 },
      ];
  cursor = drawTable(doc, priceItems, cursor, "Kaufpreis brutto", { showVat: false });
  const paidAmount = args.paymentStatus === "paid" ? args.finalPrice : args.paymentStatus === "deposit" ? args.paymentAmount || args.downPayment : args.paymentAmount || 0;
  const remaining = Math.max(0, args.finalPrice - paidAmount);
  cursor = drawTextBlock(doc,
    `Zahlungsstatus: ${args.paymentStatus === "paid" ? "bezahlt" : args.paymentStatus === "deposit" ? "Anzahlung geleistet" : "Restzahlung offen"}. ` +
    `Gezahlter Betrag: ${formatCurrency(paidAmount)}. Offener Betrag: ${formatCurrency(remaining)}.` +
    `${args.paymentDate ? ` Zahlungsdatum: ${formatDate(args.paymentDate)}.` : ""}${args.paymentMethod ? ` Zahlungsart: ${args.paymentMethod}.` : ""}\n` +
    `${taxationLine(args.vehicle)}`,
    cursor, { fontSize: 9 });
  return cursor + 4;
};

const ConditionSection = (doc: jsPDF, y: number, vehicle: Vehicle, kv?: Process["fields"]["purchaseContract"]) => {
  let cursor = drawSectionTitle(doc, "3. Fahrzeugzustand und bekannte Mängel", y);
  const facts = [
    ["Unfallfahrzeug", kv?.accidentVehicle ?? vehicle.accidentFree === false],
    ["Bekannte Schäden", !!kv?.knownDamagePresent],
    ["Nachlackierungen", !!kv?.repainted],
    ["Wie besichtigt gekauft", !!kv?.purchasedAsInspected],
  ] as const;
  cursor = drawTextBlock(doc, facts.map(([label, value]) => `${value ? "[x]" : "[ ]"} ${label}`).join("    "), cursor, { fontSize: 9 });
  const description = kv?.conditionDescription?.trim() || kv?.preDamage?.trim();
  if (description) cursor = drawTextBlock(doc, `Beschreibung: ${description}`, cursor + 2, { fontSize: 9 });
  const defects = kv?.defects?.filter((defect) => defect.title.trim()) ?? [];
  if (defects.length) {
    cursor = drawTextBlock(doc, `Bekannte Mängel:\n${defects.map((defect, index) => `${index + 1}. ${defect.title}${defect.description?.trim() ? ` – ${defect.description.trim()}` : ""}`).join("\n")}`, cursor + 2, { fontSize: 9 });
  } else if (kv?.knownDefects?.trim()) {
    cursor = drawTextBlock(doc, `Bekannte Mängel: ${kv.knownDefects.trim()}`, cursor + 2, { fontSize: 9 });
  } else {
    cursor = drawTextBlock(doc, "Keine über den dokumentierten alters- und laufleistungsüblichen Zustand hinausgehenden Mängel angegeben.", cursor + 2, { fontSize: 9, muted: true });
  }
  return cursor + 4;
};

const DeliverySection = (doc: jsPDF, y: number, process: Process, kv?: Process["fields"]["purchaseContract"]) => {
  let cursor = drawSectionTitle(doc, "4. Übergabe", y);
  const handoverDate = process.fields.delivery?.handoverDate ?? process.fields.orderConfirmation?.deliveryDate;
  const handoverPlace = process.fields.delivery?.handoverLocation ?? kv?.place;
  const handoverMileage = process.fields.delivery?.finalMileage;
  cursor = drawTextBlock(doc,
    `Übergabedatum: ${handoverDate ? formatDate(handoverDate) : "nach Vereinbarung"} · ` +
    `Übergabeort: ${handoverPlace || "Sitz des Verkäufers"} · ` +
    `Kilometerstand bei Übergabe: ${handoverMileage != null ? `${handoverMileage.toLocaleString("de-DE")} km` : "wird bei Übergabe dokumentiert"} · ` +
    `Schlüssel: ${kv?.keysCount ?? "—"}`,
    cursor, { fontSize: 9 });

  if (kv?.handoverProtocol) {
    const documents: Array<[string, boolean]> = [
      ["Zulassungsbescheinigung Teil I", !!kv.docZB1],
      ["Zulassungsbescheinigung Teil II", !!kv.docZB2],
      ["HU/AU-Bericht", !!kv.docHuAu],
      ["Serviceheft", !!kv.docServiceBook],
      ["Bedienungsanleitung", !!kv.docOwnerManual],
      ["COC-Papiere", !!kv.docCocPapers],
    ];
    cursor = drawTextBlock(doc, `Übergebene Dokumente: ${documents.filter(([, checked]) => checked).map(([label]) => label).join(" · ") || "keine Auswahl"}.`, cursor + 2, { fontSize: 9 });
    cursor = drawTextBlock(doc, "Das gesonderte Übergabeprotokoll ist Bestandteil der Fahrzeugübergabe.", cursor + 2, { fontSize: 9, muted: true });
  }
  return cursor + 4;
};

const AdditionalSection = (doc: jsPDF, y: number, kv?: Process["fields"]["purchaseContract"]) => {
  const entries = [
    kv?.additionalAgreementEnabled && kv.additionalAgreement?.trim() ? `Zusatzvereinbarung: ${kv.additionalAgreement.trim()}` : null,
    kv?.financing ? `Finanzierung: ${kv.financingDetails?.trim() || "gemäß gesonderter Finanzierungsvereinbarung"}` : null,
    kv?.tradeIn ? `Inzahlungnahme: ${kv.tradeInDetails?.trim() || "gemäß gesonderter Inzahlungnahmevereinbarung"}` : null,
  ].filter(Boolean) as string[];
  if (!entries.length) return y;
  let cursor = drawSectionTitle(doc, "Zusatzvereinbarungen", y);
  cursor = drawTextBlock(doc, entries.join("\n"), cursor, { fontSize: 9 });
  return cursor + 4;
};

const LegalSection = (doc: jsPDF, y: number, context: ContractClauseContext, ensureSpace: (cursor: number, requiredHeight: number) => number) => {
  let cursor = y;
  for (const [index, clause] of getContractClauses(context).entries()) {
    const text = clause.text(context);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const requiredHeight = 11 + doc.splitTextToSize(text, PAGE.w - 2 * PAGE.margin).length * 4;
    cursor = ensureSpace(cursor, requiredHeight);
    cursor = drawSectionTitle(doc, `${index + 5}. ${clause.title}`, cursor);
    cursor = drawTextBlock(doc, text, cursor, { fontSize: 9 });
    cursor += 4;
  }
  return cursor;
};

const SignatureSection = (doc: jsPDF, y: number, args: { place: string; contractDate: string; customerName: string; companyName: string; representative?: string; separateB2CAgreement: boolean }) => {
  let cursor = drawSectionTitle(doc, "Unterschriften", y);
  if (args.separateB2CAgreement) {
    cursor = drawTextBlock(doc, "Der Käufer bestätigt zusätzlich die vorstehende, gesondert hervorgehobene Vereinbarung zur Verkürzung der Verjährungsfrist auf ein Jahr.", cursor, { fontSize: 8.5 });
    cursor += 10;
    setColor(doc, BRAND.ink, "draw");
    doc.setLineWidth(0.4);
    doc.line(PAGE.margin, cursor, PAGE.margin + 78, cursor);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setColor(doc, BRAND.muted);
    doc.text("Gesonderte Zustimmung des Käufers zur Verkürzung auf ein Jahr", PAGE.margin, cursor + 4);
    cursor += 10;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(doc, BRAND.ink);
  doc.text(`Ort, Datum: ${args.place}, ${args.contractDate}`, PAGE.margin, cursor + 2);
  cursor += 18;
  return drawSignatureRow(doc, cursor, `Käufer · ${args.customerName}`, `Verkäufer · ${args.companyName}${args.representative ? ` (${args.representative})` : ""}`);
};

const drawContractHeading = (doc: jsPDF, args: { title: string; contractNumber: string; contractDate: string; place: string; y: number }) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setColor(doc, BRAND.ink);
  const titleLines = doc.splitTextToSize(args.title, PAGE.w - 2 * PAGE.margin);
  doc.text(titleLines, PAGE.margin, args.y);

  const metaY = args.y + titleLines.length * 6 + 1;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(doc, BRAND.muted);
  doc.text(`${args.contractDate} · ${args.place}`, PAGE.margin, metaY);
  doc.text(`Vertrags-Nr. ${args.contractNumber}`, PAGE.w - PAGE.margin, metaY, { align: "right" });
  setColor(doc, BRAND.border, "draw");
  doc.setLineWidth(0.3);
  doc.line(PAGE.margin, metaY + 3, PAGE.w - PAGE.margin, metaY + 3);
  return metaY + 9;
};

const buildKaufvertrag = (
  doc: jsPDF,
  { process, vehicle, customer, companyName, seller, finalPrice }: { process: Process; vehicle: Vehicle; customer: Customer; companyName: string; seller?: SellerInfo; finalPrice: number }
): jsPDF => {
  const kv = process.fields.purchaseContract;
  const down = process.fields.downPayment?.amount ?? 0;
  const place = kv?.place ?? customer.city ?? "—";
  const contractDate = kv?.contractDate ? formatDate(kv.contractDate) : formatDate(new Date().toISOString());

  // Verkäuferdaten: Unternehmensdaten aus den Einstellungen, mit optionalem Override am Vertrag
  const sStreet = kv?.sellerStreet || seller?.street;
  const sZip = kv?.sellerZip || seller?.zip;
  const sCity = kv?.sellerCity || seller?.city;
  const sRep = kv?.sellerRepresentative || seller?.representative;
  const sVat = kv?.sellerVatId || seller?.vatId;
  const sReg = kv?.sellerRegistration || seller?.registration;
  const resolvedSeller: SellerInfo = {
    ...seller,
    street: sStreet,
    zip: sZip,
    city: sCity,
    representative: sRep,
    vatId: sVat,
    registration: sReg,
  };
  const customerType = kv?.customerType ?? (customer.salutation === "firma" ? "b2b" : "b2c");
  const contractNumber = kv?.contractNumber ?? process.id;

  drawHeader(doc, "Kaufvertrag", `Vertrags-Nr. ${contractNumber}`, companyName, resolvedSeller);
  let cursor = drawContractHeading(doc, {
    title: "Verbindliche Bestellung / Kaufvertrag eines Fahrzeugs",
    contractNumber,
    contractDate,
    place,
    y: 38,
  });

  cursor = CustomerSection(doc, cursor, { companyName, seller: resolvedSeller, customer, customerType });

  // Preamble
  cursor = drawTextBlock(doc,
    `Zwischen den vorstehenden Parteien wird hiermit folgender Kaufvertrag über ein gebrauchtes Kraftfahrzeug geschlossen.`,
    cursor, { muted: true });
  cursor += 4;

  const addContractPage = () => {
    drawFooter(doc, companyName, resolvedSeller);
    doc.addPage();
    drawHeader(doc, "Kaufvertrag", `Vertrags-Nr. ${contractNumber}`, companyName, resolvedSeller);
    cursor = drawContractHeading(doc, {
      title: "Kaufvertrag – Fortsetzung",
      contractNumber,
      contractDate,
      place,
      y: 38,
    });
  };
  const ensureSpace = (requiredHeight = 35) => {
    if (cursor + requiredHeight > 258) addContractPage();
  };

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const featureHeight = vehicle.features?.length
    ? doc.splitTextToSize(vehicle.features.join(" · "), PAGE.w - 2 * PAGE.margin).length * 4
    : 0;
  ensureSpace(Math.min(135 + featureHeight, 180));
  cursor = VehicleSection(doc, vehicle, cursor, kv);
  ensureSpace(55);
  cursor = PriceSection(doc, cursor, {
    vehicle,
    finalPrice,
    downPayment: down,
    paymentStatus: kv?.paymentStatus ?? (process.fields.invoicing?.paid ? "paid" : process.fields.downPayment?.received ? "deposit" : "open"),
    paymentAmount: kv?.paymentAmount ?? 0,
    paymentDate: kv?.paymentDate ?? process.fields.invoicing?.paidDate ?? process.fields.downPayment?.receivedDate,
    paymentMethod: kv?.paymentMethod ?? process.fields.downPayment?.method,
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const conditionDetailText = [
    kv?.conditionDescription,
    kv?.preDamage,
    kv?.knownDefects,
    ...(kv?.defects?.map((defect) => `${defect.title} ${defect.description ?? ""}`) ?? []),
  ].filter(Boolean).join("\n");
  const conditionHeight = 30 + doc.splitTextToSize(conditionDetailText, PAGE.w - 2 * PAGE.margin).length * 4;
  ensureSpace(Math.min(conditionHeight, 175));
  cursor = ConditionSection(doc, cursor, vehicle, kv);
  ensureSpace(45);
  cursor = DeliverySection(doc, cursor, process, kv);

  if (process.customerTodosOC.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const todoHeight = 14 + process.customerTodosOC.reduce((height, todo) => {
      const lines = doc.splitTextToSize(todo.title, PAGE.w - 2 * PAGE.margin - 48).length;
      return height + Math.max(5.5, lines * 4);
    }, 0);
    ensureSpace(Math.min(todoHeight, 175));
    cursor = drawTodos(doc, process.customerTodosOC, cursor, "Kundenvereinbarungen");
    cursor += 4;
  }

  const hasAdditional = !!(
    (kv?.additionalAgreementEnabled && kv.additionalAgreement?.trim()) ||
    kv?.financing ||
    kv?.tradeIn
  );
  if (hasAdditional) {
    const additionalText = [kv?.additionalAgreement, kv?.financingDetails, kv?.tradeInDetails].filter(Boolean).join("\n");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    ensureSpace(Math.min(18 + doc.splitTextToSize(additionalText, PAGE.w - 2 * PAGE.margin).length * 4, 175));
    cursor = AdditionalSection(doc, cursor, kv);
  }

  const ensureCursorSpace = (value: number, requiredHeight: number) => {
    cursor = value;
    ensureSpace(requiredHeight);
    return cursor;
  };
  cursor = LegalSection(doc, cursor, {
    customerType,
    warrantyMonths: customerType === "b2c" && !kv?.consumerWarrantyLimitationAccepted ? 24 : kv?.warrantyMonths ?? 12,
    warrantyExcluded: customerType === "b2b" && (!!kv?.warrantyExcluded || !!kv?.exportSale),
    consumerWarrantyLimitationAccepted: customerType === "b2c" && !!kv?.consumerWarrantyLimitationAccepted,
    guaranteeAgreed: !!kv?.guaranteeAgreed && !(customerType === "b2b" && !!kv?.exportSale),
    guaranteeDetails: kv?.guaranteeDetails,
    showPrivacy: kv?.showPrivacy !== false,
    exportSale: !!kv?.exportSale,
  }, ensureCursorSpace);

  ensureSpace(customerType === "b2c" && !!kv?.consumerWarrantyLimitationAccepted ? 62 : 42);

  SignatureSection(doc, cursor, {
    place,
    contractDate,
    customerName: customer.name,
    companyName,
    representative: sRep,
    separateB2CAgreement: customerType === "b2c" && !!kv?.consumerWarrantyLimitationAccepted,
  });

  drawFooter(doc, companyName, resolvedSeller);
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
  seller?: SellerInfo;
  pdfTheme?: PdfThemeKey;
}

export const generateOfferPdf = ({ offer, vehicle, customer, companyName = "VINflow Autohaus GmbH", seller, pdfTheme }: GenerateOfferPdfArgs): jsPDF => {
  applyPdfTheme(pdfTheme);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawHeader(doc, "Angebot", `Angebots-Nr. ${offer.id}`, companyName, seller);
  drawAddressBlock(doc, customer, 36, companyName, seller, "ANGEBOTSEMPFÄNGER");
  drawMetaBlock(doc, [
    ["Angebots-Nr.", offer.id],
    ["Erstellt am", formatDate(offer.createdAt)],
    ["Gültig bis", formatDate(offer.validUntil)],
  ], 42);
  drawDocumentHeading(doc, "Angebot", `Angebots-Nr. ${offer.id}`, 76);
  let cursor = drawVehicleCard(doc, vehicle, 86);
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
  cursor = drawTable(doc, items, cursor, "Angebotspreis", { showVat: !isMarginTaxed(vehicle) });

  cursor = drawSectionTitle(doc, "Konditionen", cursor);
  cursor = drawTextBlock(doc,
    `Gültigkeit: bis ${formatDate(offer.validUntil)}\nLieferung: nach Vereinbarung\nGewährleistung: 12 Monate gemäß BGB\n${taxationLine(vehicle)}`,
    cursor);

  if (offer.customerTodos.length) {
    cursor += 6;
    cursor = drawTodos(doc, offer.customerTodos, cursor, "Kundenvereinbarungen");
  }
  if (offer.notes && offer.notes.trim()) {
    cursor += 4;
    cursor = drawSectionTitle(doc, "Hinweise", cursor);
    cursor = drawTextBlock(doc, offer.notes, cursor, { muted: true });
  }

  drawFooter(doc, companyName, seller);
  return doc;
};

export const downloadOfferPdf = (args: GenerateOfferPdfArgs) => {
  const doc = generateOfferPdf(args);
  doc.save(`${args.offer.id}_Angebot.pdf`);
};
