import { useMemo, useState, useEffect } from "react";
import {
  Plus,
  CalendarCheck2,
  Clock3,
  Users2,
  Hourglass,
  CircleCheck,
  CircleDot,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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

function minutesToTime(minutes) {
  const normalized = Math.max(0, Math.min(24 * 60, minutes));
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export default function Dashboard({ onOpenMobileMenu }) {
  const today = todayISO();
  const { settings } = useSettings();
  const { reservas, loading, refetch } = useReservas({ data: today });
  const nowMinutes = useNowMinutes();
  const [activePanel, setActivePanel] = useState(null);

  const flow = useReservationFlow({ onChanged: refetch });

  const ativas = useMemo(
    () =>
      reservas
        .filter((r) => r.status !== STATUS.CANCELADA && r.status !== STATUS.CONFLITO)
        .sort((a, b) => timeToMinutes(a.hora_inicio) - timeToMinutes(b.hora_inicio)),
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
        .filter(
          (r) =>
            r.status === STATUS.AGENDADA &&
            timeToMinutes(r.hora_fim) > nowMinutes &&
            r !== emAndamento
        )
        .sort((a, b) => timeToMinutes(a.hora_inicio) - timeToMinutes(b.hora_inicio)),
    [ativas, nowMinutes, emAndamento]
  );

  const standByReservas = useMemo(
    () =>
      ativas
        .filter((r) => r.status === STATUS.STAND_BY)
        .sort((a, b) => timeToMinutes(a.hora_inicio) - timeToMinutes(b.hora_inicio)),
    [ativas]
  );

  const standByCount = standByReservas.length;

  const intervalosLivres = useMemo(() => {
    const inicioExpediente = timeToMinutes(settings.horaInicial);
    const fimExpediente = timeToMinutes(settings.horaFinal);

    if (fimExpediente <= inicioExpediente) return [];

    const ocupados = ativas
      .filter((r) => r.status === STATUS.AGENDADA)
      .map((r) => ({
        inicio: Math.max(inicioExpediente, timeToMinutes(r.hora_inicio)),
        fim: Math.min(fimExpediente, timeToMinutes(r.hora_fim)),
      }))
      .filter((intervalo) => intervalo.fim > intervalo.inicio)
      .sort((a, b) => a.inicio - b.inicio);

    const consolidados = [];

    for (const intervalo of ocupados) {
      const ultimo = consolidados[consolidados.length - 1];

      if (!ultimo || intervalo.inicio > ultimo.fim) {
        consolidados.push({ ...intervalo });
      } else {
        ultimo.fim = Math.max(ultimo.fim, intervalo.fim);
      }
    }

    const livres = [];
    let cursor = inicioExpediente;

    for (const intervalo of consolidados) {
      if (intervalo.inicio > cursor) {
        livres.push({ inicio: cursor, fim: intervalo.inicio });
      }
      cursor = Math.max(cursor, intervalo.fim);
    }

    if (cursor < fimExpediente) {
      livres.push({ inicio: cursor, fim: fimExpediente });
    }

    return livres;
  }, [ativas, settings]);

  const horariosLivres = useMemo(() => {
    const livresMin = intervalosLivres.reduce(
      (acc, intervalo) => acc + Math.max(0, intervalo.fim - intervalo.inicio),
      0
    );

    return Math.round((livresMin / 60) * 10) / 10;
  }, [intervalosLivres]);

  function togglePanel(panel) {
    setActivePanel((current) => (current === panel ? null : panel));
  }

  function renderArrow(panel) {
    return activePanel === panel ? <ChevronUp size={15} /> : <ChevronDown size={15} />;
  }

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
          <h2>
            {emAndamento
              ? `Sala ocupada até ${formatTime(emAndamento.hora_fim)}`
              : "Sala disponível"}
          </h2>
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
        <button
          type="button"
          className={`gp-summary-card gp-summary-card-clickable ${
            activePanel === "reservas" ? "is-open" : ""
          }`}
          onClick={() => togglePanel("reservas")}
          aria-expanded={activePanel === "reservas"}
        >
          <CalendarCheck2 size={18} />
          <div>
            <strong>{ativas.length}</strong>
            <span>Reservas hoje</span>
          </div>
          <span className="gp-summary-card-arrow">{renderArrow("reservas")}</span>
        </button>

        <button
          type="button"
          className={`gp-summary-card gp-summary-card-clickable ${
            activePanel === "proxima" ? "is-open" : ""
          }`}
          onClick={() => togglePanel("proxima")}
          aria-expanded={activePanel === "proxima"}
        >
          <Clock3 size={18} />
          <div>
            <strong>{proximas[0] ? formatTime(proximas[0].hora_inicio) : "—"}</strong>
            <span>Próxima reunião</span>
          </div>
          <span className="gp-summary-card-arrow">{renderArrow("proxima")}</span>
        </button>

        <button
          type="button"
          className={`gp-summary-card gp-summary-card-clickable ${
            activePanel === "livres" ? "is-open" : ""
          }`}
          onClick={() => togglePanel("livres")}
          aria-expanded={activePanel === "livres"}
        >
          <Hourglass size={18} />
          <div>
            <strong>{horariosLivres}h</strong>
            <span>Horários livres</span>
          </div>
          <span className="gp-summary-card-arrow">{renderArrow("livres")}</span>
        </button>

        <button
          type="button"
          className={`gp-summary-card gp-summary-card-clickable gp-summary-card-standby ${
            activePanel === "standby" ? "is-open" : ""
          }`}
          onClick={() => togglePanel("standby")}
          aria-expanded={activePanel === "standby"}
        >
          <Users2 size={18} />
          <div>
            <strong>{standByCount}</strong>
            <span>Em stand by</span>
          </div>
          <span className="gp-summary-card-arrow">{renderArrow("standby")}</span>
        </button>
      </section>

      {activePanel === "reservas" && (
        <section className="gp-dashboard-detail-panel">
          <div className="gp-dashboard-detail-head">
            <div>
              <h3>Reservas de hoje</h3>
              <p>Todas as reservas válidas de {formatDateBR(today)}.</p>
            </div>
            <span>{ativas.length}</span>
          </div>

          {ativas.length === 0 ? (
            <p className="gp-dashboard-detail-empty">Nenhuma reserva registrada para hoje.</p>
          ) : (
            <div className="gp-rescard-list">
              {ativas.map((r) => (
                <ReservationCard key={r.id} reserva={r} onClick={flow.openEdit} />
              ))}
            </div>
          )}
        </section>
      )}

      {activePanel === "proxima" && (
        <section className="gp-dashboard-detail-panel">
          <div className="gp-dashboard-detail-head">
            <div>
              <h3>Próxima reunião</h3>
              <p>
                {proximas[0]
                  ? `Começa em ${Math.max(
                      0,
                      timeToMinutes(proximas[0].hora_inicio) - nowMinutes
                    )} min.`
                  : "Não há outra reunião agendada para hoje."}
              </p>
            </div>
            {proximas[0] && <span>{formatTime(proximas[0].hora_inicio)}</span>}
          </div>

          {proximas[0] ? (
            <ReservationCard reserva={proximas[0]} onClick={flow.openEdit} />
          ) : (
            <p className="gp-dashboard-detail-empty">A agenda restante do dia está livre.</p>
          )}
        </section>
      )}

      {activePanel === "livres" && (
        <section className="gp-dashboard-detail-panel">
          <div className="gp-dashboard-detail-head">
            <div>
              <h3>Horários livres</h3>
              <p>
                Período configurado: {formatTime(settings.horaInicial)} – {formatTime(settings.horaFinal)}.
              </p>
            </div>
            <span>{horariosLivres}h</span>
          </div>

          {intervalosLivres.length === 0 ? (
            <p className="gp-dashboard-detail-empty">Não há intervalos livres no período configurado.</p>
          ) : (
            <div className="gp-free-slots">
              {intervalosLivres.map((intervalo, index) => {
                const duracaoMin = intervalo.fim - intervalo.inicio;
                const horas = Math.floor(duracaoMin / 60);
                const minutos = duracaoMin % 60;
                const duracao = [
                  horas > 0 ? `${horas}h` : null,
                  minutos > 0 ? `${minutos}min` : null,
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div className="gp-free-slot" key={`${intervalo.inicio}-${intervalo.fim}-${index}`}>
                    <Clock3 size={16} />
                    <div>
                      <strong>
                        {minutesToTime(intervalo.inicio)} – {minutesToTime(intervalo.fim)}
                      </strong>
                      <span>{duracao} disponíveis</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activePanel === "standby" && (
        <section className="gp-dashboard-detail-panel gp-dashboard-detail-panel-standby">
          <div className="gp-dashboard-detail-head">
            <div>
              <h3>Reuniões em stand by</h3>
              <p>Reservas pausadas temporariamente.</p>
            </div>
            <span>{standByCount}</span>
          </div>

          {standByReservas.length === 0 ? (
            <p className="gp-dashboard-detail-empty">Nenhuma reunião em stand by no momento.</p>
          ) : (
            <div className="gp-rescard-list">
              {standByReservas.map((r) => (
                <ReservationCard key={r.id} reserva={r} onClick={flow.openEdit} />
              ))}
            </div>
          )}
        </section>
      )}

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
