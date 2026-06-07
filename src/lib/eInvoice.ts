import { PDFDocument, PDFName, PDFString, AFRelationship } from "pdf-lib";
import {
  Process,
  Vehicle,
  Customer,
} from "@/data/process";
import { isMarginTaxed, BANK } from "@/lib/pdf";
import type { SellerInfo } from "@/lib/pdf";

const esc = (s: string | number | undefined | null) =>
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

// XML-Tag nur ausgeben, wenn Wert vorhanden – keine leeren Elemente.
const tag = (name: string, value: string | number | undefined | null, attrs = "") => {
  const v = value === undefined || value === null ? "" : String(value).trim();
  if (!v) return "";
  return `<${name}${attrs ? " " + attrs : ""}>${esc(v)}</${name}>`;
};

// IBAN nur normalisiert (ohne Spaces) ausgeben.
const cleanIban = (iban?: string) => (iban ? iban.replace(/\s+/g, "").toUpperCase() : "");
const cleanBic = (bic?: string) => (bic ? bic.replace(/\s+/g, "").toUpperCase() : "");

export interface ZugferdArgs {
  process: Process;
  vehicle: Vehicle;
  customer: Customer;
  companyName: string;
  seller?: SellerInfo;
  finalPrice: number;
}

/**
 * Erzeugt ein ZUGFeRD 2.2 / Factur-X EN16931 profile XML (CrossIndustryInvoice).
 * Konform zu EN16931 / XRechnung – keine leeren Pflicht-Tags.
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

  const grossTotal = finalPrice;
  const taxRate = margin ? 0 : 19;
  const netLine = margin ? grossTotal : grossTotal / 1.19;
  const taxAmount = margin ? 0 : grossTotal - netLine;
  const payable = grossTotal - down;

  // Bei §25a Differenzbesteuerung: Kategorie "E" + Begründung.
  const taxCategory = margin ? "E" : "S";
  const taxExemptionReason = margin
    ? "Differenzbesteuerung gemäß § 25a UStG"
    : undefined;

  const dueDate = inv?.dueDate ? dateBasic(inv.dueDate) : invoiceDate;

  // --- Seller / Verkäufer ---
  const sellerName = companyName;
  const sellerStreet = seller?.street;
  const sellerZip = seller?.zip;
  const sellerCity = seller?.city;
  const sellerVat = seller?.vatId;
  const sellerTaxNr = seller?.taxNumber;
  const sellerEmail = seller?.email;
  const sellerPhone = seller?.phone;
  const sellerContactName = seller?.representative || sellerName;

  // --- Buyer / Käufer ---
  const buyerName = customer.name;
  const buyerStreet = customer.street;
  const buyerZip = customer.zip;
  const buyerCity = customer.city;
  const buyerEmail = customer.email;
  const buyerPhone = customer.phone;
  // BT-49 Buyer electronic address – wir nutzen E-Mail (schemeID EM).
  const buyerEAS = buyerEmail ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${esc(buyerEmail)}</ram:URIID></ram:URIUniversalCommunication>` : "";
  // BT-34 Seller electronic address (Pflicht für XRechnung).
  const sellerEAS = sellerEmail ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${esc(sellerEmail)}</ram:URIID></ram:URIUniversalCommunication>` : "";

  // --- Bank / Payment ---
  const iban = cleanIban(BANK.iban);
  const bic = cleanBic(BANK.bic);

  const itemName = `${vehicle.make} ${vehicle.model} (${vehicle.year}) · FIN ${vehicle.vin}`;

  // BT-10 BuyerReference – Pflicht. Fallback: Rechnungsnummer.
  const buyerReference = (customer as any).code ?? (customer as any).leitwegId ?? invoiceNo;

  // Dokumenten-Note (BG-1) für Margenbesteuerung
  const documentNote = margin
    ? `<ram:IncludedNote><ram:Content>Differenzbesteuerung gemäß § 25a UStG – kein gesonderter Umsatzsteuerausweis.</ram:Content><ram:SubjectCode>AAI</ram:SubjectCode></ram:IncludedNote>`
    : "";

  // Seller Postal Address – nur ausgeben wenn vorhanden, ohne leere Inner-Tags
  const sellerAddress = `<ram:PostalTradeAddress>${tag("ram:PostcodeCode", sellerZip)}${tag("ram:LineOne", sellerStreet)}${tag("ram:CityName", sellerCity)}<ram:CountryID>DE</ram:CountryID></ram:PostalTradeAddress>`;

  // Seller Tax Registration: USt-ID (VA) und/oder Steuernummer (FC)
  const sellerTaxReg = [
    sellerVat ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${esc(sellerVat)}</ram:ID></ram:SpecifiedTaxRegistration>` : "",
    sellerTaxNr ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">${esc(sellerTaxNr)}</ram:ID></ram:SpecifiedTaxRegistration>` : "",
  ].join("");

  // Seller Trade Contact (BG-6) – Name + Telefon ODER E-Mail
  const sellerContactInner = [
    tag("ram:PersonName", sellerContactName),
    sellerPhone ? `<ram:TelephoneUniversalCommunication>${tag("ram:CompleteNumber", sellerPhone)}</ram:TelephoneUniversalCommunication>` : "",
    sellerEmail ? `<ram:EmailURIUniversalCommunication>${tag("ram:URIID", sellerEmail)}</ram:EmailURIUniversalCommunication>` : "",
  ].join("");
  const sellerContact = sellerContactInner
    ? `<ram:DefinedTradeContact>${sellerContactInner}</ram:DefinedTradeContact>`
    : "";

  // Buyer Address
  const buyerAddress = `<ram:PostalTradeAddress>${tag("ram:PostcodeCode", buyerZip)}${tag("ram:LineOne", buyerStreet)}${tag("ram:CityName", buyerCity)}<ram:CountryID>DE</ram:CountryID></ram:PostalTradeAddress>`;

  // Buyer Contact (optional, aber sinnvoll)
  const buyerContactInner = [
    tag("ram:PersonName", buyerName),
    buyerPhone ? `<ram:TelephoneUniversalCommunication>${tag("ram:CompleteNumber", buyerPhone)}</ram:TelephoneUniversalCommunication>` : "",
    buyerEmail ? `<ram:EmailURIUniversalCommunication>${tag("ram:URIID", buyerEmail)}</ram:EmailURIUniversalCommunication>` : "",
  ].join("");
  const buyerContact = buyerContactInner
    ? `<ram:DefinedTradeContact>${buyerContactInner}</ram:DefinedTradeContact>`
    : "";

  // Payment Means: Code 58 = SEPA Credit Transfer – benötigt IBAN
  const payeeAccount = iban
    ? `<ram:PayeePartyCreditorFinancialAccount>${tag("ram:IBANID", iban)}${tag("ram:AccountName", sellerName)}</ram:PayeePartyCreditorFinancialAccount>`
    : "";
  const payeeBank = bic
    ? `<ram:PayeeSpecifiedCreditorFinancialInstitution>${tag("ram:BICID", bic)}</ram:PayeeSpecifiedCreditorFinancialInstitution>`
    : "";
  const paymentMeans = iban
    ? `<ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>58</ram:TypeCode><ram:Information>SEPA-Überweisung</ram:Information>${payeeAccount}${payeeBank}</ram:SpecifiedTradeSettlementPaymentMeans>`
    : `<ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>1</ram:TypeCode><ram:Information>Sonstige Zahlungsweise</ram:Information></ram:SpecifiedTradeSettlementPaymentMeans>`;

  // ApplicableTradeTax (Header)
  const tradeTax = `<ram:ApplicableTradeTax><ram:CalculatedAmount>${n2(taxAmount)}</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode>${taxExemptionReason ? `<ram:ExemptionReason>${esc(taxExemptionReason)}</ram:ExemptionReason>` : ""}<ram:BasisAmount>${n2(netLine)}</ram:BasisAmount><ram:CategoryCode>${taxCategory}</ram:CategoryCode><ram:RateApplicablePercent>${n2(taxRate)}</ram:RateApplicablePercent></ram:ApplicableTradeTax>`;

  const paymentTerms = `<ram:SpecifiedTradePaymentTerms><ram:Description>${esc(inv?.paymentTerms ?? "Zahlung bei Fahrzeugübergabe")}</ram:Description><ram:DueDateDateTime><udt:DateTimeString format="102">${dueDate}</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradePaymentTerms>`;

  const summation = `<ram:SpecifiedTradeSettlementHeaderMonetarySummation><ram:LineTotalAmount>${n2(netLine)}</ram:LineTotalAmount><ram:TaxBasisTotalAmount>${n2(netLine)}</ram:TaxBasisTotalAmount><ram:TaxTotalAmount currencyID="EUR">${n2(taxAmount)}</ram:TaxTotalAmount><ram:GrandTotalAmount>${n2(grossTotal)}</ram:GrandTotalAmount><ram:TotalPrepaidAmount>${n2(down)}</ram:TotalPrepaidAmount><ram:DuePayableAmount>${n2(payable)}</ram:DuePayableAmount></ram:SpecifiedTradeSettlementHeaderMonetarySummation>`;

  const lineItem = `<ram:IncludedSupplyChainTradeLineItem><ram:AssociatedDocumentLineDocument><ram:LineID>1</ram:LineID></ram:AssociatedDocumentLineDocument><ram:SpecifiedTradeProduct><ram:Name>${esc(itemName)}</ram:Name></ram:SpecifiedTradeProduct><ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>${n2(netLine)}</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement><ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="C62">1</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery><ram:SpecifiedLineTradeSettlement><ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>${taxCategory}</ram:CategoryCode><ram:RateApplicablePercent>${n2(taxRate)}</ram:RateApplicablePercent></ram:ApplicableTradeTax><ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${n2(netLine)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement></ram:IncludedSupplyChainTradeLineItem>`;

  const sellerParty = `<ram:SellerTradeParty><ram:Name>${esc(sellerName)}</ram:Name>${sellerContact}${sellerAddress}${sellerTaxReg}</ram:SellerTradeParty>`;
  const buyerParty = `<ram:BuyerTradeParty><ram:Name>${esc(buyerName)}</ram:Name>${buyerContact}${buyerAddress}${buyerEAS}</ram:BuyerTradeParty>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100" xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:BusinessProcessSpecifiedDocumentContextParameter><ram:ID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</ram:ID></ram:BusinessProcessSpecifiedDocumentContextParameter>
    <ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(invoiceNo)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${invoiceDate}</udt:DateTimeString></ram:IssueDateTime>
    ${documentNote}
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    ${lineItem}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>${esc(buyerReference)}</ram:BuyerReference>
      ${sellerParty}
      ${buyerParty}
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent><ram:OccurrenceDateTime><udt:DateTimeString format="102">${invoiceDate}</udt:DateTimeString></ram:OccurrenceDateTime></ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      ${paymentMeans}
      ${tradeTax}
      ${paymentTerms}
      ${summation}
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
};

/**
 * Hängt eine factur-x.xml als eingebettete Datei (AFRelationship: Alternative) an das PDF an.
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

  pdfDoc.setTitle("Rechnung");
  pdfDoc.setProducer("VINflow E-Rechnung (Factur-X)");
  pdfDoc.setCreator("VINflow");

  try {
    const catalog = pdfDoc.catalog;
    catalog.set(PDFName.of("Lang"), PDFString.of("de-DE"));
  } catch {
    // ignore
  }

  return await pdfDoc.save();
};
