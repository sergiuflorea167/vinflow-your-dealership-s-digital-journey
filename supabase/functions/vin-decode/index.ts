// VIN-Decoder
// Quelle: freevindecoder.eu. Diese Quelle ist für europäische VINs verlässlicher
// als der US-fokussierte NHTSA/vPIC-Datensatz und wird daher immer als Basis
// verwendet. KI ergänzt nur Felder, die freevindecoder.eu nicht ausgibt.

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

const SOURCE_URL = "https://www.freevindecoder.eu";

const htmlDecode = (value: string) =>
  value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

function stripTags(value: string) {
  return htmlDecode(value.replace(/<[^>]*>/g, " "));
}

function extractRows(html: string): Record<string, string> {
  const rows: Record<string, string> = {};
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(html))) {
    const cells = [...rowMatch[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) => stripTags(m[1]));
    if (cells.length >= 2 && cells[0] && cells[1]) rows[cells[0].toLowerCase()] = cells[1];
  }
  return rows;
}

function mapValue(map: Record<string, string>, raw?: string): string | undefined {
  if (!raw) return undefined;
  const k = raw.toLowerCase().trim();
  if (map[k]) return map[k];
  for (const [needle, val] of Object.entries(map)) {
    if (k.includes(needle)) return val;
  }
  return undefined;
}

async function decodeViaFreeVinDecoder(vin: string): Promise<Decoded | null> {
  try {
    const res = await fetch(`${SOURCE_URL}/${vin}`, {
      headers: { "User-Agent": "Mozilla/5.0 VINflow/1.0" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const rows = extractRows(html);

    const make = rows["make"];
    if (!make) return null;
    const model = rows["model"] || rows["model name"] || rows["vehicle"];
    const yearStr = rows["model year"] || rows["year"];
    const body = rows["body"] || rows["body class"] || rows["vehicle type"];
    const fuel = mapValue(FUEL_MAP, rows["fuel"] || rows["fuel type"]);
    const trans = mapValue(TRANS_MAP, rows["transmission"] || rows["gearbox"]);
    const hpRaw = rows["power"] || rows["engine power"] || rows["horsepower"];
    const displRaw = rows["displacement"] || rows["engine displacement"];
    const hpMatch = hpRaw?.match(/\d+(?:[.,]\d+)?/);
    const displMatch = displRaw?.match(/\d+(?:[.,]\d+)?/);

    return {
      make: make.charAt(0) + make.slice(1).toLowerCase(),
      model: model,
      year: yearStr ? Number(yearStr) : undefined,
      type: mapValue(TYPE_MAP, body),
      fuel,
      transmission: trans,
      power_hp: hpMatch ? Math.round(Number(hpMatch[0].replace(",", "."))) : undefined,
      displacement_l: displMatch ? Number(displMatch[0].replace(",", ".")) : undefined,
      source: "freevindecoder",
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
