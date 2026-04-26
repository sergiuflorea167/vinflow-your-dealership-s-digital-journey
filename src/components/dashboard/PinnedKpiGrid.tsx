// Drag-and-Drop Grid für gepinnte KPIs am Dashboard.
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, rectSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDashboardStore } from "@/store/dashboardStore";
import { getKpi } from "@/lib/kpis";
import { KpiCard } from "@/components/kpi/KpiCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pin, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const SortableKpi = ({ id }: { id: string }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const kpi = getKpi(id);
  if (!kpi) return null;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <KpiCard kpi={kpi} variant="dashboard" dragHandleProps={listeners as React.HTMLAttributes<HTMLButtonElement>} />
    </div>
  );
};

export const PinnedKpiGrid = () => {
  const pinnedKpis = useDashboardStore((s) => s.pinnedKpis);
  const reorder = useDashboardStore((s) => s.reorder);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = pinnedKpis.indexOf(active.id as string);
    const newIndex = pinnedKpis.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    reorder(arrayMove(pinnedKpis, oldIndex, newIndex));
  };

  if (pinnedKpis.length === 0) {
    return (
      <Card className="p-8 bg-card border-dashed border-border text-center">
        <Pin className="size-8 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-display font-semibold text-lg mb-1">Noch keine KPIs angepinnt</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          Wähle in der KPI-Übersicht aus, welche Kennzahlen du täglich am Dashboard sehen willst.
        </p>
        <Button asChild className="bg-gradient-brand">
          <Link to="/kpis">
            Zu den KPIs <ArrowRight className="size-4 ml-1.5" />
          </Link>
        </Button>
      </Card>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={pinnedKpis} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pinnedKpis.map((id) => <SortableKpi key={id} id={id} />)}
        </div>
      </SortableContext>
    </DndContext>
  );
};
