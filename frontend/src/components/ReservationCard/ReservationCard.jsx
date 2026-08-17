import { Clock3, User, Building2 } from "lucide-react";
import { StatusBadge, EmpresaBadge } from "../StatusBadge/StatusBadge";
import { formatTime } from "../../utils/date";
import "./ReservationCard.css";

export default function ReservationCard({ reserva, onClick, compact = false }) {
  return (
    <button
      className={`gp-rescard ${compact ? "gp-rescard-compact" : ""}`}
      onClick={() => onClick?.(reserva)}
      type="button"
    >
      <div className="gp-rescard-time">
        <Clock3 size={14} />
        {formatTime(reserva.hora_inicio)} — {formatTime(reserva.hora_fim)}
      </div>

      <div className="gp-rescard-body">
        <p className="gp-rescard-title">{reserva.motivo || "Reunião sem assunto definido"}</p>
        <div className="gp-rescard-meta">
          <span>
            <User size={12} /> {reserva.responsavel}
          </span>
          <span>
            <Building2 size={12} /> {reserva.setor}
          </span>
        </div>
      </div>

      <div className="gp-rescard-tags">
        <EmpresaBadge empresa={reserva.empresa} size="sm" />
        <StatusBadge status={reserva.status} size="sm" />
      </div>
    </button>
  );
}
