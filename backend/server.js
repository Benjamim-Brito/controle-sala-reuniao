const express = require("express");
const cors = require("cors");

const reservasRoutes = require("./src/routes/reservasRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/reservas", reservasRoutes);

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000");
});