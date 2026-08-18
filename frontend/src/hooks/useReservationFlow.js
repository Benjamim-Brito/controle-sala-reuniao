import {
  useCallback,
  useState
} from "react";

import {
  reservasApi,
  ApiError
} from "../services/api";

import { useToast } from "../context/ToastContext";

export function useReservationFlow({
  onChanged
} = {}) {
  const toast = useToast();

  const [
    formState,
    setFormState
  ] = useState({
    open: false,
    mode: "create",
    reserva: null
  });

  const [
    conflict,
    setConflict
  ] = useState(null);

  const [
    cancelTarget,
    setCancelTarget
  ] = useState(null);

  const [
    submitting,
    setSubmitting
  ] = useState(false);

  const [
    cancelling,
    setCancelling
  ] = useState(false);

  const [
    changingStatus,
    setChangingStatus
  ] = useState(false);


  const openCreate = useCallback(
    (prefill = null) => {
      setFormState({
        open: true,
        mode: "create",
        reserva: prefill
      });
    },
    []
  );


  const openEdit = useCallback(
    (reserva) => {
      setFormState({
        open: true,
        mode: "edit",
        reserva
      });
    },
    []
  );


  const closeForm = useCallback(() => {
    if (submitting) return;

    setFormState((prev) => ({
      ...prev,
      open: false
    }));
  }, [submitting]);


  const closeConflict =
    useCallback(
      () => setConflict(null),
      []
    );


  const openCancelConfirm =
    useCallback(
      (reserva) =>
        setCancelTarget(reserva),
      []
    );


  const closeCancelConfirm =
    useCallback(() => {
      if (cancelling) return;

      setCancelTarget(null);
    }, [cancelling]);


  // ====================================================
  // CRIAR / EDITAR
  // ====================================================

  const submitForm = useCallback(
    async (payload) => {
      setSubmitting(true);

      try {
        if (
          formState.mode === "edit" &&
          formState.reserva
        ) {
          await reservasApi.editar(
            formState.reserva.id,
            payload
          );

          toast.success(
            "Reserva atualizada com sucesso."
          );
        } else {
          await reservasApi.criar(payload);

          let aviso =
            "Reserva criada com sucesso. Em caso de necessidade emergencial, a reunião poderá ser interrompida e colocada em stand by.";

          if (
            payload.empresa === "MV" ||
            payload.empresa === "EXTERNO"
          ) {
            aviso +=
              " Reservas da GREEN possuem prioridade sobre reservas externas.";
          }

          toast.warning(
            aviso,
            {
              duration: 10000
            }
          );
        }

        setFormState({
          open: false,
          mode: "create",
          reserva: null
        });

        onChanged?.();

        return {
          ok: true
        };
      } catch (err) {
        if (
          err instanceof ApiError &&
          (
            err.codigo === "CONFLITO" ||
            err.codigo ===
              "PRIORIDADE_DISPONIVEL"
          )
        ) {
          setFormState(
            (prev) => ({
              ...prev,
              open: false
            })
          );

          setConflict({
            tipo: err.codigo,
            mensagem: err.message,
            reservas: err.reservas,
            payload
          });

          return {
            ok: false,
            handled: true
          };
        }

        const mensagem =
          err instanceof ApiError
            ? err.message
            : "Não foi possível salvar a reserva. Tente novamente.";

        toast.error(mensagem);

        return {
          ok: false,
          mensagem
        };
      } finally {
        setSubmitting(false);
      }
    },
    [
      formState,
      onChanged,
      toast
    ]
  );


  // ====================================================
  // PRIORIDADE GREEN
  // ====================================================

  const usePriority =
    useCallback(async () => {
      if (!conflict?.payload) return;

      setSubmitting(true);

      try {
        const {
          empresa: _empresa,
          ...prioridadePayload
        } = conflict.payload;

        await reservasApi.aplicarPrioridade(
          prioridadePayload
        );

        toast.success(
          "Prioridade aplicada. Reserva confirmada para a Green."
        );

        setConflict(null);

        onChanged?.();
      } catch (err) {
        const mensagem =
          err instanceof ApiError
            ? err.message
            : "Não foi possível aplicar a prioridade.";

        toast.error(mensagem);
      } finally {
        setSubmitting(false);
      }
    }, [
      conflict,
      onChanged,
      toast
    ]);


  // ====================================================
  // CANCELAMENTO
  // ====================================================

  const confirmCancel =
    useCallback(async () => {
      if (!cancelTarget) return;

      setCancelling(true);

      try {
        await reservasApi.cancelar(
          cancelTarget.id
        );

        toast.success(
          "Reserva cancelada. Ela continua disponível no histórico."
        );

        setCancelTarget(null);

        onChanged?.();
      } catch (err) {
        const mensagem =
          err instanceof ApiError
            ? err.message
            : "Não foi possível cancelar a reserva.";

        toast.error(mensagem);
      } finally {
        setCancelling(false);
      }
    }, [
      cancelTarget,
      onChanged,
      toast
    ]);


  // ====================================================
  // STAND BY
  // ====================================================

  const pauseReservation =
    useCallback(
      async (reserva) => {
        if (!reserva) return false;

        setChangingStatus(true);

        try {
          await reservasApi.pausar(
            reserva.id
          );

          toast.warning(
            "Reunião colocada em stand by. A sala está temporariamente disponível.",
            {
              duration: 7000
            }
          );

          onChanged?.();

          return true;
        } catch (err) {
          const mensagem =
            err instanceof ApiError
              ? err.message
              : "Não foi possível colocar a reunião em stand by.";

          toast.error(mensagem);

          return false;
        } finally {
          setChangingStatus(false);
        }
      },
      [
        onChanged,
        toast
      ]
    );


  // ====================================================
  // RETOMAR
  // ====================================================

  const resumeReservation =
    useCallback(
      async (reserva) => {
        if (!reserva) return false;

        setChangingStatus(true);

        try {
          await reservasApi.retomar(
            reserva.id
          );

          toast.success(
            "Reunião retomada com sucesso."
          );

          onChanged?.();

          return true;
        } catch (err) {
          const mensagem =
            err instanceof ApiError
              ? err.message
              : "Não foi possível retomar a reunião.";

          toast.error(mensagem);

          return false;
        } finally {
          setChangingStatus(false);
        }
      },
      [
        onChanged,
        toast
      ]
    );


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

    pauseReservation,
    resumeReservation,
    changingStatus
  };
}

export default useReservationFlow;