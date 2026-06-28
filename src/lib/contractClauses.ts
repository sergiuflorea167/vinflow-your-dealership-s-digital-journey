export type ContractAudience = "all" | "b2c" | "b2b";

export interface ContractClauseContext {
  customerType: "b2c" | "b2b";
  warrantyMonths: number;
  warrantyExcluded: boolean;
  consumerWarrantyLimitationAccepted: boolean;
  guaranteeAgreed: boolean;
  guaranteeDetails?: string;
  showPrivacy: boolean;
  exportSale: boolean;
}

export interface ContractClause {
  id: string;
  title: string;
  audience: ContractAudience;
  text: (context: ContractClauseContext) => string;
  isEnabled: (context: ContractClauseContext) => boolean;
}

const always = () => true;
const forB2C = (context: ContractClauseContext) => context.customerType === "b2c";
const forB2B = (context: ContractClauseContext) => context.customerType === "b2b";

export const CONTRACT_CLAUSES: ContractClause[] = [
  {
    id: "statutory-defect-rights-b2c",
    title: "Gesetzliche Mängelrechte",
    audience: "b2c",
    isEnabled: forB2C,
    text: () =>
      "Für diesen Verbrauchsgüterkauf gelten die gesetzlichen Mängelrechte, insbesondere die §§ 434, 437 und 439 BGB sowie die §§ 474 ff. BGB. Bei einem Mangel kann der Käufer zunächst Nacherfüllung verlangen; die weiteren gesetzlichen Rechte bleiben unberührt. Ein Ausschluss der gesetzlichen Mängelrechte ist nicht vereinbart. Ansprüche wegen arglistig verschwiegener Mängel oder einer übernommenen Beschaffenheitsgarantie bleiben gemäß § 444 BGB unberührt.",
  },
  {
    id: "limitation-b2c",
    title: "Gesonderte Vereinbarung zur Verjährungsfrist",
    audience: "b2c",
    isEnabled: (context) => forB2C(context) && context.consumerWarrantyLimitationAccepted,
    text: () =>
      "Der Käufer wurde vor Abgabe seiner Vertragserklärung eigens darüber informiert, dass die gesetzliche Verjährungsfrist für Mängelansprüche bei dem gebrauchten Fahrzeug von zwei Jahren auf ein Jahr ab Ablieferung verkürzt werden soll. Die Parteien vereinbaren diese Verkürzung hiermit ausdrücklich und gesondert. Die gesetzlichen Ausnahmen, insbesondere bei Arglist, Garantie sowie für nicht beschränkbare Schadensersatzansprüche, bleiben unberührt.",
  },
  {
    id: "statutory-limitation-b2c",
    title: "Verjährung",
    audience: "b2c",
    isEnabled: (context) => forB2C(context) && !context.consumerWarrantyLimitationAccepted,
    text: () =>
      "Für die Verjährung der Mängelansprüche gilt die gesetzliche Frist von zwei Jahren ab Ablieferung des Fahrzeugs (§ 438 BGB).",
  },
  {
    id: "defect-rights-b2b",
    title: "Sachmängelhaftung im Unternehmergeschäft",
    audience: "b2b",
    isEnabled: forB2B,
    text: (context) => context.warrantyExcluded
      ? "Der Verkauf erfolgt an einen Unternehmer im Sinne des § 14 BGB. Die Sachmängelhaftung für das gebrauchte Fahrzeug wird ausgeschlossen. Der Ausschluss gilt nicht bei Arglist oder übernommener Garantie, bei Vorsatz und grober Fahrlässigkeit sowie bei Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit und in sonstigen gesetzlich nicht abdingbaren Fällen."
      : `Der Verkauf erfolgt an einen Unternehmer im Sinne des § 14 BGB. Die Verjährungsfrist für Sachmängelansprüche beträgt ${context.warrantyMonths} Monate ab Ablieferung. Ansprüche wegen Arglist, übernommener Garantie sowie gesetzlich nicht beschränkbare Schadensersatzansprüche bleiben unberührt.`,
  },
  {
    id: "commercial-inspection-b2b",
    title: "Untersuchungs- und Rügepflicht",
    audience: "b2b",
    isEnabled: forB2B,
    text: () =>
      "Soweit der Kauf für beide Parteien ein Handelsgeschäft ist, gelten die Untersuchungs- und Rügepflichten des § 377 HGB. Der Käufer hat das Fahrzeug nach Ablieferung im ordnungsgemäßen Geschäftsgang unverzüglich zu untersuchen und erkennbare Mängel unverzüglich anzuzeigen; später erkennbare Mängel sind unverzüglich nach Entdeckung anzuzeigen. Bei arglistigem Verschweigen gilt § 377 HGB nicht zugunsten des Verkäufers.",
  },
  {
    id: "guarantee",
    title: "Garantie",
    audience: "all",
    isEnabled: (context) => context.guaranteeAgreed,
    text: (context) =>
      `Zusätzlich zu den gesetzlichen Mängelrechten ist eine Garantie vereinbart${context.guaranteeDetails?.trim() ? `: ${context.guaranteeDetails.trim()}.` : "."} Die gesetzlichen Rechte des Käufers bei Mängeln bestehen unentgeltlich und werden durch die Garantie nicht eingeschränkt. Maßgeblich sind die dem Käufer gesondert ausgehändigten Garantiebedingungen.`,
  },
  {
    id: "retention-of-title-and-risk",
    title: "Eigentumsvorbehalt und Gefahrübergang",
    audience: "all",
    isEnabled: always,
    text: () =>
      "Das Fahrzeug bleibt bis zur vollständigen Zahlung des Kaufpreises Eigentum des Verkäufers. Die Gefahr des zufälligen Untergangs und der zufälligen Verschlechterung geht mit der Übergabe des Fahrzeugs auf den Käufer über.",
  },
  {
    id: "privacy",
    title: "Datenschutz",
    audience: "all",
    isEnabled: (context) => context.showPrivacy,
    text: () =>
      "Die Vertragsdaten werden zur Anbahnung und Durchführung des Kaufvertrags sowie zur Erfüllung gesetzlicher Aufbewahrungs- und Nachweispflichten verarbeitet (Art. 6 Abs. 1 lit. b und c DSGVO). Eine Einwilligung ist hierfür nicht erforderlich. Weitergehende Datenschutzhinweise werden dem Käufer gesondert bereitgestellt.",
  },
  {
    id: "export",
    title: "Exportverkauf",
    audience: "all",
    isEnabled: (context) => context.exportSale,
    text: () =>
      "Der Käufer übernimmt die für Ausfuhr, Zulassung und Nutzung im Bestimmungsland erforderlichen Nachweise und Formalitäten. Zwingende gesetzliche Rechte sowie gesonderte steuerliche Nachweispflichten bleiben unberührt.",
  },
  {
    id: "final-provisions",
    title: "Schlussbestimmungen",
    audience: "all",
    isEnabled: always,
    text: (context) =>
      context.customerType === "b2b"
        ? "Individuelle Vereinbarungen in diesem Vertrag haben Vorrang. Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist, soweit gesetzlich zulässig, der Sitz des Verkäufers."
        : "Individuelle Vereinbarungen in diesem Vertrag haben Vorrang. Es gilt deutsches Recht. Zwingende Verbraucherschutzvorschriften bleiben unberührt.",
  },
];

export const getContractClauses = (context: ContractClauseContext) =>
  CONTRACT_CLAUSES.filter((clause) =>
    (clause.audience === "all" || clause.audience === context.customerType) && clause.isEnabled(context)
  );
