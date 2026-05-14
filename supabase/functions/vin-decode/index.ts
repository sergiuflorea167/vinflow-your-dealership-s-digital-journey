// VIN-Decoder via CarsXE (https://api.carsxe.com)
// Deterministisch, ohne KI. Liefert die offiziellen Vincario/CarsXE-Daten.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TYPE_MAP: Record<string, string> = {
  sedan: "limousine",
  "sedan/saloon": "limousine",
  saloon: "limousine",
  limousine: "limousine",
  wagon: "kombi",
  "station wagon": "kombi",
  estate: "kombi",
  kombi: "kombi",
  hatchback: "kleinwagen",
  "compact car": "kleinwagen",
  suv: "suv",
  "sport utility": "suv",
  "crossover utility": "suv",
  coupe: "coupe",
  "coupé": "coupe",
  convertible: "cabrio",
  cabriolet: "cabrio",
  roadster: "cabrio",
  van: "van",
  minivan: "van",
  pickup: "pickup",
  truck: "transporter",
};

const FUEL_MAP: Record<string, string> = {
  gasoline: "Benzin",
  petrol: "Benzin",
  diesel: "Diesel",
  electric: "Elektro",
  "plug-in hybrid": "Plug-in-Hybrid",
  phev: "Plug-in-Hybrid",
  hybrid: "Hybrid",
  cng: "Gas",
  lpg: "Gas",
};

function mapValue(map: Record<string, string>, raw?: string): string | undefined {
  if (!raw) return undefined;
  const k = raw.toLowerCase().trim();
  if (map[k]) return map[k];
  for (const [needle, val] of Object.entries(map)) {
    if (k.includes(needle)) return val;
  }
  return undefined;
}

function titleCaseMake(make: string): string {
  if (make.length <= 3) return make.toUpperCase();
  return make.charAt(0).toUpperCase() + make.slice(1).toLowerCase();
}

function num(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const m = String(v).match(/\d+(?:[.,]\d+)?/);
  if (!m) return undefined;
  const n = Number(m[0].replace(",", "."));
  return isFinite(n) ? n : undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("CARSXE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "CARSXE_API_KEY ist nicht konfiguriert" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { vin } = await req.json();
    const v = String(vin ?? "").trim().toUpperCase();
    if (v.length < 11 || v.length > 17) {
      return new Response(JSON.stringify({ error: "VIN ungültig" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://api.carsxe.com/specs?key=${encodeURIComponent(apiKey)}&vin=${encodeURIComponent(v)}`;
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: `CarsXE HTTP ${res.status}`, details: txt.slice(0, 500) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const json = await res.json();
    if (!json?.success || !json?.attributes) {
      return new Response(JSON.stringify({
        error: "VIN konnte über CarsXE nicht dekodiert werden",
        details: json?.message || json?.error || null,
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const a = json.attributes as Record<string, any>;

    // Hubraum: CarsXE liefert oft "1995" (ccm) als displacement_cc / engine_displacement
    let displacement_l: number | undefined =
      num(a.displacement_l) ??
      num(a.engine_displacement_l);
    const ccm =
      num(a.engine_displacement) ??
      num(a.displacement_cc) ??
      num(a.displacement);
    if (!displacement_l && ccm && ccm > 100) {
      displacement_l = Math.round((ccm / 1000) * 10) / 10;
    } else if (!displacement_l && ccm && ccm <= 10) {
      displacement_l = ccm;
    }

    // Leistung
    let power_hp = num(a.engine_horsepower) ?? num(a.horsepower) ?? num(a.power_hp);
    const kw = num(a.engine_kw) ?? num(a.power_kw);
    if (!power_hp && kw) power_hp = Math.round(kw * 1.35962);

    // Getriebe
    let transmission: string | undefined;
    const tRaw = String(a.transmission ?? "").toLowerCase();
    if (tRaw.includes("dsg") || tRaw.includes("dkg") || tRaw.includes("dual")) transmission = "DKG";
    else if (tRaw.includes("cvt")) transmission = "CVT";
    else if (tRaw.includes("auto")) transmission = "Automatik";
    else if (tRaw.includes("manual") || tRaw.includes("schalt")) transmission = "Schaltgetriebe";

    const decoded = {
      make: a.make ? titleCaseMake(String(a.make)) : undefined,
      model: a.model ? String(a.model) : undefined,
      year: a.year && /^\d{4}$/.test(String(a.year)) ? Number(a.year) : undefined,
      type: mapValue(TYPE_MAP, a.body || a.product_type),
      fuel: mapValue(FUEL_MAP, a.fuel_type || a.fuel_type_primary),
      transmission,
      power_hp,
      displacement_l,
      trim: a.series || a.trim || undefined,
      manufacturer: a.manufacturer || undefined,
      country: a.plant_country || undefined,
      doors: a.no_of_doors ? String(a.no_of_doors) : undefined,
      seats: a.no_of_seats ? String(a.no_of_seats) : undefined,
      hsn: undefined,
      tsn: undefined,
      features: [],
      confidence: 1,
      source: "carsxe.com",
      source_url: `https://api.carsxe.com/specs?vin=${v}`,
      raw: a,
    };

    if (!decoded.make) {
      return new Response(JSON.stringify({
        error: "VIN konnte über CarsXE nicht dekodiert werden",
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify(decoded), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
