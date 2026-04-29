import { useState, useRef } from "react";
import { useProcessStore } from "@/store/processStore";
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
import { User, Settings as SettingsIcon, LogOut, Camera, Mail, Phone, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export const UserMenu = () => {
  const settings = useProcessStore((s) => s.settings);
  const updateSettings = useProcessStore((s) => s.updateSettings);

  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState(settings);

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
    toast.success("Profil gespeichert");
    setOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
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
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="flex items-center gap-3 py-1">
              <Avatar className="size-10">
                {settings.avatarUrl && <AvatarImage src={settings.avatarUrl} />}
                <AvatarFallback className="bg-gradient-brand text-primary-foreground">
                  {liveInitials || "SF"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{settings.userName}</p>
                <p className="text-xs text-muted-foreground truncate">{settings.role || settings.email}</p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openDialog}>
            <User className="size-4 mr-2" /> Profil bearbeiten
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/stammdaten"><SettingsIcon className="size-4 mr-2" /> Stammdaten & Einstellungen</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => toast.info("Demo-Modus – Logout aktuell deaktiviert")}
            className="text-muted-foreground"
          >
            <LogOut className="size-4 mr-2" /> Abmelden
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Profil bearbeiten</DialogTitle>
            <DialogDescription>
              Diese Daten erscheinen im Dashboard, in Belegen und im Aktivitätslog.
            </DialogDescription>
          </DialogHeader>

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
              Klicke auf das Bild, um ein Foto<br />hochzuladen.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Vorname</Label>
              <Input value={draft.firstName ?? ""} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Nachname</Label>
              <Input value={draft.lastName ?? ""} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs flex items-center gap-1.5"><Briefcase className="size-3" /> Rolle / Position</Label>
              <Input value={draft.role ?? ""} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder="z. B. Geschäftsführer" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs flex items-center gap-1.5"><Mail className="size-3" /> E-Mail</Label>
              <Input type="email" value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs flex items-center gap-1.5"><Phone className="size-3" /> Telefon</Label>
              <Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Firma</Label>
              <Input value={draft.companyName} onChange={(e) => setDraft({ ...draft, companyName: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button onClick={save} className="bg-gradient-brand">Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
