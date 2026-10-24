-- Esquema de persistencia (PLAN_INGENIERIA.md, sección 3.3)

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL CHECK (role IN ('ADMIN', 'COORDINADOR', 'SOLICITANTE')),
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS spaces (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  type       TEXT    NOT NULL CHECK (type IN ('LABORATORIO', 'AUDITORIO', 'SALA_COMPUTO')),
  capacity   INTEGER NOT NULL CHECK (capacity BETWEEN 1 AND 1000),
  location   TEXT    NOT NULL,
  resources  TEXT,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS reservations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id        INTEGER NOT NULL REFERENCES spaces (id),
  user_id         INTEGER NOT NULL REFERENCES users (id),
  date            TEXT    NOT NULL,
  start_time      TEXT    NOT NULL,
  end_time        TEXT    NOT NULL,
  purpose         TEXT    NOT NULL,
  attendees       INTEGER NOT NULL,
  status          TEXT    NOT NULL CHECK (status IN ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'CANCELADA')),
  decided_by      INTEGER REFERENCES users (id),
  decision_reason TEXT,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reservations_space_date ON reservations (space_id, date, status);
CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations (user_id);

CREATE TABLE IF NOT EXISTS reservation_history (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id INTEGER NOT NULL REFERENCES reservations (id),
  from_status    TEXT,
  to_status      TEXT    NOT NULL,
  changed_by     INTEGER NOT NULL REFERENCES users (id),
  comment        TEXT,
  changed_at     TEXT    NOT NULL
);

-- HIS-01: el historial es de solo inserción.
CREATE TRIGGER IF NOT EXISTS reservation_history_no_update
BEFORE UPDATE ON reservation_history
BEGIN
  SELECT RAISE(ABORT, 'El historial de reservas es inmutable');
END;

CREATE TRIGGER IF NOT EXISTS reservation_history_no_delete
BEFORE DELETE ON reservation_history
BEGIN
  SELECT RAISE(ABORT, 'El historial de reservas es inmutable');
END;
