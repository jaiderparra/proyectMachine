-- =====================================================================
-- Sistema de Reservas de Espacios Académicos — script de base de datos
-- Motor: PostgreSQL 17 (Supabase). Ejecutar completo en: Supabase → SQL Editor → Run
-- Es idempotente: puede ejecutarse varias veces sin duplicar datos.
-- Las tablas quedan en el esquema "reservas" (no expuesto por la Data API de Supabase).
-- Para verlas en el Table Editor, cambie el selector de esquema de "public" a "reservas".
-- Fuente: backend/src/db/schema.sql y backend/src/db/seed.js
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS reservas;
SET search_path TO reservas;

-- ---------------------------------------------------------------------
-- 1. Estructura (tablas, índices, triggers, RLS)
-- ---------------------------------------------------------------------

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

-- ---------------------------------------------------------------------
-- 2. Datos iniciales (contraseñas con hash bcrypt; ver README para las claves)
-- ---------------------------------------------------------------------
INSERT INTO users (name, email, password_hash, role, active, created_at)
VALUES ('Administrador General', 'admin@uni.edu', '$2b$10$hqRKo73CWWzQ6oDYNV3R6OdpUrMegsTTjc1NpJo1ft5n02Hi/36E6', 'ADMIN', TRUE, now())
ON CONFLICT (email) DO NOTHING;
INSERT INTO users (name, email, password_hash, role, active, created_at)
VALUES ('Coordinadora de Espacios', 'coordinador@uni.edu', '$2b$10$uWR/u9AkaZw27F0b1I0RlusmJKaJWs6yWwPdDfGRPQtPV1gyZovyu', 'COORDINADOR', TRUE, now())
ON CONFLICT (email) DO NOTHING;
INSERT INTO users (name, email, password_hash, role, active, created_at)
VALUES ('Docente Solicitante', 'solicitante@uni.edu', '$2b$10$tvF5QA82j7uo27UaP16TpO.1uX/P8GMORzJtreq73mUQfn69S0Tny', 'SOLICITANTE', TRUE, now())
ON CONFLICT (email) DO NOTHING;
INSERT INTO spaces (name, type, capacity, location, resources, active, created_at)
VALUES ('Laboratorio de Redes', 'LABORATORIO', 30, 'Bloque A, piso 2', 'Routers, switches, 15 equipos', TRUE, now())
ON CONFLICT (lower(name)) DO NOTHING;
INSERT INTO spaces (name, type, capacity, location, resources, active, created_at)
VALUES ('Auditorio Principal', 'AUDITORIO', 200, 'Bloque C, piso 1', 'Proyector, sonido, tarima', TRUE, now())
ON CONFLICT (lower(name)) DO NOTHING;
INSERT INTO spaces (name, type, capacity, location, resources, active, created_at)
VALUES ('Sala de Cómputo 1', 'SALA_COMPUTO', 35, 'Bloque B, piso 3', '35 computadores, videobeam', TRUE, now())
ON CONFLICT (lower(name)) DO NOTHING;
INSERT INTO spaces (name, type, capacity, location, resources, active, created_at)
VALUES ('Laboratorio de Química', 'LABORATORIO', 25, 'Bloque D, piso 1', 'Campana extractora, reactivos', TRUE, now())
ON CONFLICT (lower(name)) DO NOTHING;
INSERT INTO spaces (name, type, capacity, location, resources, active, created_at)
VALUES ('Auditorio Menor', 'AUDITORIO', 80, 'Bloque C, piso 2', 'Proyector, micrófono', TRUE, now())
ON CONFLICT (lower(name)) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Verificación
-- ---------------------------------------------------------------------
SELECT 'users' AS tabla, COUNT(*) FROM reservas.users
UNION ALL SELECT 'spaces', COUNT(*) FROM reservas.spaces
UNION ALL SELECT 'reservations', COUNT(*) FROM reservas.reservations
UNION ALL SELECT 'reservation_history', COUNT(*) FROM reservas.reservation_history;
