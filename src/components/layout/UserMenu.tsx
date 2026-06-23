import { useState, useRef } from "react";
import { useProcessStore } from "@/store/processStore";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Settings as SettingsIcon, LogOut, Camera, Mail, Phone, Briefcase, Palette, Check, Building2, KeyRound, Copy, Sparkles, GraduationCap, Database, SlidersHorizontal } from "lucide-react";
import { buildDemoSeed } from "@/data/demoSeed";
import { flushOrgStateNow } from "@/lib/orgStateSync";
import { useTutorialStore } from "@/store/tutorialStore";
import { WorkshopPickerDialog } from "@/components/tutorial/WorkshopPickerDialog";
import { PDF_THEMES } from "@/lib/pdf";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const UserMenu = () => {
  const settings = useProcessStore((s) => s.settings);
  const updateSettings = useProcessStore((s) => s.updateSettings);
  const { profile, organization, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const isGF = roles.includes("geschaeftsfuehrer");
  const t = useT();

  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState(settings);
  const [workshopPickerOpen, setWorkshopPickerOpen] = useState(false);


  const openDialog = () => {
    setDraft(settings);
    setOpen(true);
  };

  const initials = `${draft.firstName?.[0] ?? "S"}${draft.lastName?.[0] ?? "F"}`.toUpperCase();
  const liveInitials = `${(settings.firstName ?? settings.userName ?? "S").trim()[0] ?? "S"}${
    (settings.lastName ?? "").trim()[0] ?? ""
  }`.toUpperCase();

  const onPickAvatar = () => fileRef.current?.click();
  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDraft((d) => ({ ...d, avatarUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const save = () => {
    const fullName = `${draft.firstName ?? ""} ${draft.lastName ?? ""}`.trim();
    updateSettings({
      ...draft,
      userName: fullName || draft.userName || "Nutzer",
    });
    toast.success(t("profile.saved"));
    setOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            data-tour="user-menu"
            className="ml-2 size-9 rounded-full overflow-hidden border border-border bg-secondary grid place-items-center text-sm font-semibold text-secondary-foreground hover:ring-2 hover:ring-primary/40 transition-smooth"
            aria-label="Profilmenü öffnen"
          >
            {settings.avatarUrl ? (
              <img src={settings.avatarUrl} alt={settings.userName} className="size-full object-cover" />
            ) : (
              <span>{liveInitials || "SF"}</span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>
            <div className="flex items-center gap-3 py-1">
              <Avatar className="size-10">
                {settings.avatarUrl && <AvatarImage src={settings.avatarUrl} />}
                <AvatarFallback className="bg-gradient-brand text-primary-foreground">
                  {liveInitials || "SF"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || settings.userName : settings.userName}
                </p>
                <p className="text-xs text-muted-foreground truncate">{profile?.position || profile?.email || settings.email}</p>
              </div>
            </div>
          </DropdownMenuLabel>
          {organization && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-2 space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <Building2 className="size-3.5 text-primary" />
                  <span className="font-semibold truncate">{organization.name}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                    {isGF ? "Geschäftsführer" : "Mitarbeiter"}
                  </span>
                </div>
                {isGF && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      navigator.clipboard.writeText(organization.invite_code);
                      toast.success("Einladungs-Code kopiert");
                    }}
                    className="w-full flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-md bg-secondary/60 hover:bg-secondary transition-smooth"
                  >
                    <KeyRound className="size-3" />
                    <span className="font-mono tracking-wider">{organization.invite_code}</span>
                    <Copy className="size-3 ml-auto text-muted-foreground" />
                  </button>
                )}
              </div>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openDialog}>
            <User className="size-4 mr-2" /> {t("menu.editProfile")}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/stammdaten"><SettingsIcon className="size-4 mr-2" /> {t("menu.settings")}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/konfiguration"><SlidersHorizontal className="size-4 mr-2" /> Konfiguration</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => useTutorialStore.getState().reset()}>
            <Sparkles className="size-4 mr-2" /> Einführungs-Tour starten
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setWorkshopPickerOpen(true)}>
            <GraduationCap className="size-4 mr-2" /> Workshop starten
          </DropdownMenuItem>
          {isGF && (
            <DropdownMenuItem
              onClick={async () => {
                if (!window.confirm("Demo-Daten laden? Vorhandene Fahrzeuge, Kunden und Vorgänge werden überschrieben."))
                  return;
                const seed = buildDemoSeed();
                useProcessStore.setState((s) => ({ ...s, ...seed }));
                try {
                  await flushOrgStateNow();
                  toast.success("Demo-Daten geladen & gespeichert");
                } catch (e) {
                  console.error(e);
                  toast.error("Demo-Daten lokal geladen, Speichern fehlgeschlagen");
                }
              }}
            >
              <Database className="size-4 mr-2" /> Demo-Daten laden
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await signOut();
              toast.success("Abgemeldet");
              navigate("/auth", { replace: true });
            }}
          >
            <LogOut className="size-4 mr-2" /> Abmelden
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle>{t("profile.title")}</DialogTitle>
            <DialogDescription>
              {t("profile.desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          <div className="flex items-center gap-4 py-2">
            <button
              type="button"
              onClick={onPickAvatar}
              className="relative size-20 rounded-full overflow-hidden border-2 border-border bg-secondary grid place-items-center group"
            >
              {draft.avatarUrl ? (
                <img src={draft.avatarUrl} alt="Avatar" className="size-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-secondary-foreground">{initials}</span>
              )}
              <span className="absolute inset-0 bg-background/70 opacity-0 group-hover:opacity-100 grid place-items-center transition-smooth">
                <Camera className="size-5" />
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onAvatarChange} />
            <div className="text-xs text-muted-foreground">
              {t("profile.uploadHint")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t("profile.firstName")}</Label>
              <Input value={draft.firstName ?? ""} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{t("profile.lastName")}</Label>
              <Input value={draft.lastName ?? ""} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs flex items-center gap-1.5"><Briefcase className="size-3" /> {t("profile.role")}</Label>
              <Input value={draft.role ?? ""} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder={t("profile.rolePlaceholder")} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs flex items-center gap-1.5"><Mail className="size-3" /> {t("profile.email")}</Label>
              <Input type="email" value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs flex items-center gap-1.5"><Phone className="size-3" /> {t("profile.phone")}</Label>
              <Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">{t("profile.company")}</Label>
              <Input value={draft.companyName} onChange={(e) => setDraft({ ...draft, companyName: e.target.value })} />
            </div>
            <div className="col-span-2 pt-2 -mb-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Unternehmensdaten · werden u. a. im Kaufvertrag als Verkäuferdaten verwendet
              </p>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Straße & Hausnummer</Label>
              <Input value={draft.companyStreet ?? ""} onChange={(e) => setDraft({ ...draft, companyStreet: e.target.value })} placeholder="z. B. Musterstraße 12" />
            </div>
            <div>
              <Label className="text-xs">PLZ</Label>
              <Input value={draft.companyZip ?? ""} onChange={(e) => setDraft({ ...draft, companyZip: e.target.value })} placeholder="80331" />
            </div>
            <div>
              <Label className="text-xs">Ort</Label>
              <Input value={draft.companyCity ?? ""} onChange={(e) => setDraft({ ...draft, companyCity: e.target.value })} placeholder="München" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Vertretungsberechtigte/r</Label>
              <Input value={draft.companyRepresentative ?? ""} onChange={(e) => setDraft({ ...draft, companyRepresentative: e.target.value })} placeholder="z. B. Geschäftsführer Max Mustermann" />
            </div>
            <div>
              <Label className="text-xs">USt-IdNr.</Label>
              <Input value={draft.companyVatId ?? ""} onChange={(e) => setDraft({ ...draft, companyVatId: e.target.value })} placeholder="DE123456789" />
            </div>
            <div>
              <Label className="text-xs">Steuernummer</Label>
              <Input value={draft.companyTaxNumber ?? ""} onChange={(e) => setDraft({ ...draft, companyTaxNumber: e.target.value })} placeholder="z. B. 143/824/02666" />
            </div>
            <div>
              <Label className="text-xs">Firmen-E-Mail (für E-Rechnung)</Label>
              <Input type="email" value={draft.companyEmail ?? ""} onChange={(e) => setDraft({ ...draft, companyEmail: e.target.value })} placeholder="rechnung@firma.de" />
            </div>
            <div>
              <Label className="text-xs">Firmen-Telefon (für E-Rechnung)</Label>
              <Input value={draft.companyPhone ?? ""} onChange={(e) => setDraft({ ...draft, companyPhone: e.target.value })} placeholder="+49 89 1234567" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Handelsregister</Label>
              <Input value={draft.companyRegistration ?? ""} onChange={(e) => setDraft({ ...draft, companyRegistration: e.target.value })} placeholder="HRB 12345, AG München" />
            </div>

            <div className="col-span-2 pt-2">
              <Label className="text-xs flex items-center gap-1.5 mb-2">
                <Palette className="size-3" /> Beleg-Farbschema (PDF)
              </Label>
              <p className="text-[11px] text-muted-foreground mb-3">
                Wähle ein Farbschema, das zu deinem Unternehmen passt. Es wird auf alle Kunden-PDFs angewendet.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PDF_THEMES.map((th) => {
                  const active = (draft.pdfTheme ?? "indigo") === th.key;
                  const rgb = (c: [number, number, number]) => `rgb(${c[0]},${c[1]},${c[2]})`;
                  return (
                    <button
                      key={th.key}
                      type="button"
                      onClick={() => setDraft({ ...draft, pdfTheme: th.key })}
                      className={cn(
                        "relative text-left rounded-lg border p-3 transition-smooth hover:border-primary/60",
                        active ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="size-4 rounded-full border border-border" style={{ background: rgb(th.primaryDark) }} />
                        <span className="size-4 rounded-full border border-border" style={{ background: rgb(th.primary) }} />
                        <span className="size-4 rounded-full border border-border" style={{ background: rgb(th.light) }} />
                        {active && <Check className="size-3.5 ml-auto text-primary" />}
                      </div>
                      <p className="text-xs font-semibold leading-tight">{th.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{th.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border">
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("profile.cancel")}</Button>
            <Button onClick={save} className="bg-gradient-brand">{t("profile.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WorkshopPickerDialog open={workshopPickerOpen} onOpenChange={setWorkshopPickerOpen} />
    </>
  );
};

