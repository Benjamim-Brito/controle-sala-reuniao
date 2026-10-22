/*
    Testes de integração das regras de negócio.

    Usam um banco SEPARADO (padrão: controle_sala_reuniao_test),
    criado e limpo automaticamente. Nunca apontam para o banco real.

    Executar: npm test (com o MySQL rodando e o .env configurado)
*/
require("dotenv").config();

process.env.DB_NAME =
    process.env.DB_NAME_TEST || "controle_sala_reuniao_test";

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");

let db;
let servidor;
let base;

const api = async (metodo, caminho, corpo) => {
    const resposta = await fetch(base + caminho, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: corpo ? JSON.stringify(corpo) : undefined
    });

    return {
        status: resposta.status,
        body: await resposta.json()
    };
};

const reserva = (data, hora_inicio, hora_fim, empresa, extra = {}) => ({
    data,
    hora_inicio,
    hora_fim,
    empresa,
    responsavel: "Teste",
    setor: "TI",
    marcado_por: "Colaborador Green",
    ...extra
});

const criar = (...args) => api("POST", "/reservas", reserva(...args));

const status = async (id) => (await api("GET", `/reservas/${id}`)).body.status;

const minutos = (hora) => {
    const [h, m] = hora.split(":").map(Number);
    return h * 60 + m;
};

const hora = (min) =>
    `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

let AMANHA;
let ONTEM;
let HOJE;
let AGORA;

before(async () => {
    const conexao = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        multipleStatements: true
    });

    const fs = require("node:fs");
    const path = require("node:path");

    // Proteção: os testes apagam o banco, então só rodam num banco "_test"
    if (!process.env.DB_NAME.endsWith("_test")) {
        throw new Error("DB_NAME_TEST precisa terminar com _test");
    }

    const schema = fs
        .readFileSync(path.join(__dirname, "..", "database.sql"), "utf8")
        .replaceAll("controle_sala_reuniao", process.env.DB_NAME);

    // Recria o banco de teste para refletir sempre o schema atual
    await conexao.query(`DROP DATABASE IF EXISTS \`${process.env.DB_NAME}\``);
    await conexao.query(schema);
    await conexao.end();

    db = require("../db");

    const [[datas]] = await db.query(`
        SELECT
            CURDATE() AS hoje,
            CURDATE() + INTERVAL 1 DAY AS amanha,
            CURDATE() - INTERVAL 1 DAY AS ontem,
            CURTIME() AS agora
    `);

    HOJE = datas.hoje;
    AMANHA = datas.amanha;
    ONTEM = datas.ontem;
    AGORA = minutos(datas.agora);

    const app = require("../app");

    await new Promise((resolve) => {
        servidor = app.listen(0, resolve);
    });

    base = `http://localhost:${servidor.address().port}`;
});

after(async () => {
    servidor?.close();
    await db?.end();
});

beforeEach(async () => {
    await db.query("TRUNCATE TABLE reservas");
});


// ======================================================
// CRIAÇÃO
// ======================================================

test("cria reserva em horário livre", async () => {
    const r = await criar(AMANHA, "09:00", "10:00", "GREEN");

    assert.equal(r.status, 201);
    assert.equal(await status(r.body.id), "AGENDADA");
});

test("GREEN contra GREEN bloqueia", async () => {
    await criar(AMANHA, "09:00", "10:00", "GREEN");

    const r = await criar(AMANHA, "09:30", "10:30", "GREEN");

    assert.equal(r.status, 409);
    assert.equal(r.body.erro, "CONFLITO");
});

test("MV contra GREEN bloqueia sem oferecer prioridade", async () => {
    await criar(AMANHA, "09:00", "10:00", "GREEN");

    const r = await criar(AMANHA, "09:30", "10:30", "MV");

    assert.equal(r.body.erro, "CONFLITO");
});

test("GREEN contra MV oferece prioridade", async () => {
    await criar(AMANHA, "09:00", "10:00", "MV");

    const r = await criar(AMANHA, "09:00", "10:00", "GREEN");

    assert.equal(r.body.erro, "PRIORIDADE_DISPONIVEL");
});

test("não aceita reserva no passado", async () => {
    const r = await criar(ONTEM, "09:00", "10:00", "MV");

    assert.equal(r.status, 400);
});

test("valida formato de data e hora", async () => {
    assert.equal((await criar("abc", "09:00", "10:00", "MV")).status, 400);
    assert.equal((await criar("2026-02-30", "09:00", "10:00", "MV")).status, 400);
    assert.equal((await criar(AMANHA, "08:00", "25:00", "MV")).status, 400);
});

test("exige o colaborador da GREEN que marcou e o salva", async () => {
    const semColaborador = await criar(AMANHA, "09:00", "10:00", "MV", {
        marcado_por: "  "
    });

    assert.equal(semColaborador.status, 400);

    const r = await criar(AMANHA, "09:00", "10:00", "MV", {
        marcado_por: "Ana (Green)"
    });

    const salva = (await api("GET", `/reservas/${r.body.id}`)).body;

    assert.equal(salva.marcado_por, "Ana (Green)");
    assert.equal(salva.empresa, "MV");
});

test("JSON malformado devolve 400 em JSON", async () => {
    const resposta = await fetch(base + "/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{"
    });

    assert.equal(resposta.status, 400);
    assert.ok((await resposta.json()).erro);
});

test("pedidos simultâneos no mesmo horário criam só uma reserva", async () => {
    const respostas = await Promise.all(
        Array.from({ length: 20 }, () =>
            criar(AMANHA, "09:00", "10:00", "MV")
        )
    );

    assert.equal(respostas.filter(r => r.status === 201).length, 1);
});


// ======================================================
// PRIORIDADE
// ======================================================

test("prioridade na criação: MV vira CONFLITO e GREEN fica AGENDADA", async () => {
    const mv = await criar(AMANHA, "09:00", "10:00", "MV");

    const r = await api(
        "POST",
        "/reservas/prioridade",
        reserva(AMANHA, "09:00", "10:00")
    );

    assert.equal(r.status, 201);
    assert.equal(await status(mv.body.id), "CONFLITO");
    assert.equal(await status(r.body.id), "AGENDADA");
});

test("prioridade na edição atualiza a reserva original sem duplicar", async () => {
    const green = await criar(AMANHA, "14:00", "15:00", "GREEN");
    const mv = await criar(AMANHA, "16:00", "17:00", "MV");

    const edicao = await api(
        "PUT",
        `/reservas/${green.body.id}`,
        reserva(AMANHA, "16:00", "17:00", "GREEN")
    );

    assert.equal(edicao.body.erro, "PRIORIDADE_DISPONIVEL");

    const r = await api("POST", "/reservas/prioridade", {
        ...reserva(AMANHA, "16:00", "17:00"),
        id: green.body.id
    });

    assert.equal(r.status, 200);
    assert.equal(r.body.id, green.body.id);

    const lista = (await api("GET", `/reservas?data=${AMANHA}`)).body;
    const greens = lista.filter(x => x.empresa === "GREEN");

    assert.equal(greens.length, 1);
    assert.equal(greens[0].hora_inicio, "16:00:00");
    assert.equal(await status(mv.body.id), "CONFLITO");
});

test("prioridades simultâneas criam só uma reserva GREEN", async () => {
    await criar(AMANHA, "09:00", "10:00", "MV");

    await Promise.all(
        Array.from({ length: 5 }, () =>
            api("POST", "/reservas/prioridade", reserva(AMANHA, "09:00", "10:00"))
        )
    );

    const lista = (await api("GET", `/reservas?data=${AMANHA}`)).body;

    assert.equal(
        lista.filter(x => x.empresa === "GREEN" && x.status === "AGENDADA").length,
        1
    );
});


// ======================================================
// EDIÇÃO E CANCELAMENTO
// ======================================================

test("reserva cancelada não pode ser editada nem reativada", async () => {
    const r = await criar(AMANHA, "18:00", "19:00", "MV");

    await api("PATCH", `/reservas/${r.body.id}/cancelar`);

    const edicao = await api(
        "PUT",
        `/reservas/${r.body.id}`,
        reserva(AMANHA, "18:00", "19:00", "MV")
    );

    assert.equal(edicao.status, 409);
    assert.equal(await status(r.body.id), "CANCELADA");
});

test("cancelar duas vezes e cancelar reserva em CONFLITO são recusados", async () => {
    const r = await criar(AMANHA, "18:00", "19:00", "MV");

    assert.equal((await api("PATCH", `/reservas/${r.body.id}/cancelar`)).status, 200);
    assert.equal((await api("PATCH", `/reservas/${r.body.id}/cancelar`)).status, 409);

    const mv = await criar(AMANHA, "09:00", "10:00", "MV");
    await api("POST", "/reservas/prioridade", reserva(AMANHA, "09:00", "10:00"));

    assert.equal((await api("PATCH", `/reservas/${mv.body.id}/cancelar`)).status, 409);
    assert.equal((await api("PATCH", "/reservas/99999/cancelar")).status, 404);
});

test("reserva encerrada não pode ser cancelada, editada nem pausada", async () => {
    const [result] = await db.query(
        `INSERT INTO reservas (data, hora_inicio, hora_fim, responsavel, setor, empresa)
         VALUES (?, '09:00', '10:00', 'Teste', 'TI', 'MV')`,
        [ONTEM]
    );

    const id = result.insertId;

    assert.equal((await api("PATCH", `/reservas/${id}/cancelar`)).status, 409);
    assert.equal((await api("PATCH", `/reservas/${id}/standby`)).status, 409);
    assert.equal(
        (await api("PUT", `/reservas/${id}`, reserva(AMANHA, "09:00", "10:00", "MV"))).status,
        409
    );
});


// ======================================================
// PAUSAR E RETOMAR
// ======================================================

test("retomar reunião futura com horário ocupado continua em STAND_BY", async () => {
    const r = await criar(AMANHA, "20:00", "21:00", "GREEN");

    await api("PATCH", `/reservas/${r.body.id}/standby`);
    await criar(AMANHA, "20:30", "21:00", "MV");

    const retomada = await api("PATCH", `/reservas/${r.body.id}/retomar`);

    assert.equal(retomada.body.erro, "RETOMADA_INDISPONIVEL");
    assert.equal(await status(r.body.id), "STAND_BY");
});

test("retomar reunião futura com horário livre volta a AGENDADA", async () => {
    const r = await criar(AMANHA, "20:00", "21:00", "GREEN");

    await api("PATCH", `/reservas/${r.body.id}/standby`);

    assert.equal((await api("PATCH", `/reservas/${r.body.id}/retomar`)).status, 200);
    assert.equal(await status(r.body.id), "AGENDADA");
});

test(
    "retomar reunião em andamento verifica o restante do intervalo",
    async (t) => {
        if (AGORA < 10 || AGORA > 22 * 60) {
            t.skip("perto da meia-noite");
            return;
        }

        // Reunião que começou 5 min atrás e termina em 1h
        const [result] = await db.query(
            `INSERT INTO reservas (data, hora_inicio, hora_fim, responsavel, setor, empresa, status)
             VALUES (?, ?, ?, 'Teste', 'TI', 'GREEN', 'STAND_BY')`,
            [HOJE, hora(AGORA - 5), hora(AGORA + 60)]
        );

        // Durante a pausa, alguém reservou o final do horário
        await criar(HOJE, hora(AGORA + 10), hora(AGORA + 60), "MV");

        const retomada = await api("PATCH", `/reservas/${result.insertId}/retomar`);

        assert.equal(retomada.body.erro, "RETOMADA_INDISPONIVEL");
        assert.equal(await status(result.insertId), "STAND_BY");
    }
);
