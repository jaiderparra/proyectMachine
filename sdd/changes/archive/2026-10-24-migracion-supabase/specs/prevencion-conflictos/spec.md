# Delta: Prevención de reservas simultáneas

## Requisitos MODIFICADOS

### Requisito CON-04: Atomicidad
La verificación de conflictos y el registro (o aprobación) DEBEN ejecutarse en una misma transacción de base de datos, que **bloquea la fila del espacio afectado** (`SELECT … FOR UPDATE`). Así, dos operaciones sobre el mismo espacio se ejecutan una tras otra, y las de espacios distintos no se bloquean entre sí.

#### Escenario CON-04-E1: Solicitudes concurrentes
- **DADO** un espacio libre de 08:00 a 10:00
- **CUANDO** dos usuarios envían simultáneamente solicitudes solapadas para esa franja
- **ENTONCES** exactamente una recibe `201` y la otra `409`
