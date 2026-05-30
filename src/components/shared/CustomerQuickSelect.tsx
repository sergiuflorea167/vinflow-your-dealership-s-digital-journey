import { useState } from "react";
import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useProcessStore } from "@/store/processStore";
import { toast } from "sonner";

interface CustomerQuickSelectProps {
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
}

/**
 * Select für Kunden mit inline "+ Neu anlegen" – legt einen Kunden in den
 * Stammdaten an und wählt ihn sofort aus, ohne den Workflow zu verlassen.
 */
export const CustomerQuickSelect = ({ value, onChange, required }: CustomerQuickSelectProps) => {
  const customers = useProcessStore((s) => s.customers);
  const addCustomer = useProcessStore((s) => s.addCustomer);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">Kunde {required && "*"}</Label>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-[11px] text-primary-glow hover:underline"
        >
          <Plus className="size-3" /> Neuen Kunden anlegen
        </button>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-md border border-input bg-background/40 px-3 text-sm"
      >
        <option value="">— Kunde wählen —</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>{c.name} · {c.city}</option>
        ))}
      </select>

      <QuickCreateCustomerDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={(id) => { onChange(id); setOpen(false); }}
        addCustomer={addCustomer}
      />
    </div>
  );
};

interface QuickCreateProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
  addCustomer: ReturnType<typeof useProcessStore.getState>["addCustomer"];
}

const QuickCreateCustomerDialog = ({ open, onOpenChange, onCreated, addCustomer }: QuickCreateProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const reset = () => {
    setName(""); setEmail(""); setPhone(""); setStreet(""); setZip(""); setCity(""); setBirthDate("");
  };

  const valid = name.trim() && city.trim();

  const handleSubmit = () => {
    if (!valid) return;
    const created = addCustomer({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      street: street.trim() || undefined,
      zip: zip.trim() || undefined,
      city: city.trim(),
      birthDate: birthDate || undefined,
    });
    toast.success(`Kunde ${created.name} angelegt.`);
    reset();
    onCreated(created.id);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary-glow" /> Neuen Kunden anlegen
          </DialogTitle>
          <DialogDescription>
            Der Kunde wird in den Stammdaten gespeichert und direkt für diesen Vorgang ausgewählt.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vor- und Nachname" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">E-Mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.de" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Telefon</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+49 …" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Straße & Hausnummer</Label>
            <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Musterstraße 12" />
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">PLZ</Label>
              <Input value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Stadt *</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Geburtsdatum</Label>
            <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button disabled={!valid} className="bg-gradient-brand" onClick={handleSubmit}>
            <UserPlus className="size-4 mr-1.5" /> Anlegen & auswählen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
