import { Menu } from "lucide-react";
import "./Header.css";

export default function Header({ title, subtitle, onOpenMobileMenu, children }) {
  return (
    <header className="gp-header">
      <div className="gp-header-left">
        <button
          className="gp-header-menu-btn"
          onClick={onOpenMobileMenu}
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="gp-header-title">{title}</h1>
          {subtitle && <p className="gp-header-subtitle">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="gp-header-actions">{children}</div>}
    </header>
  );
}
