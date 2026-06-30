// VIN-Decoder
// Einzige Quelle: freevindecoder.eu. Es wird KEINE KI-Anreicherung mehr
// verwendet, damit die Ergebnisse deterministisch und nachvollziehbar sind.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  trim?: string;
  manufacturer?: string;
  country?: string;
  doors?: string;
  seats?: string;
  source?: string;
  source_url?: string;
  raw?: Record<string, string>;
};

const TYPE_MAP: Record<string, string> = {
  sedan: "limousine",
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
  convertible: "cabrio",
  cabriolet: "cabrio",
  roadster: "cabrio",
  van: "transporter",
  minivan: "transporter",
  pickup: "transporter",
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
    const cells = [...rowMatch[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)]
      .map((m) => stripTags(m[1]))
      .filter((c) => c.length > 0);
    if (cells.length >= 2) {
      const key = cells[0].toLowerCase();
      // erste Zelle ist Label, zweite Zelle ist Wert
      if (!(key in rows)) rows[key] = cells[1];
    }
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

function mapTransmission(raw?: string): string | undefined {
  if (!raw) return undefined;
  const k = raw.toLowerCase().trim();
  // freevindecoder gibt manchmal "Automatic or Manual" / "AT" / "MT" zurück.
  // Wenn beide möglich sind => unbekannt.
  const hasAuto = /\b(automatic|automatik|\bat\b|dsg|dkg|cvt)\b/.test(k);
  const hasManual = /\b(manual|schalt|\bmt\b)\b/.test(k);
  if (hasAuto && hasManual) return undefined;
  if (k.includes("dsg") || k.includes("dkg") || k.includes("dual")) return "DKG";
  if (k.includes("cvt")) return "CVT";
  if (hasAuto) return "Automatik";
  if (hasManual) return "Schaltgetriebe";
  return undefined;
}

function titleCaseMake(make: string): string {
  // "BMW" bleibt "BMW", "VOLKSWAGEN" -> "Volkswagen"
  if (make.length <= 3) return make.toUpperCase();
  return make.charAt(0).toUpperCase() + make.slice(1).toLowerCase();
}

async function decodeViaFreeVinDecoder(vin: string): Promise<Decoded | null> {
  const res = await fetch(`${SOURCE_URL}/en/${vin}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 VINflow/1.0",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return null;
  const html = await res.text();
  const rows = extractRows(html);

  const make = rows["make"];
  if (!make) return null;

  const model = rows["model"] || rows["model name"];
  const yearStr = rows["model year"] || rows["year"];
  const body =
    rows["body type"] ||
    rows["body style"] ||
    rows["body class"] ||
    rows["vehicle class"];

  // Transmission: bevorzugt "Transmission"-Zeile, sonst kombiniert aus
  // Manual gearbox / Automatic gearbox.
  let transRaw = rows["transmission"];
  if (!transRaw) {
    const mt = rows["manual gearbox"];
    const at = rows["automatic gearbox"];
    if (mt && at) transRaw = "manual or automatic";
    else if (at) transRaw = "automatic";
    else if (mt) transRaw = "manual";
  }

  const fuel = mapValue(FUEL_MAP, rows["fuel type"] || rows["fuel"]);
  const trans = mapTransmission(transRaw);

  const hpRaw =
    rows["engine horsepower"] ||
    rows["horsepower"] ||
    rows["power"] ||
    rows["engine power"];
  const kwRaw = rows["engine kilowatts"] || rows["engine kw"];
  const displRaw =
    rows["displacement nominal"] ||
    rows["displacement"] ||
    rows["engine displacement"];
  const displSi = rows["displacement si"]; // in ccm

  const hpMatch = hpRaw?.match(/\d+(?:[.,]\d+)?/);
  const kwMatch = kwRaw?.match(/\d+(?:[.,]\d+)?/);
  let power_hp: number | undefined;
  if (hpMatch) {
    const parsed = Number(hpMatch[0].replace(",", "."));
    power_hp = Math.round(/\bkw\b/i.test(hpRaw ?? "") && !/\b(hp|ps)\b/i.test(hpRaw ?? "") ? parsed * 1.35962 : parsed);
  }
  else if (kwMatch) power_hp = Math.round(Number(kwMatch[0].replace(",", ".")) * 1.35962);

  let displacement_l: number | undefined;
  const displMatch = displRaw?.match(/\d+(?:[.,]\d+)?/);
  if (displMatch) {
    const parsed = Number(displMatch[0].replace(",", "."));
    displacement_l = parsed > 20 ? Math.round(parsed / 100) / 10 : parsed;
  }
  else if (displSi) {
    const m = displSi.match(/\d+/);
    if (m) displacement_l = Math.round(Number(m[0]) / 100) / 10;
  }

  return {
    make: titleCaseMake(make),
    model: model || undefined,
    year: yearStr && /^\d{4}$/.test(yearStr) ? Number(yearStr) : undefined,
    type: mapValue(TYPE_MAP, body),
    fuel,
    transmission: trans,
    power_hp,
    displacement_l,
    trim: rows["trim level"] || rows["trim"] || undefined,
    manufacturer: rows["manufacturer"] || undefined,
    country: rows["country"] || undefined,
    doors: rows["number of doors"] || undefined,
    seats: rows["number of seats"] || undefined,
    source: "freevindecoder.eu",
    source_url: `${SOURCE_URL}/en/${vin}`,
    raw: rows,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authorization = req.headers.get("Authorization") ?? "";
    if (!supabaseUrl || !anonKey) throw new Error("Backend nicht konfiguriert");
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Anmeldung erforderlich" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { vin } = await req.json();
    const v = String(vin ?? "").trim().toUpperCase();
    if (!/^[A-HJ-NPR-Z0-9]{11,17}$/.test(v)) {
      return new Response(JSON.stringify({ error: "VIN ungültig" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const decoded = await decodeViaFreeVinDecoder(v);

    if (!decoded || !decoded.make) {
      return new Response(
        JSON.stringify({
          error: "VIN konnte über freevindecoder.eu nicht dekodiert werden",
        source_url: `${SOURCE_URL}/en/${v}`,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        ...decoded,
        // Felder, die wir nicht mehr aus KI ergänzen — bleiben leer für manuelle Eingabe.
        hsn: undefined,
        tsn: undefined,
        features: [],
        confidence: 1,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
