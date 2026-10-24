# Especificación: Prevención de reservas simultáneas

## Propósito

Impedir que un mismo espacio quede asignado a dos actividades al mismo tiempo (problema P2, riesgo R1 del plan).

## Requisitos

### Requisito CON-01: Definición de solapamiento
Las franjas se tratan como intervalos semiabiertos `[inicio, fin)`. Dos reservas del mismo espacio en la misma fecha se solapan si y solo si `inicioA < finB` **y** `inicioB < finA`. Franjas contiguas (una termina exactamente cuando la otra empieza) **no** se solapan.

#### Escenario CON-01-E1: Solapamiento parcial
- **DADO** una reserva de 08:00 a 10:00
- **CUANDO** se evalúa la franja 09:00–11:00
- **ENTONCES** se considera solapada

#### Escenario CON-01-E2: Franja contenida
- **DADO** una reserva de 08:00 a 12:00
- **CUANDO** se evalúa la franja 09:00–10:00
- **ENTONCES** se considera solapada

#### Escenario CON-01-E3: Franjas contiguas
- **DADO** una reserva de 08:00 a 10:00
- **CUANDO** se evalúa la franja 10:00–12:00
- **ENTONCES** **no** se considera solapada

### Requisito CON-02: Rechazo de solicitudes solapadas
El sistema NO DEBE registrar una solicitud que se solape con una reserva **activa** (`PENDIENTE` o `APROBADA`) del mismo espacio. Las reservas `RECHAZADA` y `CANCELADA` no bloquean la franja. Se aplica el criterio "primero en solicitar": una solicitud pendiente reserva provisionalmente la franja hasta que sea decidida o cancelada. Debe responder `409` con código `SCHEDULE_CONFLICT` e incluir las reservas en conflicto.

#### Escenario CON-02-E1: Solicitud en franja ocupada
- **DADO** una reserva del espacio X el `2030-05-10` de 08:00 a 10:00
- **CUANDO** otro usuario solicita el espacio X ese día de 09:00 a 11:00
- **ENTONCES** recibe `409` con código `SCHEDULE_CONFLICT`

#### Escenario CON-02-E2: Otro espacio, misma franja
- **DADO** una reserva del espacio X de 08:00 a 10:00
- **CUANDO** se solicita el espacio Y en la misma franja
- **ENTONCES** la solicitud se registra (`201`)

#### Escenario CON-02-E3: Solicitud duplicada
- **DADO** que un usuario ya solicitó el espacio X de 08:00 a 10:00
- **CUANDO** envía exactamente la misma solicitud otra vez
- **ENTONCES** recibe `409`

#### Escenario CON-02-E4: Franja ocupada por solicitud pendiente
- **DADO** una solicitud `PENDIENTE` del espacio X de 08:00 a 10:00
- **CUANDO** otro usuario solicita el espacio X de 08:30 a 09:30
- **ENTONCES** recibe `409` con código `SCHEDULE_CONFLICT`

#### Escenario CON-02-E5: Reserva contigua
- **DADO** una reserva del espacio X de 08:00 a 10:00
- **CUANDO** se solicita el espacio X de 10:00 a 11:00
- **ENTONCES** la solicitud se registra (`201`)

### Requisito CON-03: Revalidación al aprobar
Al aprobar una solicitud, el sistema DEBE verificar nuevamente que no se solape con reservas **aprobadas** del mismo espacio. Es una defensa ante datos creados fuera del flujo normal (cargas manuales, condiciones de carrera); en el flujo normal CON-02 ya lo impide.

#### Escenario CON-03-E1: Conflicto detectado al aprobar
- **DADO** una solicitud pendiente que se solapa con una reserva aprobada (precondición creada directamente en la base de datos)
- **CUANDO** un coordinador intenta aprobarla
- **ENTONCES** recibe `409` con código `SCHEDULE_CONFLICT` y la solicitud sigue `PENDIENTE`

### Requisito CON-04: Atomicidad
La verificación de conflictos y el registro (o aprobación) DEBEN ejecutarse en una misma transacción de base de datos (`BEGIN IMMEDIATE`).

#### Escenario CON-04-E1: Solicitudes concurrentes
- **DADO** un espacio libre de 08:00 a 10:00
- **CUANDO** dos usuarios envían simultáneamente solicitudes solapadas para esa franja
- **ENTONCES** exactamente una recibe `201` y la otra `409`
