import {
  CheckCircle2,
  AlertCircle,
  Info,
  TriangleAlert,
  X
} from "lucide-react";

import "./Toast.css";

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: TriangleAlert
};

export default function ToastViewport({
  toasts,
  onDismiss
}) {
  if (!toasts.length) return null;

  return (
    <div
      className="gp-toast-viewport"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon =
          ICONS[toast.type] || Info;

        return (
          <div
            key={toast.id}
            className={`gp-toast gp-toast-${toast.type}`}
          >
            <Icon
              size={20}
              className="gp-toast-icon"
            />

            <span className="gp-toast-message">
              {toast.message}
            </span>

            <button
              className="gp-toast-close"
              onClick={() =>
                onDismiss(toast.id)
              }
              aria-label="Fechar aviso"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}