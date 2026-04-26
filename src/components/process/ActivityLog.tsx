import { Activity, formatDateTime } from "@/data/process";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2, Plus, Edit, FileText, ShoppingCart, MapPin, Receipt, X, User, Settings as SettingsIcon, Target, Trash2, Workflow, SkipForward, RotateCcw,
} from "lucide-react";

const ICONS: Record<Activity["type"], any> = {
  vehicle_added: Plus,
  vehicle_updated: Edit,
  vehicle_location_changed: MapPin,
  vehicle_cost_added: Receipt,
  purchase_planned: ShoppingCart,
  purchase_received: CheckCircle2,
  offer_created: FileText,
  offer_accepted: CheckCircle2,
  offer_rejected: X,
  process_created: Workflow,
  process_step_completed: CheckCircle2,
  process_step_skipped: SkipForward,
  process_step_cancelled: RotateCcw,
  process_field_updated: Edit,
  todo_created: Plus,
  todo_completed: CheckCircle2,
  todo_deleted: Trash2,
  customer_added: User,
  settings_updated: SettingsIcon,
  goal_updated: Target,
};

export const ActivityLog = ({ items, title = "Protokoll", maxItems }: { items: Activity[]; title?: string; maxItems?: number }) => {
  const list = maxItems ? items.slice(0, maxItems) : items;

  return (
    <Card className="p-5 bg-card border-border shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-sm">{title}</h3>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{items.length} Einträge</span>
      </div>
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Noch keine Aktivitäten.</p>
      ) : (
        <ol className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {list.map((a) => {
            const Icon = ICONS[a.type] ?? Edit;
            return (
              <li key={a.id} className="flex gap-3">
                <div className="size-7 rounded-md bg-primary/10 border border-primary/20 grid place-items-center shrink-0 text-primary-glow">
                  <Icon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground leading-tight">{a.message}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDateTime(a.timestamp)} · von {a.user}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
};
