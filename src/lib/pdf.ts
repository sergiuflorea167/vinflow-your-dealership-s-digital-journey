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
  PdfLayoutBlockKey,
  PdfLayoutConfig,
  PDF_DOCUMENT_GROUP_BY_STEP,
  formatCurrencyPrecise as formatCurrency,
  formatDate,
  normalizePdfLayout,
} from "@/data/process";
import { getContractClauses, type ContractClauseContext } from "@/lib/contractClauses";

/**
 * Keep every generated document lightweight for PDF viewers.
 *
 * jsPDF otherwise embeds all 14 standard fonts and writes drawing coordinates
 * with up to 16 decimal places. Contracts contain many text and line commands,
 * so the unoptimized content streams can become needlessly expensive to parse.
 */
const createPdfDocument = () => new jsPDF({
  unit: "mm",
  format: "a4",
  compress: true,
  putOnlyUsedFonts: true,
  precision: 2,
  floatPrecision: "smart",
});

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
let ACTIVE_LAYOUT = normalizePdfLayout();
let ACTIVE_DOCUMENT_CONTENT = ACTIVE_LAYOUT.documentContents.sales;

const applyPdfTheme = (_key?: PdfThemeKey) => {
  // Geschäftsdokumente bleiben bewusst neutral und unabhängig vom App-Farbthema.
  BRAND = PROFESSIONAL_DOCUMENT_THEME;
};

const ACCENT_COLORS: Record<PdfLayoutConfig["accentColor"], RGB> = {
  blue: [0, 70, 125],
  graphite: [55, 65, 81],
  gold: [168, 132, 50],
  red: [192, 32, 44],
  green: [45, 106, 79],
};

const applyPdfLayout = (layout?: PdfLayoutConfig) => {
  ACTIVE_LAYOUT = normalizePdfLayout(layout);
  ACTIVE_DOCUMENT_CONTENT = ACTIVE_LAYOUT.documentContents.sales;
  PAGE.margin = ACTIVE_LAYOUT.marginMm;
};

const applyDocumentContent = (stepKey: ProcessStepKey) => {
  const group = PDF_DOCUMENT_GROUP_BY_STEP[stepKey] ?? "sales";
  ACTIVE_DOCUMENT_CONTENT = ACTIVE_LAYOUT.documentContents[group] ?? ACTIVE_LAYOUT.documentContents.sales;
};

const fontSize = (size: number) => Number((size * ACTIVE_LAYOUT.fontScale).toFixed(2));

const blockOffset = (key: PdfLayoutBlockKey) => ACTIVE_LAYOUT.blockOffsets[key] ?? { x: 0, y: 0 };

const PAGE = {
  w: 210,
  h: 297,
  margin: 18,
  footerTop: 268,
  contentBottom: 258,
  headerY: 16,
  addressY: 58,
  titleY: 112,
  tableY: 125,
};
export const BANK = { iban: "DE89 3704 0044 0532 0130 00", bic: "COBADEFFXXX", bank: "Commerzbank" };

let activeStandardChrome: { title: string; docNumber: string; companyName: string; seller?: SellerInfo; companyLogoUrl?: string } | null = null;

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
const companySenderLine = (companyName: string, seller?: SellerInfo) => [companyName, companyAddress(seller)].filter(Boolean).join(" · ");
const sellerBank = (seller?: SellerInfo) => ({
  bank: seller?.bankName || BANK.bank,
  iban: seller?.iban || BANK.iban,
  bic: seller?.bic || BANK.bic,
});

const logoFormat = (dataUrl: string) => dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg") ? "JPEG" : "PNG";
const logoAlias = (dataUrl: string) => `company-logo-${dataUrl.length}-${dataUrl.slice(0, 32)}-${dataUrl.slice(-32)}`.replace(/[^A-Za-z0-9_-]/g, "");
const optimizedLogoCache = new Map<string, Promise<string>>();

const waitForPaint = () => new Promise<void>((resolve) => {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    resolve();
    return;
  }
  window.requestAnimationFrame(() => resolve());
});

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = src;
});

const optimizePdfLogo = async (companyLogoUrl?: string) => {
  if (!companyLogoUrl || !companyLogoUrl.startsWith("data:image/")) return companyLogoUrl;
  if (companyLogoUrl.length < 250_000) return companyLogoUrl;

  const cached = optimizedLogoCache.get(companyLogoUrl);
  if (cached) return cached;

  const optimized = (async () => {
    if (typeof document === "undefined") return companyLogoUrl;
    const image = await loadImage(companyLogoUrl);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!sourceWidth || !sourceHeight) return companyLogoUrl;

    const maxWidth = 900;
    const maxHeight = 360;
    const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
    if (scale >= 1 && companyLogoUrl.length < 500_000) return companyLogoUrl;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return companyLogoUrl;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  })().catch(() => companyLogoUrl);

  optimizedLogoCache.set(companyLogoUrl, optimized);
  return optimized;
};

const preparePdfArgs = async <T extends { companyLogoUrl?: string }>(args: T): Promise<T> => ({
  ...args,
  companyLogoUrl: await optimizePdfLogo(args.companyLogoUrl),
});

const headerLogoY = () => 16 + blockOffset("logo").y;
const headerBottomY = () => {
  if (ACTIVE_LAYOUT.logoPosition === "hidden") return PAGE.headerY + blockOffset("sender").y + 13;
  return Math.max(PAGE.headerY + blockOffset("sender").y + 13, headerLogoY() + ACTIVE_LAYOUT.logoSize.heightMm);
};

const drawHeader = (doc: jsPDF, _title: string, _docNumber: string, companyName: string, seller?: SellerInfo, companyLogoUrl?: string) => {
  const logoOffset = blockOffset("logo");
  const senderOffset = blockOffset("sender");
  const x = PAGE.margin;
  const logoW = ACTIVE_LAYOUT.logoSize.widthMm;
  const logoH = ACTIVE_LAYOUT.logoSize.heightMm;
  const logoX = (ACTIVE_LAYOUT.logoPosition === "left" ? PAGE.margin : PAGE.w - PAGE.margin - logoW) + logoOffset.x;
  const logoY = headerLogoY();
  const textX = (ACTIVE_LAYOUT.logoPosition === "left" ? PAGE.margin + logoW + 8 : x) + senderOffset.x;
  const textY = Math.max(PAGE.headerY + senderOffset.y, logoY + 2);
  const textWidth = ACTIVE_LAYOUT.logoPosition === "left"
    ? Math.max(42, PAGE.w - textX - PAGE.margin)
    : Math.max(42, PAGE.w - PAGE.margin * 2 - logoW - 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize(10));
  setColor(doc, BRAND.ink);
  doc.text(fitSingleLine(doc, companyName, textWidth), textX, textY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize(7.5));
  setColor(doc, BRAND.muted);
  const address = companyAddress(seller);
  doc.text(fitSingleLine(doc, address || "Fahrzeughandel & Service", textWidth), textX, textY + 4.2);

  if (ACTIVE_LAYOUT.logoPosition !== "hidden") {
    if (companyLogoUrl) {
      try {
        doc.addImage(companyLogoUrl, logoFormat(companyLogoUrl), logoX, logoY, logoW, logoH, logoAlias(companyLogoUrl), "FAST");
        return;
      } catch (error) {
        console.warn("[pdf] company logo could not be rendered", error);
      }
    }
    setColor(doc, ACCENT_COLORS[ACTIVE_LAYOUT.accentColor], "fill");
    doc.roundedRect(logoX, logoY, logoW, logoH, 0.8, 0.8, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize(Math.min(18, logoH * 0.8)));
    setColor(doc, [255, 255, 255]);
    doc.text("LOGO", logoX + logoW / 2, logoY + logoH / 2 + 2, { align: "center" });
  }
};

const drawFollowingPageHeader = (doc: jsPDF, title: string, docNumber: string, companyName: string, seller?: SellerInfo, companyLogoUrl?: string) => {
  if (!ACTIVE_LAYOUT.followingPage.showHeader) return;
  drawHeader(doc, title, docNumber, companyName, seller, companyLogoUrl);
  const separatorY = headerBottomY() + 5;
  setColor(doc, BRAND.border, "draw");
  doc.setLineWidth(0.25);
  doc.line(PAGE.margin, separatorY, PAGE.w - PAGE.margin, separatorY);
};

const drawDocumentHeading = (doc: jsPDF, title: string, _docNumber: string, y: number) => {
  const offset = blockOffset("title");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setColor(doc, BRAND.ink);
  doc.text(title, PAGE.margin + offset.x, y + offset.y);
  return y + offset.y + 13;
};

const drawFooter = (doc: jsPDF, companyName: string, seller?: SellerInfo, pageNumber?: number, pageCount?: number) => {
  if (!ACTIVE_LAYOUT.showFooter) return;
  const footer = ACTIVE_LAYOUT.footer;
  const configuredY = PAGE.footerTop + footer.yOffsetMm;
  const configuredFontSize = 6.1 * footer.fontScale;
  const configuredAddressLines = [seller?.street, [seller?.zip, seller?.city].filter(Boolean).join(" ")].filter(Boolean);
  const configuredTaxLine = seller?.vatId ? `USt-IdNr. ${seller.vatId}` : seller?.taxNumber ? `St.-Nr. ${seller.taxNumber}` : "USt-IdNr. -";
  const configuredSections = [
    footer.showBank ? { title: "Bankverbindung", lines: [sellerBank(seller).bank, `IBAN ${sellerBank(seller).iban}`, `BIC ${sellerBank(seller).bic}`] } : null,
    footer.showCompany ? { title: "Unternehmen", lines: [companyName, ...configuredAddressLines, seller?.representative ? `GF ${seller.representative}` : undefined].filter(Boolean) as string[] } : null,
    footer.showTax ? { title: "Steuer", lines: [configuredTaxLine, seller?.registration].filter(Boolean) as string[] } : null,
    footer.showContact ? { title: "Kontakt", lines: [seller?.phone ? `Tel. ${seller.phone}` : "Telefon -", seller?.email ? `E-Mail ${seller.email}` : "E-Mail -", seller?.website || "Website -"] } : null,
  ].filter(Boolean) as Array<{ title: string; lines: string[] }>;

  if (footer.showLine) {
    setColor(doc, BRAND.border, "draw");
    doc.setLineWidth(0.3);
    doc.line(PAGE.margin, configuredY, PAGE.w - PAGE.margin, configuredY);
  }

  if (footer.style === "minimal") {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(configuredFontSize);
    setColor(doc, BRAND.ink);
    const parts = [
      footer.showCompany ? companyName : null,
      footer.showContact && seller?.email ? seller.email : null,
      footer.showBank ? `IBAN ${sellerBank(seller).iban}` : null,
      footer.showTax ? configuredTaxLine : null,
    ].filter(Boolean) as string[];
    doc.text(fitSingleLine(doc, parts.join("   "), PAGE.w - 2 * PAGE.margin - 28), PAGE.margin, configuredY + 6);
  } else if (footer.style === "compact") {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(configuredFontSize);
    setColor(doc, BRAND.ink);
    const compactText = configuredSections.flatMap((section) => [section.title, ...section.lines]).join("   ");
    doc.text(fitSingleLine(doc, compactText, PAGE.w - 2 * PAGE.margin - 30), PAGE.margin, configuredY + 6);
  } else if (configuredSections.length) {
    const colW = (PAGE.w - 2 * PAGE.margin) / configuredSections.length;
    const drawConfiguredFooterText = (text: string, col: number, offsetY: number) => {
      doc.text(fitSingleLine(doc, text, colW - 3), PAGE.margin + col * colW, configuredY + offsetY);
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(configuredFontSize);
    setColor(doc, BRAND.muted);
    configuredSections.forEach((section, col) => drawConfiguredFooterText(section.title, col, 5));

    doc.setFont("helvetica", "normal");
    doc.setFontSize(configuredFontSize);
    setColor(doc, BRAND.ink);
    configuredSections.forEach((section, col) => {
      section.lines.slice(0, 4).forEach((line, index) => drawConfiguredFooterText(line, col, 9 + index * 3.2));
    });
  }

  if (footer.showPageNumber) {
    setColor(doc, BRAND.muted);
    doc.setFontSize(6.8 * footer.fontScale);
    const current = pageNumber ?? doc.getCurrentPageInfo().pageNumber;
    const total = pageCount ?? doc.getNumberOfPages();
    doc.text(`Seite ${current}/${total}`, PAGE.w - PAGE.margin, PAGE.h - 7, { align: "right" });
  }
  return;
  const y = PAGE.footerTop;
  const footerFontSize = 6.1;
  setColor(doc, BRAND.border, "draw");
  doc.setLineWidth(0.3);
  doc.line(PAGE.margin, y, PAGE.w - PAGE.margin, y);

  const colW = (PAGE.w - 2 * PAGE.margin) / 4;
  const drawFooterText = (text: string, col: number, offsetY: number) => {
    doc.text(fitSingleLine(doc, text, colW - 3), PAGE.margin + col * colW, y + offsetY);
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(footerFontSize);
  setColor(doc, BRAND.muted);
  doc.text("Bankverbindung", PAGE.margin, y + 5);
  doc.text("Unternehmen", PAGE.margin + colW, y + 5);
  doc.text("Steuer", PAGE.margin + 2 * colW, y + 5);
  doc.text("Kontakt", PAGE.margin + 3 * colW, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(footerFontSize);
  setColor(doc, BRAND.ink);
  drawFooterText(sellerBank(seller).bank, 0, 9);
  drawFooterText(`IBAN ${sellerBank(seller).iban}`, 0, 12.2);
  drawFooterText(`BIC ${sellerBank(seller).bic}`, 0, 15.4);

  drawFooterText(companyName, 1, 9);
  const addressLines = [seller?.street, [seller?.zip, seller?.city].filter(Boolean).join(" ")].filter(Boolean);
  if (addressLines[0]) drawFooterText(addressLines[0], 1, 12.2);
  if (addressLines[1]) drawFooterText(addressLines[1], 1, 15.4);
  if (seller?.representative) drawFooterText(`GF ${seller.representative}`, 1, 18.6);
  const taxLine = seller?.vatId ? `USt-IdNr. ${seller.vatId}` : seller?.taxNumber ? `St.-Nr. ${seller.taxNumber}` : "USt-IdNr. —";
  drawFooterText(taxLine, 2, 9);
  if (seller?.registration) drawFooterText(seller.registration, 2, 12.2);

  drawFooterText(seller?.phone ? `Tel. ${seller.phone}` : "Telefon —", 3, 9);
  drawFooterText(seller?.email ? `E-Mail ${seller.email}` : "E-Mail —", 3, 12.2);
  drawFooterText(seller?.website || "Website -", 3, 15.4);

  setColor(doc, BRAND.muted);
  doc.setFontSize(6.8);
  const current = pageNumber ?? doc.getCurrentPageInfo().pageNumber;
  const total = pageCount ?? doc.getNumberOfPages();
  doc.text(`Seite ${current}/${total}`, PAGE.w - PAGE.margin, PAGE.h - 7, { align: "right" });
};

const drawFooterOnAllPages = (doc: jsPDF, companyName: string, seller?: SellerInfo) => {
  if (!ACTIVE_LAYOUT.showFooter) return;
  const pageCount = doc.getNumberOfPages();
  const currentPage = doc.getCurrentPageInfo().pageNumber;
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    drawFooter(doc, companyName, seller, page, pageCount);
  }
  doc.setPage(currentPage);
};

const ensureStandardSpace = (doc: jsPDF, y: number, requiredHeight: number) => {
  if (!activeStandardChrome || y + requiredHeight <= PAGE.contentBottom) return y;
  doc.addPage();
  drawFollowingPageHeader(doc, activeStandardChrome.title, activeStandardChrome.docNumber, activeStandardChrome.companyName, activeStandardChrome.seller, activeStandardChrome.companyLogoUrl);
  return ACTIVE_LAYOUT.followingPage.contentStartMm;
};

// ---------- Building blocks ----------

const drawAddressBlock = (doc: jsPDF, customer: Customer, y: number, companyName: string, seller?: SellerInfo, _label = "EMPFÄNGER") => {
  const offset = blockOffset("address");
  const addressX = PAGE.margin + offset.x;
  const addressY = y + offset.y;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  setColor(doc, BRAND.muted);
  doc.text(fitSingleLine(doc, companySenderLine(companyName, seller), 108), addressX, addressY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setColor(doc, BRAND.ink);
  doc.text(customer.name, addressX, addressY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setColor(doc, BRAND.ink);
  let ay = addressY + 13;
  if (customer.contactPerson) { doc.text(customer.contactPerson, addressX, ay); ay += 5; }
  if (customer.street) { doc.text(customer.street, addressX, ay); ay += 5; }
  doc.text(`${customer.zip ?? ""} ${customer.city}`.trim(), addressX, ay); ay += 6;

  doc.setFontSize(8);
  setColor(doc, BRAND.muted);
  if (customer.email) { doc.text(customer.email, addressX, ay); ay += 4; }
  if (customer.phone) doc.text(customer.phone, addressX, ay);
};

const drawMetaBlock = (doc: jsPDF, rows: Array<[string, string]>, y: number) => {
  const offset = blockOffset("meta");
  const w = 56;
  const x = PAGE.w - PAGE.margin - w + offset.x;
  const metaY = y + offset.y;
  const dividerX = x + 26;
  const rowH = 5.6;
  setColor(doc, BRAND.border, "draw");
  doc.setLineWidth(0.35);
  doc.line(dividerX, metaY - 2.5, dividerX, metaY + Math.max(rows.length, 8) * rowH - 1);
  rows.forEach(([label, value], i) => {
    const ry = metaY + i * rowH;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.3);
    setColor(doc, BRAND.muted);
    doc.text(fitSingleLine(doc, label, 23), x, ry);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.3);
    setColor(doc, BRAND.ink);
    doc.text(fitSingleLine(doc, value, 27), x + w, ry, { align: "right" });
  });
};

const drawVehicleCard = (doc: jsPDF, vehicle: Vehicle, y: number) => {
  const x = PAGE.margin;
  const startY = y;
  const w = PAGE.w - 2 * PAGE.margin;
  const h = 28;
  const colW = w / 4;
  const row = (label: string, value: string, col: number, rowY: number) => {
    const colX = x + col * colW;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    setColor(doc, BRAND.muted);
    doc.text(label, colX, rowY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    setColor(doc, BRAND.ink);
    doc.text(fitSingleLine(doc, value, colW - 4), colX, rowY + 4);
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  setColor(doc, BRAND.muted);
  doc.text("Fahrzeugdaten", x, startY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.8);
  setColor(doc, BRAND.ink);
  const title = [vehicle.make, vehicle.model, vehicle.modelDetail].filter(Boolean).join(" ");
  doc.text(fitSingleLine(doc, title, w), x, startY + 6);

  row("VIN", vehicle.vin, 0, startY + 13);
  row("Erstzulassung", vehicle.firstRegistration ? formatDate(vehicle.firstRegistration) : "—", 1, startY + 13);
  row("Kilometerstand", `${vehicle.mileage.toLocaleString("de-DE")} km`, 2, startY + 13);
  row("Baujahr", String(vehicle.year), 3, startY + 13);
  row("Farbe", vehicle.color || "—", 0, startY + 22);
  row("Kraftstoff", vehicle.fuel || "—", 1, startY + 22);
  row("Getriebe", vehicle.transmission || "—", 2, startY + 22);
  row("Leistung", `${vehicle.power_kw} kW / ${vehicle.power_hp} PS`, 3, startY + 22);

  return startY + h + 7;
};

const drawVehicleFieldGrid = (doc: jsPDF, fields: Array<[string, string]>, y: number) => {
  const visibleFields = fields.filter(([, value]) => value && value !== "-");
  if (!visibleFields.length) return y;

  const x = PAGE.margin;
  const w = PAGE.w - 2 * PAGE.margin;
  const colW = w / 4;
  const rowGap = 9;

  visibleFields.forEach(([label, value], index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const colX = x + col * colW;
    const rowY = y + row * rowGap;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    setColor(doc, BRAND.muted);
    doc.text(label, colX, rowY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    setColor(doc, BRAND.ink);
    doc.text(fitSingleLine(doc, value, colW - 4), colX, rowY + 4);
  });

  return y + Math.ceil(visibleFields.length / 4) * rowGap + 3;
};

interface LineItem {
  description: string;
  qty: string;
  unit?: string;
  unitPrice: number;
  total: number;
  excludeFromTotal?: boolean;
}

const drawTable = (doc: jsPDF, items: LineItem[], y: number, totalLabel = "Gesamtsumme", options?: { showVat?: boolean; vatBase?: number }) => {
  const x = PAGE.margin;
  const w = PAGE.w - 2 * PAGE.margin;
  const rawWidths = ACTIVE_LAYOUT.table.columnWidthsMm;
  const rawWidthSum = Object.values(rawWidths).reduce((sum, width) => sum + width, 0) || 174;
  const widthScale = w / rawWidthSum;
  const widths = {
    pos: rawWidths.pos * widthScale,
    description: rawWidths.description * widthScale,
    qty: rawWidths.qty * widthScale,
    unit: rawWidths.unit * widthScale,
    unitPrice: rawWidths.unitPrice * widthScale,
    total: rawWidths.total * widthScale,
  };
  const headerH = ACTIVE_LAYOUT.table.rowHeightsMm.header;
  const itemMinH = ACTIVE_LAYOUT.table.rowHeightsMm.item;
  const summaryRowH = ACTIVE_LAYOUT.table.rowHeightsMm.total;
  const cols = {
    pos: x,
    description: x + widths.pos,
    qty: x + widths.pos + widths.description,
    unit: x + widths.pos + widths.description + widths.qty,
    unitPrice: x + widths.pos + widths.description + widths.qty + widths.unit,
    total: x + widths.pos + widths.description + widths.qty + widths.unit + widths.unitPrice,
  };
  const right = (start: number, width: number) => start + width - 2;
  const left = (start: number) => start + 2;

  const drawTableHeader = (hy: number) => {
    setColor(doc, [232, 232, 232], "fill");
    doc.rect(x, hy, w, headerH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setColor(doc, BRAND.ink);
    const textY = hy + Math.max(4.4, headerH - 2.2);
    doc.text("Pos.", left(cols.pos), textY);
    doc.text("Bezeichnung", left(cols.description), textY);
    doc.text("Menge", right(cols.qty, widths.qty), textY, { align: "right" });
    doc.text("Einh.", left(cols.unit), textY);
    doc.text("E-Preis", right(cols.unitPrice, widths.unitPrice), textY, { align: "right" });
    doc.text("G-Preis", right(cols.total, widths.total), textY, { align: "right" });
    setColor(doc, BRAND.border, "draw");
    doc.setLineWidth(0.2);
    doc.line(x, hy + headerH, x + w, hy + headerH);
    return hy + headerH;
  };

  let cy = drawTableHeader(y);
  items.forEach((it, index) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    const description = doc.splitTextToSize(it.description, widths.description - 4);
    const rowH = Math.max(itemMinH, description.length * 3.8 + 3);
    if (cy + rowH > PAGE.contentBottom) {
      doc.addPage();
      if (activeStandardChrome) {
        drawFollowingPageHeader(doc, activeStandardChrome.title, activeStandardChrome.docNumber, activeStandardChrome.companyName, activeStandardChrome.seller, activeStandardChrome.companyLogoUrl);
      }
      cy = drawTableHeader(ACTIVE_LAYOUT.followingPage.contentStartMm);
    }

    setColor(doc, BRAND.ink);
    doc.text(fitSingleLine(doc, String(index + 1), widths.pos - 4), left(cols.pos), cy + 5);
    doc.text(description, left(cols.description), cy + 5);
    doc.setFontSize(7.4);
    doc.text(fitSingleLine(doc, it.qty, widths.qty - 4), right(cols.qty, widths.qty), cy + 5, { align: "right" });
    doc.text(fitSingleLine(doc, it.unit ?? "Stk.", widths.unit - 4), left(cols.unit), cy + 5);
    doc.text(fitSingleLine(doc, formatCurrency(it.unitPrice), widths.unitPrice - 4), right(cols.unitPrice, widths.unitPrice), cy + 5, { align: "right" });
    doc.text(fitSingleLine(doc, formatCurrency(it.total), widths.total - 4), right(cols.total, widths.total), cy + 5, { align: "right" });
    cy += rowH;
    setColor(doc, BRAND.border, "draw");
    doc.setLineWidth(0.2);
    doc.line(x, cy, x + w, cy);
  });

  cy += 3;
  const total = items.reduce((s, i) => s + (i.excludeFromTotal ? 0 : i.total), 0);
  const taxableGross = options?.vatBase ?? total;
  const net = options?.showVat ? taxableGross / 1.19 : taxableGross;
  const vat = taxableGross - net;
  const summaryRows: Array<{ label: string; value: number; total?: boolean }> = options?.showVat
    ? [
        { label: "Nettosumme", value: net },
        { label: "zzgl. 19 % USt.", value: vat },
        { label: totalLabel, value: total, total: true },
      ]
    : [{ label: totalLabel, value: total, total: true }];
  const summaryW = 72;
  const summaryX = x + w - summaryW;
  const summaryH = summaryRows.length * summaryRowH + 5;
  if (cy + summaryH > PAGE.contentBottom) {
    doc.addPage();
    if (activeStandardChrome) {
      drawFollowingPageHeader(doc, activeStandardChrome.title, activeStandardChrome.docNumber, activeStandardChrome.companyName, activeStandardChrome.seller, activeStandardChrome.companyLogoUrl);
    }
    cy = ACTIVE_LAYOUT.followingPage.contentStartMm;
  }
  summaryRows.forEach((row, index) => {
    const rowY = cy + Math.max(5, summaryRowH) + index * summaryRowH;
    doc.setFont("helvetica", row.total ? "bold" : "normal");
    doc.setFontSize(row.total ? 10.5 : 8.2);
    setColor(doc, BRAND.ink);
    doc.text(row.label, summaryX, rowY);
    doc.text(formatCurrency(row.value), x + w - 1, rowY, { align: "right" });
  });
  setColor(doc, BRAND.ink, "draw");
  doc.setLineWidth(0.5);
  doc.line(summaryX, cy + summaryH, x + w, cy + summaryH);

  return cy + summaryH + 7;
};

const drawSectionTitle = (doc: jsPDF, title: string, y: number) => {
  y = ensureStandardSpace(doc, y, 9);
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
  const lineH = Math.max(3.6, fs * 0.42);
  let cursor = y;
  lines.forEach((line: string) => {
    cursor = ensureStandardSpace(doc, cursor, lineH + 1);
    doc.text(line, PAGE.margin, cursor);
    cursor += lineH;
  });
  return cursor;
};

const drawDeliveryCallout = (doc: jsPDF, deliveryDate: string | undefined, y: number) => {
  y = ensureStandardSpace(doc, y, 16);
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
    y = ensureStandardSpace(doc, y, 7);
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
  website?: string;
  bankName?: string;
  iban?: string;
  bic?: string;
  registration?: string;
}

export interface GeneratePdfArgs {
  process: Process;
  vehicle: Vehicle;
  customer: Customer;
  offer?: Offer;
  stepKey: ProcessStepKey;
  companyName?: string;
  companyLogoUrl?: string;
  /** Unternehmensdaten des Nutzers – werden als Verkäuferdaten im Kaufvertrag verwendet. */
  seller?: SellerInfo;
  pdfTheme?: PdfThemeKey;
  pdfLayout?: PdfLayoutConfig;
}

const downPaymentPositionDescription = (downPayment?: Process["fields"]["downPayment"]) => {
  const details = [
    downPayment?.invoiceNumber ? `Beleg-Nr. ${downPayment.invoiceNumber}` : undefined,
    downPayment?.receivedDate ? `Zahlungsdatum ${formatDate(downPayment.receivedDate)}` : downPayment?.invoiceDate ? `Belegdatum ${formatDate(downPayment.invoiceDate)}` : undefined,
    downPayment?.method ? `Zahlungsart ${downPayment.method}` : undefined,
    downPayment?.received ? "Status: eingegangen" : undefined,
  ].filter(Boolean).join(" · ");
  return `abzgl. geleistete Anzahlung${downPayment?.receivedDate ? ` vom ${formatDate(downPayment.receivedDate)}` : ""}${details ? ` (${details})` : ""}`;
};

const standardLayoutStartY = () => PAGE.tableY + blockOffset("content").y + ACTIVE_DOCUMENT_CONTENT.contentOffsetMm;

const drawStandardChrome = (
  doc: jsPDF,
  args: { title: string; docNumber: string; companyName: string; seller?: SellerInfo; companyLogoUrl?: string; customer: Customer; vehicle: Vehicle; meta: Array<[string, string]>; addressLabel?: string }
) => {
  activeStandardChrome = { title: args.title, docNumber: args.docNumber, companyName: args.companyName, seller: args.seller, companyLogoUrl: args.companyLogoUrl };
  drawHeader(doc, args.title, args.docNumber, args.companyName, args.seller, args.companyLogoUrl);
  drawAddressBlock(doc, args.customer, PAGE.addressY, args.companyName, args.seller, args.addressLabel);
  if (ACTIVE_LAYOUT.showMetaBlock) drawMetaBlock(doc, args.meta, PAGE.addressY + 1);
  drawDocumentHeading(doc, args.title, args.docNumber, PAGE.titleY);
  const cursor = ACTIVE_DOCUMENT_CONTENT.showVehicleCard
    ? drawVehicleCard(doc, args.vehicle, PAGE.titleY + 14)
    : PAGE.titleY + 18;
  return cursor;
};

export const generateBelegPdf = ({ process, vehicle, customer, offer, stepKey, companyName = "VINflow Autohaus GmbH", companyLogoUrl, seller, pdfTheme, pdfLayout }: GeneratePdfArgs): jsPDF => {
  applyPdfTheme(pdfTheme);
  applyPdfLayout(pdfLayout);
  applyDocumentContent(stepKey);
  const doc = createPdfDocument();
  const step = PROCESS_STEPS.find((s) => s.key === stepKey)!;
  const finalPrice = process.fields.finalPrice ?? vehicle.listPrice;
  const tradeIn = stepKey === "offer" ? offer?.tradeIn ?? process.fields.tradeIn : process.fields.tradeIn;
  const tradeInValue = tradeIn?.value ?? 0;
  const receivedDownPayment = process.fields.downPayment?.received ? process.fields.downPayment.amount ?? 0 : 0;

  // Kaufvertrag: spezielles, längeres Layout
  if (stepKey === "purchase_contract") {
    return buildKaufvertrag(doc, { process, vehicle, customer, companyName, companyLogoUrl, seller, finalPrice });
  }

  const resolvedNumber = stepKey === "invoicing"
    ? process.fields.invoicing?.invoiceNumber ?? process.id
    : stepKey === "down_payment"
      ? process.fields.downPayment?.invoiceNumber ?? process.id
      : stepKey === "order_confirmation"
        ? process.fields.orderConfirmation?.confirmationNumber ?? process.id
      : stepKey === "offer"
        ? offer?.id ?? process.id
        : process.id;
  const numberLabel = stepKey === "invoicing" || stepKey === "down_payment"
    ? "Rechnungs-Nr."
    : stepKey === "order_confirmation"
      ? "AB-Nr."
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
    companyLogoUrl,
    seller,
    customer,
    vehicle,
    meta: [
      [numberLabel, resolvedNumber],
      ["Kundennummer", customer.id ?? "—"],
      ["Belegdatum", formatDate(documentDate ?? new Date().toISOString())],
      ["Vorgangs-Nr.", process.id],
      ["Bearbeiter", seller?.representative ?? "—"],
      ["Seite", "1"],
    ],
  });
  cursor = Math.max(cursor, standardLayoutStartY());

  const drawCustomerAgreements = (c: number) => {
    if (!ACTIVE_DOCUMENT_CONTENT.showTodos || !CUSTOMER_AGREEMENT_STEP_KEYS.includes(stepKey) || !process.customerTodosOC.length) return c;
    return drawTodos(doc, process.customerTodosOC, c + ACTIVE_DOCUMENT_CONTENT.sectionGapMm, "Kundenvereinbarungen");
  };

  switch (stepKey) {
    case "offer": {
      if (ACTIVE_DOCUMENT_CONTENT.showIntroText) {
      cursor = drawTextBlock(doc,
        `Sehr geehrte/r ${customer.name}, vielen Dank für Ihr Interesse. Wir freuen uns, Ihnen für das oben genannte Fahrzeug folgendes verbindliches Angebot unterbreiten zu dürfen.`,
        cursor);
      cursor += 6;
      }
      const offerPrice = offer?.price ?? vehicle.listPrice;
      const offerDiscount = offer?.discount ?? 0;
      const offerTaxBase = Math.max(0, offerPrice - offerDiscount);
      if (ACTIVE_DOCUMENT_CONTENT.showMainTable) {
      cursor = drawTable(doc, [
        { description: `${vehicle.make} ${vehicle.model} (${vehicle.year})`, qty: "1", unitPrice: offerPrice, total: offerPrice },
        ...(offerDiscount > 0 ? [{ description: "Rabatt", qty: "1", unitPrice: -offerDiscount, total: -offerDiscount }] : []),
        ...(tradeInValue > 0 ? [{ description: `Inzahlungnahme · ${tradeIn?.vehicleDescription ?? "Kundenfahrzeug"}`, qty: "1", unitPrice: -tradeInValue, total: -tradeInValue }] : []),
      ], cursor, "Zahlbetrag", { showVat: !isMarginTaxed(vehicle), vatBase: offerTaxBase });
      }
      if (ACTIVE_DOCUMENT_CONTENT.showPaymentInfo) {
      cursor = drawSectionTitle(doc, "Konditionen", cursor);
      cursor = drawTextBlock(doc,
        `Gültigkeit: bis ${offer ? formatDate(offer.validUntil) : "—"}\nLieferung: nach Vereinbarung\nGewährleistung: 12 Monate gemäß BGB\n${taxationLine(vehicle)}`,
        cursor);
      }
      const agreements = process.customerTodosOC.length ? process.customerTodosOC : offer?.customerTodos ?? [];
      if (ACTIVE_DOCUMENT_CONTENT.showTodos && agreements.length) {
        cursor += 6;
        cursor = drawTodos(doc, agreements, cursor, "Kundenvereinbarungen");
      }
      break;
    }
    case "down_payment": {
      const dp = process.fields.downPayment;
      const ocDp = process.fields.orderConfirmation;
      const down = dp?.amount ?? Math.round(finalPrice * 0.15);
      if (ACTIVE_DOCUMENT_CONTENT.showIntroText) {
      cursor = drawTextBlock(doc,
        `Hiermit stellen wir Ihnen die vereinbarte Anzahlung für das oben genannte Fahrzeug in Rechnung. Bitte überweisen Sie den Betrag bis zum vereinbarten Termin auf das angegebene Konto.`,
        cursor);
      cursor += 4;
      }
      if (ACTIVE_DOCUMENT_CONTENT.showDeliveryDetails) cursor = drawDeliveryCallout(doc, ocDp?.deliveryDate, cursor);
      if (ACTIVE_DOCUMENT_CONTENT.showMainTable) {
      cursor = drawTable(doc, [
        { description: "Anzahlung Fahrzeugkauf", qty: "1", unitPrice: down, total: down },
      ], cursor, "Zu zahlender Betrag", { showVat: !isMarginTaxed(vehicle) });
      }
      if (ACTIVE_DOCUMENT_CONTENT.showPaymentInfo && tradeInValue > 0) {
        cursor = drawSectionTitle(doc, "Vereinbarte Inzahlungnahme", cursor);
        cursor = drawTextBlock(doc,
          `Fahrzeug: ${tradeIn?.vehicleDescription ?? "Kundenfahrzeug"}\nAnrechnungswert: ${formatCurrency(tradeInValue)}${tradeIn?.details ? `\nDetails: ${tradeIn.details}` : ""}`,
          cursor, { fontSize: 8.5 });
      }
      if (ACTIVE_DOCUMENT_CONTENT.showPaymentInfo) {
      cursor = drawSectionTitle(doc, "Zahlungsdaten Anzahlung", cursor);
      cursor = drawTextBlock(doc,
        `Empfänger: ${companyName}\nBank: ${sellerBank(seller).bank}\nIBAN: ${sellerBank(seller).iban}\nBIC: ${sellerBank(seller).bic}\nVerwendungszweck: ${dp?.invoiceNumber ?? process.id}\nRechnungsdatum: ${dp?.invoiceDate ? formatDate(dp.invoiceDate) : "—"}\nZahlungsbedingung: ${dp?.paymentTerms ?? (dp?.dueDate ? `Fällig am ${formatDate(dp.dueDate)}` : "Sofort fällig nach Erhalt der Rechnung")}\nZahlungsart: ${dp?.method ?? "nicht angegeben"}${dp?.received ? `\nZahlung eingegangen am: ${dp.receivedDate ? formatDate(dp.receivedDate) : "—"}` : ""}\n${taxationLine(vehicle)}`,
        cursor);
      if (ocDp?.paymentTerms || ocDp?.paymentMethod) {
        cursor = drawSectionTitle(doc, "Vereinbarte Restzahlung", cursor);
        cursor = drawTextBlock(doc,
          `Zahlungsbedingung: ${ocDp?.paymentTerms ?? "nicht angegeben"}\nZahlungsart: ${ocDp?.paymentMethod ?? "nicht angegeben"}`,
          cursor);
      }
      }
      break;
    }
    case "order_confirmation": {
      const oc = process.fields.orderConfirmation;
      if (ACTIVE_DOCUMENT_CONTENT.showIntroText) {
      cursor = drawTextBlock(doc,
        `Wir bestätigen Ihnen hiermit den verbindlichen Kaufauftrag für das oben aufgeführte Fahrzeug zu folgenden Konditionen:`,
        cursor);
      cursor += 4;
      }
      if (ACTIVE_DOCUMENT_CONTENT.showDeliveryDetails) cursor = drawDeliveryCallout(doc, oc?.deliveryDate, cursor);
      if (ACTIVE_DOCUMENT_CONTENT.showMainTable) {
      cursor = drawTable(doc, [
        { description: `${vehicle.make} ${vehicle.model}`, qty: "1", unitPrice: finalPrice, total: finalPrice },
        ...(tradeInValue > 0 ? [{ description: `Inzahlungnahme · ${tradeIn?.vehicleDescription ?? "Kundenfahrzeug"}`, qty: "1", unitPrice: -tradeInValue, total: -tradeInValue }] : []),
        ...(receivedDownPayment > 0 ? [{ description: downPaymentPositionDescription(process.fields.downPayment), qty: "1", unitPrice: -receivedDownPayment, total: -receivedDownPayment }] : []),
      ], cursor, "Verbleibender Restbetrag", { showVat: !isMarginTaxed(vehicle), vatBase: finalPrice });
      }
      if (ACTIVE_DOCUMENT_CONTENT.showPaymentInfo) {
      cursor = drawSectionTitle(doc, "Eckdaten", cursor);
      cursor = drawTextBlock(doc,
        `Auftragsdatum: ${oc?.orderDate ? formatDate(oc.orderDate) : "—"}\n${taxationLine(vehicle)}`,
        cursor);
      cursor = drawSectionTitle(doc, "Zahlungsabwicklung", cursor);
      cursor = drawTextBlock(doc,
        `${process.fields.downPayment ? `Anzahlung${process.fields.downPayment.invoiceNumber ? ` (${process.fields.downPayment.invoiceNumber})` : ""}\nBetrag: ${formatCurrency(process.fields.downPayment.amount ?? 0)}\nZahlungsbedingung: ${process.fields.downPayment.paymentTerms ?? "nicht angegeben"}\nZahlungsart: ${process.fields.downPayment.method ?? "nicht angegeben"}\nGezahlt am: ${process.fields.downPayment.receivedDate ? formatDate(process.fields.downPayment.receivedDate) : "nicht dokumentiert"}\n\n` : ""}Restzahlung\nZahlungsbedingung: ${oc?.paymentTerms ?? "nicht angegeben"}\nZahlungsart: ${oc?.paymentMethod ?? "nicht angegeben"}`,
        cursor);
      }
      cursor = drawCustomerAgreements(cursor);
      break;
    }
    case "outbound_check": {
      const checklist = process.outboundChecklist;
      const doneCount = checklist.filter((i) => i.done).length;
      const allDone = doneCount === checklist.length && checklist.length > 0;
      if (ACTIVE_DOCUMENT_CONTENT.showIntroText) {
      cursor = drawTextBlock(doc,
        allDone
          ? `Vor Übergabe des Fahrzeugs wurde folgende Ausgangskontrolle vollständig durchgeführt und dokumentiert:`
          : `Stand der Ausgangskontrolle (${doneCount} von ${checklist.length} Punkten erledigt):`,
        cursor);
      cursor += 4;
      }
      if (ACTIVE_DOCUMENT_CONTENT.showChecklist) {
      checklist.forEach((item) => {
        cursor = ensureStandardSpace(doc, cursor, 8);
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
      }
      cursor = drawCustomerAgreements(cursor);
      break;
    }
    case "invoicing": {
      const inv = process.fields.invoicing;
      const ocInv = process.fields.orderConfirmation;
      const down = receivedDownPayment;
      const remaining = Math.max(0, finalPrice - tradeInValue - down);
      if (ACTIVE_DOCUMENT_CONTENT.showIntroText) {
      cursor = drawTextBlock(doc,
        `Für das oben aufgeführte Fahrzeug stellen wir Ihnen hiermit den Kaufpreis in Rechnung. Eine bereits geleistete Anzahlung wird verrechnet.`,
        cursor);
      cursor += 4;
      }
      if (ACTIVE_DOCUMENT_CONTENT.showDeliveryDetails) cursor = drawDeliveryCallout(doc, ocInv?.deliveryDate, cursor);
      if (ACTIVE_DOCUMENT_CONTENT.showMainTable) {
      cursor = drawTable(doc, [
        { description: `${vehicle.make} ${vehicle.model} (${vehicle.year})`, qty: "1", unitPrice: finalPrice, total: finalPrice },
        ...(tradeInValue > 0 ? [{ description: `Inzahlungnahme · ${tradeIn?.vehicleDescription ?? "Kundenfahrzeug"}`, qty: "1", unitPrice: -tradeInValue, total: -tradeInValue }] : []),
        ...(down > 0 ? [{ description: downPaymentPositionDescription(process.fields.downPayment), qty: "1", unitPrice: -down, total: -down }] : []),
      ], cursor, inv?.paid ? "Bezahlt" : "Restbetrag", { showVat: !isMarginTaxed(vehicle), vatBase: finalPrice });
      }
      if (ACTIVE_DOCUMENT_CONTENT.showPaymentInfo) {
      cursor = drawSectionTitle(doc, "Zahlungsdaten", cursor);
      cursor = drawTextBlock(doc,
        `Rechnungs-Nr.: ${inv?.invoiceNumber ?? "—"}\nRechnungsdatum: ${inv?.invoiceDate ? formatDate(inv.invoiceDate) : formatDate(new Date().toISOString())}\nZahlungsbedingung: ${inv?.paymentTerms ?? (inv?.dueDate ? `Fällig am ${formatDate(inv.dueDate)}` : "Sofort fällig nach Erhalt der Rechnung")}\nZahlungsart: ${inv?.method ?? "nicht angegeben"}\nBank: ${sellerBank(seller).bank}\nIBAN: ${sellerBank(seller).iban} · BIC: ${sellerBank(seller).bic}\nVerwendungszweck: ${process.id}${inv?.paid ? `\nZahlungsstatus: Bezahlt${inv.paidDate ? ` am ${formatDate(inv.paidDate)}` : ""} – Vielen Dank!` : `\nDer Restbetrag von ${formatCurrency(remaining)} ist bei Fahrzeugübergabe fällig.`}\n${taxationLine(vehicle)}`,
        cursor);
      }
      break;
    }
    case "delivery_confirmation": {
      const del = process.fields.delivery;
      if (ACTIVE_DOCUMENT_CONTENT.showIntroText) {
      cursor = drawTextBlock(doc, `Hiermit bestätigt der Kunde die ordnungsgemäße Übergabe des Fahrzeugs in technisch und optisch einwandfreiem Zustand.`, cursor);
      cursor += 6;
      }
      if (ACTIVE_DOCUMENT_CONTENT.showDeliveryDetails) {
      cursor = drawSectionTitle(doc, "Übergabedaten", cursor);
      cursor = drawTextBlock(doc,
        `Übergabedatum: ${del?.handoverDate ? formatDate(del.handoverDate) : formatDate(new Date().toISOString())}\nÜbergabeort: ${del?.handoverLocation ?? "Filiale"}\nKilometerstand bei Übergabe: ${del?.finalMileage?.toLocaleString("de-DE") ?? vehicle.mileage.toLocaleString("de-DE")} km\nTankfüllung: ${del?.fuelLevel ?? "voll"}\nMitgegeben: 2 Schlüssel, Zulassungsbescheinigung Teil I & II, Service-Heft`,
        cursor);
      }
      if (ACTIVE_DOCUMENT_CONTENT.showSignatures) {
      cursor = drawSignatureRow(doc, cursor + 20, "Unterschrift Kunde", `Unterschrift ${companyName}`);
      }
      break;
    }
  }

  drawFooterOnAllPages(doc, companyName, seller);
  activeStandardChrome = null;
  return doc;
};

const drawSignatureRow = (doc: jsPDF, y: number, leftLabel: string, rightLabel: string) => {
  y = ensureStandardSpace(doc, y, 14);
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

const drawKvSpecsTable = (doc: jsPDF, vehicle: Vehicle, y: number, kv?: Process["fields"]["purchaseContract"]) => {
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
  cursor = drawVehicleCard(doc, vehicle, cursor + 3);
  cursor = drawVehicleFieldGrid(doc, [
    ["Fahrzeugart", VEHICLE_TYPE_LABELS[vehicle.type]],
    ["HSN / TSN", [vehicle.hsn, vehicle.tsn].filter(Boolean).join(" / ") || "-"],
    ["Amtl. Kennzeichen", vehicle.licensePlate ?? "-"],
    ["Vorbesitzer", vehicle.previousOwners != null ? String(vehicle.previousOwners) : "-"],
    ["Schlüssel", kv?.keysCount != null ? String(kv.keysCount) : "-"],
    ["Hubraum", vehicle.displacement_ccm ? `${vehicle.displacement_ccm} ccm` : "-"],
    ["Innenraum", [vehicle.interiorColor, vehicle.interiorMaterial].filter(Boolean).join(", ") || "-"],
    ["HU/AU gültig bis", vehicle.hu ? formatDate(vehicle.hu) : "-"],
    ["Serviceheft", (vehicle.serviceBookComplete || kv?.docServiceBook) ? "vollständig / vorhanden" : "-"],
  ], cursor);
  if (vehicle.features?.length) {
    cursor = drawTextBlock(doc, `Sonderausstattung / Zubehör: ${vehicle.features.join(" · ")}`, cursor + 2, { fontSize: 8.5 });
  }
  return cursor + 4;
};

const PriceSection = (
  doc: jsPDF,
  y: number,
  args: {
    vehicle: Vehicle;
    finalPrice: number;
    tradeIn?: Process["fields"]["tradeIn"];
    downPayment?: Process["fields"]["downPayment"];
    invoice?: Process["fields"]["invoicing"];
  }
) => {
  let cursor = drawSectionTitle(doc, "2. Kaufpreis und Zahlung", y);
  const net = isMarginTaxed(args.vehicle) ? undefined : args.finalPrice / 1.19;
  const vat = net == null ? undefined : args.finalPrice - net;
  const tradeInValue = args.tradeIn?.value ?? 0;
  const downPaymentAmount = args.downPayment?.amount ?? 0;
  const depositReceived = !!args.downPayment?.received && (args.downPayment.amount ?? 0) > 0;
  const downPaymentValue = depositReceived ? downPaymentAmount : 0;
  const priceItems: LineItem[] = net == null
    ? [{ description: "Kaufpreis (Differenzbesteuerung)", qty: "1", unitPrice: args.finalPrice, total: args.finalPrice }]
    : [
        { description: "Kaufpreis netto", qty: "1", unitPrice: net, total: net },
        { description: "Umsatzsteuer 19 %", qty: "1", unitPrice: vat ?? 0, total: vat ?? 0 },
      ];
  if (tradeInValue > 0) {
    priceItems.push({ description: `Inzahlungnahme · ${args.tradeIn?.vehicleDescription ?? "Kundenfahrzeug"}`, qty: "1", unitPrice: -tradeInValue, total: -tradeInValue });
  }
  if (downPaymentValue > 0) {
    priceItems.push({ description: downPaymentPositionDescription(args.downPayment), qty: "1", unitPrice: -downPaymentValue, total: -downPaymentValue });
  }
  const finalInvoicePaid = !!args.invoice?.paid;
  const cashPurchasePrice = Math.max(0, args.finalPrice - tradeInValue);
  const restPaymentAmount = Math.max(0, cashPurchasePrice - downPaymentAmount);
  const paidAmount = downPaymentValue + (finalInvoicePaid ? restPaymentAmount : 0);
  const remaining = Math.max(0, cashPurchasePrice - paidAmount);
  const paymentStatus = remaining === 0 ? "bezahlt" : paidAmount > 0 ? "teilbezahlt" : "offen";
  const restPaymentDetails = [
    args.invoice?.invoiceNumber ? `Beleg-Nr. ${args.invoice.invoiceNumber}` : undefined,
    finalInvoicePaid && args.invoice?.paidDate ? `Zahlungsdatum ${formatDate(args.invoice.paidDate)}` : undefined,
    args.invoice?.method ? `Zahlungsart ${args.invoice.method}` : undefined,
    finalInvoicePaid ? "Status: eingegangen" : "Status: offen",
  ].filter(Boolean).join(" · ");
  priceItems.push({
    description: `${finalInvoicePaid ? "abzgl. geleistete Restzahlung" : "Restzahlung"}${restPaymentDetails ? ` (${restPaymentDetails})` : ""}`,
    qty: "1",
    unitPrice: finalInvoicePaid ? -restPaymentAmount : restPaymentAmount,
    total: finalInvoicePaid ? -restPaymentAmount : restPaymentAmount,
    excludeFromTotal: !finalInvoicePaid,
  });
  cursor = drawTable(doc, priceItems, cursor, "Zu zahlender Restbetrag", { showVat: false });
  cursor = drawTextBlock(doc,
    `Zahlungsstand laut Rechnungsdaten: ${paymentStatus}. ` +
    `Gezahlter Betrag: ${formatCurrency(paidAmount)}. Offener Betrag: ${formatCurrency(remaining)}.\n` +
    taxationLine(args.vehicle),
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
  const handoverDate = kv?.handoverDateOverride || process.fields.orderConfirmation?.deliveryDate;
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
  { process, vehicle, customer, companyName, companyLogoUrl, seller, finalPrice }: { process: Process; vehicle: Vehicle; customer: Customer; companyName: string; companyLogoUrl?: string; seller?: SellerInfo; finalPrice: number }
): jsPDF => {
  const kv = process.fields.purchaseContract;
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

  drawHeader(doc, "Kaufvertrag", `Vertrags-Nr. ${contractNumber}`, companyName, resolvedSeller, companyLogoUrl);
  const contractHeadingY = Math.max(38, headerBottomY() + 12);
  let cursor = drawContractHeading(doc, {
    title: "Verbindliche Bestellung / Kaufvertrag eines Fahrzeugs",
    contractNumber,
    contractDate,
    place,
    y: contractHeadingY,
  });

  cursor = CustomerSection(doc, cursor, { companyName, seller: resolvedSeller, customer, customerType });

  // Preamble
  if (ACTIVE_DOCUMENT_CONTENT.showIntroText) {
  cursor = drawTextBlock(doc,
    `Zwischen den vorstehenden Parteien wird hiermit folgender Kaufvertrag über ein gebrauchtes Kraftfahrzeug geschlossen.`,
    cursor, { muted: true });
  cursor += 4;
  }

  const addContractPage = () => {
    drawFooter(doc, companyName, resolvedSeller);
    doc.addPage();
    drawHeader(doc, "Kaufvertrag", `Vertrags-Nr. ${contractNumber}`, companyName, resolvedSeller, companyLogoUrl);
    cursor = drawContractHeading(doc, {
      title: "Kaufvertrag – Fortsetzung",
      contractNumber,
      contractDate,
      place,
      y: Math.max(38, headerBottomY() + 12),
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
  if (ACTIVE_DOCUMENT_CONTENT.showVehicleCard) {
  ensureSpace(Math.min(135 + featureHeight, 180));
  cursor = VehicleSection(doc, vehicle, cursor, kv);
  }
  if (ACTIVE_DOCUMENT_CONTENT.showMainTable || ACTIVE_DOCUMENT_CONTENT.showPaymentInfo) {
  ensureSpace(125);
  cursor = PriceSection(doc, cursor, {
    vehicle,
    finalPrice,
    tradeIn: process.fields.tradeIn,
    downPayment: process.fields.downPayment,
    invoice: process.fields.invoicing,
  });
  }

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
  if (ACTIVE_DOCUMENT_CONTENT.showDeliveryDetails) {
  ensureSpace(45);
  cursor = DeliverySection(doc, cursor, process, kv);
  }

  if (ACTIVE_DOCUMENT_CONTENT.showTodos && process.customerTodosOC.length) {
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
    kv?.financing
  );
  if (ACTIVE_DOCUMENT_CONTENT.showContractClauses && hasAdditional) {
    const additionalText = [kv?.additionalAgreement, kv?.financingDetails].filter(Boolean).join("\n");
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
  if (ACTIVE_DOCUMENT_CONTENT.showContractClauses) {
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
  }

  if (ACTIVE_DOCUMENT_CONTENT.showSignatures) {
  ensureSpace(customerType === "b2c" && !!kv?.consumerWarrantyLimitationAccepted ? 62 : 42);

  SignatureSection(doc, cursor, {
    place,
    contractDate,
    customerName: customer.name,
    companyName,
    representative: sRep,
    separateB2CAgreement: customerType === "b2c" && !!kv?.consumerWarrantyLimitationAccepted,
  });
  }

  drawFooter(doc, companyName, resolvedSeller);
  return doc;
};

export const downloadBelegPdf = async (args: GeneratePdfArgs) => {
  await waitForPaint();
  const preparedArgs = await preparePdfArgs(args);
  const doc = generateBelegPdf(preparedArgs);
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
  companyLogoUrl?: string;
  seller?: SellerInfo;
  pdfTheme?: PdfThemeKey;
  pdfLayout?: PdfLayoutConfig;
}

export const generateOfferPdf = ({ offer, vehicle, customer, companyName = "VINflow Autohaus GmbH", companyLogoUrl, seller, pdfTheme, pdfLayout }: GenerateOfferPdfArgs): jsPDF => {
  applyPdfTheme(pdfTheme);
  applyPdfLayout(pdfLayout);
  applyDocumentContent("offer");
  const doc = createPdfDocument();
  activeStandardChrome = { title: "Angebot", docNumber: `Angebots-Nr. ${offer.id}`, companyName, seller, companyLogoUrl };
  drawHeader(doc, "Angebot", `Angebots-Nr. ${offer.id}`, companyName, seller, companyLogoUrl);
  drawAddressBlock(doc, customer, PAGE.addressY, companyName, seller, "ANGEBOTSEMPFÄNGER");
  if (ACTIVE_LAYOUT.showMetaBlock) drawMetaBlock(doc, [
    ["Angebots-Nr.", offer.id],
    ["Kundennummer", customer.id],
    ["Erstellt am", formatDate(offer.createdAt)],
    ["Gültig bis", formatDate(offer.validUntil)],
    ["Bearbeiter", seller?.representative ?? "—"],
    ["Seite", "1"],
  ], PAGE.addressY + 1);
  drawDocumentHeading(doc, "Angebot", `Angebots-Nr. ${offer.id}`, PAGE.titleY);
  let cursor = ACTIVE_DOCUMENT_CONTENT.showVehicleCard
    ? drawVehicleCard(doc, vehicle, PAGE.titleY + 14)
    : PAGE.titleY + 18;
  cursor = Math.max(cursor, standardLayoutStartY());

  if (ACTIVE_DOCUMENT_CONTENT.showIntroText) {
  cursor = drawTextBlock(doc,
    `Sehr geehrte/r ${customer.name}, vielen Dank für Ihr Interesse. Wir freuen uns, Ihnen für das oben genannte Fahrzeug folgendes verbindliches Angebot unterbreiten zu dürfen.`,
    cursor);
  cursor += 6;
  }

  const items: LineItem[] = [
    { description: `${vehicle.make} ${vehicle.model} (${vehicle.year})`, qty: "1", unitPrice: offer.price, total: offer.price },
  ];
  if (offer.discount && offer.discount > 0) {
    items.push({ description: "Rabatt", qty: "1", unitPrice: -offer.discount, total: -offer.discount });
  }
  if (offer.tradeIn && offer.tradeIn.value > 0) {
    items.push({ description: `Inzahlungnahme · ${offer.tradeIn.vehicleDescription}`, qty: "1", unitPrice: -offer.tradeIn.value, total: -offer.tradeIn.value });
  }
  if (ACTIVE_DOCUMENT_CONTENT.showMainTable) {
  cursor = drawTable(doc, items, cursor, "Zahlbetrag", {
    showVat: !isMarginTaxed(vehicle),
    vatBase: Math.max(0, offer.price - (offer.discount ?? 0)),
  });
  }

  if (ACTIVE_DOCUMENT_CONTENT.showPaymentInfo) {
  cursor = drawSectionTitle(doc, "Konditionen", cursor);
  cursor = drawTextBlock(doc,
    `Gültigkeit: bis ${formatDate(offer.validUntil)}\nLieferung: nach Vereinbarung\nGewährleistung: 12 Monate gemäß BGB\n${taxationLine(vehicle)}`,
    cursor);
  }

  if (ACTIVE_DOCUMENT_CONTENT.showTodos && offer.customerTodos.length) {
    cursor += 6;
    cursor = drawTodos(doc, offer.customerTodos, cursor, "Kundenvereinbarungen");
  }
  if (ACTIVE_DOCUMENT_CONTENT.showTodos && offer.notes && offer.notes.trim()) {
    cursor += 4;
    cursor = drawSectionTitle(doc, "Hinweise", cursor);
    cursor = drawTextBlock(doc, offer.notes, cursor, { muted: true });
  }

  drawFooterOnAllPages(doc, companyName, seller);
  activeStandardChrome = null;
  return doc;
};

export const downloadOfferPdf = async (args: GenerateOfferPdfArgs) => {
  await waitForPaint();
  const preparedArgs = await preparePdfArgs(args);
  const doc = generateOfferPdf(preparedArgs);
  doc.save(`${args.offer.id}_Angebot.pdf`);
};

