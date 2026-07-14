import { useState } from "react";
import { Search, Bell, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTopbarSearchConfig } from "@/context/TopbarSearchContext";
import { UserMenu } from "./UserMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { MobileNavMenu } from "./MobileNavMenu";
import { useT } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { WorkshopPickerDialog } from "@/components/tutorial/WorkshopPickerDialog";

export const Topbar = () => {
  const config = useTopbarSearchConfig();
  const disabled = !config;
  const t = useT();
  const isMobile = useIsMobile();
  const [workshopOpen, setWorkshopOpen] = useState(false);

  return (
    <header className="min-h-14 sm:min-h-16 shrink-0 border-b border-border/60 bg-card/60 backdrop-blur-md flex items-center gap-1.5 px-3 py-2 sm:gap-3 sm:px-6 sm:py-0">
      <MobileNavMenu />
      <div className="flex flex-1 min-w-0 items-center gap-1.5 sm:max-w-2xl sm:gap-2" data-tour="topbar-search">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={config?.value ?? ""}
            onChange={(e) => config?.onChange(e.target.value)}
            disabled={disabled}
            placeholder={config?.placeholder ?? t("search.placeholder")}
            className="h-10 rounded-full pl-9 bg-muted/50 border-transparent text-sm focus-visible:ring-primary sm:h-10 sm:rounded-md sm:bg-background/40 sm:border-border/60"
          />
        </div>
        {config && config.fields.length > 1 && (
          <Select value={config.field} onValueChange={config.onFieldChange}>
            <SelectTrigger className="h-10 w-[92px] shrink-0 rounded-full bg-muted/50 border-transparent text-[11px] sm:h-10 sm:w-[170px] sm:rounded-md sm:bg-background/40 sm:border-border/60 sm:text-xs">
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
      <div className="flex items-center gap-0.5 shrink-0 sm:gap-1">
        {!isMobile && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWorkshopOpen(true)}
            className="hidden sm:flex h-9 gap-1.5 rounded-full border-primary/30 text-primary-glow hover:bg-primary/10 sm:rounded-md"
          >
            <GraduationCap className="size-4" /> Workshop
          </Button>
        )}
        <div className="hidden sm:flex sm:items-center sm:gap-1">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
        <Button variant="ghost" size="icon" className="size-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 sm:size-10 sm:rounded-md" aria-label={t("topbar.notifications")}>
          <Bell className="size-4" />
        </Button>
        <UserMenu />
      </div>
      {!isMobile && <WorkshopPickerDialog open={workshopOpen} onOpenChange={setWorkshopOpen} />}
    </header>
  );
};
