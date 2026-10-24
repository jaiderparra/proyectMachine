# ReservaU — Sistema de gestión de reservas de espacios académicos

Sistema web para centralizar la reserva de laboratorios, auditorios y salas de cómputo de una institución universitaria. Evita solicitudes duplicadas y conflictos de horario, y deja trazabilidad de cada decisión.

Proyecto construido con **Spec-Driven Development (SDD)**: plan de ingeniería → especificaciones → revisión → implementación → gestión de cambios → verificación. En lugar de la CLI de OpenSpec se usó el agente de IA (Claude) como herramienta de especificación, con la misma estructura (`sdd/`).

| Documento | Contenido |
|---|---|
| [`PLAN_INGENIERIA.md`](PLAN_INGENIERIA.md) | Planificación y justificación técnica inicial |
| [`sdd/`](sdd/README.md) | Especificaciones, revisiones, propuestas de cambio, tareas y archivo |
| [`sdd/traceability.md`](sdd/traceability.md) | Matriz requisito → código → prueba |
| [`INFORME_FINAL.md`](INFORME_FINAL.md) | Resultados, dificultades, decisiones modificadas y conclusiones |
| `Documentacion_Proyecto_Reservas.docx` | Toda la documentación consolidada en Word (se regenera con `cd tools/docgen && npm install && npm run build`) |

## Funcionalidades

- Gestión de espacios (crear, editar, activar/inactivar; sin borrado físico).
- Registro público, inicio de sesión (JWT) y administración de usuarios.
- Roles `ADMIN`, `COORDINADOR`, `SOLICITANTE` con matriz de permisos.
- Solicitudes de reserva con validación de horario (07:00–22:00, mínimo 30 min, inicio futuro, capacidad).
- Consulta de ocupación diaria y verificación de franjas.
- Prevención de reservas simultáneas (transacción con bloqueo de fila del espacio, `SELECT … FOR UPDATE`).
- Aprobación y rechazo (con motivo obligatorio).
- Cancelación e historial inmutable de cambios de estado.
- **Regla de cambio:** nadie puede reservar el mismo espacio más de 4 horas consecutivas.
- Persistencia en **Supabase (PostgreSQL 17)**.

## Arquitectura

```
frontend/ (Next.js 15, App Router)  ──HTTP/JSON + JWT──▶  backend/ (Node.js 22 + Express 5)
                                                            rutas → servicios/reglas → repositorios
                                                                                          │
                                                       Supabase (PostgreSQL 17, esquema "reservas")
                                                       o PGlite local si no hay DATABASE_URL
```

## Requisitos previos

- **Node.js 22.13 o superior**. Verifique con `node -v`.
- npm 10+.
- Un proyecto de **Supabase** (recomendado). Sin él, la API funciona con PGlite (PostgreSQL embebido) y no hay que instalar nada.

## Instalación

```bash
git clone https://github.com/jaiderparra/proyectMachine.git
cd proyectMachine

cd backend && npm install
cd ../frontend && npm install
```

## Configuración

### Base de datos: Supabase

1. En Supabase abra **Project Settings → Database → Connection string → Session pooler** y copie la cadena. La conexión directa `db.<ref>.supabase.co` es solo IPv6 y puede no resolver en redes IPv4.
2. Copie `backend/.env.example` a `backend/.env` y complete `DATABASE_URL` (la contraseña debe ir codificada para URL) y `JWT_SECRET`.
3. **Opción A — script SQL:** abra *Supabase → SQL Editor*, pegue el contenido de [`database/supabase_schema.sql`](database/supabase_schema.sql) y presione **Run**. Crea el esquema, las tablas, los índices, los triggers, RLS y los datos iniciales; es idempotente.
4. **Opción B — automática:** al arrancar, la API crea el esquema `reservas`, sus tablas, índices, triggers y RLS (script idempotente `backend/src/db/schema.sql`) y siembra datos de ejemplo si está vacía.

> **¿No ve las tablas en Supabase?** El *Table Editor* muestra por defecto el esquema `public`. Cambie el selector de esquema (arriba a la izquierda) a **`reservas`**.

> `backend/.env` y cualquier archivo de credenciales están en `.gitignore`. **Nunca** los suba al repositorio.

Las tablas viven en el esquema `reservas`, que la Data API de Supabase no publica, y tienen RLS activado sin políticas. Así las claves publicables de Supabase no pueden leerlas; solo el backend accede, con la cadena de conexión.

### Backend (variables de entorno, en `backend/.env`)

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `DATABASE_URL` | *(vacío)* | Cadena de conexión de Supabase. Vacía → PGlite local en `backend/data/pglite` |
| `DB_SCHEMA` | `reservas` | Esquema de PostgreSQL |
| `PORT` | `4000` | Puerto de la API |
| `JWT_SECRET` | `dev-secret-cambiar-en-produccion` | Secreto para firmar tokens (**cámbielo** fuera de desarrollo) |
| `CORS_ORIGIN` | `http://localhost:3000` | Origen permitido del frontend |
| `BCRYPT_ROUNDS` | `10` | Costo del hash de contraseñas |
| `SEED` | `true` | Carga datos de ejemplo si la base está vacía |

### Frontend

Copie `frontend/.env.example` a `frontend/.env.local` si la API no está en `http://localhost:4000/api`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Ejecución

En dos terminales:

```bash
# Terminal 1 — API
cd backend
npm start            # o npm run dev (recarga automática)

# Terminal 2 — interfaz web
cd frontend
npm run dev          # desarrollo
# o: npm run build && npm start   (producción)
```

Abra <http://localhost:3000>.

### Usuarios de ejemplo (creados en el primer arranque)

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@uni.edu` | `Admin123!` |
| Coordinador | `coordinador@uni.edu` | `Coord123!` |
| Solicitante | `solicitante@uni.edu` | `Solic123!` |

También se crean 5 espacios (laboratorios, auditorios y una sala de cómputo). Para reiniciar los datos locales de PGlite, borre `backend/data/pglite`. En Supabase, elimine el esquema `reservas`.

## Pruebas

```bash
cd backend
npm test
```

Ejecuta **118 pruebas** (unitarias y de integración de la API) contra **PGlite**: PostgreSQL real en memoria, con el mismo esquema y SQL que Supabase, reloj fijo y sin tocar la base de datos real. Cada prueba empieza con el ID del escenario que verifica, por ejemplo `CON-02-E1 franja ocupada → 409`.

Prueba de humo contra Supabase real (crea un esquema temporal y lo elimina al terminar):

```bash
cd backend
npm run smoke
```

Verificación del frontend:

```bash
cd frontend
npm run build
```

## API (prefijo `/api`)

| Método | Ruta | Rol |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | Público |
| GET | `/auth/me` | Autenticado |
| GET / POST / PATCH | `/users`, `/users/:id` | ADMIN |
| GET | `/spaces`, `/spaces/:id` | Autenticado |
| POST / PATCH | `/spaces`, `/spaces/:id` | ADMIN |
| GET | `/spaces/:id/availability?date=` | Autenticado |
| GET | `/spaces/:id/availability/check?date=&startTime=&endTime=` | Autenticado |
| POST / GET | `/reservations` | Autenticado (el solicitante ve solo las suyas) |
| GET | `/reservations/:id`, `/reservations/:id/history` | Propietario, COORDINADOR, ADMIN |
| POST | `/reservations/:id/approve`, `/reservations/:id/reject` | COORDINADOR, ADMIN |
| POST | `/reservations/:id/cancel` | Propietario, COORDINADOR, ADMIN |

Errores: `{ "error": { "code", "message", "details" } }` con `400` validación, `401` autenticación, `403` permiso, `404` no existe, `409` conflicto/estado, `422` regla de negocio. Detalle en [`sdd/project.md`](sdd/project.md).

## Estructura del repositorio

```
├── PLAN_INGENIERIA.md
├── INFORME_FINAL.md
├── Documentacion_Proyecto_Reservas.docx
├── database/supabase_schema.sql          ← script SQL completo para Supabase
├── sdd/
│   ├── project.md, README.md, traceability.md
│   ├── specs/<capacidad>/spec.md        ← especificación vigente
│   ├── reviews/                          ← revisión v1 → v2
│   └── changes/archive/                  ← cambios implementados (implementación inicial, límite 4 h, Supabase)
├── backend/
│   ├── src/ (app.js, server.js, config.js, db/, middleware/, modules/, utils/)
│   ├── scripts/smoke-supabase.js
│   ├── .env.example
│   └── test/
└── frontend/
    └── src/ (app/, components/, lib/)
```
