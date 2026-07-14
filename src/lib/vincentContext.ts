import { useProcessStore } from "@/store/processStore";
import { KPI_CATALOG } from "@/lib/kpis";
import { PROCESS_STEPS, vehicleTotalCostsGross, COST_CATEGORY_LABELS, VEHICLE_TYPE_LABELS, grossFromNet, type Vehicle } from "@/data/process";
import { redactSensitiveText } from "@/lib/vincentPrivacy";

const appLink = (path: string) => path.startsWith("/") ? path : `/${path}`;

const VEHICLE_STATUS_LABELS: Record<Vehicle["status"], string> = {
  planned: "Geplant",
  in_stock: "Im Bestand",
  reserved: "Reserviert",
  sold: "Verkauft",
};

const VEHICLE_YEAR_PATTERN = /\b(19[5-9]\d|20[0-4]\d)\b/;

/**
 * Findet Fahrzeuge, die in der Frage per Marke + Modell (und optional Baujahr)
 * konkret angesprochen werden, z. B. "der Audi A6 von 2015".
 */
function matchVehiclesForQuestion(normalizedQuestion: string, vehicles: Vehicle[]): Vehicle[] {
  const yearMatch = normalizedQuestion.match(VEHICLE_YEAR_PATTERN);
  const mentionedYear = yearMatch ? Number(yearMatch[1]) : undefined;

  return vehicles
    .map((vehicle) => {
      const make = vehicle.make.toLocaleLowerCase("de-DE");
      const model = vehicle.model.toLocaleLowerCase("de-DE");
      if (!make || !model) return null;
      if (!normalizedQuestion.includes(make) || !normalizedQuestion.includes(model)) return null;
      let score = 2;
      if (mentionedYear) {
        const registrationYear = vehicle.firstRegistration ? Number(vehicle.firstRegistration.slice(0, 4)) : undefined;
        if (vehicle.year === mentionedYear || registrationYear === mentionedYear) score += 2;
        else score -= 1;
      }
      return { vehicle, score };
    })
    .filter((entry): entry is { vehicle: Vehicle; score: number } => entry !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((entry) => entry.vehicle);
}

/**
 * Vollständige, strukturierte Fahrzeugakte für ein konkret angefragtes Fahrzeug
 * (z. B. zur Vorbereitung eines Kundentelefonats). VIN und Kennzeichen sind
 * eigenständige Fahrzeugidentifikatoren und verlassen den Browser bewusst nie.
 */
function buildVehicleDetail(vehicle: Vehicle) {
  const costsByCategory = vehicle.costs.reduce<Record<string, number>>((acc, cost) => {
    const label = COST_CATEGORY_LABELS[cost.category];
    acc[label] = Math.round((acc[label] ?? 0) + grossFromNet(cost.netAmount, cost.vatRate));
    return acc;
  }, {});

  return {
    id: vehicle.id,
    url: appLink(`/bestand/${encodeURIComponent(vehicle.id)}`),
    identifikation: {
      typ: VEHICLE_TYPE_LABELS[vehicle.type],
      marke: vehicle.make,
      modell: vehicle.model,
      modellDetail: vehicle.modelDetail ?? null,
      baujahr: vehicle.year,
      zustand: vehicle.condition ?? null,
      hsn: vehicle.hsn ?? null,
      tsn: vehicle.tsn ?? null,
      vorbesitzer: vehicle.previousOwners ?? null,
    },
    technik: {
      kraftstoff: vehicle.fuel,
      getriebe: vehicle.transmission,
      antrieb: vehicle.drive ?? null,
      leistung_kw: vehicle.power_kw,
      leistung_ps: vehicle.power_hp,
      hubraum_ccm: vehicle.displacement_ccm ?? null,
      zylinder: vehicle.cylinders ?? null,
      schadstoffklasse: vehicle.emissionClass ?? null,
      co2_g_km: vehicle.co2_g_km ?? null,
      verbrauch_l_100km: vehicle.consumption_l_100km ?? null,
      batteriekapazitaet_kwh: vehicle.batteryCapacity_kwh ?? null,
      reichweite_km: vehicle.range_km ?? null,
    },
    optikUndInnenraum: {
      farbe: vehicle.color,
      lackcode: vehicle.paintCode ?? null,
      metallic: vehicle.metallic ?? null,
      innenraumfarbe: vehicle.interiorColor ?? null,
      innenraummaterial: vehicle.interiorMaterial ?? null,
      tueren: vehicle.doors ?? null,
      sitze: vehicle.seats ?? null,
    },
    historie: {
      laufleistung_km: vehicle.mileage,
      erstzulassung: vehicle.firstRegistration ?? null,
      naechsteHu: vehicle.hu ?? null,
      scheckheftgepflegt: vehicle.serviceBookComplete ?? null,
      unfallfrei: vehicle.accidentFree ?? null,
      nichtraucherfahrzeug: vehicle.nonSmoker ?? null,
    },
    ausstattung: vehicle.features ?? [],
    preisUndStatus: {
      status: VEHICLE_STATUS_LABELS[vehicle.status],
      listenpreis: vehicle.listPrice,
      einkaufspreis: vehicle.purchasePrice,
      zusatzkostenGesamt: Math.round(vehicleTotalCostsGross(vehicle)),
      zusatzkostenNachKategorie: costsByCategory,
      inseriert: vehicle.listed ?? null,
      eingetroffenAm: vehicle.arrivedAt ?? null,
      verkauftAm: vehicle.soldAt ?? null,
    },
    standort: { name: vehicle.location.name, art: vehicle.location.kind },
    notizen: vehicle.notes ? redactSensitiveText(vehicle.notes).text : null,
  };
}

/**
 * Erstellt ausschließlich den für die konkrete Frage notwendigen Kontext.
 * Direkte Kundenkennungen, VIN, Kennzeichen und Kontaktdaten verlassen den
 * Browser nicht. Wird ein konkretes Fahrzeug (Marke + Modell, optional
 * Baujahr) in der Frage erkannt, erhält VINcent dessen vollständige,
 * strukturierte Fahrzeugakte (Technik, Ausstattung, Zustand, Preis, Historie).
 * Die vollständige To-Do-Liste wird transparent als Arbeitskontext übertragen.
 */
export function buildVincentContext(question = "") {
  const state = useProcessStore.getState();
  const { vehicles, processes, offers, customers, todos, calendarEvents, settings } = state;
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const range = { from: yearStart, to: now, label: `YTD ${now.getFullYear()}` };
  const kpiContext = { vehicles, processes, offers, customers, processStepKeys: settings.processStepKeys, range };
  const normalizedQuestion = question.toLocaleLowerCase("de-DE");
  const wantsStock = /(bestand|fahrzeug|standzeit|lager|modell|verkauf)/.test(normalizedQuestion);
  const wantsProcesses = /(vorgang|prozess|pipeline|auftrag|schritt|abschluss)/.test(normalizedQuestion);
  const wantsTodos = /(todo|to-do|termin|heute|priorit|aufgabe|kalender)/.test(normalizedQuestion);
  const wantsKpis = /(kpi|umsatz|marge|rendite|gewinn|quote|performance|kennzahl|kosten)/.test(normalizedQuestion);
  const matchedVehicles = matchVehiclesForQuestion(normalizedQuestion, vehicles);

  const kpis = wantsKpis || (!wantsStock && !wantsProcesses && !wantsTodos)
    ? KPI_CATALOG.map((kpi) => {
        try {
          const result = kpi.compute(kpiContext);
          return {
            id: kpi.id,
            label: kpi.label,
            category: kpi.category,
            url: appLink("/kpis"),
            value: result.value,
            display: result.display,
            sub: result.sub,
            interpretation: kpi.interpretation,
          };
        } catch {
          return null;
        }
      }).filter(Boolean)
    : undefined;

  const pipeline = PROCESS_STEPS.map((step) => ({
    key: step.key,
    label: step.label,
    count: processes.filter((process) => process.currentStep === step.key && process.steps[step.key].status !== "completed").length,
  }));

  const stock = wantsStock
    ? vehicles
        .filter((vehicle) => vehicle.status === "in_stock" || vehicle.status === "reserved")
        .slice(0, 20)
        .map((vehicle) => ({
          id: vehicle.id,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          url: appLink(`/bestand/${encodeURIComponent(vehicle.id)}`),
          km: vehicle.mileage,
          status: vehicle.status,
          purchasePrice: vehicle.purchasePrice,
          listPrice: vehicle.listPrice,
          costs: vehicleTotalCostsGross(vehicle),
          arrivedAt: vehicle.arrivedAt,
        }))
    : undefined;

  const processOverview = wantsProcesses
    ? processes.slice(0, 20).map((process) => {
        const vehicle = vehicles.find((item) => item.id === process.vehicleId);
        return {
          id: process.id,
          step: process.currentStep,
          url: appLink(`/vorgaenge/${encodeURIComponent(process.id)}`),
          vehicle: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : null,
          vehicleUrl: vehicle ? appLink(`/bestand/${encodeURIComponent(vehicle.id)}`) : null,
          finalPrice: process.fields.finalPrice ?? null,
          createdAt: process.createdAt,
        };
      })
    : undefined;

  const today = now.toISOString().slice(0, 10);
  const todoOverview = {
    total: todos.filter((todo) => !todo.done).length,
    overdue: todos.filter((todo) => !todo.done && !!todo.dueDate && todo.dueDate < today).length,
    today: todos.filter((todo) => !todo.done && todo.dueDate === today).length,
    highPriority: todos.filter((todo) => !todo.done && todo.priority === "high").length,
    items: todos.map((todo) => {
      const vehicle = todo.vehicleId ? vehicles.find((item) => item.id === todo.vehicleId) : undefined;
      const process = todo.processId ? processes.find((item) => item.id === todo.processId) : undefined;
      return {
        id: todo.id,
        title: todo.title,
        url: appLink(`/todos?todo=${encodeURIComponent(todo.id)}`),
        description: todo.description ?? null,
        priority: todo.priority,
        done: todo.done,
        dueDate: todo.dueDate ?? null,
        startTime: todo.startTime ?? null,
        endTime: todo.endTime ?? null,
        scope: todo.scope,
        tags: todo.tags ?? [],
        assignee: todo.assignee ?? null,
        createdAt: todo.createdAt,
        completedAt: todo.completedAt ?? null,
        createdBy: todo.createdBy,
        vehicle: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : null,
        vehicleUrl: vehicle ? appLink(`/bestand/${encodeURIComponent(vehicle.id)}`) : null,
        process: process?.id ?? null,
        processUrl: process ? appLink(`/vorgaenge/${encodeURIComponent(process.id)}`) : null,
      };
    }),
  };
  const eventOverview = wantsTodos
    ? calendarEvents.filter((event) => event.date === today).reduce<Record<string, number>>((acc, event) => {
        acc[event.type] = (acc[event.type] ?? 0) + 1;
        return acc;
      }, {})
    : undefined;

  return {
    generatedAt: now.toISOString(),
    range: { from: range.from.toISOString(), to: range.to.toISOString(), label: range.label },
    counts: {
      vehicles: vehicles.length,
      processes: processes.length,
      offers: offers.length,
      customers: customers.length,
      openTodos: todos.filter((todo) => !todo.done).length,
    },
    links: {
      dashboard: appLink("/"),
      todos: appLink("/todos"),
      stock: appLink("/bestand"),
      processes: appLink("/vorgaenge"),
      kpis: appLink("/kpis"),
      calendar: appLink("/kalender"),
    },
    pipeline,
    ...(kpis ? { kpis } : {}),
    ...(stock ? { stock } : {}),
    ...(processOverview ? { processes: processOverview } : {}),
    todos: todoOverview,
    ...(eventOverview ? { todayEvents: eventOverview } : {}),
    ...(matchedVehicles.length ? { vehicleDetails: matchedVehicles.map(buildVehicleDetail) } : {}),
  };
}
