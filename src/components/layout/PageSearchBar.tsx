import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTopbarSearchConfig } from "@/context/TopbarSearchContext";

/**
 * Seiteneigene Suchleiste — ersetzt die frühere globale Topbar-Suche. Seiten
 * registrieren ihre Konfiguration weiterhin über useTopbarSearch(); gerendert
 * wird sie jetzt inline am Seitenanfang statt in einer festen Menüleiste.
 */
export const PageSearchBar = () => {
  const config = useTopbarSearchConfig();
  if (!config) return null;

  return (
    <div className="mb-4 flex max-w-2xl items-center gap-2" data-tour="topbar-search">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={config.value}
          onChange={(e) => config.onChange(e.target.value)}
          placeholder={config.placeholder}
          className="h-10 rounded-md pl-9 bg-background/60 border-border/60 text-sm focus-visible:ring-primary"
        />
      </div>
      {config.fields.length > 1 && (
        <Select value={config.field} onValueChange={config.onFieldChange}>
          <SelectTrigger className="h-10 w-[170px] shrink-0 rounded-md bg-background/60 border-border/60 text-xs">
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
  );
};
