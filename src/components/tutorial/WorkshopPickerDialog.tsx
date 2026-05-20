import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LayoutDashboard, Warehouse, ShoppingCart, ListTodo, CalendarDays, Sparkles } from "lucide-react";
import { useWorkshopStore } from "@/store/workshopStore";
import { useFleetWorkshopStore } from "@/store/fleetWorkshopStore";
import { usePurchaseWorkshopStore } from "@/store/purchaseWorkshopStore";
import { useTodosWorkshopStore } from "@/store/todosWorkshopStore";
import { useCalendarWorkshopStore } from "@/store/calendarWorkshopStore";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export const WorkshopPickerDialog = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();

  const startDashboard = (chainAll: boolean) => {
    onOpenChange(false);
    navigate("/");
    setTimeout(() => useWorkshopStore.getState().start({ chainNext: chainAll ? "fleet" : null }), 80);
  };

  const startFleet = () => {
    onOpenChange(false);
    navigate("/bestand");
    setTimeout(() => useFleetWorkshopStore.getState().start(), 80);
  };

  const startPurchase = () => {
    onOpenChange(false);
    navigate("/einkaufsplanung");
    setTimeout(() => usePurchaseWorkshopStore.getState().start(), 80);
  };

  const startTodos = () => {
    onOpenChange(false);
    navigate("/todos");
    setTimeout(() => useTodosWorkshopStore.getState().start(), 80);
  };

  const startCalendar = () => {
    onOpenChange(false);
    navigate("/kalender");
    setTimeout(() => useCalendarWorkshopStore.getState().start(), 80);
  };

  const items = [
    {
      key: "dashboard",
      icon: LayoutDashboard,
      title: "Dashboard-Workshop",
      desc: "Lerne, wie du KPIs, To-Dos und Vorgänge im Dashboard liest.",
      onClick: () => startDashboard(false),
    },
    {
      key: "fleet",
      icon: Warehouse,
      title: "Bestand-Workshop",
      desc: "Filter, Sortierung, Aufnahme und Import-Funktionen im Bestand.",
      onClick: startFleet,
    },
    {
      key: "purchase",
      icon: ShoppingCart,
      title: "Einkaufsplanung-Workshop",
      desc: "Potenzielle Einkäufe tracken, Notizen führen, in den Bestand überführen.",
      onClick: startPurchase,
    },
    {
      key: "todos",
      icon: ListTodo,
      title: "To-Dos-Workshop",
      desc: "Aufgaben filtern, anlegen und Vorgangs-To-Dos automatisch verwalten.",
      onClick: startTodos,
    },
    {
      key: "full",
      icon: Sparkles,
      title: "Kompletter Workshop",
      desc: "Alle Workshops nacheinander – startet mit Dashboard.",
      onClick: () => startDashboard(true),
      highlight: true,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Workshop wählen</DialogTitle>
          <DialogDescription>
            Interaktive Tour mit Beispieldaten – klicke dich Schritt für Schritt durch.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          {items.map(({ key, icon: Icon, title, desc, onClick, highlight }) => (
            <button
              key={key}
              onClick={onClick}
              className={`w-full text-left flex items-start gap-3 p-4 rounded-lg border transition-all ${
                highlight
                  ? "border-primary/50 bg-primary/5 hover:bg-primary/10"
                  : "border-border hover:border-primary/40 hover:bg-secondary/40"
              }`}
            >
              <div className={`size-10 rounded-md grid place-items-center shrink-0 ${highlight ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>
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
