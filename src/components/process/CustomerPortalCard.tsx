import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Check, ExternalLink, Mail, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buildCustomerTrackingUrl, saveCustomerTrackingSnapshot, type ContactPerson } from "@/lib/customerLink";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { WhatsAppLogo } from "@/components/shared/WhatsAppLogo";
import type { Customer, Offer, Process, Vehicle } from "@/data/process";
import { useProcessStore } from "@/store/processStore";
import { toast } from "sonner";

interface Props {
  processId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  vehicleLabel: string;
  companyName: string;
  process: Process;
  vehicle: Vehicle;
  customer: Customer;
  offer?: Offer | null;
}

export const CustomerPortalCard = ({ processId, customerName, customerEmail, customerPhone, vehicleLabel, companyName, process, vehicle, customer, offer }: Props) => {
  const [url, setUrl] = useState(() => process.fields.customerPortalToken ? buildCustomerTrackingUrl(process.fields.customerPortalToken) : "");
  const [copied, setCopied] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const lastSavedRef = useRef("");
  const saveInFlightRef = useRef<Promise<string> | null>(null);
  const settings = useProcessStore((s) => s.settings);
  const updateProcessFields = useProcessStore((s) => s.updateProcessFields);

  const contact: ContactPerson = useMemo(() => ({
    name: settings.userName || [settings.firstName, settings.lastName].filter(Boolean).join(" ") || "Ihr Ansprechpartner",
    email: settings.email || "",
    phone: settings.phone || "",
    role: settings.role,
  }), [settings.email, settings.firstName, settings.lastName, settings.phone, settings.role, settings.userName]);

  const ensureSnapshot = useCallback(async () => {
    const signature = JSON.stringify({ process, vehicle, customer, offer, companyName, contact });
    if (lastSavedRef.current === signature && url) return url;
    if (saveInFlightRef.current) return saveInFlightRef.current;

    const savePromise = (async () => {
      setIsPreparing(true);
      setLinkError(null);
      const token = await saveCustomerTrackingSnapshot(
        { process, vehicle, customer, offer: offer ?? null, companyName, contact },
        process.fields.customerPortalToken,
      );
      if (token !== process.fields.customerPortalToken) {
        updateProcessFields(processId, { customerPortalToken: token });
      }
      const nextUrl = buildCustomerTrackingUrl(token);
      setUrl(nextUrl);
      setLinkError(null);
      lastSavedRef.current = signature;
      return nextUrl;
    })();
    saveInFlightRef.current = savePromise;
    try {
      return await savePromise;
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : "Kundenlink konnte nicht erstellt werden");
      throw error;
    } finally {
      saveInFlightRef.current = null;
      setIsPreparing(false);
    }
  }, [process, vehicle, customer, offer, companyName, contact, processId, updateProcessFields, url]);

  useEffect(() => {
    ensureSnapshot().catch(() => undefined);
  }, [ensureSnapshot]);

  const handleCopy = async () => {
    try {
      const currentUrl = await ensureSnapshot();
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      toast.success("Link kopiert");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Konnte Link nicht synchronisieren oder kopieren");
    }
  };

  const handlePreview = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    try {
      const currentUrl = await ensureSnapshot();
      window.open(currentUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Konnte Kundenlink nicht synchronisieren");
    }
  };

  const buildMailto = (currentUrl: string) => {
    const subject = encodeURIComponent(`Ihre Unterlagen & Status zu ${vehicleLabel}`);
    const body = encodeURIComponent(
      `Hallo ${customerName},\n\nüber den folgenden persönlichen Link können Sie jederzeit den Status Ihres Auftrags verfolgen und alle Belege einsehen:\n\n${currentUrl}\n\nViele Grüße\n${companyName}`
    );
    return `mailto:${customerEmail}?subject=${subject}&body=${body}`;
  };

  const buildWhatsAppMessage = (currentUrl: string) =>
    `Hallo ${customerName},\n\nüber diesen persönlichen Link können Sie den Status Ihres Auftrags verfolgen und alle Belege einsehen:\n\n${currentUrl}\n\nSie können fehlende Belege auch einfach direkt hier per WhatsApp als Foto oder PDF senden.\n\nViele Grüße\n${companyName}`;

  const handleEmail = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    try {
      const currentUrl = await ensureSnapshot();
      window.location.href = buildMailto(currentUrl);
    } catch {
      toast.error("Konnte Kundenlink nicht synchronisieren");
    }
  };

  const handleWhatsApp = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    try {
      const currentUrl = await ensureSnapshot();
      window.open(buildWhatsAppUrl({ phone: customerPhone, message: buildWhatsAppMessage(currentUrl) }), "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Konnte Kundenlink nicht synchronisieren");
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/10 via-card to-card border-primary/20 shadow-card">
      <div className="flex items-start gap-3 mb-4">
        <div className="size-9 rounded-lg bg-primary/15 grid place-items-center text-primary-glow shrink-0">
          <Link2 className="size-4" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-sm">Kunden-Portal</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Persönlicher Link für {customerName} – Status, Belege & voraussichtlicher Abholtermin.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <Input
          value={url}
          placeholder={linkError ? "Link konnte nicht erstellt werden" : "Sicherer Link wird vorbereitet …"}
          readOnly
          aria-invalid={!!linkError}
          className="bg-background/60 font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button size="icon" variant="outline" onClick={handleCopy} disabled={isPreparing} className="shrink-0">
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
        </Button>
      </div>

      {linkError && (
        <div className="flex items-center justify-between gap-3 mb-3 text-xs text-destructive">
          <span>Kundenlink konnte nicht synchronisiert werden.</span>
          <Button size="sm" variant="outline" disabled={isPreparing} onClick={() => ensureSnapshot().catch(() => undefined)}>
            Erneut versuchen
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" className="gap-2 bg-gradient-brand hover:opacity-90 flex-1 min-w-[140px]">
          <a href={url ? buildMailto(url) : "#"} aria-disabled={isPreparing} onClick={handleEmail}><Mail className="size-3.5" /> Per E-Mail senden</a>
        </Button>
        <Button asChild size="sm" variant="outline" className="gap-2 flex-1 min-w-[140px]">
          <a
            href={url ? buildWhatsAppUrl({ phone: customerPhone, message: buildWhatsAppMessage(url) }) : "#"}
            aria-disabled={isPreparing}
            onClick={handleWhatsApp}
          >
            <WhatsAppLogo className="size-3.5 text-[#25D366]" /> Per WhatsApp
          </a>
        </Button>
        <Button asChild size="sm" variant="outline" className="gap-2">
          <a href={url || "#"} target="_blank" rel="noreferrer" onClick={handlePreview}><ExternalLink className="size-3.5" /> Vorschau</a>
        </Button>
      </div>
    </Card>
  );
};
