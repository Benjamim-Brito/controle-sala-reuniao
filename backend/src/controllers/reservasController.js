const db = require("../../db");

const EMPRESAS_VALIDAS = ["GREEN", "MV", "EXTERNO"];

const validarDadosReserva = ({
    data,
    hora_inicio,
    hora_fim,
    responsavel,
    setor,
    empresa
}) => {
    if (
        !data ||
        !hora_inicio ||
        !hora_fim ||
        !responsavel ||
        !setor ||
        !empresa
    ) {
        return "Preencha todos os campos obrigatórios";
    }

    if (!EMPRESAS_VALIDAS.includes(empresa)) {
        return "Empresa inválida. Utilize GREEN, MV ou EXTERNO";
    }

    if (hora_inicio >= hora_fim) {
        return "O horário inicial deve ser menor que o horário final";
    }

    return null;
};

const listarReservas = (req, res) => {
    const {
        data,
        status,
        empresa
    } = req.query;

    let sql = `
        SELECT *
        FROM reservas
        WHERE 1 = 1
    `;

    const valores = [];

    if (data) {
        sql += " AND data = ?";
        valores.push(data);
    }

    if (status) {
        sql += " AND status = ?";
        valores.push(status);
    }

    if (empresa) {
        sql += " AND empresa = ?";
        valores.push(empresa);
    }

    sql += " ORDER BY data ASC, hora_inicio ASC";

    db.query(sql, valores, (err, results) => {
        if (err) {
            console.error(err);

            return res.status(500).json({
                erro: "Erro ao buscar reservas"
            });
        }

        res.json(results);
    });
};

const criarReserva = (req, res) => {
    const {
        data,
        hora_inicio,
        hora_fim,
        responsavel,
        setor,
        empresa,
        motivo
    } = req.body;

    const erroValidacao = validarDadosReserva({
        data,
        hora_inicio,
        hora_fim,
        responsavel,
        setor,
        empresa
    });

    if (erroValidacao) {
        return res.status(400).json({
            erro: erroValidacao
        });
    }

    const sqlConflito = `
        SELECT *
        FROM reservas
        WHERE data = ?
        AND status != 'CANCELADA'
        AND hora_inicio < ?
        AND hora_fim > ?
    `;
    
    db.query(
        sqlConflito,
        [data, hora_fim, hora_inicio],
        (err, reservasExistentes) => {
            if (err) {
                console.error(err);

                return res.status(500).json({
                    erro: "Erro ao verificar disponibilidade"
                });
            }

            if (reservasExistentes.length > 0) {
                const existeReservaGreen = reservasExistentes.some(
                    reserva => reserva.empresa === "GREEN"
                );

                const existeReservaExterna = reservasExistentes.some(
                    reserva =>
                        reserva.empresa === "MV" ||
                        reserva.empresa === "EXTERNO"
                );

                if (
                    empresa === "GREEN" &&
                    existeReservaExterna &&
                    !existeReservaGreen
                ) {
                    return res.status(409).json({
                        erro: "PRIORIDADE_DISPONIVEL",
                        mensagem: "Existe uma reserva externa neste horário. A GREEN possui prioridade.",
                        reservas: reservasExistentes
                    });
                }

                return res.status(409).json({
                    erro: "CONFLITO",
                    mensagem: "Já existe uma reserva neste horário.",
                    reservas: reservasExistentes
                });
            }

            const status =
                empresa === "GREEN"
                    ? "AGENDADA"
                    : "STAND_BY";

            const sqlInsert = `
                INSERT INTO reservas
                (
                    data,
                    hora_inicio,
                    hora_fim,
                    responsavel,
                    setor,
                    empresa,
                    motivo,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(
                sqlInsert,
                [
                    data,
                    hora_inicio,
                    hora_fim,
                    responsavel,
                    setor,
                    empresa,
                    motivo || null,
                    status
                ],
                (err, result) => {
                    if (err) {
                        console.error(err);

                        return res.status(500).json({
                            erro: "Erro ao criar reserva"
                        });
                    }

                    res.status(201).json({
                        mensagem: "Reserva criada com sucesso",
                        id: result.insertId,
                        status
                    });
                }
            );
        }
    );
};

const aplicarPrioridade = (req, res) => {
    const {
        data,
        hora_inicio,
        hora_fim,
        responsavel,
        setor,
        motivo
    } = req.body;

    if (
        !data ||
        !hora_inicio ||
        !hora_fim ||
        !responsavel ||
        !setor
    ) {
        return res.status(400).json({
            erro: "Preencha todos os campos obrigatórios"
        });
    }

    if (hora_inicio >= hora_fim) {
        return res.status(400).json({
            erro: "O horário inicial deve ser menor que o horário final"
        });
    }

    const sqlBuscarConflitos = `
        SELECT *
        FROM reservas
        WHERE data = ?
        AND status != 'CANCELADA'
        AND hora_inicio < ?
        AND hora_fim > ?
    `;

    db.query(
        sqlBuscarConflitos,
        [data, hora_fim, hora_inicio],
        (err, reservasExistentes) => {
            if (err) {
                console.error(err);

                return res.status(500).json({
                    erro: "Erro ao verificar reservas existentes"
                });
            }

            if (reservasExistentes.length === 0) {
                return res.status(400).json({
                    erro: "Nenhum conflito encontrado para aplicar prioridade"
                });
            }

            const existeGreen = reservasExistentes.some(
                reserva => reserva.empresa === "GREEN"
            );

            if (existeGreen) {
                return res.status(409).json({
                    erro: "CONFLITO_INTERNO",
                    mensagem: "Já existe uma reserva da GREEN neste horário."
                });
            }

            const idsExternos = reservasExistentes
                .filter(
                    reserva =>
                        reserva.empresa === "MV" ||
                        reserva.empresa === "EXTERNO"
                )
                .map(reserva => reserva.id);

            if (idsExternos.length === 0) {
                return res.status(409).json({
                    erro: "PRIORIDADE_NAO_APLICAVEL"
                });
            }

            const placeholders = idsExternos
                .map(() => "?")
                .join(",");

            const sqlAtualizar = `
                UPDATE reservas
                SET status = 'CONFLITO'
                WHERE id IN (${placeholders})
            `;

            db.query(sqlAtualizar, idsExternos, (err) => {
                if (err) {
                    console.error(err);

                    return res.status(500).json({
                        erro: "Erro ao atualizar reservas externas"
                    });
                }

                const sqlInsert = `
                    INSERT INTO reservas
                    (
                        data,
                        hora_inicio,
                        hora_fim,
                        responsavel,
                        setor,
                        empresa,
                        motivo,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;

                db.query(
                    sqlInsert,
                    [
                        data,
                        hora_inicio,
                        hora_fim,
                        responsavel,
                        setor,
                        "GREEN",
                        motivo || null,
                        "AGENDADA"
                    ],
                    (err, result) => {
                        if (err) {
                            console.error(err);

                            return res.status(500).json({
                                erro: "Erro ao criar reserva prioritária"
                            });
                        }

                        res.status(201).json({
                            mensagem: "Prioridade aplicada com sucesso",
                            id: result.insertId,
                            reservasAfetadas: idsExternos
                        });
                    }
                );
            });
        }
    );
};

const cancelarReserva = (req, res) => {
    const { id } = req.params;

    const sql = `
        UPDATE reservas
        SET status = 'CANCELADA'
        WHERE id = ?
        AND status != 'CANCELADA'
    `;

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error(err);

            return res.status(500).json({
                erro: "Erro ao cancelar reserva"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                erro: "Reserva não encontrada ou já cancelada"
            });
        }

        res.json({
            mensagem: "Reserva cancelada com sucesso"
        });
    });
};

const editarReserva = (req, res) => {
    const { id } = req.params;

    const {
        data,
        hora_inicio,
        hora_fim,
        responsavel,
        setor,
        empresa,
        motivo
    } = req.body;

    const erroValidacao = validarDadosReserva({
        data,
        hora_inicio,
        hora_fim,
        responsavel,
        setor,
        empresa
    });

    if (erroValidacao) {
        return res.status(400).json({
            erro: erroValidacao
        });
    }

    const sqlBuscarReserva = `
        SELECT *
        FROM reservas
        WHERE id = ?
    `;

    db.query(sqlBuscarReserva, [id], (err, resultado) => {
        if (err) {
            console.error(err);

            return res.status(500).json({
                erro: "Erro ao buscar reserva"
            });
        }

        if (resultado.length === 0) {
            return res.status(404).json({
                erro: "Reserva não encontrada"
            });
        }

        const sqlConflito = `
            SELECT *
            FROM reservas
            WHERE data = ?
            AND id != ?
            AND status != 'CANCELADA'
            AND hora_inicio < ?
            AND hora_fim > ?
        `;

        db.query(
            sqlConflito,
            [data, id, hora_fim, hora_inicio],
            (err, reservasExistentes) => {
                if (err) {
                    console.error(err);

                    return res.status(500).json({
                        erro: "Erro ao verificar conflitos"
                    });
                }

                if (reservasExistentes.length > 0) {
                    const existeReservaGreen = reservasExistentes.some(
                        reserva => reserva.empresa === "GREEN"
                    );

                    const existeReservaExterna = reservasExistentes.some(
                        reserva =>
                            reserva.empresa === "MV" ||
                            reserva.empresa === "EXTERNO"
                    );

                    if (
                        empresa === "GREEN" &&
                        existeReservaExterna &&
                        !existeReservaGreen
                    ) {
                        return res.status(409).json({
                            erro: "PRIORIDADE_DISPONIVEL",
                            mensagem: "Existe uma reserva externa neste horário. A GREEN possui prioridade.",
                            reservas: reservasExistentes
                        });
                    }

                    return res.status(409).json({
                        erro: "CONFLITO",
                        mensagem: "Já existe uma reserva neste horário.",
                        reservas: reservasExistentes
                    });
                }

                const status =
                    empresa === "GREEN"
                        ? "AGENDADA"
                        : "STAND_BY";

                const sqlAtualizar = `
                    UPDATE reservas
                    SET
                        data = ?,
                        hora_inicio = ?,
                        hora_fim = ?,
                        responsavel = ?,
                        setor = ?,
                        empresa = ?,
                        motivo = ?,
                        status = ?
                    WHERE id = ?
                `;

                db.query(
                    sqlAtualizar,
                    [
                        data,
                        hora_inicio,
                        hora_fim,
                        responsavel,
                        setor,
                        empresa,
                        motivo || null,
                        status,
                        id
                    ],
                    (err) => {
                        if (err) {
                            console.error(err);

                            return res.status(500).json({
                                erro: "Erro ao atualizar reserva"
                            });
                        }

                        res.json({
                            mensagem: "Reserva atualizada com sucesso"
                        });
                    }
                );
            }
        );
    });
};

const buscarReservaPorId = (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT *
        FROM reservas
        WHERE id = ?
    `;

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error(err);

            return res.status(500).json({
                erro: "Erro ao buscar reserva"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                erro: "Reserva não encontrada"
            });
        }

        res.json(results[0]);
    });
};

module.exports = {
    listarReservas,
    buscarReservaPorId,
    criarReserva,
    aplicarPrioridade,
    editarReserva,
    cancelarReserva
};