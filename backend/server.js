// O .env tem prioridade sobre variáveis já definidas no sistema
require("dotenv").config({ override: true });

const app = require("./app");

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000");
});
