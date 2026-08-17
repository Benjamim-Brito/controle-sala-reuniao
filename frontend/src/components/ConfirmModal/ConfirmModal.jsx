import { AlertTriangle } from "lucide-react";
import Modal from "../Modal";

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Voltar",
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal open={open} onClose={onClose} width={420}>
      <div className="gp-confirm">
        <div className={`gp-confirm-icon ${danger ? "gp-confirm-icon-danger" : ""}`}>
          <AlertTriangle size={22} />
        </div>
        <h3 className="gp-confirm-title">{title}</h3>
        {description && <p className="gp-confirm-desc">{description}</p>}
        <div className="gp-confirm-actions">
          <button className="gp-btn gp-btn-secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className={`gp-btn ${danger ? "gp-btn-danger" : "gp-btn-primary"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Aguarde…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
