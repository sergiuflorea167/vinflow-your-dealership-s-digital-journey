import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "vinflow-documents";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-file-name, x-organization-id, x-uploaded-by",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const safeSegment = (value: string) => value
  .normalize("NFKD")
  .replace(/[^A-Za-z0-9._-]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 120) || "datei";

const decodedHeader = (request: Request, name: string) => {
  const value = request.headers.get(name) || "";
  try { return decodeURIComponent(value); } catch { return value; }
};

const authenticateLegacyUser = async (request: Request) => {
  const legacyUrl = Deno.env.get("LEGACY_SUPABASE_URL");
  const legacyAnonKey = Deno.env.get("LEGACY_SUPABASE_ANON_KEY");
  const authorization = request.headers.get("Authorization");
  if (!legacyUrl || !legacyAnonKey) throw new Error("Die Dokumentenablage ist nicht konfiguriert.");
  if (!authorization?.startsWith("Bearer ")) throw new Error("Bitte erneut anmelden.");

  const headers = { apikey: legacyAnonKey, Authorization: authorization };
  const userResponse = await fetch(`${legacyUrl}/auth/v1/user`, { headers });
  if (!userResponse.ok) throw new Error("Die Anmeldung ist abgelaufen. Bitte erneut anmelden.");
  const user = await userResponse.json() as { id: string };
  const profileResponse = await fetch(
    `${legacyUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=organization_id`,
    { headers },
  );
  if (!profileResponse.ok) throw new Error("Der Benutzerzugriff konnte nicht geprüft werden.");
  const profiles = await profileResponse.json() as Array<{ organization_id: string | null }>;
  const organizationId = profiles[0]?.organization_id;
  if (!organizationId) throw new Error("Dem Benutzer ist keine Organisation zugeordnet.");
  return { userId: user.id, organizationId };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Methode nicht erlaubt." }, 405);

  try {
    const { userId, organizationId } = await authenticateLegacyUser(request);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Die Dokumentenablage ist nicht verfügbar.");
    const storage = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }).storage.from(BUCKET);
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "upload") {
      const expectedOrganizationId = request.headers.get("x-organization-id");
      if (expectedOrganizationId !== organizationId) return json({ error: "Organisation stimmt nicht überein." }, 403);
      const entityType = url.searchParams.get("entityType");
      const entityId = url.searchParams.get("entityId") || "";
      if (entityType !== "process" && entityType !== "todo") return json({ error: "Ungültiger Dokumenttyp." }, 400);
      if (!entityId || entityId.length > 200) return json({ error: "Ungültige Zuordnung." }, 400);
      const declaredLength = Number(request.headers.get("content-length") || 0);
      if (declaredLength > MAX_FILE_SIZE) return json({ error: "Die Datei darf maximal 20 MB groß sein." }, 413);
      const bytes = new Uint8Array(await request.arrayBuffer());
      if (!bytes.length) return json({ error: "Die Datei ist leer." }, 400);
      if (bytes.length > MAX_FILE_SIZE) return json({ error: "Die Datei darf maximal 20 MB groß sein." }, 413);

      const id = crypto.randomUUID();
      const fileName = decodedHeader(request, "x-file-name") || "datei";
      const uploadedBy = decodedHeader(request, "x-uploaded-by").slice(0, 200);
      const storagePath = [organizationId, entityType, safeSegment(entityId), `${id}-${safeSegment(fileName)}`].join("/");
      const mimeType = request.headers.get("content-type") || "application/octet-stream";
      const { error } = await storage.upload(storagePath, bytes, { contentType: mimeType, upsert: false });
      if (error) throw error;
      return json({
        id,
        name: fileName,
        mimeType,
        size: bytes.length,
        storagePath,
        uploadedAt: new Date().toISOString(),
        uploadedBy: uploadedBy || userId,
        portalVisible: false,
      }, 201);
    }

    const payload = await request.json().catch(() => ({})) as { storagePath?: string };
    const storagePath = payload.storagePath || "";
    if (!storagePath.startsWith(`${organizationId}/`)) return json({ error: "Kein Zugriff auf dieses Dokument." }, 403);

    if (action === "sign") {
      const { data, error } = await storage.createSignedUrl(storagePath, 60);
      if (error) throw error;
      return json({ signedUrl: data.signedUrl });
    }
    if (action === "delete") {
      const { error } = await storage.remove([storagePath]);
      if (error) throw error;
      return json({ deleted: true });
    }
    return json({ error: "Unbekannte Aktion." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dokumentenablage nicht erreichbar.";
    const status = /anmeld|Benutzerzugriff/i.test(message) ? 401 : 500;
    return json({ error: message }, status);
  }
});
