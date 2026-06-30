import { useId, useRef, useState } from "react";
import { Eye, EyeOff, ExternalLink, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { StoredDocument } from "@/data/process";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  deleteStoredDocument,
  formatFileSize,
  openStoredDocument,
  uploadStoredDocument,
  validateDocumentFile,
} from "@/lib/documentStorage";

interface DocumentManagerProps {
  documents: StoredDocument[];
  entityType: "process" | "todo";
  entityId: string;
  onChange: (documents: StoredDocument[]) => void;
  allowPortalVisibility?: boolean;
  compact?: boolean;
  disabled?: boolean;
}

export const DocumentManager = ({
  documents,
  entityType,
  entityId,
  onChange,
  allowPortalVisibility = false,
  compact = false,
  disabled = false,
}: DocumentManagerProps) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { organization, user, profile } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const uploaderName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || user?.email || "VINflow";

  const uploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length || uploading || disabled) return;
    if (!organization?.id) {
      toast.error("Dokumentenablage ist erst mit einer Organisation verfügbar.");
      return;
    }
    const invalid = files.map((file) => ({ file, error: validateDocumentFile(file) })).find((item) => item.error);
    if (invalid) {
      toast.error(`${invalid.file.name}: ${invalid.error}`);
      return;
    }

    setUploading(true);
    let next = [...documents];
    try {
      for (const file of files) {
        const uploaded = await uploadStoredDocument({
          file,
          organizationId: organization.id,
          entityType,
          entityId,
          uploadedBy: uploaderName,
        });
        next = [...next, uploaded];
        onChange(next);
      }
      toast.success(files.length === 1 ? "Dokument abgelegt." : `${files.length} Dokumente abgelegt.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dokument konnte nicht hochgeladen werden.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeDocument = async (document: StoredDocument) => {
    setDeletingId(document.id);
    try {
      await deleteStoredDocument(document);
      onChange(documents.filter((item) => item.id !== document.id));
      toast.success("Dokument gelöscht.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dokument konnte nicht gelöscht werden.");
    } finally {
      setDeletingId(null);
    }
  };

  const openDocument = async (document: StoredDocument) => {
    try {
      await openStoredDocument(document);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dokument konnte nicht geöffnet werden.");
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        className="sr-only"
        onChange={(event) => event.target.files && void uploadFiles(event.target.files)}
        disabled={disabled || uploading}
      />
      <div
        onDragEnter={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
        onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={(event) => { event.preventDefault(); if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void uploadFiles(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-xl border border-dashed p-4 text-center transition-colors",
          dragging ? "border-primary bg-primary/10" : "border-border bg-background/40",
          disabled && "opacity-60",
          compact && "p-3",
        )}
      >
        <Upload className={cn("mx-auto text-primary-glow", compact ? "size-5" : "size-7")} />
        <p className="mt-2 text-sm font-medium">Dokumente hier ablegen</p>
        <p className="mt-1 text-xs text-muted-foreground">Drag-and-drop oder Dateiauswahl · maximal 20 MB je Datei</p>
        <Button type="button" size="sm" variant="outline" className="mt-3" disabled={disabled || uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Upload className="mr-1.5 size-3.5" />}
          {uploading ? "Wird hochgeladen …" : "Dateien auswählen"}
        </Button>
      </div>

      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((document) => (
            <div key={document.id} className="rounded-lg border border-border/70 bg-background/50 p-3">
              <div className="flex items-center gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-glow">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={document.name}>{document.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatFileSize(document.size)} · {new Date(document.uploadedAt).toLocaleDateString("de-DE")} · {document.uploadedBy}
                  </p>
                </div>
                <Button type="button" size="icon" variant="ghost" className="size-8 shrink-0" onClick={() => void openDocument(document)} aria-label={`${document.name} öffnen`}>
                  <ExternalLink className="size-3.5" />
                </Button>
                {!disabled && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={deletingId === document.id}
                    onClick={() => void removeDocument(document)}
                    aria-label={`${document.name} löschen`}
                  >
                    {deletingId === document.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  </Button>
                )}
              </div>

              {allowPortalVisibility && (
                <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md bg-muted/20 px-2.5 py-2 text-xs">
                  <Checkbox
                    checked={!!document.portalVisible}
                    disabled={disabled}
                    onCheckedChange={(checked) => onChange(documents.map((item) => item.id === document.id ? { ...item, portalVisible: checked === true } : item))}
                  />
                  {document.portalVisible ? <Eye className="size-3.5 text-success" /> : <EyeOff className="size-3.5 text-muted-foreground" />}
                  <span>{document.portalVisible ? "Im Kundenportal sichtbar" : "Nur intern sichtbar"}</span>
                </label>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
