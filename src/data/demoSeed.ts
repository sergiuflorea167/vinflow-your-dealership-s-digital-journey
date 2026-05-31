// Demo-Seed für Verkaufspräsentationen.
// Lädt die kompletten Mock-Daten und ergänzt historische, abgeschlossene
// Vorgänge der letzten 11 Monate, sodass der Jahresumsatz ca. 1.000.000 €
// erreicht. Fahrzeugpreise liegen zwischen 10.000 € und 40.000 €.

import {
  MOCK_VEHICLES, MOCK_CUSTOMERS, MOCK_OFFERS, MOCK_PROCESSES, MOCK_PURCHASE_PLANS,
  MOCK_TODOS, MOCK_ACTIVITIES, MOCK_GOALS, MOCK_CALENDAR_EVENTS,
  DEFAULT_DAY_TEMPLATES, DEFAULT_SETTINGS, DEFAULT_OUTBOUND_CHECKLIST,
  type Vehicle, type Customer, type Offer, type Process, type FuelType, type Transmission, type VehicleType,
} from "@/data/process";

const D = 86400000;
const iso = (d: Date) => d.toISOString();
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

// Datum n Tage in der Vergangenheit
const past = (days: number) => new Date(Date.now() - days * D);

// Deterministischer PRNG (mulberry32) – stabile Demodaten
const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

interface ModelSpec {
  make: string; model: string; type: VehicleType; fuel: FuelType; transmission: Transmission;
  power_kw: number; power_hp: number; doors: number; seats: number; basePrice: number; marginPct: number;
}

const MODELS: ModelSpec[] = [
  { make: "Volkswagen", model: "Polo 1.0 TSI",        type: "kleinwagen", fuel: "Benzin",  transmission: "Schaltgetriebe", power_kw: 70,  power_hp: 95,  doors: 5, seats: 5, basePrice: 14900, marginPct: 0.18 },
  { make: "Volkswagen", model: "Golf 1.5 TSI Life",   type: "limousine",  fuel: "Benzin",  transmission: "DKG",            power_kw: 96,  power_hp: 130, doors: 5, seats: 5, basePrice: 23900, marginPct: 0.17 },
  { make: "Volkswagen", model: "Passat Variant 2.0 TDI", type: "kombi",   fuel: "Diesel",  transmission: "Automatik",      power_kw: 110, power_hp: 150, doors: 5, seats: 5, basePrice: 28900, marginPct: 0.18 },
  { make: "Volkswagen", model: "Tiguan 2.0 TDI",      type: "suv",        fuel: "Diesel",  transmission: "Automatik",      power_kw: 110, power_hp: 150, doors: 5, seats: 5, basePrice: 32900, marginPct: 0.19 },
  { make: "Volkswagen", model: "Touran 1.5 TSI",      type: "suv",        fuel: "Benzin",  transmission: "DKG",            power_kw: 110, power_hp: 150, doors: 5, seats: 7, basePrice: 27900, marginPct: 0.17 },
  { make: "Volkswagen", model: "ID.3 Pro",            type: "limousine",  fuel: "Elektro", transmission: "Automatik",      power_kw: 150, power_hp: 204, doors: 5, seats: 5, basePrice: 28500, marginPct: 0.18 },
  { make: "Audi",       model: "A3 Sportback 35 TFSI", type: "limousine", fuel: "Benzin",  transmission: "DKG",            power_kw: 110, power_hp: 150, doors: 5, seats: 5, basePrice: 26900, marginPct: 0.20 },
  { make: "Audi",       model: "A4 35 TDI",           type: "limousine",  fuel: "Diesel",  transmission: "Automatik",      power_kw: 120, power_hp: 163, doors: 4, seats: 5, basePrice: 31900, marginPct: 0.19 },
  { make: "Audi",       model: "Q2 35 TFSI",          type: "suv",        fuel: "Benzin",  transmission: "DKG",            power_kw: 110, power_hp: 150, doors: 5, seats: 5, basePrice: 24900, marginPct: 0.20 },
  { make: "Audi",       model: "Q3 35 TDI",           type: "suv",        fuel: "Diesel",  transmission: "Automatik",      power_kw: 110, power_hp: 150, doors: 5, seats: 5, basePrice: 33900, marginPct: 0.20 },
  { make: "BMW",        model: "118i Advantage",      type: "limousine",  fuel: "Benzin",  transmission: "Automatik",      power_kw: 100, power_hp: 136, doors: 5, seats: 5, basePrice: 24900, marginPct: 0.19 },
  { make: "BMW",        model: "320d Touring",        type: "kombi",      fuel: "Diesel",  transmission: "Automatik",      power_kw: 140, power_hp: 190, doors: 5, seats: 5, basePrice: 33900, marginPct: 0.20 },
  { make: "BMW",        model: "X1 sDrive18d",        type: "suv",        fuel: "Diesel",  transmission: "Automatik",      power_kw: 110, power_hp: 150, doors: 5, seats: 5, basePrice: 32900, marginPct: 0.21 },
  { make: "BMW",        model: "X2 sDrive20i",        type: "suv",        fuel: "Benzin",  transmission: "DKG",            power_kw: 131, power_hp: 178, doors: 5, seats: 5, basePrice: 31900, marginPct: 0.20 },
  { make: "Mercedes-Benz", model: "A 180 Progressive", type: "limousine", fuel: "Benzin",  transmission: "DKG",            power_kw: 100, power_hp: 136, doors: 5, seats: 5, basePrice: 25900, marginPct: 0.19 },
  { make: "Mercedes-Benz", model: "C 200 T-Modell",   type: "kombi",      fuel: "Benzin",  transmission: "Automatik",      power_kw: 150, power_hp: 204, doors: 5, seats: 5, basePrice: 34900, marginPct: 0.20 },
  { make: "Mercedes-Benz", model: "GLA 200 d",        type: "suv",        fuel: "Diesel",  transmission: "Automatik",      power_kw: 110, power_hp: 150, doors: 5, seats: 5, basePrice: 31900, marginPct: 0.20 },
  { make: "Mercedes-Benz", model: "Vito 114 CDI",     type: "transporter", fuel: "Diesel", transmission: "Automatik",      power_kw: 100, power_hp: 136, doors: 5, seats: 3, basePrice: 27900, marginPct: 0.16 },
  { make: "Opel",       model: "Astra 1.2 Turbo",     type: "limousine",  fuel: "Benzin",  transmission: "Schaltgetriebe", power_kw: 81,  power_hp: 110, doors: 5, seats: 5, basePrice: 17900, marginPct: 0.17 },
  { make: "Opel",       model: "Mokka-e",             type: "suv",        fuel: "Elektro", transmission: "Automatik",      power_kw: 100, power_hp: 136, doors: 5, seats: 5, basePrice: 23900, marginPct: 0.18 },
  { make: "Ford",       model: "Focus Turnier 1.5",   type: "kombi",      fuel: "Benzin",  transmission: "Automatik",      power_kw: 110, power_hp: 150, doors: 5, seats: 5, basePrice: 22900, marginPct: 0.18 },
  { make: "Ford",       model: "Kuga 2.0 EcoBlue",    type: "suv",        fuel: "Diesel",  transmission: "Automatik",      power_kw: 110, power_hp: 150, doors: 5, seats: 5, basePrice: 28900, marginPct: 0.19 },
  { make: "Skoda",      model: "Octavia Combi 2.0 TDI", type: "kombi",    fuel: "Diesel",  transmission: "DKG",            power_kw: 110, power_hp: 150, doors: 5, seats: 5, basePrice: 24900, marginPct: 0.18 },
  { make: "Skoda",      model: "Kodiaq 2.0 TDI 4x4",  type: "suv",        fuel: "Diesel",  transmission: "Automatik",      power_kw: 110, power_hp: 150, doors: 5, seats: 7, basePrice: 36900, marginPct: 0.19 },
  { make: "Renault",    model: "Clio TCe 90",         type: "kleinwagen", fuel: "Benzin",  transmission: "Schaltgetriebe", power_kw: 67,  power_hp: 91,  doors: 5, seats: 5, basePrice: 13900, marginPct: 0.17 },
  { make: "Hyundai",    model: "Tucson 1.6 T-GDI",    type: "suv",        fuel: "Benzin",  transmission: "Automatik",      power_kw: 110, power_hp: 150, doors: 5, seats: 5, basePrice: 27900, marginPct: 0.19 },
  { make: "Kia",        model: "Ceed SW 1.5 T-GDI",   type: "kombi",      fuel: "Benzin",  transmission: "DKG",            power_kw: 103, power_hp: 140, doors: 5, seats: 5, basePrice: 21900, marginPct: 0.18 },
  { make: "Mini",       model: "Cooper 1.5",          type: "kleinwagen", fuel: "Benzin",  transmission: "Automatik",      power_kw: 100, power_hp: 136, doors: 3, seats: 4, basePrice: 22900, marginPct: 0.19 },
];

const COLORS = ["Alpinweiß", "Tiefschwarz", "Mineralgrau", "Mondsteinsilber", "Stahlblau", "Nachtblau", "Polarweiß", "Manhattangrau", "Pearl White", "Tornadorot", "Daytonagrau", "Eiger Grey", "Mineralweiß", "Cavansitblau"];

const NAMES = [
  "Felix Albrecht", "Carolin Adler", "Niklas Wagner", "Hannah Berg", "Jonas Richter", "Lea Neumann",
  "Tim Schäfer", "Mara Lindner", "Philipp Köhler", "Sarah Otto", "Lukas Bergmann", "Theresa Walter",
  "David Schuster", "Lara Schmitt", "Yannick Förster", "Helena Krause", "Mats Reuter", "Greta Bock",
  "Erik Lange", "Pia Sommer", "Moritz Vogt", "Lisa Marie Jung", "Benjamin Hoffmann", "Alina Kaiser",
  "Maximilian Brand", "Sina Westermann", "Kevin Stein", "Marlene Held",
  "Auto-Service Süd GmbH", "Pflegedienst Vital UG",
];

const CITIES: Array<[string, string, string]> = [
  ["10115", "Berlin", "Torstraße"], ["20095", "Hamburg", "Spitalerstraße"], ["80331", "München", "Sendlinger Straße"],
  ["50667", "Köln", "Hohe Straße"], ["60313", "Frankfurt", "Zeil"], ["70173", "Stuttgart", "Königstraße"],
  ["30159", "Hannover", "Georgstraße"], ["90402", "Nürnberg", "Karolinenstraße"], ["01067", "Dresden", "Prager Str."],
  ["28195", "Bremen", "Obernstraße"], ["04109", "Leipzig", "Petersstraße"], ["40213", "Düsseldorf", "Schadowstraße"],
];

const randVin = (rand: () => number) => {
  const alphabet = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < 17; i++) s += alphabet[Math.floor(rand() * alphabet.length)];
  return s;
};

const pick = <T,>(arr: T[], rand: () => number) => arr[Math.floor(rand() * arr.length)];

export interface DemoSeed {
  vehicles: Vehicle[];
  customers: Customer[];
  offers: Offer[];
  processes: Process[];
  purchasePlans: typeof MOCK_PURCHASE_PLANS;
  todos: typeof MOCK_TODOS;
  activities: typeof MOCK_ACTIVITIES;
  goals: typeof MOCK_GOALS;
  calendarEvents: typeof MOCK_CALENDAR_EVENTS;
  dayTemplates: typeof DEFAULT_DAY_TEMPLATES;
  settings: typeof DEFAULT_SETTINGS;
}

/**
 * Erzeugt ein vollständiges Demo-Set:
 * - alle bestehenden Mock-Daten (aktive Vorgänge, Bestand, Einkaufsplanung etc.)
 * - + 28 historische, abgeschlossene Vorgänge der letzten 11 Monate,
 *   gleichmäßig verteilt, sodass der Jahresumsatz ca. 1.000.000 € erreicht.
 */
export const buildDemoSeed = (): DemoSeed => {
  const rand = rng(20260531); // deterministisch
  const extraVehicles: Vehicle[] = [];
  const extraCustomers: Customer[] = [];
  const extraOffers: Offer[] = [];
  const extraProcesses: Process[] = [];

  // 28 Vorgänge in den letzten 11 Monaten (vor dem aktuellen Monat),
  // damit die aktuellen Monatsdaten / Anker der MOCK_PROCESSES sichtbar bleiben.
  const N = 28;
  for (let i = 0; i < N; i++) {
    const idx = i + 1;
    const vId = `VD-${String(idx).padStart(3, "0")}`;
    const cId = `CD-${String(idx).padStart(3, "0")}`;
    const pId = `VF-DEMO-${String(idx).padStart(3, "0")}`;
    const ofId = `OFR-DEMO-${String(idx).padStart(3, "0")}`;

    // Lieferdatum: von vor ~330 Tagen bis vor ~45 Tagen, gleichmäßig
    const deliveryDaysAgo = Math.round(45 + (285 * i) / (N - 1));
    const deliveredAt = past(deliveryDaysAgo);

    const model = MODELS[i % MODELS.length];
    const priceJitter = Math.round((rand() - 0.5) * 1600); // ±800 €
    const price = Math.max(10000, Math.min(40000, model.basePrice + priceJitter));
    const purchase = Math.round(price * (1 - model.marginPct));

    const year = 2022 + Math.floor(rand() * 3);
    const firstRegDate = new Date(year, Math.floor(rand() * 12), 1 + Math.floor(rand() * 27));
    const mileage = 8000 + Math.floor(rand() * 60000);

    const [zip, city, street] = pick(CITIES, rand);
    const houseNo = 1 + Math.floor(rand() * 120);
    const name = NAMES[i % NAMES.length];
    const isCompany = name.includes("GmbH") || name.includes("UG");
    const emailLocal = isCompany
      ? "info"
      : name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
    const emailHost = isCompany
      ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".de"
      : "example.de";

    extraCustomers.push({
      id: cId,
      name,
      email: `${emailLocal}@${emailHost}`,
      phone: `+49 ${150 + Math.floor(rand() * 30)} ${1000000 + Math.floor(rand() * 8999999)}`,
      street: `${street} ${houseNo}`,
      zip, city,
    });

    extraVehicles.push({
      id: vId,
      vin: randVin(rand),
      type: model.type,
      make: model.make,
      model: model.model,
      year,
      fuel: model.fuel,
      transmission: model.transmission,
      power_kw: model.power_kw,
      power_hp: model.power_hp,
      doors: model.doors,
      seats: model.seats,
      color: pick(COLORS, rand),
      mileage,
      firstRegistration: isoDate(firstRegDate),
      hu: isoDate(new Date(firstRegDate.getFullYear() + 3, firstRegDate.getMonth(), firstRegDate.getDate())),
      listPrice: price,
      purchasePrice: purchase,
      status: "sold",
      arrivedAt: iso(past(deliveryDaysAgo + 35)),
      soldAt: iso(deliveredAt),
      location: { name: "Beim Kunden (übergeben)", kind: "customer", since: iso(deliveredAt) },
      locationHistory: [
        { name: "Showroom", kind: "showroom", since: iso(past(deliveryDaysAgo + 20)) },
        { name: "Hof A · Platz 01", kind: "lot", since: iso(past(deliveryDaysAgo + 35)) },
      ],
      costs: [
        { id: `KD-${idx}-1`, category: "transport", description: "Anlieferung", netAmount: 220 + Math.floor(rand() * 280), vatRate: 19, date: iso(past(deliveryDaysAgo + 34)), createdAt: iso(past(deliveryDaysAgo + 34)), createdBy: "Admin" },
        { id: `KD-${idx}-2`, category: "detailing", description: "Aufbereitung", netAmount: 180 + Math.floor(rand() * 420), vatRate: 19, date: iso(past(deliveryDaysAgo + 20)), createdAt: iso(past(deliveryDaysAgo + 20)), createdBy: "Admin" },
      ],
    });

    extraOffers.push({
      id: ofId,
      vehicleId: vId,
      customerId: cId,
      createdAt: iso(past(deliveryDaysAgo + 25)),
      validUntil: iso(past(deliveryDaysAgo + 11)),
      price,
      status: "accepted",
      customerTodos: [],
    });

    const days = (n: number) => iso(past(deliveryDaysAgo + n));
    const dDate = (n: number) => isoDate(past(deliveryDaysAgo + n));

    extraProcesses.push({
      id: pId,
      vehicleId: vId,
      customerId: cId,
      acceptedOfferId: ofId,
      createdAt: days(25),
      updatedAt: iso(deliveredAt),
      currentStep: "delivery_confirmation",
      steps: {
        offer:                 { status: "completed", completedAt: days(25), documentArchived: true },
        down_payment:          { status: i % 3 === 0 ? "skipped" : "completed", completedAt: days(22), documentArchived: i % 3 !== 0 },
        order_confirmation:    { status: "completed", completedAt: days(20), documentArchived: true },
        outbound_check:        { status: "completed", completedAt: days(7), documentArchived: true },
        invoicing:             { status: "completed", completedAt: days(5), documentArchived: true },
        purchase_contract:     { status: "completed", completedAt: days(3), documentArchived: true },
        delivery_confirmation: { status: "completed", completedAt: iso(deliveredAt), documentArchived: true },
      },
      fields: {
        finalPrice: price,
        downPayment: i % 3 === 0 ? undefined : { amount: Math.round(price * 0.15 / 100) * 100, dueDate: dDate(22), method: "Überweisung", received: true, receivedDate: dDate(22) },
        orderConfirmation: { orderDate: dDate(20), deliveryDate: dDate(0), paymentTerms: "Restzahlung bei Übergabe" },
        invoicing: { invoiceNumber: `RE-DEMO-${String(idx).padStart(4, "0")}`, invoiceDate: dDate(5), dueDate: dDate(-9), paid: true, paidDate: dDate(-2) },
        purchaseContract: { contractNumber: `KV-DEMO-${String(idx).padStart(4, "0")}`, contractDate: dDate(3), warrantyMonths: 12, place: city },
        delivery: { handoverDate: isoDate(deliveredAt), handoverLocation: "Showroom", finalMileage: mileage, fuelLevel: "voll", customerSignature: true },
      },
      customerTodosOC: [],
      outboundChecklist: DEFAULT_OUTBOUND_CHECKLIST().map((c) => ({ ...c, done: true })),
    });
  }

  return {
    vehicles: [...MOCK_VEHICLES, ...extraVehicles],
    customers: [...MOCK_CUSTOMERS, ...extraCustomers],
    offers: [...MOCK_OFFERS, ...extraOffers],
    processes: [...MOCK_PROCESSES, ...extraProcesses],
    purchasePlans: MOCK_PURCHASE_PLANS,
    todos: MOCK_TODOS,
    activities: MOCK_ACTIVITIES,
    goals: MOCK_GOALS,
    calendarEvents: MOCK_CALENDAR_EVENTS,
    dayTemplates: DEFAULT_DAY_TEMPLATES,
    settings: DEFAULT_SETTINGS,
  };
};
