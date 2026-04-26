import { NavLink } from "react-router-dom";
import { LayoutDashboard, Workflow, Car, Users, ShoppingCart, ListChecks, BarChart3, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: any };

const dashboardItem: NavItem = { to: "/", label: "Dashboard", icon: LayoutDashboard };

const mainNav: NavItem[] = [
  { to: "/bestand", label: "Bestand", icon: Car },
  { to: "/vorgaenge", label: "Vorgänge", icon: Workflow },
  { to: "/einkaufsplanung", label: "Einkaufsplanung", icon: ShoppingCart },
  { to: "/todos", label: "To-Dos", icon: ListChecks },
  { to: "/kunden", label: "Kunden", icon: Users },
  { to: "/kpis", label: "KPIs", icon: BarChart3 },
];

const settingsItem: NavItem = { to: "/einstellungen", label: "Einstellungen", icon: SettingsIcon };

export const Sidebar = () => {
  const renderItem = ({ to, label, icon: Icon }: NavItem) => (
    <NavLink
      key={to}
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-card"
            : "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
        )
      }
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar h-screen sticky top-0">
      <NavLink to="/" className="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border hover:opacity-90 transition-smooth">
        <div className="size-9 rounded-xl bg-gradient-brand grid place-items-center shadow-glow">
          <span className="font-display font-bold text-primary-foreground text-lg">V</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display font-bold text-base text-sidebar-foreground tracking-tight">VINflow</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Process OS</span>
        </div>
      </NavLink>

      <nav className="flex-1 px-3 py-5 flex flex-col gap-1 overflow-y-auto">
        {renderItem(dashboardItem)}

        <div className="my-3 mx-3 h-px bg-sidebar-border/70" />

        {mainNav.map(renderItem)}

        <div className="flex-1" />

        <div className="my-3 mx-3 h-px bg-sidebar-border/70" />

        {renderItem(settingsItem)}
      </nav>
    </aside>
  );
};
