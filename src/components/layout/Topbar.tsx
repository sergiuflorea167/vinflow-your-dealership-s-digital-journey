import { Search, Bell, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Topbar = () => {
  return (
    <header className="h-16 shrink-0 border-b border-border bg-card/40 backdrop-blur-md flex items-center gap-4 px-6">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Suche nach VIN, Vorgang oder Kunde…"
          className="pl-9 bg-background/40 border-border/60 focus-visible:ring-primary"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Bell className="size-4" />
        </Button>
        <Button className="bg-gradient-brand hover:opacity-90 shadow-elegant gap-2">
          <Plus className="size-4" />
          Neuer Vorgang
        </Button>
        <div className="ml-2 size-9 rounded-full bg-secondary grid place-items-center text-sm font-semibold text-secondary-foreground border border-border">
          MH
        </div>
      </div>
    </header>
  );
};
