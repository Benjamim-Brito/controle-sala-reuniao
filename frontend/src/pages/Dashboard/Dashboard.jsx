import { useMemo, useState, useEffect } from "react";
import { Plus, CalendarCheck2, Clock3, Users2, Hourglass, CircleCheck, CircleDot } from "lucide-react";
import Header from "../../components/Header/Header";
import ReservationCard from "../../components/ReservationCard/ReservationCard";
import ReservationModal from "../../components/ReservationModal/ReservationModal";
import ConflictModal from "../../components/ConflictModal/ConflictModal";
import EmptyState from "../../components/EmptyState/EmptyState";
import { useReservas } from "../../hooks/useReservas";
import { useReservationFlow } from "../../hooks/useReservationFlow";
import { useSettings } from "../../hooks/useSettings";
import { todayISO, formatTime, timeToMinutes, weekdayLong, formatDateBR } from "../../utils/date";
import { STATUS } from "../../utils/status";
import "./Dashboard.css";

function useNowMinutes() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return now.getHours() * 60 + now.getMinutes();
}

export default function Dashboard({ onOpenMobileMenu }) {
  const today = todayISO();
  const { settings } = useSettings();
  const { reservas, loading, refetch } = useReservas({ data: today });
  const nowMinutes = useNowMinutes();

  const flow = useReservationFlow({ onChanged: refetch });

  const ativas = useMemo(
    () => reservas.filter((r) => r.status !== STATUS.CANCELADA && r.status !== STATUS.CONFLITO),
    [reservas]
  );

  const emAndamento = useMemo(
    () =>
      ativas
        .filter((r) => r.status === STATUS.AGENDADA)
        .find(
          (r) =>
            timeToMinutes(r.hora_inicio) <= nowMinutes && nowMinutes < timeToMinutes(r.hora_fim)
        ),
    [ativas, nowMinutes]
  );

  const proximas = useMemo(
    () =>
      ativas
        .filter((r) => timeToMinutes(r.hora_fim) > nowMinutes && r !== emAndamento)
        .sort((a, b) => timeToMinutes(a.hora_inicio) - timeToMinutes(b.hora_inicio)),
    [ativas, nowMinutes, emAndamento]
  );

  const standByCount = useMemo(
    () => ativas.filter((r) => r.status === STATUS.STAND_BY).length,
    [ativas]
  );

  const horariosLivres = useMemo(() => {
    const inicio = timeToMinutes(settings.horaInicial);
    const fim = timeToMinutes(settings.horaFinal);
    const ocupados = ativas
      .filter((r) => r.status === STATUS.AGENDADA)
      .reduce((acc, r) => acc + Math.max(0, timeToMinutes(r.hora_fim) - timeToMinutes(r.hora_inicio)), 0);
    const totalMin = Math.max(0, fim - inicio);
    const livresMin = Math.max(0, totalMin - ocupados);
    return Math.round((livresMin / 60) * 10) / 10;
  }, [ativas, settings]);

  return (
    <div className="gp-page">
      <Header
        title="Dashboard"
        subtitle={`${weekdayLong(today)}, ${formatDateBR(today)}`}
        onOpenMobileMenu={onOpenMobileMenu}
      >
        <button className="gp-btn gp-btn-primary" onClick={() => flow.openCreate()}>
          <Plus size={16} /> Nova reserva
        </button>
      </Header>

      <section className={`gp-status-hero ${emAndamento ? "is-busy" : "is-free"}`}>
        <div className="gp-status-hero-icon">
          {emAndamento ? <CircleDot size={22} /> : <CircleCheck size={22} />}
        </div>
        <div className="gp-status-hero-text">
          <h2>{emAndamento ? `Sala ocupada até ${formatTime(emAndamento.hora_fim)}` : "Sala disponível"}</h2>
          {emAndamento ? (
            <div className="gp-status-hero-meta">
              <span>{emAndamento.responsavel}</span>
              <span>·</span>
              <span>{emAndamento.setor}</span>
              {emAndamento.motivo && (
                <>
                  <span>·</span>
                  <span>{emAndamento.motivo}</span>
                </>
              )}
              <span>·</span>
              <span>
                {formatTime(emAndamento.hora_inicio)} – {formatTime(emAndamento.hora_fim)}
              </span>
            </div>
          ) : (
            <p className="gp-status-hero-desc">Nenhuma reunião em andamento neste momento.</p>
          )}
        </div>
      </section>

      <section className="gp-summary-grid">
        <div className="gp-summary-card">
          <CalendarCheck2 size={18} />
          <div>
            <strong>{ativas.length}</strong>
            <span>Reservas hoje</span>
          </div>
        </div>
        <div className="gp-summary-card">
          <Clock3 size={18} />
          <div>
            <strong>{proximas[0] ? formatTime(proximas[0].hora_inicio) : "—"}</strong>
            <span>Próxima reunião</span>
          </div>
        </div>
        <div className="gp-summary-card">
          <Hourglass size={18} />
          <div>
            <strong>{horariosLivres}h</strong>
            <span>Horários livres</span>
          </div>
        </div>
        <div className="gp-summary-card">
          <Users2 size={18} />
          <div>
            <strong>{standByCount}</strong>
            <span>Em stand by</span>
          </div>
        </div>
      </section>

      <section className="gp-section">
        <h3 className="gp-section-title">Próximas reservas</h3>
        {loading ? (
          <div className="gp-skeleton-list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="gp-skeleton-card" />
            ))}
          </div>
        ) : proximas.length === 0 ? (
          <EmptyState
            icon={CalendarCheck2}
            title="Nenhuma reserva para hoje"
            description="A sala está livre durante todo o período."
            action={
              <button className="gp-btn gp-btn-primary gp-btn-sm" onClick={() => flow.openCreate()}>
                <Plus size={14} /> Criar reserva
              </button>
            }
          />
        ) : (
          <div className="gp-rescard-list">
            {proximas.map((r) => (
              <ReservationCard key={r.id} reserva={r} onClick={flow.openEdit} />
            ))}
          </div>
        )}
      </section>

      <ReservationModal
        open={flow.formState.open}
        mode={flow.formState.mode}
        reserva={flow.formState.reserva}
        submitting={flow.submitting}
        onClose={flow.closeForm}
        onSubmit={flow.submitForm}
      />
      <ConflictModal
        conflict={flow.conflict}
        onClose={flow.closeConflict}
        onUsePriority={flow.usePriority}
        loading={flow.submitting}
      />
    </div>
  );
}
