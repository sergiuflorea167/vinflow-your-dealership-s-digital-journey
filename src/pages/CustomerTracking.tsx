import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CheckCircle2, Clock, Download, FileText, Lock, MapPin, Package, Phone, Mail, Car, Calendar as CalendarIcon, ShieldCheck,
} from "lucide-react";
import { useProcessStore } from "@/store/processStore";
import { PROCESS_STEPS, formatCurrency, formatDate, stepIndex } from "@/data/process";
import { findProcessIdForToken, loadCustomerTrackingSnapshot, type CustomerTrackingSnapshot } from "@/lib/customerLink";
import { buildCustomerAccessCode, matchesCustomerAccessCode, normalizeAccessCode } from "@/lib/customerCode";
import { downloadBelegPdf } from "@/lib/pdf";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";

const CustomerTracking = () => {
  const { token } = useParams<{ token: string }>();
  const [remoteSnapshot, setRemoteSnapshot] = useState<CustomerTrackingSnapshot | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(true);
  const processes = useProcessStore((s) => s.processes);
  const storeCompanyName = useProcessStore((s) => s.settings.companyName);

  useEffect(() => {
    let active = true;
    if (!token) {
      setLoadingRemote(false);
      return;
    }
    setLoadingRemote(true);
    loadCustomerTrackingSnapshot(token)
      .then((snapshot) => { if (active) setRemoteSnapshot(snapshot); })
      .catch(() => { if (active) setRemoteSnapshot(null); })
      .finally(() => { if (active) setLoadingRemote(false); });
    return () => { active = false; };
  }, [token]);

  const localProcessId = useMemo(
    () => (token ? findProcessIdForToken(token, processes.map((p) => p.id)) : undefined),
    [token, processes]
  );

  const localProcess = useProcessStore((s) => (localProcessId ? s.processes.find((p) => p.id === localProcessId) : undefined));
  const localVehicle = useProcessStore((s) => localProcess && s.getVehicle(localProcess.vehicleId));
  const localCustomer = useProcessStore((s) => localProcess && s.getCustomer(localProcess.customerId));
  const localOffer = useProcessStore((s) => localProcess && s.getOffer(localProcess.acceptedOfferId));

  const process = remoteSnapshot?.process ?? localProcess;
  const vehicle = remoteSnapshot?.vehicle ?? localVehicle;
  const customer = remoteSnapshot?.customer ?? localCustomer;
  const offer = remoteSnapshot?.offer ?? localOffer;
  const companyName = remoteSnapshot?.companyName ?? storeCompanyName;
  const storeSettings = useProcessStore((s) => s.settings);
  const contact = remoteSnapshot?.contact ?? {
    name: storeSettings.userName || "Ihr Ansprechpartner",
    email: storeSettings.email || "",
    phone: storeSettings.phone || "",
    role: storeSettings.role,
  };

  // Sicherheits-Code Gate – bei jedem Seiten-Reload neu anfordern (kein Persistieren).
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  if (loadingRemote && (!localProcess || !localVehicle || !localCustomer)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 grid place-items-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="size-16 rounded-2xl bg-card border border-border grid place-items-center mx-auto">
            <Clock className="size-7 text-primary-glow animate-pulse" />
          </div>
          <h1 className="font-display text-2xl font-bold">Vorgang wird geladen</h1>
          <p className="text-sm text-muted-foreground">Einen Moment bitte, der Kundenlink wird synchronisiert.</p>
        </div>
      </div>
    );
  }

  if (!process || !vehicle || !customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 grid place-items-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="size-16 rounded-2xl bg-card border border-border grid place-items-center mx-auto">
            <Lock className="size-7 text-muted-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold">Link nicht gültig</h1>
          <p className="text-sm text-muted-foreground">
            Dieser Vorgangs-Link existiert nicht oder ist abgelaufen. Bitte wenden Sie sich an Ihren Händler.
          </p>
        </div>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 grid place-items-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-card p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-primary/15 grid place-items-center text-primary-glow">
              <Lock className="size-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">Sicherheits-Code</h1>
              <p className="text-xs text-muted-foreground">Bitte geben Sie Ihren persönlichen Zugangscode ein.</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Geben Sie Ihren persönlichen Code Zelle für Zelle ein – jede Zelle ist beschriftet.
          </p>

          <SegmentedCodeInput
            onSubmit={(value) => {
              if (matchesCustomerAccessCode(value, customer)) {
                try { sessionStorage.setItem(storageKey, expectedCode); } catch { /* noop */ }
                setCodeError(null);
                setUnlocked(true);
              } else {
                setCodeError("Code ist nicht korrekt. Bitte prüfen Sie Ihre Angaben.");
              }
            }}
            error={codeError}
          />

          <p className="text-[11px] text-muted-foreground text-center">
            Aus Sicherheitsgründen geschützt. Bei Problemen wenden Sie sich bitte an Ihren Händler.
          </p>
        </div>
      </div>
    );
  }

  const completedCount = PROCESS_STEPS.filter((s) => {
    const r = process.steps[s.key];
    return r.status === "completed" || r.status === "skipped";
  }).length;
  const progressPct = Math.round((completedCount / PROCESS_STEPS.length) * 100);
  const currentIdx = stepIndex(process.currentStep);
  const isFinished = completedCount === PROCESS_STEPS.length;

  // Voraussichtlicher Abholtermin: Liefertermin aus AB > Übergabedatum > +14 Tage ab Erstellung.
  const pickupDate =
    process.fields.delivery?.handoverDate ||
    process.fields.orderConfirmation?.deliveryDate ||
    new Date(new Date(process.createdAt).getTime() + 14 * 86400000).toISOString().slice(0, 10);

  const handleDownload = (key: typeof PROCESS_STEPS[number]["key"]) => {
    downloadBelegPdf({ process, vehicle, customer, offer: offer ?? undefined, stepKey: key, companyName });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/40 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt={companyName} className="size-9 object-contain" />
            <div>
              <p className="font-display font-bold text-foreground leading-tight">{companyName}</p>
              <p className="text-[11px] text-muted-foreground">Ihr Fahrzeug-Portal</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-success" /> Sichere Verbindung
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Greeting + Vehicle hero */}
        <section className="rounded-2xl bg-gradient-surface border border-border shadow-card p-6 sm:p-8">
          <p className="text-xs uppercase tracking-widest text-primary-glow font-semibold">Hallo {customer.name.split(" ")[0]} 👋</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mt-2 text-foreground">
            Ihr {vehicle.make} {vehicle.model}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Vorgangs-Nr. <span className="font-mono">{process.id}</span> · willkommen in Ihrem persönlichen Bereich.
            Hier sehen Sie jederzeit den Status Ihres Auftrags und alle Unterlagen.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <HeroStat icon={<Car className="size-4" />} label="Fahrzeug" value={`${vehicle.year}`} sub={`${vehicle.mileage.toLocaleString("de-DE")} km`} />
            <HeroStat icon={<Package className="size-4" />} label="Kaufpreis" value={formatCurrency(process.fields.finalPrice ?? vehicle.listPrice)} />
            <HeroStat icon={<CalendarIcon className="size-4" />} label={isFinished ? "Übergeben am" : "Vorauss. Abholung"} value={formatDate(pickupDate)} />
            <HeroStat icon={<MapPin className="size-4" />} label="Übergabeort" value={process.fields.delivery?.handoverLocation || companyName} />
          </div>
        </section>

        {/* Progress – Sendungsverfolgung */}
        <section className="rounded-2xl bg-card border border-border shadow-card p-6 sm:p-8">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Auftragsstatus</p>
              <h2 className="font-display text-2xl font-bold mt-1">
                {isFinished ? "Abgeschlossen 🎉" : PROCESS_STEPS[currentIdx].label}
              </h2>
            </div>
            <div className="text-right">
              <p className="font-display text-4xl font-bold text-primary-glow leading-none">{progressPct}%</p>
              <p className="text-xs text-muted-foreground mt-1">{completedCount} / {PROCESS_STEPS.length} Schritte</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-3 rounded-full bg-muted/40 overflow-hidden mb-8">
            <div
              className="h-full bg-gradient-brand transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Vertical timeline */}
          <ol className="space-y-1">
            {PROCESS_STEPS.map((step, i) => {
              const r = process.steps[step.key];
              const done = r.status === "completed";
              const skipped = r.status === "skipped";
              const active = !done && !skipped && i === currentIdx;
              const upcoming = !done && !skipped && i > currentIdx;
              const isLast = i === PROCESS_STEPS.length - 1;

              return (
                <li key={step.key} className="flex gap-4 relative">
                  {/* Connector + dot */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "size-9 rounded-full grid place-items-center shrink-0 border-2 transition-all",
                      done && "bg-success border-success text-success-foreground",
                      skipped && "bg-muted border-border text-muted-foreground",
                      active && "bg-primary border-primary text-primary-foreground shadow-glow animate-pulse",
                      upcoming && "bg-card border-border text-muted-foreground",
                    )}>
                      {done ? <CheckCircle2 className="size-5" /> : active ? <Clock className="size-4" /> : <span className="text-xs font-semibold">{i + 1}</span>}
                    </div>
                    {!isLast && (
                      <div className={cn(
                        "w-0.5 flex-1 my-1 min-h-8",
                        done ? "bg-success" : "bg-border"
                      )} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={cn("flex-1 pb-6", upcoming && "opacity-50")}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className={cn("font-display font-semibold", active && "text-primary-glow")}>{step.label}</p>
                      {done && r.completedAt && (
                        <span className="text-xs text-success inline-flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> Erledigt am {formatDate(r.completedAt)}
                        </span>
                      )}
                      {skipped && <span className="text-xs text-muted-foreground">Nicht relevant</span>}
                      {active && <span className="text-xs text-primary-glow font-semibold">In Bearbeitung</span>}
                      {upcoming && <span className="text-xs text-muted-foreground">Folgt</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{step.description}</p>

                    {done && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(step.key)}
                        className="mt-3 gap-2 h-8"
                      >
                        <Download className="size-3.5" />
                        {step.documentName} (PDF)
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Documents archive */}
        <section className="rounded-2xl bg-card border border-border shadow-card p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <FileText className="size-5 text-primary-glow" /> Ihre Unterlagen
          </h2>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            Alle bisher erstellten Dokumente zu Ihrem Vorgang. Jederzeit als PDF herunterladbar.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {PROCESS_STEPS.map((s) => {
              const r = process.steps[s.key];
              const done = r.status === "completed";
              const skipped = r.status === "skipped";
              const pending = !done && !skipped;

              return (
                <div
                  key={s.key}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border transition-smooth",
                    done && "bg-success/5 border-success/20 hover:border-success/40",
                    skipped && "bg-muted/20 border-border opacity-60",
                    pending && "bg-background/40 border-border opacity-60",
                  )}
                >
                  <div className={cn(
                    "size-10 rounded-lg grid place-items-center shrink-0",
                    done && "bg-success/10 text-success",
                    !done && "bg-muted/40 text-muted-foreground",
                  )}>
                    <FileText className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{s.documentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {done ? "Verfügbar" : skipped ? "Nicht erstellt" : "Wird vorbereitet"}
                    </p>
                  </div>
                  {done && (
                    <Button size="icon" variant="ghost" onClick={() => handleDownload(s.key)} className="shrink-0">
                      <Download className="size-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact */}
        <section className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 shadow-card p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold">Fragen zu Ihrem Vorgang?</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            {contact.name} {contact.role ? `(${contact.role}) ` : ""}von {companyName} betreut Ihren Vorgang persönlich und hilft Ihnen jederzeit gerne weiter.
          </p>
          <div className="flex flex-wrap gap-3">
            {contact.email && (
              <Button asChild variant="outline" className="gap-2">
                <a href={`mailto:${contact.email}`}><Mail className="size-4" /> {contact.email}</a>
              </Button>
            )}
            {contact.phone && (
              <Button asChild className="gap-2 bg-gradient-brand hover:opacity-90">
                <a href={`tel:${contact.phone}`}><Phone className="size-4" /> {contact.phone}</a>
              </Button>
            )}
          </div>
        </section>

        <footer className="text-center text-xs text-muted-foreground py-6">
          © {new Date().getFullYear()} {companyName} · Powered by VINflow
        </footer>
      </main>
    </div>
  );
};

const HeroStat = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) => (
  <div className="rounded-xl bg-background/40 border border-border p-3">
    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-widest">
      {icon} {label}
    </div>
    <p className="font-display font-bold text-foreground mt-1.5 text-sm sm:text-base leading-tight">{value}</p>
    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
  </div>
);

type Segment = {
  key: string;
  label: string;
  length: number;
  mode: "alpha" | "digit" | "any";
  hint?: string;
};

const SEGMENTS: Segment[] = [
  { key: "vn", label: "Vorname", length: 1, mode: "alpha", hint: "1. Buchstabe" },
  { key: "nn", label: "Nachname", length: 1, mode: "alpha", hint: "1. Buchstabe" },
  { key: "p1", label: "PLZ", length: 1, mode: "digit", hint: "1. Ziffer" },
  { key: "mm", label: "Geburtsmonat", length: 2, mode: "digit", hint: "z. B. 04" },
  { key: "yy", label: "Geburtsjahr", length: 4, mode: "digit", hint: "z. B. 1985" },
  { key: "p2", label: "PLZ", length: 1, mode: "any", hint: "letztes Zeichen" },
];

const sanitizeSegment = (raw: string, mode: Segment["mode"]) => {
  const upper = raw.toUpperCase();
  if (mode === "alpha") return upper.replace(/[^A-ZÄÖÜß]/g, "");
  if (mode === "digit") return upper.replace(/[^0-9]/g, "");
  return upper.replace(/\s+/g, "");
};

const SegmentedCodeInput = ({
  onSubmit,
  error,
}: {
  onSubmit: (value: string) => void;
  error: string | null;
}) => {
  const [values, setValues] = useState<string[]>(() => SEGMENTS.map(() => ""));
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const focusIndex = (i: number) => {
    const el = refs.current[i];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const handleChange = (i: number, raw: string) => {
    const seg = SEGMENTS[i];
    const cleaned = sanitizeSegment(raw, seg.mode).slice(0, seg.length);
    const next = [...values];
    next[i] = cleaned;
    setValues(next);
    if (cleaned.length === seg.length && i < SEGMENTS.length - 1) {
      focusIndex(i + 1);
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !values[i] && i > 0) {
      e.preventDefault();
      focusIndex(i - 1);
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      focusIndex(i - 1);
    } else if (e.key === "ArrowRight" && i < SEGMENTS.length - 1) {
      e.preventDefault();
      focusIndex(i + 1);
    }
  };

  const handlePaste = (i: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (!pasted) return;
    e.preventDefault();
    let buf = pasted.toUpperCase().replace(/\s+/g, "");
    const next = [...values];
    let idx = i;
    while (idx < SEGMENTS.length && buf.length > 0) {
      const seg = SEGMENTS[idx];
      const take = sanitizeSegment(buf, seg.mode).slice(0, seg.length);
      next[idx] = take;
      buf = buf.slice(take.length || 1);
      idx++;
    }
    setValues(next);
    focusIndex(Math.min(idx, SEGMENTS.length - 1));
  };

  const allFilled = values.every((v, i) => v.length === SEGMENTS[i].length);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values.join(""));
      }}
      className="space-y-3"
    >
      <div className="flex items-end justify-center gap-1.5 flex-nowrap">
        {SEGMENTS.map((seg, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {seg.label}
            </span>
            <input
              ref={(el) => (refs.current[i] = el)}
              value={values[i]}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={(e) => handlePaste(i, e)}
              onFocus={(e) => e.currentTarget.select()}
              autoFocus={i === 0}
              inputMode={seg.mode === "digit" ? "numeric" : "text"}
              maxLength={seg.length}
              aria-label={seg.label}
              className={cn(
                "h-11 rounded-md border bg-background text-center font-mono font-bold text-base uppercase px-1",
                "focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary",
                error ? "border-destructive/60" : "border-border",
              )}
              style={{ width: `${seg.length * 1.15 + 0.7}rem` }}
            />
            <span className="text-[9px] text-muted-foreground">{seg.hint}</span>
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-destructive text-center">{error}</p>}

      <Button
        type="submit"
        disabled={!allFilled}
        className="w-full bg-gradient-brand hover:opacity-90"
      >
        Vorgang öffnen
      </Button>
    </form>
  );
};

export default CustomerTracking;
