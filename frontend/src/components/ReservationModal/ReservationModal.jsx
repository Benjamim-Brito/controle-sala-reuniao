import { useEffect, useState } from "react";
import { CalendarDays, AlertCircle } from "lucide-react";
import Modal from "../Modal";
import { toISODate } from "../../utils/date";
import "./ReservationModal.css";

const EMPTY_FORM = {
  data: toISODate(new Date()),
  hora_inicio: "",
  hora_fim: "",
  responsavel: "",
  setor: "",
  empresa: "GREEN",
  motivo: "",
};

function toFormState(reserva) {
  if (!reserva) return EMPTY_FORM;
  return {
    data: reserva.data || EMPTY_FORM.data,
    hora_inicio: (reserva.hora_inicio || "").slice(0, 5),
    hora_fim: (reserva.hora_fim || "").slice(0, 5),
    responsavel: reserva.responsavel || "",
    setor: reserva.setor || "",
    empresa: reserva.empresa || "GREEN",
    motivo: reserva.motivo || "",
  };
}

export default function ReservationModal({ open, mode = "create", reserva, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState(() => toFormState(reserva));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(toFormState(reserva));
      setErrors({});
      setFormError("");
    }
  }, [open, reserva]);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.data) next.data = "Informe a data.";
    if (!form.hora_inicio) next.hora_inicio = "Informe o horário inicial.";
    if (!form.hora_fim) next.hora_fim = "Informe o horário final.";
    if (form.hora_inicio && form.hora_fim && form.hora_fim <= form.hora_inicio) {
      next.hora_fim = "O horário final deve ser maior que o inicial.";
    }
    if (!form.responsavel.trim()) next.responsavel = "Informe o responsável.";
    if (!form.setor.trim()) next.setor = "Informe o setor.";
    if (!form.empresa) next.empresa = "Selecione a empresa.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (submitting) return;
    if (!validate()) return;

    const payload = {
      data: form.data,
      hora_inicio: form.hora_inicio,
      hora_fim: form.hora_fim,
      responsavel: form.responsavel.trim(),
      setor: form.setor.trim(),
      empresa: form.empresa,
      motivo: form.motivo.trim() || undefined,
    };

    const result = await onSubmit(payload);
    if (result && !result.ok && !result.handled) {
      setFormError(result.mensagem || "Não foi possível salvar a reserva.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} width={520} title="Reserva de sala">
      <form className="gp-resform" onSubmit={handleSubmit} noValidate>
        <div className="gp-resform-header">
          <div className="gp-resform-icon">
            <CalendarDays size={20} />
          </div>
          <div>
            <h3 className="gp-resform-title">
              {mode === "edit" ? "Editar reserva" : "Nova reserva"}
            </h3>
            <p className="gp-resform-subtitle">Sala de reunião · Green Paperless</p>
          </div>
        </div>

        {formError && (
          <div className="gp-resform-alert">
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <div className="gp-resform-grid">
          <label className="gp-field">
            <span>Data</span>
            <input
              type="date"
              value={form.data}
              min={mode === "create" ? toISODate(new Date()) : undefined}
              onChange={(e) => setField("data", e.target.value)}
            />
            {errors.data && <em>{errors.data}</em>}
          </label>

          <label className="gp-field">
            <span>Empresa</span>
            <select value={form.empresa} onChange={(e) => setField("empresa", e.target.value)}>
              <option value="GREEN">Green</option>
              <option value="MV">MV</option>
              <option value="EXTERNO">Externo / Outros</option>
            </select>
            {errors.empresa && <em>{errors.empresa}</em>}
          </label>

          <label className="gp-field">
            <span>Horário inicial</span>
            <input
              type="time"
              value={form.hora_inicio}
              onChange={(e) => setField("hora_inicio", e.target.value)}
            />
            {errors.hora_inicio && <em>{errors.hora_inicio}</em>}
          </label>

          <label className="gp-field">
            <span>Horário final</span>
            <input
              type="time"
              value={form.hora_fim}
              min={form.hora_inicio || undefined}
              onChange={(e) => setField("hora_fim", e.target.value)}
            />
            {errors.hora_fim && <em>{errors.hora_fim}</em>}
          </label>

          <label className="gp-field">
            <span>Responsável</span>
            <input
              type="text"
              placeholder="Nome do responsável"
              value={form.responsavel}
              onChange={(e) => setField("responsavel", e.target.value)}
            />
            {errors.responsavel && <em>{errors.responsavel}</em>}
          </label>

          <label className="gp-field">
            <span>Setor</span>
            <input
              type="text"
              placeholder="Ex.: Projetos, TI, Financeiro"
              value={form.setor}
              onChange={(e) => setField("setor", e.target.value)}
            />
            {errors.setor && <em>{errors.setor}</em>}
          </label>

          <label className="gp-field gp-field-full">
            <span>Motivo / Assunto <em className="gp-field-optional">(opcional)</em></span>
            <textarea
              rows={3}
              placeholder="Sobre o que é a reunião?"
              value={form.motivo}
              onChange={(e) => setField("motivo", e.target.value)}
            />
          </label>
        </div>

        <div className="gp-resform-actions">
          <button type="button" className="gp-btn gp-btn-secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" className="gp-btn gp-btn-primary" disabled={submitting}>
            {submitting ? "Salvando…" : mode === "edit" ? "Salvar alterações" : "Reservar sala"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
