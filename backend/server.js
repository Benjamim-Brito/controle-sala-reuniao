// O .env tem prioridade sobre variáveis já definidas no sistema
require("dotenv").config({ override: true });

const app = require("./app");
const { modoPrevia } = require("./src/middleware/autenticacao");

if (modoPrevia()) {
    console.warn("AUTENTICAÇÃO EM MODO PRÉVIA – não usar em produção");
}

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000");
});
