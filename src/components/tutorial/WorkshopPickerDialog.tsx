import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { useWorkshopStore, WORKSHOP_ORDER } from "@/store/workshopStore";
import { WORKSHOP_LIST } from "./workshopRegistry";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export const WorkshopPickerDialog = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();

  const startOne = (key: (typeof WORKSHOP_ORDER)[number], route: string) => {
    onOpenChange(false);
    navigate(route);
    setTimeout(() => useWorkshopStore.getState().start(key), 80);
  };

  const startAll = () => {
    onOpenChange(false);
    const first = WORKSHOP_ORDER[0];
    navigate("/");
    setTimeout(() => useWorkshopStore.getState().start(first, { runAll: true }), 80);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>Workshop wählen</DialogTitle>
          <DialogDescription>
            Interaktive Tour mit Beispieldaten für jeden Menüpunkt — klicke dich Schritt für Schritt durch. Es wird nichts an deinen echten Daten geändert.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          <button
            onClick={startAll}
            className="w-full text-left flex items-start gap-3 p-4 rounded-lg border border-primary/50 bg-primary/5 hover:bg-primary/10 transition-smooth"
          >
            <div className="size-10 rounded-md grid place-items-center shrink-0 bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">Kompletter Workshop</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Alle {WORKSHOP_LIST.length} Workshops nacheinander — die komplette Einführung durchs ganze Menü.
              </p>
            </div>
          </button>

          {WORKSHOP_LIST.map(({ key, icon: Icon, title, desc, route }) => (
            <button
              key={key}
              onClick={() => startOne(key, route)}
              className="w-full text-left flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary/40 hover:bg-secondary/40 transition-smooth"
            >
              <div className="size-10 rounded-md grid place-items-center shrink-0 bg-secondary text-primary">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
