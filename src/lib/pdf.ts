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

const BRAND = {
  primary: [79, 70, 229] as [number, number, number],   // #4f46e5
  primaryDark: [30, 30, 90] as [number, number, number], // #1e1e5a
  ink: [10, 10, 26] as [number, number, number],         // #0a0a1a
  muted: [120, 124, 145] as [number, number, number],
  light: [240, 241, 248] as [number, number, number],
  border: [220, 222, 235] as [number, number, number],
  success: [38, 168, 110] as [number, number, number],
};

const PAGE = { w: 210, h: 297, margin: 18 };

const setColor = (doc: jsPDF, c: [number, number, number], type: "fill" | "draw" | "text" = "text") => {
  if (type === "fill") doc.setFillColor(c[0], c[1], c[2]);
  if (type === "draw") doc.setDrawColor(c[0], c[1], c[2]);
  if (type === "text") doc.setTextColor(c[0], c[1], c[2]);
};

const drawHeader = (doc: jsPDF, title: string, subtitle: string, docNumber: string) => {
  // Top brand band
  setColor(doc, BRAND.primaryDark, "fill");
  doc.rect(0, 0, PAGE.w, 38, "F");
  setColor(doc, BRAND.primary, "fill");
  doc.rect(0, 36, PAGE.w, 2, "F");

  // Logo mark
  setColor(doc, BRAND.primary, "fill");
  doc.roundedRect(PAGE.margin, 12, 14, 14, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setColor(doc, [255, 255, 255]);
  doc.text("V", PAGE.margin + 7, 22, { align: "center" });

  // Brand wordmark
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  setColor(doc, [255, 255, 255]);
  doc.text("VINflow", PAGE.margin + 19, 19);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(doc, [200, 205, 230]);
  doc.text("PROCESS OS · VIN-BASIERT", PAGE.margin + 19, 24);

  // Document title block (right)
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

const drawFooter = (doc: jsPDF, footerText: string) => {
  const y = PAGE.h - 15;
  setColor(doc, BRAND.border, "draw");
  doc.setLineWidth(0.3);
  doc.line(PAGE.margin, y, PAGE.w - PAGE.margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(doc, BRAND.muted);
  doc.text(footerText, PAGE.margin, y + 5);
  doc.text("VINflow · vinflow.app", PAGE.w - PAGE.margin, y + 5, { align: "right" });
  doc.text(`Erstellt am ${formatDate(new Date().toISOString())}`, PAGE.w / 2, y + 5, { align: "center" });
};

const drawAddressBlock = (
  doc: jsPDF,
  customer: Customer,
  y: number
) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(doc, BRAND.muted);
  doc.text("RECHNUNGSEMPFÄNGER", PAGE.margin, y);

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

const drawMetaBlock = (
  doc: jsPDF,
  rows: Array<[string, string]>,
  y: number
) => {
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
  doc.roundedRect(PAGE.margin, y, PAGE.w - 2 * PAGE.margin, 28, 3, 3, "F");

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
    `${vehicle.year}  ·  ${vehicle.color}  ·  ${vehicle.mileage.toLocaleString("de-DE")} km`,
    PAGE.margin + 6,
    y + 25
  );
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

  // Header
  setColor(doc, BRAND.ink, "fill");
  doc.rect(x, y, w, headerH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(doc, [255, 255, 255]);
  doc.text("BESCHREIBUNG", x + 3, y + 5.5);
  doc.text("MENGE", x + 110, y + 5.5);
  doc.text("EINZELPREIS", x + 135, y + 5.5);
  doc.text("BETRAG", x + w - 3, y + 5.5, { align: "right" });

  // Rows
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

  // Total bar
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

// ---------- Public API ----------

export interface GeneratePdfArgs {
  process: Process;
  vehicle: Vehicle;
  customer: Customer;
  offer?: Offer;
  stepKey: ProcessStepKey;
}

export const generateBelegPdf = ({ process, vehicle, customer, offer, stepKey }: GeneratePdfArgs): jsPDF => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const step = PROCESS_STEPS.find((s) => s.key === stepKey)!;
  const docNumber = `${process.id} · ${step.shortLabel.toUpperCase()}`;

  drawHeader(doc, step.documentName, `Vorgang ${process.id}`, docNumber);

  // Address + meta
  drawAddressBlock(doc, customer, 50);
  drawMetaBlock(
    doc,
    [
      ["Vorgangs-Nr.", process.id],
      ["Beleg-Datum", formatDate(new Date().toISOString())],
      ["Erstellt am", formatDate(process.createdAt)],
    ],
    50
  );

  // Vehicle card
  drawVehicleCard(doc, vehicle, 88);

  let cursor = 128;

  // Step-specific body
  const finalPrice = process.fields.finalPrice ?? vehicle.listPrice;

  switch (stepKey) {
    case "offer": {
      drawSectionTitle(doc, "Angebot", cursor);
      cursor += 8;
      cursor = drawTextBlock(
        doc,
        `Sehr geehrte/r ${customer.name}, vielen Dank für Ihr Interesse. Wir freuen uns, Ihnen für das oben genannte Fahrzeug folgendes verbindliches Angebot unterbreiten zu dürfen.`,
        cursor,
        { muted: true }
      );
      cursor += 6;
      cursor = drawTable(
        doc,
        [
          {
            description: `${vehicle.make} ${vehicle.model} (${vehicle.year})`,
            qty: "1",
            unitPrice: offer?.price ?? vehicle.listPrice,
            total: offer?.price ?? vehicle.listPrice,
          },
        ],
        cursor,
        "ANGEBOTSPREIS"
      );
      cursor += 6;
      drawSectionTitle(doc, "Konditionen", cursor);
      cursor += 6;
      cursor = drawTextBlock(
        doc,
        `Gültigkeit: bis ${offer ? formatDate(offer.validUntil) : "—"}\nLieferung: nach Vereinbarung\nGewährleistung: 12 Monate gemäß BGB\nPreis inkl. 19% MwSt.`,
        cursor
      );
      break;
    }
    case "down_payment": {
      drawSectionTitle(doc, "Anzahlungsrechnung", cursor);
      cursor += 8;
      const down = process.fields.downPayment?.amount ?? Math.round(finalPrice * 0.15);
      cursor = drawTextBlock(
        doc,
        `Hiermit stellen wir Ihnen die vereinbarte Anzahlung für das oben genannte Fahrzeug in Rechnung. Bitte überweisen Sie den Betrag bis zum vereinbarten Termin auf das angegebene Konto.`,
        cursor,
        { muted: true }
      );
      cursor += 6;
      cursor = drawTable(
        doc,
        [
          { description: "Anzahlung Fahrzeugkauf", qty: "1", unitPrice: down, total: down },
        ],
        cursor,
        "ZU ZAHLENDER BETRAG"
      );
      cursor += 6;
      drawSectionTitle(doc, "Zahlungsdaten", cursor);
      cursor += 6;
      cursor = drawTextBlock(
        doc,
        `Empfänger: VINflow Autohaus GmbH\nIBAN: DE89 3704 0044 0532 0130 00\nBIC: COBADEFFXXX\nVerwendungszweck: ${process.id}\nFällig: ${process.fields.downPayment?.dueDate ? formatDate(process.fields.downPayment.dueDate) : "sofort"}`,
        cursor
      );
      break;
    }
    case "order_confirmation": {
      drawSectionTitle(doc, "Auftragsbestätigung", cursor);
      cursor += 8;
      cursor = drawTextBlock(
        doc,
        `Wir bestätigen Ihnen hiermit den verbindlichen Kaufauftrag für das oben aufgeführte Fahrzeug zu folgenden Konditionen:`,
        cursor,
        { muted: true }
      );
      cursor += 6;
      cursor = drawTable(
        doc,
        [
          { description: `${vehicle.make} ${vehicle.model}`, qty: "1", unitPrice: finalPrice, total: finalPrice },
        ],
        cursor,
        "KAUFPREIS"
      );
      cursor += 6;
      drawSectionTitle(doc, "Eckdaten", cursor);
      cursor += 6;
      const oc = process.fields.orderConfirmation;
      cursor = drawTextBlock(
        doc,
        `Auftragsdatum: ${oc?.orderDate ? formatDate(oc.orderDate) : "—"}\nLiefertermin: ${oc?.deliveryDate ? formatDate(oc.deliveryDate) : "nach Vereinbarung"}\nZahlungsbedingungen: ${oc?.paymentTerms ?? "Restzahlung bei Übergabe"}\nBereits geleistete Anzahlung: ${formatCurrency(process.fields.downPayment?.amount ?? 0)}`,
        cursor
      );
      break;
    }
    case "outbound_check": {
      drawSectionTitle(doc, "Ausgangsprotokoll", cursor);
      cursor += 8;
      cursor = drawTextBlock(
        doc,
        `Vor Übergabe des Fahrzeugs wurde folgende Ausgangskontrolle vollständig durchgeführt und dokumentiert:`,
        cursor,
        { muted: true }
      );
      cursor += 4;
      process.checklist.forEach((item) => {
        setColor(doc, BRAND.success, "fill");
        doc.circle(PAGE.margin + 2, cursor + 2, 1.5, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setColor(doc, BRAND.ink);
        doc.text(item.label, PAGE.margin + 7, cursor + 3);
        cursor += 6;
      });
      cursor += 4;
      cursor = drawTextBlock(
        doc,
        `Das Fahrzeug ist übergabebereit.`,
        cursor,
        { muted: true }
      );
      break;
    }
    case "invoicing": {
      drawSectionTitle(doc, "Rechnung", cursor);
      cursor += 8;
      const inv = process.fields.invoicing;
      const down = process.fields.downPayment?.amount ?? 0;
      const remaining = finalPrice - down;
      cursor = drawTable(
        doc,
        [
          { description: `${vehicle.make} ${vehicle.model} (${vehicle.year})`, qty: "1", unitPrice: finalPrice, total: finalPrice },
          { description: "abzgl. geleistete Anzahlung", qty: "1", unitPrice: -down, total: -down },
        ],
        cursor,
        "RESTBETRAG"
      );
      cursor += 6;
      drawSectionTitle(doc, "Zahlungsdaten", cursor);
      cursor += 6;
      cursor = drawTextBlock(
        doc,
        `Rechnungs-Nr.: ${inv?.invoiceNumber ?? "—"}\nRechnungsdatum: ${inv?.invoiceDate ? formatDate(inv.invoiceDate) : formatDate(new Date().toISOString())}\nFällig: ${inv?.dueDate ? formatDate(inv.dueDate) : "sofort"}\nIBAN: DE89 3704 0044 0532 0130 00 · Verwendungszweck: ${process.id}\nDer Restbetrag von ${formatCurrency(remaining)} ist bei Fahrzeugübergabe fällig.`,
        cursor
      );
      break;
    }
    case "delivery_confirmation": {
      drawSectionTitle(doc, "Übergabeprotokoll", cursor);
      cursor += 8;
      const del = process.fields.delivery;
      cursor = drawTextBlock(
        doc,
        `Hiermit bestätigt der Kunde die ordnungsgemäße Übergabe des Fahrzeugs.`,
        cursor,
        { muted: true }
      );
      cursor += 6;
      cursor = drawTextBlock(
        doc,
        `Übergabedatum: ${del?.handoverDate ? formatDate(del.handoverDate) : formatDate(new Date().toISOString())}\nÜbergabeort: ${del?.handoverLocation ?? "Filiale"}\nKilometerstand bei Übergabe: ${del?.finalMileage?.toLocaleString("de-DE") ?? vehicle.mileage.toLocaleString("de-DE")} km\nTankfüllung: ${del?.fuelLevel ?? "voll"}`,
        cursor
      );
      cursor += 14;

      // Signature lines
      const colW = (PAGE.w - 2 * PAGE.margin - 10) / 2;
      setColor(doc, BRAND.ink, "draw");
      doc.setLineWidth(0.4);
      doc.line(PAGE.margin, cursor, PAGE.margin + colW, cursor);
      doc.line(PAGE.margin + colW + 10, cursor, PAGE.w - PAGE.margin, cursor);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setColor(doc, BRAND.muted);
      doc.text("Unterschrift Kunde", PAGE.margin, cursor + 4);
      doc.text("Unterschrift VINflow", PAGE.margin + colW + 10, cursor + 4);
      break;
    }
  }

  drawFooter(doc, `${step.documentName} · ${process.id}`);

  return doc;
};

export const downloadBelegPdf = (args: GeneratePdfArgs) => {
  const doc = generateBelegPdf(args);
  const step = PROCESS_STEPS.find((s) => s.key === args.stepKey)!;
  doc.save(`${args.process.id}_${step.documentName.replace(/[^A-Za-z0-9]/g, "_")}.pdf`);
};
