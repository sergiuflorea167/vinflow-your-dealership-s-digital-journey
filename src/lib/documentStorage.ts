import { supabase } from "@/integrations/supabase/client";
import type { StoredDocument } from "@/data/process";

const BUCKET = "vinflow-documents";
export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024;

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
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(document.storagePath, 60);
  if (error) throw error;
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
};

export const deleteStoredDocument = async (document: StoredDocument) => {
  const { error } = await supabase.storage.from(BUCKET).remove([document.storagePath]);
  if (error) throw error;
};

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
};
