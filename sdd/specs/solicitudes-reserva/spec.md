# Especificación: Creación de solicitudes de reserva

## Propósito

Ofrecer un canal único y estructurado para solicitar espacios (problema P1 del plan).

## Requisitos

### Requisito RES-01: Crear solicitud
El sistema DEBE permitir a cualquier usuario autenticado crear una solicitud con `spaceId`, `date`, `startTime`, `endTime`, `purpose` (5–300 caracteres) y `attendees` (entero ≥ 1). La solicitud DEBE crearse en estado `PENDIENTE`, asociada al usuario autenticado, y DEBE registrar una entrada de historial.

#### Escenario RES-01-E1: Solicitud exitosa
- **DADO** un usuario autenticado y un espacio activo libre el `2030-05-10` de 08:00 a 10:00
- **CUANDO** solicita ese espacio en esa franja
- **ENTONCES** recibe `201` con la reserva en estado `PENDIENTE` y su `userId`

#### Escenario RES-01-E2: Datos faltantes
- **CUANDO** envía una solicitud sin `purpose`
- **ENTONCES** recibe `400` con código `VALIDATION_ERROR`

#### Escenario RES-01-E3: Espacio inexistente
- **CUANDO** solicita un `spaceId` que no existe
- **ENTONCES** recibe `404`

#### Escenario RES-01-E4: Capacidad excedida
- **DADO** un espacio con capacidad 30
- **CUANDO** solicita con `attendees = 31`
- **ENTONCES** recibe `422` con código `BUSINESS_RULE`

### Requisito RES-02: Reglas de horario
Toda solicitud DEBE cumplir:
1. `date` con formato `YYYY-MM-DD` válido; `startTime` y `endTime` con formato `HH:MM`.
2. `endTime` posterior a `startTime` (misma fecha).
3. Franja dentro del horario de operación: **07:00 a 22:00**.
4. Inicio posterior al momento actual.
5. Duración mínima de 30 minutos.

Los errores de formato DEBEN responder `400`. Las violaciones de los puntos 2 a 5 con datos bien formados DEBEN responder `422` con código `BUSINESS_RULE` y un mensaje que indique la regla incumplida.

#### Escenario RES-02-E1: Fin anterior al inicio
- **CUANDO** solicita de 10:00 a 09:00
- **ENTONCES** recibe `422` con código `BUSINESS_RULE`

#### Escenario RES-02-E2: Fuera del horario de operación
- **CUANDO** solicita de 21:00 a 23:00
- **ENTONCES** recibe `422` con código `BUSINESS_RULE`

#### Escenario RES-02-E3: Fecha pasada
- **DADO** que el momento actual es `2030-05-10 09:00`
- **CUANDO** solicita ese día de 08:00 a 10:00
- **ENTONCES** recibe `422` con código `BUSINESS_RULE`

#### Escenario RES-02-E4: Duración insuficiente
- **CUANDO** solicita de 08:00 a 08:15
- **ENTONCES** recibe `422` con código `BUSINESS_RULE`

#### Escenario RES-02-E5: Formato inválido
- **CUANDO** envía `date = "10/05/2030"` o `startTime = "8am"`
- **ENTONCES** recibe `400` con código `VALIDATION_ERROR`

### Requisito RES-03: Consultar reservas
El sistema DEBE permitir listar reservas con filtros opcionales `status`, `spaceId` y `date`, y consultar el detalle de una reserva, respetando ROL-04. El listado DEBE incluir el nombre del espacio y del solicitante.

#### Escenario RES-03-E1: Filtro por estado
- **DADO** reservas en distintos estados
- **CUANDO** un `COORDINADOR` consulta `GET /reservations?status=PENDIENTE`
- **ENTONCES** solo recibe reservas pendientes

#### Escenario RES-03-E3: Coordinador ve todas
- **DADO** reservas de varios solicitantes
- **CUANDO** un `COORDINADOR` consulta `GET /reservations`
- **ENTONCES** recibe las reservas de todos, con `spaceName` y `userName`

#### Escenario RES-03-E2: Detalle de reserva
- **CUANDO** el propietario consulta `GET /reservations/:id`
- **ENTONCES** recibe `200` con la reserva

### Requisito RES-04: Duración consecutiva máxima
Ningún usuario DEBE poder reservar un mismo espacio durante **más de 240 minutos (4 horas) consecutivos**. El tiempo consecutivo se calcula sumando la nueva franja y todas las reservas **activas** (`PENDIENTE` o `APROBADA`) del **mismo usuario**, en el **mismo espacio** y la **misma fecha**, que formen con ella una cadena contigua (cada una termina exactamente cuando empieza la siguiente). Si la cadena resultante supera 240 minutos, la solicitud DEBE rechazarse con `422` y código `BUSINESS_RULE`. Aplica a todos los roles.

#### Escenario RES-04-E1: Exactamente cuatro horas
- **DADO** un espacio libre
- **CUANDO** un usuario solicita de 08:00 a 12:00
- **ENTONCES** recibe `201`

#### Escenario RES-04-E2: Reserva individual de más de cuatro horas
- **CUANDO** un usuario solicita de 08:00 a 12:30
- **ENTONCES** recibe `422` con código `BUSINESS_RULE` y un mensaje que menciona el límite de 4 horas

#### Escenario RES-04-E3: Reservas contiguas que suman más de cuatro horas
- **DADO** que el usuario tiene una reserva activa del espacio X de 08:00 a 11:00
- **CUANDO** solicita el espacio X de 11:00 a 13:00 (cadena de 5 h)
- **ENTONCES** recibe `422` con código `BUSINESS_RULE`

#### Escenario RES-04-E4: Reservas separadas por un hueco
- **DADO** que el usuario tiene una reserva activa del espacio X de 08:00 a 11:00
- **CUANDO** solicita el espacio X de 11:30 a 13:00
- **ENTONCES** recibe `201`

#### Escenario RES-04-E5: Reserva contigua en otro espacio
- **DADO** que el usuario tiene una reserva activa del espacio X de 08:00 a 11:00
- **CUANDO** solicita el espacio Y de 11:00 a 13:00
- **ENTONCES** recibe `201`

#### Escenario RES-04-E6: Reserva contigua cancelada o rechazada
- **DADO** que el usuario tuvo una reserva del espacio X de 08:00 a 11:00 que fue cancelada
- **CUANDO** solicita el espacio X de 11:00 a 13:00
- **ENTONCES** recibe `201`

#### Escenario RES-04-E7: Reserva contigua de otro usuario
- **DADO** que otro usuario tiene una reserva activa del espacio X de 08:00 a 11:00
- **CUANDO** el usuario solicita el espacio X de 11:00 a 13:00
- **ENTONCES** recibe `201`

#### Escenario RES-04-E8: Franja que une dos reservas
- **DADO** que el usuario tiene reservas activas del espacio X de 08:00 a 10:00 y de 12:00 a 14:00
- **CUANDO** solicita el espacio X de 10:00 a 12:00 (cadena de 6 h)
- **ENTONCES** recibe `422` con código `BUSINESS_RULE`

#### Escenario RES-04-E9: Aplica a todos los roles
- **CUANDO** un `ADMIN` solicita de 08:00 a 13:00
- **ENTONCES** recibe `422` con código `BUSINESS_RULE`

## Restricciones

- Una reserva no puede cruzar la medianoche.
- No hay reservas recurrentes.
