# Tareas: límite de cuatro horas consecutivas

## 1. Especificación (antes del código)
- [x] 1.1 Propuesta con interpretación de la regla y análisis de impacto (`proposal.md`).
- [x] 1.2 Deltas: RES-04 (agregado), APR-01 y UI-03 (modificados).
- [x] 1.3 Anexo de cambios en `PLAN_INGENIERIA.md`.

## 2. Implementación
- [ ] 2.1 `config.schedule.maxConsecutiveMinutes = 240`.
- [ ] 2.2 Regla pura `consecutiveBlockMinutes(slot, sameUserReservations)` — RES-04.
- [ ] 2.3 Repositorio: reservas activas de un usuario en un espacio y fecha.
- [ ] 2.4 Validación en la creación (después de RES-02, antes de CON-02) — RES-04.
- [ ] 2.5 Validación en la aprobación — APR-01 (modificado).
- [ ] 2.6 Frontend: aviso del límite en el formulario — UI-03.

## 3. Pruebas
- [ ] 3.1 Unitarias de la cadena contigua (`rules.unit.test.js`).
- [ ] 3.2 Integración RES-04-E1…E9 y APR-01-E6 (`max-consecutive.test.js`).
- [ ] 3.3 Regresión: suite completa en verde sin modificar pruebas previas.
- [ ] 3.4 `next build` sin errores.

## 4. Cierre
- [ ] 4.1 Fusionar deltas en `sdd/specs/` y archivar el cambio.
