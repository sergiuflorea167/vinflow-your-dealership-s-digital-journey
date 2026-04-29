import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTopbarSearchConfig } from "@/context/TopbarSearchContext";
import { UserMenu } from "./UserMenu";

export const Topbar = () => {
  const config = useTopbarSearchConfig();
  const disabled = !config;

  return (
    <header className="h-16 shrink-0 border-b border-border bg-card/40 backdrop-blur-md flex items-center gap-3 px-6">
      <div className="flex flex-1 max-w-2xl items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={config?.value ?? ""}
            onChange={(e) => config?.onChange(e.target.value)}
            disabled={disabled}
            placeholder={config?.placeholder ?? "Suche…"}
            className="pl-9 bg-background/40 border-border/60 focus-visible:ring-primary"
          />
        </div>
        {config && config.fields.length > 1 && (
          <Select value={config.field} onValueChange={config.onFieldChange}>
            <SelectTrigger className="w-[170px] bg-background/40 border-border/60 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {config.fields.map((f) => (
                <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Bell className="size-4" />
        </Button>
        <UserMenu />
      </div>
    </header>
  );
};
