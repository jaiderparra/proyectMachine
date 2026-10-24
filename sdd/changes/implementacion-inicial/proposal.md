# Propuesta: implementación inicial del sistema de reservas

## Por qué

Las especificaciones v2 (revisadas el 2026-10-24, ver `sdd/reviews/2026-10-24-revision-especificaciones.md`) están aprobadas. Este cambio agrupa la construcción del sistema completo según `PLAN_INGENIERIA.md`.

## Qué cambia

- Se crea el backend Node.js/Express con SQLite que implementa las capacidades ESP, USR, ROL, RES, DIS, CON, APR, CAN/HIS.
- Se crea el frontend Next.js que implementa UI-01…UI-06.
- Se crean pruebas automatizadas nombradas por ID de escenario.

## Impacto

- Especificaciones afectadas: todas (implementación de la versión vigente; sin deltas).
- Código: nuevo (`backend/`, `frontend/`).

## Fuera de este cambio

- Notificaciones, reservas recurrentes, despliegue productivo (ver limitaciones del plan).
