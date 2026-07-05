import { supabase } from "@/integrations/supabase/client";
import type { StoredDocument } from "@/data/process";

const BUCKET = "vinflow-documents";
export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024;
const STORAGE_GATEWAY_URL = import.meta.env.VITE_DOCUMENT_STORAGE_URL as string | undefined;
const STORAGE_GATEWAY_KEY = import.meta.env.VITE_DOCUMENT_STORAGE_PUBLISHABLE_KEY as string | undefined;

const usesStorageGateway = Boolean(STORAGE_GATEWAY_URL && STORAGE_GATEWAY_KEY);

const gatewayError = async (response: Response) => {
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  return new Error(payload?.error || `Dokumentenablage nicht erreichbar (${response.status}).`);
};

const gatewayHeaders = async (contentType?: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Bitte erneut anmelden, um Dokumente zu verwalten.");
  return {
    apikey: STORAGE_GATEWAY_KEY!,
    Authorization: `Bearer ${session.access_token}`,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
};

const safeSegment = (value: string) => value
  .normalize("NFKD")
  .replace(/[^A-Za-z0-9._-]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 120) || "datei";

export const validateDocumentFile = (file: File): string | null => {
  if (!file.size) return "Die Datei ist leer.";
  if (file.size > MAX_DOCUMENT_SIZE) return "Die Datei darf maximal 20 MB groß sein.";
  return null;
};

export const uploadStoredDocument = async ({
  file,
  organizationId,
  entityType,
  entityId,
  uploadedBy,
}: {
  file: File;
  organizationId: string;
  entityType: "process" | "todo";
  entityId: string;
  uploadedBy: string;
}): Promise<StoredDocument> => {
  const validationError = validateDocumentFile(file);
  if (validationError) throw new Error(validationError);
  if (usesStorageGateway) {
    const url = new URL(STORAGE_GATEWAY_URL!);
    url.searchParams.set("action", "upload");
    url.searchParams.set("entityType", entityType);
    url.searchParams.set("entityId", entityId);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...await gatewayHeaders(file.type || "application/octet-stream"),
        "x-file-name": encodeURIComponent(file.name),
        "x-organization-id": organizationId,
        "x-uploaded-by": encodeURIComponent(uploadedBy),
      },
      body: file,
    });
    if (!response.ok) throw await gatewayError(response);
    return await response.json() as StoredDocument;
  }
  const id = crypto.randomUUID();
  const storagePath = [organizationId, entityType, safeSegment(entityId), `${id}-${safeSegment(file.name)}`].join("/");
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  return {
    id,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    storagePath,
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    portalVisible: false,
  };
};

export const openStoredDocument = async (document: StoredDocument) => {
  if (usesStorageGateway) {
    const url = new URL(STORAGE_GATEWAY_URL!);
    url.searchParams.set("action", "sign");
    const response = await fetch(url, {
      method: "POST",
      headers: await gatewayHeaders("application/json"),
      body: JSON.stringify({ storagePath: document.storagePath }),
    });
    if (!response.ok) throw await gatewayError(response);
    const { signedUrl } = await response.json() as { signedUrl: string };
    window.open(signedUrl, "_blank", "noopener,noreferrer");
    return;
  }
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(document.storagePath, 60);
  if (error) throw error;
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
};

export const deleteStoredDocument = async (document: StoredDocument) => {
  if (usesStorageGateway) {
    const url = new URL(STORAGE_GATEWAY_URL!);
    url.searchParams.set("action", "delete");
    const response = await fetch(url, {
      method: "POST",
      headers: await gatewayHeaders("application/json"),
      body: JSON.stringify({ storagePath: document.storagePath }),
    });
    if (!response.ok) throw await gatewayError(response);
    return;
  }
  const { error } = await supabase.storage.from(BUCKET).remove([document.storagePath]);
  if (error) throw error;
};

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
};
