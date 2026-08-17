import { useCallback, useState } from "react";
import { reservasApi, ApiError } from "../services/api";
import { useToast } from "../context/ToastContext";

/**
 * Centraliza o fluxo de criação/edição/cancelamento de reservas e o
 * tratamento das respostas especiais da API (CONFLITO e PRIORIDADE_DISPONIVEL),
 * para ser reutilizado em Dashboard, Agenda e Reservas sem duplicar lógica.
 */
export function useReservationFlow({ onChanged } = {}) {
  const toast = useToast();

  const [formState, setFormState] = useState({ open: false, mode: "create", reserva: null });
  const [conflict, setConflict] = useState(null); // { tipo, mensagem, reservas, payload }
  const [cancelTarget, setCancelTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const openCreate = useCallback((prefill = null) => {
    setFormState({ open: true, mode: "create", reserva: prefill });
  }, []);

  const openEdit = useCallback((reserva) => {
    setFormState({ open: true, mode: "edit", reserva });
  }, []);

  const closeForm = useCallback(() => {
    if (submitting) return;
    setFormState((prev) => ({ ...prev, open: false }));
  }, [submitting]);

  const closeConflict = useCallback(() => setConflict(null), []);

  const openCancelConfirm = useCallback((reserva) => setCancelTarget(reserva), []);
  const closeCancelConfirm = useCallback(() => {
    if (cancelling) return;
    setCancelTarget(null);
  }, [cancelling]);

  const submitForm = useCallback(
    async (payload) => {
      setSubmitting(true);
      try {
        if (formState.mode === "edit" && formState.reserva) {
          await reservasApi.editar(formState.reserva.id, payload);
          toast.success("Reserva atualizada com sucesso.");
        } else {
          await reservasApi.criar(payload);
          toast.success("Reserva criada com sucesso.");
        }
        setFormState({ open: false, mode: "create", reserva: null });
        onChanged?.();
        return { ok: true };
      } catch (err) {
        if (err instanceof ApiError && (err.codigo === "CONFLITO" || err.codigo === "PRIORIDADE_DISPONIVEL")) {
          setFormState((prev) => ({ ...prev, open: false }));
          setConflict({ tipo: err.codigo, mensagem: err.message, reservas: err.reservas, payload });
          return { ok: false, handled: true };
        }
        const mensagem =
          err instanceof ApiError ? err.message : "Não foi possível salvar a reserva. Tente novamente.";
        toast.error(mensagem);
        return { ok: false, mensagem };
      } finally {
        setSubmitting(false);
      }
    },
    [formState, onChanged, toast]
  );

  const usePriority = useCallback(async () => {
    if (!conflict?.payload) return;
    setSubmitting(true);
    try {
      // A rota de prioridade não recebe "empresa": a reserva é sempre assumida pela GREEN.
      const { empresa: _empresa, ...prioridadePayload } = conflict.payload;
      await reservasApi.aplicarPrioridade(prioridadePayload);
      toast.success("Prioridade aplicada. Reserva confirmada para a Green.");
      setConflict(null);
      onChanged?.();
    } catch (err) {
      const mensagem = err instanceof ApiError ? err.message : "Não foi possível aplicar a prioridade.";
      toast.error(mensagem);
    } finally {
      setSubmitting(false);
    }
  }, [conflict, onChanged, toast]);

  const confirmCancel = useCallback(async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await reservasApi.cancelar(cancelTarget.id);
      toast.success("Reserva cancelada. Ela continua disponível no histórico.");
      setCancelTarget(null);
      onChanged?.();
    } catch (err) {
      const mensagem = err instanceof ApiError ? err.message : "Não foi possível cancelar a reserva.";
      toast.error(mensagem);
    } finally {
      setCancelling(false);
    }
  }, [cancelTarget, onChanged, toast]);

  return {
    formState,
    openCreate,
    openEdit,
    closeForm,
    submitForm,
    submitting,
    conflict,
    closeConflict,
    usePriority,
    cancelTarget,
    openCancelConfirm,
    closeCancelConfirm,
    confirmCancel,
    cancelling,
  };
}

export default useReservationFlow;
