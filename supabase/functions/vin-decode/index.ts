// VIN-Decoder via Lovable AI Gateway
// Nimmt eine VIN entgegen und liefert geschätzte Fahrzeugdaten (Marke, Modell,
// Baujahr, Kraftstoff, Getriebe, Leistung, Typ, Ausstattung-Stichworte) als JSON.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Du bist ein VIN-Dekoder für europäische Fahrzeuge.
Aus einer 17-stelligen VIN leitest du so präzise wie möglich Fahrzeugdaten ab
(WMI = Hersteller/Land, VDS = Modellreihe/Karosserie/Motor, Modelljahrcode an Pos. 10).
Wenn ein Wert nicht eindeutig bestimmbar ist, gib einen plausiblen, branchenüblichen
Default an und setze "confidence" entsprechend niedriger. Antworte AUSSCHLIESSLICH als
gültiges JSON nach folgendem Schema:

{
  "make": string,
  "model": string,
  "year": number,
  "type": "limousine"|"kombi"|"suv"|"coupe"|"cabrio"|"van"|"transporter"|"pickup"|"kleinwagen",
  "fuel": "Benzin"|"Diesel"|"Hybrid"|"Elektro"|"Plug-in-Hybrid"|"Gas",
  "transmission": "Schaltgetriebe"|"Automatik"|"DKG"|"CVT",
  "power_hp": number,
  "color": string,
  "features": string[],
  "confidence": number
}`;

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
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY fehlt" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
          { role: "system", content: SYSTEM },
          { role: "user", content: `Dekodiere diese VIN: ${v}` },
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: `AI-Gateway ${res.status}: ${t}` }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
