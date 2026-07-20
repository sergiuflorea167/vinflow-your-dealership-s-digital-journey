import { Menu } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { allNavItems, tourMap } from "./navItems";
import { SidebarAccountMenu } from "./SidebarAccountMenu";

/**
 * Mobile Navigation als versteckbares Menü statt permanenter Menüleiste —
 * schafft mehr Platz für den eigentlichen Seiteninhalt. Erreichbar über das
 * Menü-Icon links in der Topbar.
 */
export const MobileNavMenu = () => {
  const t = useT();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 shrink-0 rounded-full text-foreground hover:bg-muted/60 md:hidden"
          aria-label="Navigation öffnen"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] max-w-xs overflow-y-auto p-4">
        <SheetHeader className="mb-4 text-left">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="VINflow Logo" className="size-8 object-contain shrink-0" />
            <div className="flex flex-col leading-tight">
              <SheetTitle className="font-display text-base">VINflow</SheetTitle>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Process OS</span>
            </div>
          </div>
        </SheetHeader>

        <nav className="flex flex-col gap-1">
          {allNavItems.map(({ to, labelKey, icon: Icon }) => {
            const label = t(labelKey);
            return (
              <SheetClose asChild key={to}>
                <NavLink
                  to={to}
                  end={to === "/"}
                  data-tour={tourMap[to]}
                  aria-label={label}
                  className={({ isActive }) =>
                    cn(
                      "flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-smooth",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/80 hover:bg-muted/60",
                    )
                  }
                >
                  <Icon className="size-[18px] shrink-0" />
                  <span className="min-w-0 truncate">{label}</span>
                </NavLink>
              </SheetClose>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-border pt-2">
          <SidebarAccountMenu collapsed={false} />
        </div>
      </SheetContent>
    </Sheet>
  );
};
