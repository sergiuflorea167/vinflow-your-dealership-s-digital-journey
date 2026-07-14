import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

const jsonResponse = (body: unknown, status: number) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
});

const transcriptionUrl = () => {
  const explicit = Deno.env.get("AI_TRANSCRIBE_API_URL");
  if (explicit) return explicit;
  const chatUrl = Deno.env.get("AI_API_URL");
  if (!chatUrl) return "";
  return chatUrl.replace(/\/chat\/completions\/?$/, "/audio/transcriptions");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { ...corsHeaders, ...securityHeaders } });
  if (req.method !== "POST") return jsonResponse({ error: "Methode nicht erlaubt" }, 405);

  try {
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 8_000_000) return jsonResponse({ error: "Audio ist zu groß" }, 413);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const aiApiKey = Deno.env.get("AI_API_KEY");
    const aiModel = Deno.env.get("AI_TRANSCRIBE_MODEL") ?? "whisper-1";
    const aiApiUrl = transcriptionUrl();
    if (!supabaseUrl || !anonKey || !aiApiKey || !aiApiUrl) {
      return jsonResponse({ error: "Spracherkennung ist nicht konfiguriert" }, 500);
    }

    let upstreamUrl: URL;
    try {
      upstreamUrl = new URL(aiApiUrl);
      if (upstreamUrl.protocol !== "https:") throw new Error("HTTPS required");
    } catch {
      return jsonResponse({ error: "Spracherkennung ist ungültig konfiguriert" }, 500);
    }

    const authorization = req.headers.get("Authorization") ?? "";
    if (!authorization.toLowerCase().startsWith("bearer ")) return jsonResponse({ error: "Anmeldung erforderlich" }, 401);
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) return jsonResponse({ error: "Anmeldung erforderlich" }, 401);

    const formData = await req.formData().catch(() => null);
    const audio = formData?.get("audio");
    if (!(audio instanceof File) || audio.size === 0) {
      return jsonResponse({ error: "Keine Audiodatei erhalten" }, 400);
    }
    if (audio.size > 8_000_000) return jsonResponse({ error: "Audio ist zu groß" }, 413);

    const lang = formData?.get("lang") === "en" ? "en" : "de";
    const upstreamForm = new FormData();
    upstreamForm.append("file", audio, audio.name || "vincent.webm");
    upstreamForm.append("model", aiModel);
    upstreamForm.append("language", lang);
    upstreamForm.append("response_format", "json");

    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${aiApiKey}` },
      body: upstreamForm,
      signal: AbortSignal.timeout(30_000),
    });
    const body = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      console.error("VINcent transcription upstream failed", { status: upstream.status });
      return jsonResponse({ error: "Sprache konnte nicht verarbeitet werden" }, upstream.status === 429 ? 429 : 502);
    }

    const text = typeof body?.text === "string" ? body.text.trim().slice(0, 4_000) : "";
    if (!text) return jsonResponse({ error: "Ich konnte keine Sprache erkennen" }, 422);
    return jsonResponse({ text }, 200);
  } catch (error) {
    console.error("VINcent transcription failed", error instanceof Error ? error.name : "unknown");
    return jsonResponse({ error: "Sprache konnte nicht verarbeitet werden" }, 500);
  }
});
