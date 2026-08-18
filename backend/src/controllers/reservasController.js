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


// ======================================================
// LISTAR RESERVAS
// ======================================================

const listarReservas = (req, res) => {
    const { data, status, empresa } = req.query;

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


// ======================================================
// BUSCAR RESERVA POR ID
// ======================================================

const buscarReservaPorId = (req, res) => {
    const { id } = req.params;

    db.query(
        "SELECT * FROM reservas WHERE id = ?",
        [id],
        (err, results) => {
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
        }
    );
};


// ======================================================
// CRIAR RESERVA
// ======================================================

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

    /*
        Só reservas AGENDADAS bloqueiam a sala.

        STAND_BY = reunião pausada, portanto não ocupa a sala.
        CONFLITO = reserva que perdeu prioridade.
        CANCELADA = reserva cancelada.
    */
    const sqlConflito = `
        SELECT *
        FROM reservas
        WHERE data = ?
        AND status = 'AGENDADA'
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
                        mensagem:
                            "Existe uma reserva externa neste horário. A GREEN possui prioridade.",
                        reservas: reservasExistentes
                    });
                }

                return res.status(409).json({
                    erro: "CONFLITO",
                    mensagem: "Já existe uma reserva neste horário.",
                    reservas: reservasExistentes
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
                    empresa,
                    motivo || null,
                    "AGENDADA"
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
                        status: "AGENDADA"
                    });
                }
            );
        }
    );
};


// ======================================================
// APLICAR PRIORIDADE GREEN
// ======================================================

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
        AND status = 'AGENDADA'
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
                    mensagem:
                        "Já existe uma reserva da GREEN neste horário."
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

            db.query(
                sqlAtualizar,
                idsExternos,
                (err) => {
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
                }
            );
        }
    );
};


// ======================================================
// EDITAR RESERVA
// ======================================================

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

    db.query(
        "SELECT * FROM reservas WHERE id = ?",
        [id],
        (err, resultado) => {
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

            const reservaAtual = resultado[0];

            const sqlConflito = `
                SELECT *
                FROM reservas
                WHERE data = ?
                AND id != ?
                AND status = 'AGENDADA'
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

                    /*
                        Uma reserva em STAND_BY não está ocupando a sala.
                        Portanto ela pode ser editada sem tentar retomá-la.
                    */
                    if (
                        reservaAtual.status !== "STAND_BY" &&
                        reservasExistentes.length > 0
                    ) {
                        const existeReservaGreen =
                            reservasExistentes.some(
                                reserva => reserva.empresa === "GREEN"
                            );

                        const existeReservaExterna =
                            reservasExistentes.some(
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
                                mensagem:
                                    "Existe uma reserva externa neste horário. A GREEN possui prioridade.",
                                reservas: reservasExistentes
                            });
                        }

                        return res.status(409).json({
                            erro: "CONFLITO",
                            mensagem:
                                "Já existe uma reserva neste horário.",
                            reservas: reservasExistentes
                        });
                    }

                    let status = "AGENDADA";

                    if (reservaAtual.status === "STAND_BY") {
                        status = "STAND_BY";
                    }

                    if (reservaAtual.status === "CONFLITO") {
                        status = "CONFLITO";
                    }

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
        }
    );
};


// ======================================================
// PAUSAR / STAND BY
// ======================================================

const pausarReserva = (req, res) => {
    const { id } = req.params;

    const sql = `
        UPDATE reservas
        SET status = 'STAND_BY'
        WHERE id = ?
        AND status = 'AGENDADA'
    `;

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error(err);

            return res.status(500).json({
                erro: "Erro ao colocar reserva em stand by"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(409).json({
                erro: "STAND_BY_NAO_PERMITIDO",
                mensagem:
                    "Somente reservas agendadas podem ser colocadas em stand by."
            });
        }

        res.json({
            mensagem: "Reunião colocada em stand by com sucesso",
            status: "STAND_BY"
        });
    });
};


// ======================================================
// RETOMAR
// ======================================================

const retomarReserva = (req, res) => {
    const { id } = req.params;

    // Busca a reserva que o usuário deseja retomar
    db.query(
        "SELECT * FROM reservas WHERE id = ?",
        [id],
        (err, results) => {
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

            const reserva = results[0];

            // Somente reservas em STAND_BY podem ser retomadas
            if (reserva.status !== "STAND_BY") {
                return res.status(409).json({
                    erro: "RETOMADA_NAO_PERMITIDA",
                    mensagem:
                        "Somente reuniões em stand by podem ser retomadas."
                });
            }

            // Pegamos data e hora diretamente do MySQL
            db.query(
                `
                    SELECT
                        CURDATE() AS data_atual,
                        CURTIME() AS hora_atual
                `,
                (err, horarioAtual) => {
                    if (err) {
                        console.error(err);

                        return res.status(500).json({
                            erro: "Erro ao verificar horário atual"
                        });
                    }

                    const dataAtual =
                        horarioAtual[0].data_atual;

                    const horaAtual =
                        horarioAtual[0].hora_atual;


                    // ==================================================
                    // REUNIÃO JÁ TERMINOU
                    // ==================================================

                    if (
                        reserva.data < dataAtual ||
                        (
                            reserva.data === dataAtual &&
                            reserva.hora_fim <= horaAtual
                        )
                    ) {
                        return res.status(409).json({
                            erro: "REUNIAO_ENCERRADA",
                            mensagem:
                                "O horário desta reunião já terminou. Ela não pode mais ser retomada."
                        });
                    }


                    // ==================================================
                    // REUNIÃO AINDA NÃO COMEÇOU
                    // ==================================================

                    if (
                        reserva.data > dataAtual ||
                        (
                            reserva.data === dataAtual &&
                            reserva.hora_inicio > horaAtual
                        )
                    ) {
                        /*
                            Como a reunião é futura, verificamos
                            se alguém ocupou o intervalo enquanto
                            ela estava em STAND_BY.
                        */

                        const sqlConflitoFuturo = `
                            SELECT *
                            FROM reservas
                            WHERE id != ?
                            AND data = ?
                            AND status = 'AGENDADA'
                            AND hora_inicio < ?
                            AND hora_fim > ?
                            ORDER BY hora_inicio ASC
                        `;

                        db.query(
                            sqlConflitoFuturo,
                            [
                                id,
                                reserva.data,
                                reserva.hora_fim,
                                reserva.hora_inicio
                            ],
                            (err, conflitos) => {
                                if (err) {
                                    console.error(err);

                                    return res.status(500).json({
                                        erro:
                                            "Erro ao verificar disponibilidade da sala"
                                    });
                                }

                                if (conflitos.length > 0) {
                                    const conflito =
                                        conflitos[0];

                                    const inicio =
                                        conflito.hora_inicio
                                            .toString()
                                            .slice(0, 5);

                                    const fim =
                                        conflito.hora_fim
                                            .toString()
                                            .slice(0, 5);

                                    return res
                                        .status(409)
                                        .json({
                                            erro:
                                                "RETOMADA_INDISPONIVEL",

                                            mensagem:
                                                `Não é possível retomar esta reunião porque outra reserva ocupa o horário das ${inicio} às ${fim}.`,

                                            reservas:
                                                conflitos
                                        });
                                }

                                // Horário continua livre
                                ativarReserva(
                                    id,
                                    res
                                );
                            }
                        );

                        return;
                    }


                    // ==================================================
                    // REUNIÃO ESTÁ ACONTECENDO AGORA
                    // ==================================================

                    /*
                        Nesse caso não verificamos todo o intervalo.

                        Só queremos saber se existe outra reunião
                        utilizando a sala NESTE MOMENTO.
                    */

                    const sqlOcupacaoAtual = `
                        SELECT *
                        FROM reservas
                        WHERE id != ?
                        AND status = 'AGENDADA'
                        AND data = CURDATE()
                        AND hora_inicio <= CURTIME()
                        AND hora_fim > CURTIME()
                        ORDER BY hora_fim ASC
                        LIMIT 1
                    `;

                    db.query(
                        sqlOcupacaoAtual,
                        [id],
                        (err, ocupacoes) => {
                            if (err) {
                                console.error(err);

                                return res.status(500).json({
                                    erro:
                                        "Erro ao verificar ocupação da sala"
                                });
                            }

                            if (ocupacoes.length > 0) {
                                const ocupacao =
                                    ocupacoes[0];

                                const fim =
                                    ocupacao.hora_fim
                                        .toString()
                                        .slice(0, 5);

                                return res
                                    .status(409)
                                    .json({
                                        erro:
                                            "RETOMADA_INDISPONIVEL",

                                        mensagem:
                                            `A sala está sendo utilizada por outra reunião até ${fim}. Você poderá tentar retomar após esse horário.`,

                                        reservas:
                                            ocupacoes
                                    });
                            }

                            // Sala livre neste momento
                            ativarReserva(
                                id,
                                res
                            );
                        }
                    );
                }
            );
        }
    );
};


// ======================================================
// FUNÇÃO AUXILIAR PARA RETOMAR
// ======================================================

const ativarReserva = (id, res) => {
    const sql = `
        UPDATE reservas
        SET status = 'AGENDADA'
        WHERE id = ?
        AND status = 'STAND_BY'
    `;

    db.query(
        sql,
        [id],
        (err, result) => {
            if (err) {
                console.error(err);

                return res.status(500).json({
                    erro: "Erro ao retomar reunião"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(409).json({
                    erro: "RETOMADA_NAO_PERMITIDA",
                    mensagem:
                        "Não foi possível retomar esta reunião."
                });
            }

            res.json({
                mensagem:
                    "Reunião retomada com sucesso",
                status: "AGENDADA"
            });
        }
    );
};

// ======================================================
// CANCELAR
// ======================================================

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


module.exports = {
    listarReservas,
    buscarReservaPorId,
    criarReserva,
    aplicarPrioridade,
    editarReserva,
    pausarReserva,
    retomarReserva,
    cancelarReserva
};