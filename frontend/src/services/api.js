// Camada central de comunicação com a API REST (Node/Express).
// Toda a aplicação deve importar deste arquivo — nunca montar URLs soltas
// dentro de componentes.

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Erro estruturado lançado por todas as chamadas desta camada.
 * `codigo` reflete o campo `erro` retornado pela API (ex: "CONFLITO",
 * "PRIORIDADE_DISPONIVEL" ou uma mensagem de validação).
 */
export class ApiError extends Error {
  constructor(codigo, mensagem, reservas = []) {
    super(mensagem || codigo);
    this.name = "ApiError";
    this.codigo = codigo;
    this.reservas = reservas;
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new ApiError(
      "ERRO_REDE",
      "Não foi possível conectar ao servidor. Verifique se a API está em execução."
    );
  }

  // 204 / respostas sem corpo
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    // Corpo de erro conhecido: { erro, mensagem, reservas }
    if (data && data.erro) {
      throw new ApiError(data.erro, data.mensagem, data.reservas || []);
    }
    throw new ApiError(
      "ERRO_SERVIDOR",
      "Ocorreu um erro inesperado no servidor. Tente novamente."
    );
  }

  return data;
}

function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const reservasApi = {
  /** GET /reservas — aceita filtros opcionais: data, empresa, status */
  listar(filters = {}) {
    return request(`/reservas${buildQuery(filters)}`);
  },

  /** GET /reservas/:id */
  buscar(id) {
    return request(`/reservas/${id}`);
  },

  /** POST /reservas */
  criar(payload) {
    return request(`/reservas`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** PUT /reservas/:id — envia o objeto completo */
  editar(id, payload) {
    return request(`/reservas/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /** PATCH /reservas/:id/cancelar — sem corpo */
  cancelar(id) {
    return request(`/reservas/${id}/cancelar`, { method: "PATCH" });
  },

  /** POST /reservas/prioridade — usado quando a GREEN assume a prioridade */
  aplicarPrioridade(payload) {
    return request(`/reservas/prioridade`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
