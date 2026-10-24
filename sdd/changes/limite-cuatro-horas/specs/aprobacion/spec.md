# Delta: Aprobación y rechazo de solicitudes

## Requisitos MODIFICADOS

### Requisito APR-01: Aprobar solicitud
Un `COORDINADOR` o `ADMIN` DEBE poder aprobar una solicitud en estado `PENDIENTE`. La reserva pasa a `APROBADA`, se registra quién decidió (`decidedBy`) y se crea una entrada de historial. Se aplica CON-03. NO DEBE aprobarse una solicitud cuya hora de inicio ya pasó (`422`, `BUSINESS_RULE`); sí puede rechazarse. **NO DEBE aprobarse una solicitud que incumpla RES-04 (más de 4 horas consecutivas del mismo usuario en el mismo espacio) (`422`, `BUSINESS_RULE`); sí puede rechazarse.**

> Escenarios APR-01-E1 a APR-01-E5 se conservan sin cambios.

#### Escenario APR-01-E6: Solicitud que incumple el límite de cuatro horas
- **DADO** una solicitud pendiente de 08:00 a 13:00 creada antes de que existiera la regla (precondición creada directamente en la base de datos)
- **CUANDO** un `COORDINADOR` intenta aprobarla
- **ENTONCES** recibe `422` con código `BUSINESS_RULE` y la solicitud sigue `PENDIENTE`
