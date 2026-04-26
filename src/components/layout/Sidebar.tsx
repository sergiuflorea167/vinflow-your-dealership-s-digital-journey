import { NavLink } from "react-router-dom";
import { Workflow, Car, Users, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/einkaufsplanung", label: "Einkaufsplanung", icon: ShoppingCart },
  { to: "/flotte", label: "Flotte", icon: Car },
  { to: "/vorgaenge", label: "Vorgänge", icon: Workflow },
  { to: "/kunden", label: "Kunden", icon: Users },
];

export const Sidebar = () => {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <NavLink to="/" className="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border hover:opacity-90 transition-smooth">
        <div className="size-9 rounded-xl bg-gradient-brand grid place-items-center shadow-glow">
          <span className="font-display font-bold text-primary-foreground text-lg">V</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display font-bold text-base text-sidebar-foreground tracking-tight">VINflow</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Process OS</span>
        </div>
      </NavLink>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
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
        ))}
      </nav>

      <div className="m-3 p-4 rounded-xl bg-gradient-brand/20 border border-primary/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />
        <div className="relative">
          <p className="text-xs font-semibold text-sidebar-accent-foreground">VINflow Pro</p>
          <p className="text-xs text-muted-foreground mt-1">Cloud-Sync, E-Signaturen, Buchhaltung.</p>
        </div>
      </div>
    </aside>
  );
};
