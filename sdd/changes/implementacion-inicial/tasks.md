# Tareas: implementación inicial

> Cada tarea referencia los requisitos que implementa. Una tarea solo se marca como hecha cuando sus pruebas pasan junto con toda la suite.

## 1. Base del backend (E3)
- [x] 1.1 Estructura `backend/` (Express, `createApp({ db, clock })` inyectable, `server.js`, `config.js`).
- [x] 1.2 Base de datos SQLite (`node:sqlite`): esquema `users`, `spaces`, `reservations`, `reservation_history`; datos semilla (admin, coordinador, solicitante, espacios).
- [x] 1.3 Manejo de errores uniforme `{ error: { code, message, details } }` y clase `AppError` (project.md).
- [x] 1.4 Utilidades de validación (texto, enteros, email, enumeraciones, fecha `YYYY-MM-DD`, hora `HH:MM`).

## 2. Identidad (E3)
- [x] 2.1 Registro público con rol forzado `SOLICITANTE` y hash bcrypt — USR-01.
- [x] 2.2 Login con JWT 8 h; mensaje genérico; cuenta desactivada → 403 — USR-02.
- [x] 2.3 `GET /auth/me` — USR-04.
- [x] 2.4 Middleware `authenticate` (usuario existente y activo, rol desde BD) — ROL-02.
- [x] 2.5 Middleware `authorize(...roles)` con matriz de ROL-03 — ROL-01, ROL-03.
- [x] 2.6 Administración de usuarios con protección de autobloqueo — USR-03.
- [x] 2.7 Pruebas: `auth.test.js`, `users.test.js`, `permissions.test.js`.

## 3. Espacios (E4)
- [ ] 3.1 CRUD sin borrado, nombre único sin mayúsculas — ESP-01, ESP-03.
- [ ] 3.2 Listado con filtro por tipo y `includeInactive` por rol — ESP-02.
- [ ] 3.3 Inactivación bloqueada con reservas futuras activas — ESP-04.
- [ ] 3.4 Pruebas: `spaces.test.js`.

## 4. Núcleo de reservas (E5)
- [ ] 4.1 Reglas puras: `overlaps`, horario de operación, duración mínima, inicio futuro — CON-01, RES-02.
- [ ] 4.2 Crear solicitud en transacción `BEGIN IMMEDIATE` con verificación de conflictos y entrada de historial — RES-01, CON-02, CON-04, HIS-01.
- [ ] 4.3 Listar y detallar con visibilidad por rol — RES-03, ROL-04, HIS-03.
- [ ] 4.4 Disponibilidad diaria y verificación de franja — DIS-01, DIS-02.
- [ ] 4.5 Pruebas: `rules.unit.test.js`, `reservations.test.js`, `availability.test.js`, `conflicts.test.js`.

## 5. Decisión y ciclo de vida (E6)
- [ ] 5.1 Aprobar con revalidación y control de vencimiento — APR-01, CON-03.
- [ ] 5.2 Rechazar con motivo obligatorio — APR-02.
- [ ] 5.3 Cancelar (propietario/coordinador/admin, no iniciada) — CAN-01.
- [ ] 5.4 Historial por reserva — HIS-02.
- [ ] 5.5 Pruebas: `approval.test.js`, `cancellation.test.js`, `history.test.js`.

## 6. Frontend (E7)
- [ ] 6.1 Proyecto Next.js, cliente API, contexto de sesión — UI-01.
- [ ] 6.2 Barra de navegación por rol y protección de rutas — UI-01, UI-02.
- [ ] 6.3 Espacios: disponibilidad y solicitud — UI-03.
- [ ] 6.4 Mis reservas: cancelar e historial — UI-04.
- [ ] 6.5 Aprobaciones — UI-05.
- [ ] 6.6 Administración de espacios y usuarios — UI-06.
- [ ] 6.7 Verificación: `next build` sin errores.
