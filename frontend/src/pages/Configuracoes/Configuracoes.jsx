import { Sun, Moon, MonitorCog, Check } from "lucide-react";
import Header from "../../components/Header/Header";
import { useTheme } from "../../context/ThemeContext";
import { useSettings } from "../../hooks/useSettings";
import "./Configuracoes.css";

const APARENCIA_OPCOES = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: MonitorCog },
];

export default function Configuracoes({ onOpenMobileMenu }) {
  const { preference, setPreference } = useTheme();
  const { settings, update } = useSettings();

  return (
    <div className="gp-page">
      <Header
        title="Configurações"
        subtitle="Preferências de exibição da aplicação"
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <section className="gp-config-card gp-card">
        <div className="gp-config-card-head">
          <h3>Aparência</h3>
          <p>Escolha como a interface deve ser exibida neste dispositivo.</p>
        </div>

        <div className="gp-config-options">
          {APARENCIA_OPCOES.map(({ value, label, icon: Icon }) => {
            const active = preference === value;
            return (
              <button
                key={value}
                type="button"
                className={`gp-config-option ${active ? "is-active" : ""}`}
                onClick={() => setPreference(value)}
              >
                <span className="gp-config-option-icon">
                  <Icon size={18} />
                </span>
                <span className="gp-config-option-label">{label}</span>
                {active && <Check size={16} className="gp-config-option-check" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="gp-config-card gp-card">
        <div className="gp-config-card-head">
          <h3>Preferências da agenda</h3>
          <p>Define o intervalo de horários exibido na visão do dia e da semana.</p>
        </div>

        <div className="gp-config-grid">
          <label className="gp-field">
            <span>Hora inicial exibida</span>
            <input
              type="time"
              value={settings.horaInicial}
              onChange={(e) => update({ horaInicial: e.target.value })}
            />
          </label>
          <label className="gp-field">
            <span>Hora final exibida</span>
            <input
              type="time"
              value={settings.horaFinal}
              onChange={(e) => update({ horaFinal: e.target.value })}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
