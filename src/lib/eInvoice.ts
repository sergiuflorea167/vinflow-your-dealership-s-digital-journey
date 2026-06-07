import { PDFDocument, PDFName, PDFHexString, PDFString, AFRelationship } from "pdf-lib";
import {
  Process,
  Vehicle,
  Customer,
  formatDate,
} from "@/data/process";
import { isMarginTaxed } from "@/lib/pdf";
import type { SellerInfo } from "@/lib/pdf";

const esc = (s: string | undefined | null) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const n2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

const dateBasic = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
};

export interface ZugferdArgs {
  process: Process;
  vehicle: Vehicle;
  customer: Customer;
  companyName: string;
  seller?: SellerInfo;
  finalPrice: number;
}

/**
 * Erzeugt ein ZUGFeRD 2.1 / Factur-X BASIC profile XML (CrossIndustryInvoice).
 * Kompatibel mit XRechnung-fähigen Verarbeitungs-Tools.
 */
export const buildZugferdXml = ({
  process,
  vehicle,
  customer,
  companyName,
  seller,
  finalPrice,
}: ZugferdArgs): string => {
  const inv = process.fields.invoicing;
  const down = process.fields.downPayment?.amount ?? 0;
  const invoiceNo = inv?.invoiceNumber ?? process.id;
  const invoiceDate = dateBasic(inv?.invoiceDate);
  const margin = isMarginTaxed(vehicle);

  // Bei Differenzbesteuerung (§25a UStG) wird KEINE USt. ausgewiesen.
  // Wir verwenden Kategorie "E" (Exempt) mit 0 % und einem Hinweistext.
  // Bei Regelbesteuerung 19 % netto/brutto Aufteilung aus Bruttopreis.
  const grossTotal = finalPrice;
  const taxRate = margin ? 0 : 19;
  const netLine = margin ? grossTotal : grossTotal / 1.19;
  const taxAmount = margin ? 0 : grossTotal - netLine;
  const payable = grossTotal - down;

  const taxCategory = margin ? "E" : "S";
  const taxExemptionReason = margin
    ? "Differenzbesteuerung gemäß § 25a UStG"
    : undefined;

  const dueDate = inv?.dueDate ? dateBasic(inv.dueDate) : invoiceDate;

  const sellerName = esc(companyName);
  const sellerStreet = esc(seller?.street);
  const sellerZip = esc(seller?.zip);
  const sellerCity = esc(seller?.city);
  const sellerVat = esc(seller?.vatId);

  const buyerName = esc(customer.name);
  const buyerStreet = esc((customer as any).street);
  const buyerZip = esc((customer as any).zip);
  const buyerCity = esc((customer as any).city);

  const itemName = esc(
    `${vehicle.make} ${vehicle.model} (${vehicle.year}) · FIN ${vehicle.vin}`,
  );

  // BT-10 BuyerReference ist in EN 16931 verpflichtend (Leitweg-ID o.ä.).
  // Fallback: Kundencode oder Rechnungsnummer.
  const buyerReference = esc(
    (customer as any).code ?? (customer as any).leitwegId ?? invoiceNo,
  );

  // BT-30 Seller legal registration (handelsregister) optional
  const sellerLegalId = esc((seller as any)?.registerNumber);

  // Note für Differenzbesteuerung (BT-22 / IncludedNote) auf Dokumentebene
  const documentNote = margin
    ? `<ram:IncludedNote><ram:Content>${esc("Differenzbesteuerung gemäß § 25a UStG – kein gesonderter Umsatzsteuerausweis.")}</ram:Content><ram:SubjectCode>AAI</ram:SubjectCode></ram:IncludedNote>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:BusinessProcessSpecifiedDocumentContextParameter>
      <ram:ID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</ram:ID>
    </ram:BusinessProcessSpecifiedDocumentContextParameter>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(invoiceNo)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${invoiceDate}</udt:DateTimeString>
    </ram:IssueDateTime>
    ${documentNote}
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>1</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${itemName}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${n2(netLine)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">1</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${taxCategory}</ram:CategoryCode>
          <ram:RateApplicablePercent>${n2(taxRate)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${n2(netLine)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>${buyerReference}</ram:BuyerReference>
      <ram:SellerTradeParty>
        <ram:Name>${sellerName}</ram:Name>
        ${sellerLegalId ? `<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${sellerLegalId}</ram:ID></ram:SpecifiedLegalOrganization>` : ""}
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${sellerZip}</ram:PostcodeCode>
          <ram:LineOne>${sellerStreet}</ram:LineOne>
          <ram:CityName>${sellerCity}</ram:CityName>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
        ${sellerVat ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${sellerVat}</ram:ID></ram:SpecifiedTaxRegistration>` : ""}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${buyerName}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${buyerZip}</ram:PostcodeCode>
          <ram:LineOne>${buyerStreet}</ram:LineOne>
          <ram:CityName>${buyerCity}</ram:CityName>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${invoiceDate}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:Information>${esc("SEPA-Überweisung")}</ram:Information>
      </ram:SpecifiedTradeSettlementPaymentMeans>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${n2(taxAmount)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        ${taxExemptionReason ? `<ram:ExemptionReason>${esc(taxExemptionReason)}</ram:ExemptionReason>` : ""}
        <ram:BasisAmount>${n2(netLine)}</ram:BasisAmount>
        <ram:CategoryCode>${taxCategory}</ram:CategoryCode>
        <ram:RateApplicablePercent>${n2(taxRate)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms>
        <ram:Description>${esc(inv?.paymentTerms ?? "Zahlung bei Fahrzeugübergabe")}</ram:Description>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${dueDate}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${n2(netLine)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${n2(netLine)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${n2(taxAmount)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${n2(grossTotal)}</ram:GrandTotalAmount>
        <ram:TotalPrepaidAmount>${n2(down)}</ram:TotalPrepaidAmount>
        <ram:DuePayableAmount>${n2(payable)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
};

/**
 * Hängt eine factur-x.xml als eingebettete Datei (AFRelationship: Alternative) an das PDF an
 * und setzt die ZUGFeRD-/Factur-X-konformen Metadaten. Hinweis: Volle PDF/A-3-Konformität
 * (mit ICC-Profil/XMP-Validierung) erfordert spezialisierte Tools; das Ergebnis ist jedoch
 * ein technisch valides hybrides E-Rechnungs-PDF mit eingebettetem XRechnung-Datensatz.
 */
export const attachZugferdXml = async (
  pdfBytes: ArrayBuffer | Uint8Array,
  xml: string,
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const encoder = new TextEncoder();
  const xmlBytes = encoder.encode(xml);

  await pdfDoc.attach(xmlBytes, "factur-x.xml", {
    mimeType: "application/xml",
    description: "Factur-X / ZUGFeRD invoice",
    creationDate: new Date(),
    modificationDate: new Date(),
    afRelationship: AFRelationship.Alternative,
  });

  // ZUGFeRD/Factur-X Metadaten ergänzen
  pdfDoc.setTitle("Rechnung");
  pdfDoc.setProducer("VINflow E-Rechnung (Factur-X)");
  pdfDoc.setCreator("VINflow");

  // PDF/A-Konformitätsbits via Markierung (best-effort)
  try {
    const catalog = pdfDoc.catalog;
    catalog.set(PDFName.of("Lang"), PDFString.of("de-DE"));
  } catch {
    // ignore
  }

  return await pdfDoc.save();
};
