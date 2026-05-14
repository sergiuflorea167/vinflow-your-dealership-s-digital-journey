// VIN-Decoder
// Strategie:
// 1) NHTSA vPIC (kostenlos, ohne Key) liefert verifizierte Stammdaten
//    (Marke, Modell, Baujahr, Karosserie, Motor, PS, Kraftstoff, Getriebe).
//    Funktioniert sehr gut für europäische VAG-/BMW-/MB-VINs.
// 2) Lovable AI veredelt die Antwort (Modell-Variante, Ausstattungs-Stichworte,
//    Plausi-Check). Stammdaten von NHTSA überschreiben AI immer, wenn vorhanden.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Decoded = {
  make?: string;
  model?: string;
  year?: number;
  type?: string;
  fuel?: string;
  transmission?: string;
  power_hp?: number;
  displacement_l?: number;
  color?: string;
  features?: string[];
  hsn?: string;
  tsn?: string;
  confidence?: number;
  source?: string;
};

const TYPE_MAP: Record<string, string> = {
  sedan: "limousine",
  saloon: "limousine",
  wagon: "kombi",
  "station wagon": "kombi",
  estate: "kombi",
  hatchback: "kleinwagen",
  suv: "suv",
  "sport utility": "suv",
  "crossover utility": "suv",
  coupe: "coupe",
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
const TRANS_MAP: Record<string, string> = {
  automatic: "Automatik",
  "automated manual transmission (amt)": "Automatik",
  "dual-clutch transmission (dct)": "DKG",
  dsg: "DKG",
  manual: "Schaltgetriebe",
  "manual/standard": "Schaltgetriebe",
  cvt: "CVT",
  "continuously variable transmission (cvt)": "CVT",
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

async function decodeViaNHTSA(vin: string): Promise<Decoded | null> {
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const rows: Array<{ Variable: string; Value: string | null }> = json?.Results ?? [];
    const get = (name: string) =>
      rows.find((r) => r.Variable === name)?.Value?.trim() || undefined;

    const make = get("Make");
    if (!make) return null;
    const model = get("Model");
    const yearStr = get("Model Year");
    const body = get("Body Class");
    const fuelPrim = get("Fuel Type - Primary");
    const fuelSec = get("Fuel Type - Secondary");
    const trans = get("Transmission Style");
    const hp = get("Engine Brake (hp) From") || get("Engine Power (hp)");
    const displ = get("Displacement (L)");

    let fuel = mapValue(FUEL_MAP, fuelPrim);
    if (fuelSec && fuel === "Benzin") fuel = "Hybrid";
    if (fuelSec && /electric/i.test(fuelSec) && fuelPrim) fuel = "Plug-in-Hybrid";

    return {
      make: make.charAt(0) + make.slice(1).toLowerCase(),
      model: model,
      year: yearStr ? Number(yearStr) : undefined,
      type: mapValue(TYPE_MAP, body),
      fuel,
      transmission: mapValue(TRANS_MAP, trans),
      power_hp: hp ? Math.round(Number(hp)) : undefined,
      displacement_l: displ ? Number(displ) : undefined,
      source: "nhtsa",
    };
  } catch (_e) {
    return null;
  }
}

async function enrichViaAI(vin: string, base: Decoded | null): Promise<Decoded | null> {
  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) return null;

  const sys = `Du bist VIN- und Fahrzeug-Experte für den deutschen Markt.
Aufgabe: Aus VIN + bereits verifizierten Stammdaten ergänzt du fehlende Felder
(Modellvariante, typische Ausstattung, deutsche HSN/TSN sofern aus Modelljahr/
Motorisierung eindeutig ableitbar). Erfinde NICHTS – im Zweifel weglassen oder
"confidence" niedriger setzen. Antworte ausschließlich als gültiges JSON:

{
  "make": string|null,
  "model": string|null,            // bevorzuge spezifische Variante (z.B. "A6 Avant 2.0 TDI")
  "year": number|null,
  "type": "limousine"|"kombi"|"suv"|"coupe"|"cabrio"|"van"|"transporter"|"pickup"|"kleinwagen"|null,
  "fuel": "Benzin"|"Diesel"|"Hybrid"|"Elektro"|"Plug-in-Hybrid"|"Gas"|null,
  "transmission": "Schaltgetriebe"|"Automatik"|"DKG"|"CVT"|null,
  "power_hp": number|null,
  "displacement_l": number|null,
  "hsn": string|null,             // 4-stellig, deutsche KBA-Herstellernummer
  "tsn": string|null,             // 3-stellig, deutsche KBA-Typnummer
  "features": string[],            // 5–12 typische Ausstattungs-Stichworte für genau dieses Modell/Jahr/Motor
  "confidence": number             // 0..1
}`;

  const userPrompt = `VIN: ${vin}
Verifizierte Stammdaten (NHTSA): ${JSON.stringify(base ?? {})}
Bitte ergänzen.`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    return JSON.parse(content) as Decoded;
  } catch (_e) {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { vin } = await req.json();
    const v = String(vin ?? "").trim().toUpperCase();
    if (v.length < 11 || v.length > 17) {
      return new Response(JSON.stringify({ error: "VIN ungültig" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [nhtsa, ai] = await Promise.all([
      decodeViaNHTSA(v),
      enrichViaAI(v, null), // AI bekommt parallel VIN, finale Merge-Logik unten
    ]);

    // Merge: NHTSA gewinnt bei Stammdaten (verifiziert), AI füllt nur Lücken.
    const merged: Decoded = {
      make: nhtsa?.make ?? ai?.make ?? undefined,
      model: nhtsa?.model ?? ai?.model ?? undefined,
      year: nhtsa?.year ?? ai?.year ?? undefined,
      type: nhtsa?.type ?? ai?.type ?? undefined,
      fuel: nhtsa?.fuel ?? ai?.fuel ?? undefined,
      transmission: nhtsa?.transmission ?? ai?.transmission ?? undefined,
      power_hp: nhtsa?.power_hp ?? ai?.power_hp ?? undefined,
      displacement_l: nhtsa?.displacement_l ?? ai?.displacement_l ?? undefined,
      hsn: ai?.hsn ?? undefined,
      tsn: ai?.tsn ?? undefined,
      features: Array.isArray(ai?.features) ? ai!.features : [],
      confidence: nhtsa ? Math.max(0.85, ai?.confidence ?? 0.5) : ai?.confidence ?? 0.4,
      source: nhtsa ? (ai ? "nhtsa+ai" : "nhtsa") : ai ? "ai" : "none",
    };

    if (!merged.make) {
      return new Response(
        JSON.stringify({ error: "VIN konnte nicht dekodiert werden" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(merged), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
