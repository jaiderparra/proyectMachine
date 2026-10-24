# Delta: Creación de solicitudes de reserva

## Requisitos AGREGADOS

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
