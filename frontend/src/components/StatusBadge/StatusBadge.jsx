import { statusConfig, empresaConfig } from "../../utils/status";
import "./StatusBadge.css";

export function StatusBadge({ status, size = "md" }) {
  const cfg = statusConfig(status);
  const Icon = cfg.icon;
  return (
    <span
      className={`gp-badge gp-badge-${size}`}
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <Icon size={size === "sm" ? 12 : 14} />
      {cfg.label}
    </span>
  );
}

export function EmpresaBadge({ empresa, size = "md" }) {
  const cfg = empresaConfig(empresa);
  return (
    <span
      className={`gp-badge gp-badge-dot gp-badge-${size}`}
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <span className="gp-badge-swatch" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

export default StatusBadge;
