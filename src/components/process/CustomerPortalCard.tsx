import { useState } from "react";
import { Copy, Check, ExternalLink, Mail, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buildCustomerTrackingUrl } from "@/lib/customerLink";
import { toast } from "sonner";

interface Props {
  processId: string;
  customerName: string;
  customerEmail: string;
  vehicleLabel: string;
  companyName: string;
}

export const CustomerPortalCard = ({ processId, customerName, customerEmail, vehicleLabel, companyName }: Props) => {
  const url = buildCustomerTrackingUrl(processId);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link kopiert");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Konnte Link nicht kopieren");
    }
  };

  const subject = encodeURIComponent(`Ihre Unterlagen & Status zu ${vehicleLabel}`);
  const body = encodeURIComponent(
    `Hallo ${customerName},\n\nüber den folgenden persönlichen Link können Sie jederzeit den Status Ihres Auftrags verfolgen und alle Belege einsehen:\n\n${url}\n\nViele Grüße\n${companyName}`
  );
  const mailto = `mailto:${customerEmail}?subject=${subject}&body=${body}`;

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
        <Input value={url} readOnly className="bg-background/60 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <Button size="icon" variant="outline" onClick={handleCopy} className="shrink-0">
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" className="gap-2 bg-gradient-brand hover:opacity-90 flex-1 min-w-[140px]">
          <a href={mailto}><Mail className="size-3.5" /> Per E-Mail senden</a>
        </Button>
        <Button asChild size="sm" variant="outline" className="gap-2">
          <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> Vorschau</a>
        </Button>
      </div>
    </Card>
  );
};
