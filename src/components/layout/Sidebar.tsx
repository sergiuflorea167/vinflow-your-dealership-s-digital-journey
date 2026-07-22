import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useT } from "@/lib/i18n";
import { navEntries, tourMap, type NavItem, type NavGroup } from "./navItems";
import { SidebarAccountMenu } from "./SidebarAccountMenu";

const STORAGE_KEY = "vinflow.sidebar.collapsed";

const isPathActive = (pathname: string, to: string) =>
  to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);

const NavItemLink = ({ to, labelKey, icon: Icon, collapsed }: NavItem & { collapsed: boolean }) => {
  const t = useT();
  const label = t(labelKey);
  const link = (
    <NavLink
      to={to}
      end={to === "/"}
      data-tour={tourMap[to]}
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
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
};

const FlyoutItemLink = ({ to, labelKey, icon: Icon }: NavItem) => {
  const t = useT();
  const label = t(labelKey);
  return (
    <NavLink
      to={to}
      end={to === "/"}
      data-tour={tourMap[to]}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-card"
            : "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50",
        )
      }
      aria-label={label}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
};

/**
 * Ein Obermenü. Enthält es die aktuell aktive Seite, zeigt es seine Punkte
 * (im ausgeklappten Sidebar-Zustand) direkt inline an — so findet auch die
 * geführte Tour ihre Ziele, ohne Hover simulieren zu müssen. Ansonsten klappt
 * das Untermenü erst per Hover/Klick als eigene Spalte rechts daneben auf,
 * per Portal gerendert, damit es nicht vom scrollenden Sidebar-Bereich
 * abgeschnitten wird.
 */
const SidebarGroup = ({ group, collapsed }: { group: NavGroup; collapsed: boolean }) => {
  const t = useT();
  const location = useLocation();
  const [hoverOpen, setHoverOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);

  const GroupIcon = group.icon;
  const label = t(group.labelKey);
  const active = group.items.some((item) => isPathActive(location.pathname, item.to));
  const showInline = !collapsed && active;
  // Im eingeklappten Zustand darf "active" das Flyout nicht dauerhaft offen
  // erzwingen — sonst lässt es sich nie mehr schließen (hoverOpen ist dann
  // die einzige Instanz, die es wieder zumacht).
  const showFlyout = !showInline && hoverOpen;

  useEffect(() => {
    setHoverOpen(false);
  }, [location.pathname]);

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    if (!showFlyout) return;
    const update = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const estimatedHeight = 56 + group.items.length * 44;
      setCoords({
        top: Math.max(8, Math.min(r.top, window.innerHeight - estimatedHeight - 8)),
        left: r.right + 8,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [showFlyout, group.items.length]);

  useEffect(() => {
    if (!hoverOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setHoverOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [hoverOpen]);

  const openFlyout = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setHoverOpen(true);
  };

  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setHoverOpen(false), 150);
  };

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className={cn(
        "flex w-full items-center rounded-lg text-sm font-medium transition-smooth",
        collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3 py-2.5",
        active
          ? "text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50",
      )}
      onClick={() => setHoverOpen((prev) => !prev)}
      onFocus={openFlyout}
      aria-expanded={showInline || showFlyout}
      aria-label={label}
    >
      <GroupIcon className="size-4 shrink-0" />
      {!collapsed && <span className="flex-1 text-left truncate">{label}</span>}
      {!collapsed && (
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 text-sidebar-foreground/40 transition-transform",
            showInline && "rotate-90",
          )}
        />
      )}
    </button>
  );

  return (
    <div
      className="relative"
      onMouseEnter={openFlyout}
      onMouseLeave={scheduleClose}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHoverOpen(false);
      }}
    >
      {collapsed ? (
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      {showInline && (
        <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-sidebar-border/70 pl-3">
          {group.items.map((item) => <FlyoutItemLink key={item.to} {...item} />)}
        </div>
      )}

      {showFlyout && coords && createPortal(
        <div
          ref={panelRef}
          className="fixed z-30 w-56 rounded-xl border border-sidebar-border bg-sidebar p-2 shadow-lg animate-in fade-in slide-in-from-left-1 duration-150"
          style={{ top: coords.top, left: coords.left }}
          onMouseEnter={openFlyout}
          onMouseLeave={scheduleClose}
        >
          <p className="px-2 pt-1 pb-2 text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
            {label}
          </p>
          <div className="flex flex-col gap-1">
            {group.items.map((item) => <FlyoutItemLink key={item.to} {...item} />)}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export const Sidebar = () => {
  const t = useT();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

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
          {navEntries.map((entry, i) => {
            const prev = navEntries[i - 1];
            const showDivider = entry.kind === "group" || prev?.kind === "group";
            const key = entry.kind === "item" ? entry.item.to : entry.group.labelKey;
            return (
              <div key={key} className="flex flex-col gap-1">
                {showDivider && <div className="my-1 mx-3 h-px bg-sidebar-border/70" />}
                {entry.kind === "item" ? (
                  <NavItemLink {...entry.item} collapsed={collapsed} />
                ) : entry.group.items.length === 1 ? (
                  <NavItemLink {...entry.group.items[0]} collapsed={collapsed} />
                ) : (
                  <SidebarGroup group={entry.group} collapsed={collapsed} />
                )}
              </div>
            );
          })}

          <div className="flex-1" />
        </nav>

        <div className={cn("border-t border-sidebar-border py-2", collapsed ? "px-2" : "px-2")}>
          <SidebarAccountMenu collapsed={collapsed} />
        </div>
      </aside>
    </TooltipProvider>
  );
};
