# Especificación: Validación de disponibilidad

## Propósito

Permitir conocer la ocupación de un espacio antes de solicitarlo (problema P3 del plan).

## Requisitos

### Requisito DIS-01: Ocupación diaria de un espacio
El sistema DEBE devolver, para un espacio y una fecha, el horario de operación (06:00 a 22:00) y la lista de bloques ocupados por reservas existentes, ordenados por hora de inicio. Cada bloque DEBE incluir `startTime`, `endTime` y `status`.

#### Escenario DIS-01-E1: Día sin reservas
- **DADO** un espacio sin reservas el `2030-05-10`
- **CUANDO** se consulta su disponibilidad para esa fecha
- **ENTONCES** se recibe `200` con la lista de bloques vacía

#### Escenario DIS-01-E2: Día con reservas
- **DADO** reservas de 10:00–11:00 y 08:00–09:00
- **CUANDO** se consulta la disponibilidad
- **ENTONCES** se reciben los bloques ordenados: 08:00–09:00, 10:00–11:00

#### Escenario DIS-01-E3: Fecha inválida
- **CUANDO** se consulta con `date = "2030-13-40"`
- **ENTONCES** se recibe `400`

#### Escenario DIS-01-E4: Espacio inexistente
- **CUANDO** se consulta la disponibilidad de un espacio que no existe
- **ENTONCES** se recibe `404`

### Requisito DIS-02: Verificación de una franja
El sistema DEBE permitir verificar si una franja concreta está disponible, devolviendo `available` (booleano) y, si no lo está, la lista de reservas en conflicto. Aplica las reglas de formato de RES-02.

#### Escenario DIS-02-E1: Franja libre
- **DADO** un espacio sin reservas de 08:00 a 10:00
- **CUANDO** se verifica la franja 08:00–10:00
- **ENTONCES** se recibe `available = true`

#### Escenario DIS-02-E2: Franja ocupada
- **DADO** una reserva de 09:00 a 11:00
- **CUANDO** se verifica la franja 08:00–10:00
- **ENTONCES** se recibe `available = false` y la reserva en `conflicts`
