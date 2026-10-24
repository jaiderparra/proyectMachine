# Especificación: Cancelación e historial de reservas

## Propósito

Liberar espacios que ya no se usarán y conservar la trazabilidad completa de cada reserva (problema P5 del plan).

## Requisitos

### Requisito CAN-01: Cancelar reserva
El propietario de una reserva, un `COORDINADOR` o un `ADMIN` DEBEN poder cancelarla si está en estado `PENDIENTE` o `APROBADA` y su hora de inicio aún no ha llegado, con un motivo opcional (`reason`, máx. 300 caracteres) que se guarda como comentario del historial. La reserva pasa a `CANCELADA`, deja de bloquear la franja y se crea una entrada de historial. Una reserva que ya comenzó o terminó NO DEBE cancelarse (`422`, `BUSINESS_RULE`).

#### Escenario CAN-01-E1: Cancelación por el propietario
- **DADO** una solicitud pendiente del solicitante A
- **CUANDO** A la cancela
- **ENTONCES** recibe `200` y el estado es `CANCELADA`

#### Escenario CAN-01-E2: Cancelación libera la franja
- **DADO** una reserva aprobada de 08:00 a 10:00 que se cancela
- **CUANDO** otro usuario solicita la misma franja
- **ENTONCES** la solicitud se registra (`201`)

#### Escenario CAN-01-E3: Cancelación de reserva ajena
- **DADO** una reserva del solicitante A
- **CUANDO** el solicitante B intenta cancelarla
- **ENTONCES** recibe `403`

#### Escenario CAN-01-E4: Estado final
- **DADO** una reserva `RECHAZADA` o ya `CANCELADA`
- **CUANDO** se intenta cancelar
- **ENTONCES** se recibe `409` con código `INVALID_STATE`

#### Escenario CAN-01-E5: Cancelación por coordinador
- **DADO** una reserva aprobada del solicitante A
- **CUANDO** un `COORDINADOR` la cancela con motivo "Evento institucional"
- **ENTONCES** recibe `200`, estado `CANCELADA`, y el motivo queda en el historial

#### Escenario CAN-01-E6: Reserva ya iniciada
- **DADO** una reserva aprobada cuya hora de inicio ya pasó
- **CUANDO** su propietario intenta cancelarla
- **ENTONCES** recibe `422` con código `BUSINESS_RULE`

### Requisito HIS-01: Registro de historial
Cada transición de estado de una reserva (creación, aprobación, rechazo, cancelación) DEBE registrar una entrada con `fromStatus`, `toStatus`, `changedBy`, `changedAt` y `comment`. El historial NO DEBE poder modificarse ni eliminarse.

#### Escenario HIS-01-E1: Entrada de creación
- **CUANDO** se crea una solicitud
- **ENTONCES** su historial contiene una entrada `null → PENDIENTE` hecha por el solicitante

### Requisito HIS-02: Consultar historial de una reserva
El sistema DEBE devolver el historial de una reserva en orden cronológico, con el nombre de quien realizó cada cambio, respetando la visibilidad de ROL-04.

#### Escenario HIS-02-E1: Ciclo de vida completo
- **DADO** una solicitud creada, aprobada y luego cancelada
- **CUANDO** se consulta su historial
- **ENTONCES** se reciben 3 entradas en orden: `null→PENDIENTE`, `PENDIENTE→APROBADA`, `APROBADA→CANCELADA`

#### Escenario HIS-02-E2: Historial ajeno
- **DADO** una reserva del solicitante A
- **CUANDO** el solicitante B consulta su historial
- **ENTONCES** recibe `403`

### Requisito HIS-03: Historial de reservas del usuario
Un usuario DEBE poder consultar todas sus reservas en cualquier estado (incluidas rechazadas y canceladas) mediante `GET /reservations`.

#### Escenario HIS-03-E1: Reservas en todos los estados
- **DADO** un solicitante con reservas pendiente, rechazada y cancelada
- **CUANDO** consulta `GET /reservations`
- **ENTONCES** recibe las tres reservas
