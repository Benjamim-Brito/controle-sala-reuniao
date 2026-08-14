CREATE DATABASE IF NOT EXISTS controle_sala_reuniao;

USE controle_sala_reuniao;

CREATE TABLE IF NOT EXISTS reservas (
    id INT AUTO_INCREMENT PRIMARY KEY,

    data DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,

    responsavel VARCHAR(100) NOT NULL,
    setor VARCHAR(100) NOT NULL,

    empresa ENUM(
        'GREEN',
        'MV',
        'EXTERNO'
    ) NOT NULL,

    motivo VARCHAR(255) NULL,

    status ENUM(
        'AGENDADA',
        'STAND_BY',
        'CONFLITO',
        'CANCELADA'
    ) NOT NULL DEFAULT 'AGENDADA',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);