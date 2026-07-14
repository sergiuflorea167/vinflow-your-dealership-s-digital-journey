import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTopbarSearchConfig } from "@/context/TopbarSearchContext";
import { UserMenu } from "./UserMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useT } from "@/lib/i18n";

export const Topbar = () => {
  const config = useTopbarSearchConfig();
  const disabled = !config;
  const t = useT();

  return (
    <header className="min-h-16 shrink-0 border-b border-border bg-card/40 backdrop-blur-md flex flex-wrap items-center gap-2 px-3 py-2 sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-0">
      <div className="order-2 flex w-full min-w-0 flex-1 flex-col gap-2 sm:order-1 sm:max-w-2xl sm:flex-row sm:items-center" data-tour="topbar-search">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={config?.value ?? ""}
            onChange={(e) => config?.onChange(e.target.value)}
            disabled={disabled}
            placeholder={config?.placeholder ?? t("search.placeholder")}
            className="pl-9 bg-background/40 border-border/60 focus-visible:ring-primary"
          />
        </div>
        {config && config.fields.length > 1 && (
          <Select value={config.field} onValueChange={config.onFieldChange}>
            <SelectTrigger className="w-full shrink-0 bg-background/40 border-border/60 sm:w-[170px]">
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
      <div className="order-1 flex items-center gap-1 ml-auto sm:order-2">
        <LanguageSwitcher />
        <ThemeSwitcher />
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label={t("topbar.notifications")}>
          <Bell className="size-4" />
        </Button>
        <UserMenu />
      </div>
    </header>
  );
};
