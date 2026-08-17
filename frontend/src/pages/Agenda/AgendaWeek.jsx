import { formatTime, weekdayShort, fromISODate, isTodayISO } from "../../utils/date";
import { EmpresaBadge } from "../../components/StatusBadge/StatusBadge";
import { STATUS } from "../../utils/status";

export default function AgendaWeek({ dates, reservasByDate, onSelect, onCreateDay }) {
  return (
    <div className="gp-week">
      {dates.map((date) => {
        const reservas = (reservasByDate[date] || [])
          .filter((r) => r.status !== STATUS.CANCELADA && r.status !== STATUS.CONFLITO)
          .sort((a, b) => (a.hora_inicio > b.hora_inicio ? 1 : -1));
        const today = isTodayISO(date);

        return (
          <div key={date} className={`gp-week-col ${today ? "is-today" : ""}`}>
            <div className="gp-week-col-header">
              <span className="gp-week-col-day">{weekdayShort(date)}</span>
              <span className="gp-week-col-date">{fromISODate(date).getDate()}</span>
            </div>

            <div className="gp-week-col-body gp-scrollbar">
              {reservas.length === 0 ? (
                <button className="gp-week-empty" onClick={() => onCreateDay(date)} type="button">
                  Livre
                </button>
              ) : (
                reservas.map((r) => (
                  <button
                    key={r.id}
                    className={`gp-week-chip gp-week-chip-${r.status.toLowerCase()}`}
                    onClick={() => onSelect(r)}
                    type="button"
                  >
                    <span className="gp-week-chip-time">{formatTime(r.hora_inicio)}</span>
                    <span className="gp-week-chip-title">{r.motivo || r.responsavel}</span>
                    <EmpresaBadge empresa={r.empresa} size="sm" />
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
