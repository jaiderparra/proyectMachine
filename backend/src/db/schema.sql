-- Esquema de persistencia en PostgreSQL / Supabase (cambio migracion-supabase).
-- Idempotente: se ejecuta en cada arranque. El search_path apunta al esquema `reservas`,
-- que la Data API de Supabase no expone (solo publica `public`).

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL CHECK (role IN ('ADMIN', 'COORDINADOR', 'SOLICITANTE')),
  active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS spaces (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT        NOT NULL,
  type       TEXT        NOT NULL CHECK (type IN ('LABORATORIO', 'AUDITORIO', 'SALA_COMPUTO')),
  capacity   INTEGER     NOT NULL CHECK (capacity BETWEEN 1 AND 1000),
  location   TEXT        NOT NULL,
  resources  TEXT,
  active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL
);

-- ESP-01-E2: nombre único sin distinguir mayúsculas.
CREATE UNIQUE INDEX IF NOT EXISTS spaces_name_lower_key ON spaces (lower(name));

CREATE TABLE IF NOT EXISTS reservations (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  space_id        INTEGER     NOT NULL REFERENCES spaces (id),
  user_id         INTEGER     NOT NULL REFERENCES users (id),
  date            DATE        NOT NULL,
  start_time      TIME        NOT NULL,
  end_time        TIME        NOT NULL,
  purpose         TEXT        NOT NULL,
  attendees       INTEGER     NOT NULL,
  status          TEXT        NOT NULL CHECK (status IN ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'CANCELADA')),
  decided_by      INTEGER REFERENCES users (id),
  decision_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL,
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_reservations_space_date ON reservations (space_id, date, status);
CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations (user_id);

CREATE TABLE IF NOT EXISTS reservation_history (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reservation_id INTEGER     NOT NULL REFERENCES reservations (id),
  from_status    TEXT,
  to_status      TEXT        NOT NULL,
  changed_by     INTEGER     NOT NULL REFERENCES users (id),
  comment        TEXT,
  changed_at     TIMESTAMPTZ NOT NULL
);

-- HIS-01: el historial es de solo inserción.
CREATE OR REPLACE FUNCTION reservation_history_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'El historial de reservas es inmutable';
END;
$$;

DROP TRIGGER IF EXISTS reservation_history_no_update ON reservation_history;
CREATE TRIGGER reservation_history_no_update
  BEFORE UPDATE OR DELETE ON reservation_history
  FOR EACH ROW EXECUTE FUNCTION reservation_history_immutable();

-- Defensa adicional: sin políticas, ningún rol de la Data API (anon, authenticated) puede leer.
-- El rol `postgres` del backend omite RLS.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_history ENABLE ROW LEVEL SECURITY;
