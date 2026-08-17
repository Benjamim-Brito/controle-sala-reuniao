# Sala de Reunião — Green Paperless

Frontend interno para agendamento e gerenciamento da sala de reunião,
substituindo a planilha em uso hoje. React + Vite, consumindo a API REST
existente em Node/Express.

## Como executar

```bash
npm install
npm run dev
```

A aplicação abre em `http://localhost:5173` e espera a API em
`http://localhost:3000` (veja abaixo como alterar).

## Estrutura do projeto

```
src/
├── components/     # Sidebar, Header, modais, badges, cards — peças reutilizáveis
├── pages/          # Dashboard, Agenda, Reservas, Histórico, Configurações
├── services/api.js # único ponto de contato com a API
├── utils/          # conversão de datas e configuração de status/empresa
├── hooks/          # useReservas, useReservationFlow, useSettings, useTheme...
├── context/         # ThemeContext (tema) e ToastContext (feedback)
└── styles/          # tokens.css (marca) + global.css + pages.css
```

Cada tela vive na sua própria pasta em `pages/`, e a lógica repetida entre
telas (criar, editar, cancelar reserva, tratar conflito/prioridade) está
centralizada em `hooks/useReservationFlow.js` — nenhuma página duplica essa
lógica.

## Onde está a URL da API

Centralizada em `src/services/api.js`, lida da variável de ambiente
`VITE_API_URL`. Para apontar para outro endereço, copie `.env.example` para
`.env` e ajuste:

```
VITE_API_URL=http://localhost:3000
```

Nenhum componente monta URLs soltas — tudo passa por `reservasApi.*`.

## Como alterar o tema

Clique no botão de tema na base da barra lateral (ou vá em
**Configurações → Aparência**) para escolher **Claro**, **Escuro** ou
**Sistema**. A preferência é salva no `localStorage` do navegador e
persiste entre sessões. As cores de cada tema estão centralizadas em
`src/styles/tokens.css`.

## Dependências utilizadas

- **react-router-dom** — navegação entre as 5 telas
- **lucide-react** — ícones minimalistas, sem emojis
- Sem Redux nem outra store pesada — apenas hooks e Context API
  (`ThemeContext`, `ToastContext`)

## Notas de implementação

- **Datas/horários**: a API sempre recebe/retorna `YYYY-MM-DD` e
  `HH:mm:ss`; a interface converte para `DD/MM/YYYY` e `HH:mm` apenas na
  exibição (`src/utils/date.js`), nunca altera o valor enviado de volta.
- **Prioridade GREEN**: ao criar uma reserva GREEN sobre um horário
  ocupado por MV/Externo, a API responde `PRIORIDADE_DISPONIVEL` e a
  interface mostra o modal "Prioridade disponível" com a reserva
  conflitante — "Usar prioridade" chama `POST /reservas/prioridade`.
- **Conflito comum**: a resposta `CONFLITO` da API vira o modal "Horário
  indisponível", sem expor mensagens técnicas do backend.
- **Cancelamento**: nunca exclui — sempre usa
  `PATCH /reservas/:id/cancelar`, com confirmação prévia.
- **Sem dados mockados**: todas as telas consomem a API real; estados
  vazios, de carregamento (skeleton) e de erro são tratados por tela.
