# Especificación: Aprobación y rechazo de solicitudes

## Propósito

Formalizar la decisión sobre cada solicitud con responsable y motivo (problema P4 del plan).

## Requisitos

### Requisito APR-01: Aprobar solicitud
Un `COORDINADOR` o `ADMIN` DEBE poder aprobar una solicitud en estado `PENDIENTE`. La reserva pasa a `APROBADA`, se registra quién decidió (`decidedBy`) y se crea una entrada de historial. Se aplica CON-03. NO DEBE aprobarse una solicitud cuya hora de inicio ya pasó (`422`, `BUSINESS_RULE`); sí puede rechazarse. **NO DEBE aprobarse una solicitud que incumpla RES-04 (más de 4 horas consecutivas del mismo usuario en el mismo espacio) (`422`, `BUSINESS_RULE`); sí puede rechazarse.**

#### Escenario APR-01-E1: Aprobación exitosa
- **DADO** una solicitud pendiente
- **CUANDO** un `COORDINADOR` la aprueba
- **ENTONCES** recibe `200`, el estado es `APROBADA` y `decidedBy` es el coordinador

#### Escenario APR-01-E2: Solicitud no pendiente
- **DADO** una reserva ya `APROBADA` o `RECHAZADA`
- **CUANDO** se intenta aprobar
- **ENTONCES** se recibe `409` con código `INVALID_STATE`

#### Escenario APR-01-E3: Reserva inexistente
- **CUANDO** se intenta aprobar una reserva que no existe
- **ENTONCES** se recibe `404`

#### Escenario APR-01-E4: Solicitud vencida
- **DADO** una solicitud pendiente cuya hora de inicio ya pasó
- **CUANDO** un `COORDINADOR` intenta aprobarla
- **ENTONCES** recibe `422` con código `BUSINESS_RULE`

#### Escenario APR-01-E5: Solicitante sin permiso
- **DADO** un `SOLICITANTE`
- **CUANDO** intenta aprobar una solicitud
- **ENTONCES** recibe `403` (ver ROL-03-E1)

#### Escenario APR-01-E6: Solicitud que incumple el límite de cuatro horas
- **DADO** una solicitud pendiente de 08:00 a 13:00 creada antes de que existiera la regla (precondición creada directamente en la base de datos)
- **CUANDO** un `COORDINADOR` intenta aprobarla
- **ENTONCES** recibe `422` con código `BUSINESS_RULE` y la solicitud sigue `PENDIENTE`

### Requisito APR-02: Rechazar solicitud
Un `COORDINADOR` o `ADMIN` DEBE poder rechazar una solicitud `PENDIENTE` indicando obligatoriamente un motivo (`reason`, 5–300 caracteres). La reserva pasa a `RECHAZADA`, se guarda el motivo y se crea una entrada de historial.

#### Escenario APR-02-E1: Rechazo exitoso
- **DADO** una solicitud pendiente
- **CUANDO** el `COORDINADOR` la rechaza con motivo "Mantenimiento programado"
- **ENTONCES** recibe `200`, estado `RECHAZADA` y `decisionReason` con el motivo

#### Escenario APR-02-E2: Rechazo sin motivo
- **CUANDO** el `COORDINADOR` rechaza sin `reason`
- **ENTONCES** recibe `400` con código `VALIDATION_ERROR`

#### Escenario APR-02-E3: Rechazo de solicitud no pendiente
- **DADO** una reserva `CANCELADA`
- **CUANDO** se intenta rechazar
- **ENTONCES** se recibe `409` con código `INVALID_STATE`

#### Escenario APR-02-E4: Rechazo libera la franja
- **DADO** una solicitud rechazada de 08:00 a 10:00
- **CUANDO** otro usuario solicita la misma franja
- **ENTONCES** la solicitud se registra (`201`)
