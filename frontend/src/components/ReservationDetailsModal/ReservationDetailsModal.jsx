import { Pencil, Ban, CalendarDays, Clock3, User, Building2, MessageSquare } from "lucide-react";
import Modal from "../Modal";
import { EmpresaBadge, StatusBadge } from "../StatusBadge/StatusBadge";
import { formatDateBR, formatTime } from "../../utils/date";
import { STATUS } from "../../utils/status";
import "./ReservationDetailsModal.css";

export default function ReservationDetailsModal({ reserva, onClose, onEdit, onCancel, readOnly = false }) {
  if (!reserva) return null;
  const podeGerenciar = !readOnly && reserva.status !== STATUS.CANCELADA;

  return (
    <Modal open={!!reserva} onClose={onClose} width={460} title="Detalhes da reserva">
      <div className="gp-details">
        <div className="gp-details-header">
          <h3>{reserva.motivo || "Reunião sem assunto definido"}</h3>
          <div className="gp-details-badges">
            <EmpresaBadge empresa={reserva.empresa} />
            <StatusBadge status={reserva.status} />
          </div>
        </div>

        <div className="gp-details-rows">
          <div className="gp-details-row">
            <CalendarDays size={16} />
            <span>{formatDateBR(reserva.data)}</span>
          </div>
          <div className="gp-details-row">
            <Clock3 size={16} />
            <span>
              {formatTime(reserva.hora_inicio)} – {formatTime(reserva.hora_fim)}
            </span>
          </div>
          <div className="gp-details-row">
            <User size={16} />
            <span>{reserva.responsavel}</span>
          </div>
          <div className="gp-details-row">
            <Building2 size={16} />
            <span>{reserva.setor}</span>
          </div>
          {reserva.motivo && (
            <div className="gp-details-row">
              <MessageSquare size={16} />
              <span>{reserva.motivo}</span>
            </div>
          )}
        </div>

        {podeGerenciar && (
          <div className="gp-details-actions">
            <button className="gp-btn gp-btn-secondary" onClick={() => onEdit(reserva)}>
              <Pencil size={15} /> Editar reserva
            </button>
            <button className="gp-btn gp-btn-danger" onClick={() => onCancel(reserva)}>
              <Ban size={15} /> Cancelar reserva
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
