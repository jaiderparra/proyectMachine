# Propuesta de cambio: persistencia en Supabase (PostgreSQL)

| Campo | Valor |
|---|---|
| ID | `migracion-supabase` |
| Solicitado por | Estudiante / institución |
| Fecha | 2026-10-24 |
| Estado | Aprobado para implementación |

## Por qué

La decisión D1 del plan eligió SQLite en archivo por simplicidad. Antes del cierre se pide usar una **base de datos gestionada en Supabase** (PostgreSQL 17). Esto aporta respaldo administrado, acceso concurrente real desde varias instancias de la API y un motor con tipos `DATE`/`TIME`, bloqueos de fila y funciones `plpgsql`.

## Qué cambia

| Aspecto | Antes (SQLite) | Después (Supabase / PostgreSQL) |
|---|---|---|
| Motor | `node:sqlite`, archivo local | PostgreSQL 17 en Supabase, driver `pg` (pool) |
| Conexión | Ruta de archivo | `DATABASE_URL` por el *session pooler* de Supabase con SSL |
| Esquema | Tablas en la BD por defecto | Esquema dedicado `reservas` (no expuesto por la Data API de Supabase, que solo publica `public`) y RLS activado como defensa adicional |
| Tipos | Texto `YYYY-MM-DD` / `HH:MM` | `DATE`, `TIME`, `TIMESTAMPTZ`, `BOOLEAN`; la API sigue devolviendo `YYYY-MM-DD` y `HH:MM` |
| Nombre único sin mayúsculas | `COLLATE NOCASE` | Índice único sobre `lower(name)` |
| Atomicidad (CON-04) | `BEGIN IMMEDIATE` (bloqueo global de escritura) | Transacción con bloqueo de la fila del espacio (`SELECT … FOR UPDATE`): serializa solo las reservas del mismo espacio |
| Historial inmutable (HIS-01) | Triggers SQLite `RAISE(ABORT)` | Triggers con función `plpgsql` que lanza excepción |
| Acceso a datos | Síncrono | Asíncrono (`async/await`) en repositorios y servicios; Express 5, que propaga errores de promesas |
| Pruebas | SQLite en memoria | **PGlite** (PostgreSQL real compilado a WASM, en proceso): mismo dialecto SQL, sin red, sin tocar la BD de Supabase |
| Desarrollo sin credenciales | — | Si no hay `DATABASE_URL`, la API usa PGlite persistente en `backend/data/` |

## Impacto

### Especificaciones

- **Funcionales:** ninguna cambia de comportamiento. Todos los escenarios ESP, USR, ROL, RES, DIS, CON, APR, CAN/HIS y UI se conservan.
- **MODIFICADO CON-04:** el mecanismo de atomicidad pasa de `BEGIN IMMEDIATE` a bloqueo de fila del espacio.
- **`project.md`:** stack y persistencia.

### Plan de ingeniería

- **D1 (sección 3.5) se revierte parcialmente.** Se descartó PostgreSQL por requerir instalar y operar un servidor. Supabase elimina ese costo operativo, así que la objeción desaparece. Se registra en el Anexo A, sin reescribir el plan original.
- **3.3 Persistencia:** el modelo de entidades se mantiene; cambian el motor y los tipos.
- **Riesgos:** aparecen dos nuevos.
  - **R9 (credenciales expuestas):** mitigado con `.env` y el archivo de credenciales en `.gitignore`.
  - **R10 (dependencia de red y del servicio externo):** mitigado con PGlite para pruebas y desarrollo sin conexión.
- **R7 (dependencias nativas):** `pg` y PGlite son JavaScript/WASM puros.

### Código

`db/` (adaptador `query`/`transaction` para pg y PGlite, esquema PostgreSQL, semilla), los tres repositorios, los servicios (async), `server.js`, `config.js`, middleware de autenticación (async), helpers de prueba. La lógica de reglas (`reservations.rules.js`) no cambia.

### Pruebas

Las 118 pruebas deben pasar **sin cambiar sus expectativas**. Solo cambia la infraestructura de los helpers (BD PGlite, inserción directa async). Además se ejecuta una prueba de humo contra Supabase real.

## Seguridad

- Las credenciales **nunca** se versionan: `databasepasswords.txt` y `.env` están en `.gitignore`. Se publica `backend/.env.example` sin secretos.
- La API usa el rol `postgres` solo desde el servidor. El frontend no recibe claves de Supabase.
- Con esquema `reservas` + RLS activo, las tablas no son accesibles con la clave publicable a través de la Data API.
