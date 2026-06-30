import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type StoredSnapshot = {
  version: 2;
  ownerId: string;
  accessCodeHash: string;
  payload: Record<string, unknown>;
};

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const normalizeAccessCode = (value: unknown) => String(value ?? "").replace(/\s+/g, "").toUpperCase();

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const hashAccessCode = (token: string, accessCode: string) => sha256(`${token}:${normalizeAccessCode(accessCode)}`);

const generateToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const isSecureToken = (token: string) => /^[A-Za-z0-9_-]{40,128}$/.test(token);

const isStoredSnapshot = (value: unknown): value is StoredSnapshot => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<StoredSnapshot>;
  return item.version === 2 && typeof item.ownerId === "string" &&
    typeof item.accessCodeHash === "string" && !!item.payload && typeof item.payload === "object";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceRoleKey) {
      return jsonResponse({ error: "Backend nicht konfiguriert" }, 500);
    }

    const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const token = typeof body?.token === "string" ? body.token : "";

    if (action === "load") {
      const accessCode = normalizeAccessCode(body?.accessCode);
      if (!isSecureToken(token) || !accessCode) return jsonResponse({ error: "Link oder Sicherheits-Code ungültig" }, 400);
      const { data, error } = await supabase
        .from("customer_tracking_snapshots")
        .select("snapshot")
        .eq("token", token)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .maybeSingle();

      if (error) throw error;
      if (!isStoredSnapshot(data?.snapshot)) return jsonResponse({ error: "Link ist abgelaufen und muss neu erstellt werden" }, 410);
      const providedHash = await hashAccessCode(token, accessCode);
      if (providedHash !== data.snapshot.accessCodeHash) return jsonResponse({ error: "Link oder Sicherheits-Code ungültig" }, 403);
      return jsonResponse({ snapshot: data.snapshot.payload });
    }

    if (action === "save") {
      const authorization = req.headers.get("Authorization") ?? "";
      const jwt = authorization.replace(/^Bearer\s+/i, "");
      const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
      if (authError || !authData.user) return jsonResponse({ error: "Anmeldung erforderlich" }, 401);

      const processId = typeof body?.processId === "string" ? body.processId : "";
      const snapshot = body?.snapshot;
      const accessCode = normalizeAccessCode(body?.accessCode);
      if (!processId || !snapshot || typeof snapshot !== "object" || !accessCode) {
        return jsonResponse({ error: "Unvollständige Tracking-Daten" }, 400);
      }
      if (JSON.stringify(snapshot).length > 750_000) return jsonResponse({ error: "Tracking-Daten sind zu groß" }, 413);

      let saveToken = isSecureToken(token) ? token : "";
      if (saveToken) {
        const { data: existing, error: existingError } = await supabase
          .from("customer_tracking_snapshots")
          .select("process_id,snapshot")
          .eq("token", saveToken)
          .maybeSingle();
        if (existingError) throw existingError;
        if (!existing || existing.process_id !== processId || !isStoredSnapshot(existing.snapshot) || existing.snapshot.ownerId !== authData.user.id) {
          return jsonResponse({ error: "Kundenportal-Link gehört nicht zu diesem Vorgang" }, 403);
        }
      } else {
        saveToken = generateToken();
      }

      const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
      const stored: StoredSnapshot = {
        version: 2,
        ownerId: authData.user.id,
        accessCodeHash: await hashAccessCode(saveToken, accessCode),
        payload: snapshot as Record<string, unknown>,
      };
      const { error } = await supabase
        .from("customer_tracking_snapshots")
        .upsert({ token: saveToken, process_id: processId, snapshot: stored, expires_at: expiresAt });

      if (error) throw error;
      return jsonResponse({ ok: true, token: saveToken });
    }

    return jsonResponse({ error: "Unbekannte Aktion" }, 400);
  } catch (e) {
    console.error("customer-tracking failed", e);
    return jsonResponse({ error: "Kundenportal konnte nicht verarbeitet werden" }, 500);
  }
});
