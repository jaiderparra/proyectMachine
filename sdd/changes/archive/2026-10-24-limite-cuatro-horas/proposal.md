# Propuesta de cambio: límite de cuatro horas consecutivas

| Campo | Valor |
|---|---|
| ID | `limite-cuatro-horas` |
| Solicitado por | Institución (nueva regla de negocio) |
| Fecha | 2026-10-24 |
| Estado | Aprobado para implementación |

## Por qué

La institución introduce la regla: **"Ningún usuario podrá reservar un espacio académico durante más de cuatro horas consecutivas."** Busca repartir de forma equitativa el uso de los espacios.

## Interpretación de la regla (decisiones del estudiante)

La frase admite varias lecturas; se resuelven así:

| Pregunta | Decisión | Justificación |
|---|---|---|
| ¿Solo aplica a una reserva individual? | **No.** Aplica también a reservas **contiguas** del mismo usuario. | Si solo se limitara cada reserva, bastaría con pedir 08–12 y 12–14 para evadir la regla. La palabra "consecutivas" apunta a tiempo continuo. |
| ¿Qué es "contigua"? | Una reserva que termina exactamente cuando empieza la otra (sin hueco), mismo espacio, misma fecha. | Coherente con CON-01 (intervalos `[inicio, fin)`). Un hueco, aunque sea de 15 min, rompe la continuidad. |
| ¿Qué reservas cuentan? | Solo las **activas** (`PENDIENTE`, `APROBADA`) del **mismo usuario**. | Igual criterio que CON-02. Canceladas y rechazadas no ocupan tiempo. Las de otros usuarios no son "del usuario". |
| ¿Por espacio o global? | **Por espacio.** | La regla habla de "reservar **un** espacio". Pasar de un laboratorio a otro no es usar el mismo espacio de forma consecutiva. |
| ¿Exactamente 4 h está permitido? | **Sí.** El límite es "más de" cuatro horas: 240 min es válido, 241 no. | Lectura literal. |
| ¿Qué pasa con solicitudes pendientes creadas antes de la regla? | Se valida **también al aprobar**: no se puede aprobar si deja al usuario con más de 4 h consecutivas. | La regla debe cumplirse en toda reserva aprobada, sin importar cuándo se creó. |
| ¿Código de error? | `422 BUSINESS_RULE`. | Es una regla de negocio con datos bien formados (project.md). |
| ¿Aplica a todos los roles? | **Sí**, incluidos `ADMIN` y `COORDINADOR`. | La regla dice "ningún usuario". |

## Análisis de impacto

### Especificaciones

| Especificación | Tipo de cambio | Detalle |
|---|---|---|
| `solicitudes-reserva` | **AGREGADO** RES-04 | Nueva regla de duración consecutiva máxima. |
| `aprobacion` | **MODIFICADO** APR-01 | La aprobación también verifica RES-04. |
| `interfaz-web` | **MODIFICADO** UI-03 | La pantalla de solicitud informa el límite. |
| `prevencion-conflictos`, `disponibilidad`, `cancelacion-historial`, `usuarios`, `roles-permisos`, `gestion-espacios` | Sin cambio | La regla no altera la definición de conflicto ni los permisos. |

### Plan de ingeniería (`PLAN_INGENIERIA.md`)

- **Arquitectura, stack y persistencia:** sin impacto. La regla es lógica de dominio y encaja en la capa de servicios/reglas ya prevista; no requiere cambios de esquema (se calcula con las reservas existentes).
- **Alcance (1.4):** se amplía con una regla de negocio; se registra en un anexo del plan (no se reescribe el plan original para conservar la trazabilidad).
- **Riesgos (5.2):** se confirma el riesgo **R6** (cambios tardíos). Mitigación aplicada: propuesta + delta de especificación antes del código y suite de regresión completa.
- **Configuración:** nueva constante `maxConsecutiveMinutes = 240` junto al resto de reglas de horario (mismo criterio que H4).

### Código

| Componente | Cambio |
|---|---|
| `reservations.rules.js` | Nueva función pura `consecutiveBlockMinutes` (cadena de reservas contiguas). |
| `reservations.repository.js` | Consulta de reservas activas del usuario en el espacio y fecha. |
| `reservations.service.js` | Validación en `create` y en `approve`. |
| `config.js` | `schedule.maxConsecutiveMinutes`. |
| Frontend `espacios/page.js` | Texto informativo del límite. |

### Pruebas

- **Nuevas:** `max-consecutive.test.js` (API) y casos unitarios de la función de cadena.
- **Regresión:** toda la suite existente debe seguir pasando sin modificar sus expectativas. Se revisó que ninguna prueba previa cree reservas de más de 4 h por la API (las franjas largas solo aparecen en pruebas unitarias de `scheduleViolation`, que no cambia).

### Datos existentes

Reservas ya aprobadas que superen 4 h no se modifican (no hay retroactividad); solo se impide aprobar pendientes que la incumplan.

## Fuera de alcance

- Límites semanales o por número de reservas.
- Excepciones por rol o por tipo de espacio (si la institución las pide, será otro cambio).
