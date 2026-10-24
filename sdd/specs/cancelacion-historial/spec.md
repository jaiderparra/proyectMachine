# Especificación: Cancelación e historial de reservas

## Propósito

Liberar espacios que ya no se usarán y conservar la trazabilidad completa de cada reserva (problema P5 del plan).

## Requisitos

### Requisito CAN-01: Cancelar reserva
El propietario de una reserva o un `ADMIN` DEBE poder cancelarla si está en estado `PENDIENTE` o `APROBADA`, con un motivo opcional (`reason`). La reserva pasa a `CANCELADA`, deja de bloquear la franja y se crea una entrada de historial.

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
