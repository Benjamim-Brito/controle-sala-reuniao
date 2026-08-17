import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarRange,
  ListChecks,
  History,
  Settings,
  ChevronsLeft,
  X,
} from "lucide-react";
import Logo from "../Logo/Logo";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import "./Sidebar.css";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/agenda", label: "Agenda", icon: CalendarRange },
  { to: "/reservas", label: "Reservas", icon: ListChecks },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  return (
    <>
      {mobileOpen && <div className="gp-sidebar-scrim" onClick={onCloseMobile} />}

      <aside
        className={`gp-sidebar ${collapsed ? "gp-sidebar-collapsed" : ""} ${
          mobileOpen ? "gp-sidebar-mobile-open" : ""
        }`}
      >
        <div className="gp-sidebar-top">
          <div className="gp-sidebar-brand">
            <Logo variant={collapsed ? "reduced" : "full"} />
          </div>
          <button
            className="gp-sidebar-mobile-close"
            onClick={onCloseMobile}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="gp-sidebar-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `gp-sidebar-link ${isActive ? "is-active" : ""}`}
              onClick={onCloseMobile}
              title={collapsed ? label : undefined}
            >
              <Icon size={19} strokeWidth={2} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="gp-sidebar-bottom">
          <ThemeToggle collapsed={collapsed} />
          <button
            className="gp-sidebar-collapse-btn"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            <ChevronsLeft size={16} style={{ transform: collapsed ? "rotate(180deg)" : "none" }} />
            {!collapsed && <span>Recolher</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
