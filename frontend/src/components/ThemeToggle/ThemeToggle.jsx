import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import "./ThemeToggle.css";

export default function ThemeToggle({ collapsed = false }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      className={`gp-theme-toggle ${collapsed ? "gp-theme-toggle-collapsed" : ""}`}
      onClick={toggleTheme}
      type="button"
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
    >
      <span className={`gp-theme-toggle-track ${isDark ? "is-dark" : ""}`}>
        <span className="gp-theme-toggle-thumb">
          {isDark ? <Moon size={12} /> : <Sun size={12} />}
        </span>
      </span>
      {!collapsed && <span className="gp-theme-toggle-label">{isDark ? "Modo escuro" : "Modo claro"}</span>}
    </button>
  );
}
