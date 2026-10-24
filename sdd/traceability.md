# Matriz de trazabilidad

Requisito → escenarios → código → pruebas. Generada a partir de `sdd/specs/` y de los nombres de las pruebas en `backend/test/` (cada prueba empieza con el ID del escenario que verifica).

| Requisito | Capacidad | Escenarios | Código | Pruebas | Verificación |
|---|---|---|---|---|---|
| **APR-01** Aprobar solicitud | aprobacion | APR-01-E1, APR-01-E2, APR-01-E3, APR-01-E4, APR-01-E5, APR-01-E6 | reservations.service.js (approve, reject) | approval.test.js, max-consecutive.test.js | Automatizada |
| **APR-02** Rechazar solicitud | aprobacion | APR-02-E1, APR-02-E2, APR-02-E3, APR-02-E4 | reservations.service.js (approve, reject) | approval.test.js | Automatizada |
| **CAN-01** Cancelar reserva | cancelacion-historial | CAN-01-E1, CAN-01-E2, CAN-01-E3, CAN-01-E4, CAN-01-E5, CAN-01-E6 | reservations.service.js (cancel) | cancellation.test.js | Automatizada |
| **HIS-01** Registro de historial | cancelacion-historial | HIS-01-E1 | reservations.repository.js (addHistory, listHistory), db/schema.sql (triggers plpgsql) | reservations.test.js | Automatizada |
| **HIS-02** Consultar historial de una reserva | cancelacion-historial | HIS-02-E1, HIS-02-E2 | reservations.repository.js (addHistory, listHistory), db/schema.sql (triggers plpgsql) | history.test.js | Automatizada |
| **HIS-03** Historial de reservas del usuario | cancelacion-historial | HIS-03-E1 | reservations.repository.js (addHistory, listHistory), db/schema.sql (triggers plpgsql) | history.test.js | Automatizada |
| **DIS-01** Ocupación diaria de un espacio | disponibilidad | DIS-01-E1, DIS-01-E2, DIS-01-E5, DIS-01-E3, DIS-01-E4 | reservations.service.js (dailyAvailability, checkSlot) | availability.test.js | Automatizada |
| **DIS-02** Verificación de una franja | disponibilidad | DIS-02-E1, DIS-02-E2 | reservations.service.js (dailyAvailability, checkSlot) | availability.test.js | Automatizada |
| **ESP-01** Registrar espacio | gestion-espacios | ESP-01-E1, ESP-01-E2, ESP-01-E3, ESP-01-E4 | backend/src/modules/spaces/* | spaces.test.js | Automatizada |
| **ESP-02** Consultar espacios | gestion-espacios | ESP-02-E1, ESP-02-E2, ESP-02-E3, ESP-02-E4 | backend/src/modules/spaces/* | spaces.test.js | Automatizada |
| **ESP-03** Actualizar espacio | gestion-espacios | ESP-03-E1, ESP-03-E2 | backend/src/modules/spaces/* | spaces.test.js | Automatizada |
| **ESP-04** Activar e inactivar espacio | gestion-espacios | ESP-04-E1, ESP-04-E2, ESP-04-E3 | backend/src/modules/spaces/* | reservations.test.js, spaces.test.js | Automatizada |
| **UI-01** Autenticación en la interfaz | interfaz-web | UI-01-E1, UI-01-E2 | frontend/src/app/* | — | Manual (build + revisión) |
| **UI-02** Navegación por rol | interfaz-web | UI-02-E1 | frontend/src/app/* | — | Manual (build + revisión) |
| **UI-03** Consultar disponibilidad y solicitar | interfaz-web | UI-03-E1, UI-03-E2 | frontend/src/app/* | — | Manual (build + revisión) |
| **UI-04** Mis reservas e historial | interfaz-web | — | frontend/src/app/* | — | Manual (build + revisión) |
| **UI-05** Bandeja de aprobaciones | interfaz-web | — | frontend/src/app/* | — | Manual (build + revisión) |
| **UI-06** Administración | interfaz-web | — | frontend/src/app/* | — | Manual (build + revisión) |
| **CON-01** Definición de solapamiento | prevencion-conflictos | CON-01-E1, CON-01-E2, CON-01-E3 | reservations.rules.js (overlaps), reservations.repository.js (findOverlapping), spaces.repository.js (findByIdForUpdate), db/database.js (transaction) | rules.unit.test.js | Automatizada |
| **CON-02** Rechazo de solicitudes solapadas | prevencion-conflictos | CON-02-E1, CON-02-E2, CON-02-E3, CON-02-E4, CON-02-E5 | reservations.rules.js (overlaps), reservations.repository.js (findOverlapping), spaces.repository.js (findByIdForUpdate), db/database.js (transaction) | conflicts.test.js | Automatizada |
| **CON-03** Revalidación al aprobar | prevencion-conflictos | CON-03-E1 | reservations.rules.js (overlaps), reservations.repository.js (findOverlapping), spaces.repository.js (findByIdForUpdate), db/database.js (transaction) | approval.test.js | Automatizada |
| **CON-04** Atomicidad | prevencion-conflictos | CON-04-E1 | reservations.rules.js (overlaps), reservations.repository.js (findOverlapping), spaces.repository.js (findByIdForUpdate), db/database.js (transaction) | conflicts.test.js | Automatizada |
| **ROL-01** Roles del sistema | roles-permisos | ROL-01-E1 | backend/src/middleware/auth.js, users.service.js | permissions.test.js | Automatizada |
| **ROL-02** Autenticación obligatoria | roles-permisos | ROL-02-E1, ROL-02-E2, ROL-02-E3, ROL-02-E4 | backend/src/middleware/auth.js, users.service.js | approval.test.js, permissions.test.js | Automatizada |
| **ROL-03** Matriz de permisos | roles-permisos | ROL-03-E1, ROL-03-E2 | backend/src/middleware/auth.js, users.service.js | approval.test.js, spaces.test.js | Automatizada |
| **ROL-04** Propiedad de las reservas | roles-permisos | ROL-04-E1, ROL-04-E2 | backend/src/middleware/auth.js, users.service.js | reservations.test.js | Automatizada |
| **RES-01** Crear solicitud | solicitudes-reserva | RES-01-E1, RES-01-E2, RES-01-E3, RES-01-E4 | backend/src/modules/reservations/reservations.service.js, reservations.rules.js | reservations.test.js | Automatizada |
| **RES-02** Reglas de horario | solicitudes-reserva | RES-02-E1, RES-02-E2, RES-02-E3, RES-02-E4, RES-02-E5 | backend/src/modules/reservations/reservations.service.js, reservations.rules.js | reservations.test.js, rules.unit.test.js | Automatizada |
| **RES-03** Consultar reservas | solicitudes-reserva | RES-03-E1, RES-03-E3, RES-03-E2 | backend/src/modules/reservations/reservations.service.js, reservations.rules.js | reservations.test.js | Automatizada |
| **RES-04** Duración consecutiva máxima | solicitudes-reserva | RES-04-E1, RES-04-E2, RES-04-E3, RES-04-E4, RES-04-E5, RES-04-E6, RES-04-E7, RES-04-E8, RES-04-E9 | backend/src/modules/reservations/reservations.service.js, reservations.rules.js | max-consecutive.test.js | Automatizada |
| **USR-01** Registro público | usuarios | USR-01-E1, USR-01-E2, USR-01-E3, USR-01-E4 | backend/src/modules/users/* | auth.test.js | Automatizada |
| **USR-02** Inicio de sesión | usuarios | USR-02-E1, USR-02-E2, USR-02-E3 | backend/src/modules/users/* | auth.test.js | Automatizada |
| **USR-03** Administración de usuarios | usuarios | USR-03-E1, USR-03-E2, USR-03-E3, USR-03-E5, USR-03-E4 | backend/src/modules/users/* | users.test.js | Automatizada |
| **USR-04** Perfil propio | usuarios | USR-04-E1 | backend/src/modules/users/* | auth.test.js | Automatizada |

**Resumen:** 98 escenarios; 93 verificados con pruebas automatizadas (todos los del backend); 5 de interfaz verificados mediante `next build` y revisión manual del flujo.

Las pruebas automatizadas se ejecutan sobre PGlite (PostgreSQL en memoria). Además, `npm run smoke` repite el flujo principal y la concurrencia (CON-04) contra Supabase real.
