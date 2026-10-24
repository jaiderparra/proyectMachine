# Revisión de especificaciones — v1 → v2

| Campo | Valor |
|---|---|
| Fecha | 2026-10-24 |
| Revisor | Jaider Parra (con asistencia de Claude) |
| Alcance | `sdd/specs/*` (8 capacidades) frente a `PLAN_INGENIERIA.md` |
| Resultado | **Aprobadas con correcciones** — se habilita la implementación |

## 1. Método

1. Lectura cruzada de cada requisito contra el plan (sección 1.4 alcance, 1.5 limitaciones, 2.2 prioridades, 3.3 persistencia, 5.2 riesgos).
2. Búsqueda de **ambigüedades** (términos sin definir, escenarios no verificables).
3. Búsqueda de **contradicciones** entre especificaciones y con `project.md`.
4. Búsqueda de **vacíos** (situaciones posibles sin comportamiento definido).
5. Verificación de que cada escenario tenga un resultado observable (código HTTP + código de error o estado).

## 2. Hallazgos y resoluciones

| ID | Tipo | Especificación | Hallazgo | Resolución (decisión del estudiante) |
|---|---|---|---|---|
| H1 | Ambigüedad | CON-01 | "Coinciden en algún momento" no aclara si franjas contiguas (08–10 y 10–12) chocan. | Intervalos semiabiertos `[inicio, fin)`; contiguas **no** se solapan. Nuevo escenario CON-01-E3 y CON-02-E5. |
| H2 | Ambigüedad | CON-02 | "Reserva existente" no indica qué estados bloquean. | Bloquean solo las **activas** (`PENDIENTE`, `APROBADA`). Criterio "primero en solicitar" para evitar duplicidad (P1). Nuevo CON-02-E4. |
| H3 | Ambigüedad | DIS-01 | No se define qué reservas aparecen ni qué datos se exponen. | Solo reservas activas; sin propósito ni solicitante (privacidad). Nuevo DIS-01-E5. |
| H4 | Contradicción | DIS-01 vs RES-02 | Horario de operación 06:00–22:00 en DIS-01 y 07:00–22:00 en RES-02. | Se unifica en **07:00–22:00** (valor del plan); se implementa como constante única de configuración. |
| H5 | Contradicción | ROL-03 vs CAN-01 | La matriz permite al `COORDINADOR` cancelar reservas ajenas, pero CAN-01 solo al propietario o `ADMIN`. | Se mantiene la matriz: el coordinador puede cancelar (p. ej. mantenimiento o evento institucional). CAN-01 corregido, nuevo CAN-01-E5. |
| H6 | Inconsistencia | RES-02 vs project.md | RES-02 pedía `400` para reglas de negocio; `project.md` define `422 BUSINESS_RULE`. Escenarios decían "es rechazada" (no verificable). | Reglas de negocio → `422 BUSINESS_RULE`; formato → `400`. Escenarios con código explícito; RES-02-E3 con reloj fijo. |
| H7 | Vacío | ESP-04 | No se define qué pasa al inactivar un espacio con reservas futuras. | Se prohíbe (`422`) hasta cancelar/rechazar esas reservas. Nuevo ESP-04-E3. |
| H8 | Vacío | CAN-01 | No se define si una reserva ya iniciada o pasada puede cancelarse. | No se permite (`422`). Nuevo CAN-01-E6. |
| H9 | Vacío | APR-01 | Solicitud pendiente cuya hora ya pasó: ¿se puede aprobar? | No se puede aprobar (`422`); sí rechazar. Nuevo APR-01-E4. |
| H10 | Vacío / Riesgo R4 | ROL-02 | Un usuario desactivado conserva un token JWT válido hasta 8 h; un cambio de rol no se refleja. | El middleware consulta el usuario en cada petición: inactivo → `401`; el rol se toma de la BD. Nuevos ROL-02-E3 y E4. |
| H11 | Vacío | USR-03 | El único `ADMIN` podría desactivarse o quitarse el rol y bloquear el sistema. | Prohibido (`422`). Nuevo USR-03-E5. |
| H12 | Vacío | ESP-02 | ¿Un solicitante ve espacios inactivos? | Por defecto solo activos; `includeInactive` solo para `ADMIN`/`COORDINADOR`. Nuevo ESP-02-E4. |
| H13 | Verificabilidad | CON-03-E1 | "Por datos inconsistentes" no es reproducible vía API (CON-02 lo impide). | Precondición creada directamente en BD en la prueba; el requisito se justifica como defensa en profundidad. |
| H14 | Verificabilidad | CON-04 | Requisito sin escenario. | Nuevo CON-04-E1 (solicitudes concurrentes: exactamente una `201`). |
| H15 | Correspondencia con plan | — | El plan (2.3) incluye el módulo frontend, pero no había especificación de la interfaz. | Nueva capacidad `interfaz-web` (UI-01…UI-06), verificada con `next build` y pruebas manuales. |
| H16 | Vacío | CAN-01 / HIS-01 | ¿Dónde se guarda el motivo de cancelación? | En el `comment` de la entrada de historial; `decisionReason` queda solo para rechazos. |

## 3. Correspondencia plan ↔ especificaciones

| Elemento del plan | Especificación |
|---|---|
| N1 Inventario de espacios | ESP-01…ESP-04 |
| N2 Canal único de solicitud | RES-01…RES-03 |
| N3 Disponibilidad y no simultaneidad | DIS-01, DIS-02, CON-01…CON-04 |
| N4 Aprobación/rechazo con responsable | APR-01, APR-02 |
| N5 Cancelación e historial | CAN-01, HIS-01…HIS-03 |
| N6 Usuarios, roles y permisos | USR-01…USR-04, ROL-01…ROL-04 |
| Limitación: reservas en el mismo día | RES-02 (punto 2) y restricciones de RES |
| Limitación: sin borrado (trazabilidad) | ESP-04, restricciones de USR, HIS-01 |
| Persistencia transaccional (3.3) | CON-04 |
| Riesgo R1 (concurrencia) | CON-04-E1 |
| Riesgo R4 (permisos) | ROL-02, ROL-03, ROL-04 + escenarios 403 |
| Riesgo R5 (fechas) | RES-02-E5, DIS-01-E3 |
| Módulo frontend (2.3) | UI-01…UI-06 |

Sin elementos del alcance del plan sin especificación, y sin especificaciones fuera del alcance del plan.

## 4. Verificación de consistencia final (v2)

- [x] Un único horario de operación (07:00–22:00).
- [x] Códigos HTTP coherentes con `project.md` en todos los escenarios.
- [x] Matriz de permisos (ROL-03) coherente con APR, CAN, HIS, ESP y USR.
- [x] Estados de reserva y transiciones coherentes con el diagrama de `project.md`.
- [x] Todos los escenarios tienen resultado observable.
- [x] Tareas de implementación definidas: `sdd/changes/implementacion-inicial/tasks.md`.

**Decisión:** especificaciones v2 aprobadas para implementación.
