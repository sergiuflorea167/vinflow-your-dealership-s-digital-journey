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
import { User, Settings as SettingsIcon, LogOut, Camera, Mail, Phone, Briefcase, Building2, KeyRound, Copy, Sparkles, GraduationCap, Database, SlidersHorizontal, ImagePlus } from "lucide-react";
import { buildDemoSeed } from "@/data/demoSeed";
import { flushOrgStateNow } from "@/lib/orgStateSync";
import { useTutorialStore } from "@/store/tutorialStore";
import { WorkshopPickerDialog } from "@/components/tutorial/WorkshopPickerDialog";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";

export const UserMenu = () => {
  const settings = useProcessStore((s) => s.settings);
  const updateSettings = useProcessStore((s) => s.updateSettings);
  const { profile, organization, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const isGF = roles.includes("geschaeftsfuehrer");
  const t = useT();
  const isMobile = useIsMobile();

  const [open, setOpen] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState(settings);
  const [workshopPickerOpen, setWorkshopPickerOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<"user" | "company">("user");


  const openDialog = () => {
    setDraft(settings);
    setProfileTab("user");
    setOpen(true);
  };

  const initials = `${draft.firstName?.[0] ?? "S"}${draft.lastName?.[0] ?? "F"}`.toUpperCase();
  const liveInitials = `${(settings.firstName ?? settings.userName ?? "S").trim()[0] ?? "S"}${
    (settings.lastName ?? "").trim()[0] ?? ""
  }`.toUpperCase();

  const onPickAvatar = () => avatarFileRef.current?.click();
  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDraft((d) => ({ ...d, avatarUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const onPickCompanyLogo = () => logoFileRef.current?.click();
  const onCompanyLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDraft((d) => ({ ...d, companyLogoUrl: String(reader.result) }));
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
          {!isMobile && (
            <>
              <DropdownMenuItem onClick={() => useTutorialStore.getState().reset()}>
                <Sparkles className="size-4 mr-2" /> Einführungs-Tour starten
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setWorkshopPickerOpen(true)}>
                <GraduationCap className="size-4 mr-2" /> Workshop starten
              </DropdownMenuItem>
            </>
          )}
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
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle>{t("profile.title")}</DialogTitle>
            <DialogDescription>
              Benutzer- und Firmendaten sind getrennt, damit Belege und Profil sauber gepflegt werden.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setProfileTab("user")}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-smooth ${profileTab === "user" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Benutzerprofil
              </button>
              <button
                type="button"
                onClick={() => setProfileTab("company")}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-smooth ${profileTab === "company" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Firmenprofil
              </button>
            </div>

          {profileTab === "user" && (
          <>
          <div>
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="size-4 text-primary" /> Benutzerprofil
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Deine persoenlichen Kontaktdaten und dein Profilbild.</p>
          </div>

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
            <input ref={avatarFileRef} type="file" accept="image/*" hidden onChange={onAvatarChange} />
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
          </div>
          </>
          )}

          {profileTab === "company" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="size-4 text-primary" /> Firmenprofil
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Firmenlogo, Rechnungsdaten und Angaben fuer Belege.</p>
            </div>
            <div className="col-span-2 rounded-lg border border-border bg-muted/25 p-4">
              <Label className="text-xs">Firmenlogo</Label>
              <button
                type="button"
                onClick={onPickCompanyLogo}
                className="mt-2 flex min-h-24 w-full items-center gap-4 rounded-lg border border-dashed border-border bg-background/70 p-4 text-left transition-smooth hover:border-primary/60"
              >
                <div className="grid h-16 w-28 shrink-0 place-items-center rounded-md border border-border bg-card">
                  {draft.companyLogoUrl ? (
                    <img src={draft.companyLogoUrl} alt="Firmenlogo" className="max-h-12 max-w-24 object-contain" />
                  ) : (
                    <ImagePlus className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Logo hochladen</p>
                  <p className="mt-1 text-xs text-muted-foreground">PNG oder JPG. Das Logo wird fuer Belege und Kundenansichten genutzt.</p>
                </div>
              </button>
              <input ref={logoFileRef} type="file" accept="image/png,image/jpeg" hidden onChange={onCompanyLogoChange} />
              {draft.companyLogoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-8 px-2 text-xs"
                  onClick={() => setDraft({ ...draft, companyLogoUrl: "" })}
                >
                  Logo entfernen
                </Button>
              )}
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
            <div className="col-span-2 pt-2 -mb-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Bankdaten und Online-Angaben · werden im Footer und in Zahlungsdaten ausgegeben
              </p>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Website</Label>
              <Input value={draft.companyWebsite ?? ""} onChange={(e) => setDraft({ ...draft, companyWebsite: e.target.value })} placeholder="www.firma.de" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Bank</Label>
              <Input value={draft.companyBankName ?? ""} onChange={(e) => setDraft({ ...draft, companyBankName: e.target.value })} placeholder="z. B. Commerzbank" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">IBAN</Label>
              <Input value={draft.companyIban ?? ""} onChange={(e) => setDraft({ ...draft, companyIban: e.target.value })} placeholder="DE00 0000 0000 0000 0000 00" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">BIC</Label>
              <Input value={draft.companyBic ?? ""} onChange={(e) => setDraft({ ...draft, companyBic: e.target.value })} placeholder="COBADEFFXXX" />
            </div>

          </div>
          )}
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

