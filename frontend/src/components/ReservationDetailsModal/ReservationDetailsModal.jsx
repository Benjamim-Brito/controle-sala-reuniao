import {
  Pencil,
  Ban,
  CalendarDays,
  Clock3,
  User,
  Building2,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  UserCheck
} from "lucide-react";

import Modal from "../Modal";

import {
  EmpresaBadge,
  StatusBadge
} from "../StatusBadge/StatusBadge";

import {
  formatDateBR,
  formatTime
} from "../../utils/date";

import { STATUS } from "../../utils/status";

import "./ReservationDetailsModal.css";


export default function ReservationDetailsModal({
  reserva,
  onClose,
  onEdit,
  onCancel,
  onPause,
  onResume,
  changingStatus = false,
  readOnly = false
}) {
  if (!reserva) return null;

  const podeGerenciar =
    !readOnly &&
    reserva.status !== STATUS.CANCELADA &&
    reserva.status !== STATUS.CONFLITO;

  const podePausar =
    podeGerenciar &&
    reserva.status === STATUS.AGENDADA;

  const podeRetomar =
    podeGerenciar &&
    reserva.status === STATUS.STAND_BY;


  return (
    <Modal
      open={!!reserva}
      onClose={onClose}
      width={460}
      title="Detalhes da reserva"
    >
      <div className="gp-details">

        <div className="gp-details-header">

          <h3>
            {reserva.motivo ||
              "Reunião sem assunto definido"}
          </h3>

          <div className="gp-details-badges">

            <EmpresaBadge
              empresa={reserva.empresa}
            />

            <StatusBadge
              status={reserva.status}
            />

          </div>

        </div>


        <div className="gp-details-rows">

          <div className="gp-details-row">
            <CalendarDays size={16} />

            <span>
              {formatDateBR(reserva.data)}
            </span>
          </div>


          <div className="gp-details-row">
            <Clock3 size={16} />

            <span>
              {formatTime(
                reserva.hora_inicio
              )}{" "}
              –{" "}
              {formatTime(
                reserva.hora_fim
              )}
            </span>
          </div>


          <div className="gp-details-row">
            <User size={16} />

            <span>
              {reserva.responsavel}
            </span>
          </div>


          <div className="gp-details-row">
            <Building2 size={16} />

            <span>
              {reserva.setor}
            </span>
          </div>


          {reserva.marcado_por && (
            <div className="gp-details-row">
              <UserCheck size={16} />

              <span>
                Marcado por {reserva.marcado_por}
              </span>
            </div>
          )}


          {reserva.motivo && (
            <div className="gp-details-row">
              <MessageSquare size={16} />

              <span>
                {reserva.motivo}
              </span>
            </div>
          )}

        </div>


        {podeGerenciar && (
          <div className="gp-details-actions">

            {podePausar && (
              <button
                className="gp-btn gp-btn-standby"
                disabled={changingStatus}
                onClick={() =>
                  onPause?.(reserva)
                }
              >
                <PauseCircle size={16} />

                {changingStatus
                  ? "Pausando..."
                  : "Pausar reunião"}
              </button>
            )}


            {podeRetomar && (
              <button
                className="gp-btn gp-btn-resume"
                disabled={changingStatus}
                onClick={() =>
                  onResume?.(reserva)
                }
              >
                <PlayCircle size={16} />

                {changingStatus
                  ? "Retomando..."
                  : "Retomar reunião"}
              </button>
            )}


            <button
              className="gp-btn gp-btn-secondary"
              onClick={() =>
                onEdit(reserva)
              }
            >
              <Pencil size={15} />
              Editar reserva
            </button>


            <button
              className="gp-btn gp-btn-danger"
              onClick={() =>
                onCancel(reserva)
              }
            >
              <Ban size={15} />
              Cancelar reserva
            </button>

          </div>
        )}

      </div>
    </Modal>
  );
}