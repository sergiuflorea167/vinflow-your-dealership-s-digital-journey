import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Workflow, Car, ShoppingCart, ListChecks,
  BarChart3, Settings as SettingsIcon, ChevronLeft, ChevronRight,
  Database, Sparkles, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useT } from "@/lib/i18n";

type NavItem = { to: string; labelKey: string; icon: any };
type NavGroup = { labelKey: string; items: NavItem[] };

const overview: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
];

const groups: NavGroup[] = [
  {
    labelKey: "nav.group.daily",
    items: [
      { to: "/bestand",         labelKey: "nav.fleet",      icon: Car },
      { to: "/vorgaenge",       labelKey: "nav.processes",  icon: Workflow },
      { to: "/einkaufsplanung", labelKey: "nav.purchasing", icon: ShoppingCart },
      { to: "/todos",           labelKey: "nav.todos",      icon: ListChecks },
      { to: "/kalender",        labelKey: "nav.calendar",   icon: CalendarDays },
    ],
  },
  {
    labelKey: "nav.group.analytics",
    items: [
      { to: "/kpis",     labelKey: "nav.kpis",     icon: BarChart3 },
      { to: "/insights", labelKey: "nav.insights", icon: Sparkles },
    ],
  },
  {
    labelKey: "nav.group.master",
    items: [
      { to: "/stammdaten", labelKey: "nav.master", icon: Database },
    ],
  },
];

const settingsItem: NavItem = { to: "/einstellungen", labelKey: "nav.settings", icon: SettingsIcon };

const STORAGE_KEY = "vinflow.sidebar.collapsed";

export const Sidebar = () => {
  const t = useT();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const renderItem = ({ to, labelKey, icon: Icon }: NavItem) => {
    const label = t(labelKey);
    const link = (
      <NavLink
        key={to}
        to={to}
        end={to === "/"}
        className={({ isActive }) =>
          cn(
            "flex items-center rounded-lg text-sm font-medium transition-smooth",
            collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3 py-2.5",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-card"
              : "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50",
          )
        }
        aria-label={label}
      >
        <Icon className="size-4 shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </NavLink>
    );

    if (!collapsed) return link;

    return (
      <Tooltip key={to} delayDuration={150}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  };

  const renderGroup = (group: NavGroup) => (
    <div key={group.labelKey} className="flex flex-col gap-1">
      {!collapsed && (
        <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
          {t(group.labelKey)}
        </p>
      )}
      {group.items.map(renderItem)}
    </div>
  );

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "hidden md:flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar h-screen sticky top-0 transition-[width] duration-200",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex items-center h-16 border-b border-sidebar-border",
            collapsed ? "justify-center px-2" : "justify-between pl-6 pr-2",
          )}
        >
          <NavLink to="/" className="flex items-center gap-3 hover:opacity-90 transition-smooth min-w-0">
            <img src="/favicon.png" alt="VINflow Logo" className="size-9 object-contain shrink-0" />
            {!collapsed && (
              <div className="flex flex-col leading-tight min-w-0">
                <span className="font-display font-bold text-base text-sidebar-foreground tracking-tight truncate">VINflow</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">Process OS</span>
              </div>
            )}
          </NavLink>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
              onClick={() => setCollapsed(true)}
              aria-label={t("nav.collapse")}
            >
              <ChevronLeft className="size-4" />
            </Button>
          )}
        </div>

        {collapsed && (
          <div className="flex justify-center pt-3">
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
                  onClick={() => setCollapsed(false)}
                  aria-label={t("nav.expand")}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{t("nav.expand")}</TooltipContent>
            </Tooltip>
          </div>
        )}

        <nav className={cn("flex-1 py-5 flex flex-col gap-3 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
          {overview.map(renderItem)}

          {groups.map((g, i) => (
            <div key={g.labelKey} className="flex flex-col gap-1">
              <div className="my-1 mx-3 h-px bg-sidebar-border/70" />
              {renderGroup(g)}
            </div>
          ))}

          <div className="flex-1" />

          <div className="my-1 mx-3 h-px bg-sidebar-border/70" />

          {renderItem(settingsItem)}
        </nav>
      </aside>
    </TooltipProvider>
  );
};
