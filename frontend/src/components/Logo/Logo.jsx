import "./Logo.css";

/**
 * Wordmark da Green Paperless, recriado a partir do manual de marca:
 * "green" em minúsculas, com um pingo/quadrado verde arredondado no lugar
 * do acento do "n", e "PAPERLESS" em versalete espaçado abaixo.
 *
 * `variant="reduced"` exibe apenas o símbolo "g'" (versão reduzida do manual),
 * usado na sidebar recolhida e em espaços pequenos.
 */
export default function Logo({ variant = "full", tone = "auto", className = "" }) {
  if (variant === "reduced") {
    return (
      <span className={`gp-logo gp-logo-reduced gp-logo-${tone} ${className}`} aria-label="Green Paperless">
        <span className="gp-logo-g">g</span>
        <span className="gp-logo-dot" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className={`gp-logo gp-logo-full gp-logo-${tone} ${className}`} aria-label="Green Paperless">
      <span className="gp-logo-word">
        green<span className="gp-logo-dot" aria-hidden="true" />
      </span>
      <span className="gp-logo-sub">PAPERLESS</span>
    </span>
  );
}
