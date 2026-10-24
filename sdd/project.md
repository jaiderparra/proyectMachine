# Contexto del proyecto

## Propósito

Sistema web para centralizar la reserva de espacios académicos (laboratorios, auditorios y salas de cómputo) de una institución universitaria, eliminando la duplicidad de solicitudes y los conflictos de horario. Derivado de `PLAN_INGENIERIA.md`.

## Stack

- Backend: Node.js 22 + Express 4, SQLite (`node:sqlite`), JWT, bcryptjs.
- Pruebas: `node:test` + supertest.
- Frontend: Next.js 15 (App Router) + React.

## Glosario

| Término | Definición |
|---|---|
| Espacio | Lugar físico reservable: `LABORATORIO`, `AUDITORIO` o `SALA_COMPUTO`. |
| Solicitud / Reserva | Petición de uso de un espacio en una fecha y franja horaria. Se usa "reserva" para cualquier estado. |
| Franja | Intervalo `[horaInicio, horaFin)` dentro de una fecha. |
| Reserva activa | Reserva en estado `PENDIENTE` o `APROBADA`. |
| Horario de operación | Franja diaria en la que los espacios pueden reservarse. |
| Solicitante | Usuario con rol `SOLICITANTE`. |

## Estados de una reserva

```
            aprobar             cancelar
PENDIENTE ──────────▶ APROBADA ──────────▶ CANCELADA
    │  │
    │  └── rechazar ──▶ RECHAZADA
    └───── cancelar ──▶ CANCELADA
```

`RECHAZADA` y `CANCELADA` son estados finales.

## Convenciones

- Fechas `YYYY-MM-DD`, horas `HH:MM` (24 h), hora local de la institución.
- Identificadores numéricos autoincrementales.
- Respuestas JSON. Errores con forma `{ "error": { "code": "...", "message": "...", "details": ... } }`.

### Códigos HTTP

| Código | Uso |
|---|---|
| 200 / 201 | Éxito / recurso creado |
| 400 | Datos con formato inválido o faltantes (`VALIDATION_ERROR`) |
| 401 | Sin autenticación o token inválido (`UNAUTHENTICATED`) |
| 403 | Autenticado pero sin permiso (`FORBIDDEN`) |
| 404 | Recurso inexistente (`NOT_FOUND`) |
| 409 | Conflicto de horario (`SCHEDULE_CONFLICT`), duplicado (`DUPLICATE`) o transición de estado inválida (`INVALID_STATE`) |
| 422 | Violación de regla de negocio con datos bien formados (`BUSINESS_RULE`) |

## Contrato de API (prefijo `/api`)

| Método | Ruta | Descripción | Requisitos |
|---|---|---|---|
| GET | `/health` | Estado del servicio | — |
| POST | `/auth/register` | Registro público | USR-01 |
| POST | `/auth/login` | Inicio de sesión | USR-02 |
| GET | `/auth/me` | Perfil propio | USR-04 |
| GET | `/users` | Listar usuarios | USR-03 |
| POST | `/users` | Crear usuario con rol | USR-03 |
| PATCH | `/users/:id` | Editar nombre, rol o estado | USR-03 |
| GET | `/spaces` | Listar espacios | ESP-02 |
| GET | `/spaces/:id` | Detalle de espacio | ESP-02 |
| POST | `/spaces` | Crear espacio | ESP-01 |
| PATCH | `/spaces/:id` | Editar / activar / inactivar | ESP-03, ESP-04 |
| GET | `/spaces/:id/availability?date=` | Ocupación diaria | DIS-01 |
| GET | `/spaces/:id/availability/check?date=&startTime=&endTime=` | Verificar franja | DIS-02 |
| POST | `/reservations` | Crear solicitud | RES-01, RES-02, CON-02 |
| GET | `/reservations` | Listar reservas (filtros) | RES-03, HIS-03 |
| GET | `/reservations/:id` | Detalle | RES-03 |
| POST | `/reservations/:id/approve` | Aprobar | APR-01 |
| POST | `/reservations/:id/reject` | Rechazar | APR-02 |
| POST | `/reservations/:id/cancel` | Cancelar | CAN-01 |
| GET | `/reservations/:id/history` | Historial de la reserva | HIS-02 |
