# Informe final
## Sistema de Gestión de Reservas de Espacios Académicos — desarrollo con SDD

| Campo | Valor |
|---|---|
| Autor | Jaider Parra |
| Fecha de cierre | 2026-10-24 |
| Repositorio | https://github.com/jaiderparra/proyectMachine |
| Herramienta SDD | Claude (agente de IA) con estructura tipo OpenSpec en `sdd/` |
| Stack | Node.js 22 + Express 5 + **Supabase (PostgreSQL 17)** · Next.js 15 + React 19 |

---

## 1. Resumen

Se construyó un sistema web funcional que centraliza la reserva de laboratorios, auditorios y salas de cómputo. El proceso siguió la secuencia exigida: **plan de ingeniería → especificaciones → revisión → implementación incremental → gestión de un cambio → verificación**, y el historial de Git permite comprobarla.

**Resultados principales:**

- 9 capacidades especificadas (las 8 mínimas + interfaz web), **27 requisitos** y **98 escenarios** de aceptación.
- **118 pruebas automatizadas, 118 aprobadas, 0 fallidas.**
- **93 de 98 escenarios** verificados por pruebas automatizadas (el 100 % de los del backend). Los 5 restantes son de interfaz y su propia especificación define verificación por compilación y revisión manual.
- La regla de cambio (máximo 4 horas consecutivas) se incorporó **especificando primero** y sin romper ninguna de las 101 pruebas previas.
- La persistencia se migró de SQLite a **Supabase (PostgreSQL 17)** como un segundo cambio gestionado. Las 118 pruebas siguieron pasando sin cambiar ninguna expectativa, y una prueba de humo contra Supabase real confirmó el flujo completo y la prevención de reservas simultáneas con concurrencia real.

## 2. Evidencia de la secuencia del proceso (historial de Git)

| # | Commit | Fase | Contenido |
|---|---|---|---|
| 1 | `116d33d` | Etapa 1 | `PLAN_INGENIERIA.md` (commit independiente, sin otros archivos) |
| 2 | `ee4aa3b` | Fase 1 | Especificaciones v1 de las 8 capacidades |
| 3 | `95e396e` | Fase 2 | Revisión v1→v2 (16 hallazgos), spec de interfaz, tareas |
| 4 | `568a2c7` | Fase 3 | Backend: base, usuarios, autenticación, roles |
| 5 | `c665659` | Fase 3 | Backend: espacios |
| 6 | `559fcfe` | Fase 3 | Backend: solicitudes, disponibilidad, conflictos |
| 7 | `5bdcc3d` | Fase 3 | Backend: aprobación, cancelación, historial |
| 8 | `1f37849` | Fase 3 | Frontend Next.js |
| 9 | `5c04793` | Fase 3 | Archivo del cambio de implementación inicial |
| 10 | `d3332b5` | Fase 4 | **Solo especificación** del cambio de 4 horas (propuesta, impacto, deltas) |
| 11 | `73909c8` | Fase 4 | Implementación y pruebas del cambio |
| 12 | `2a02cf0` | Fase 4 | Fusión de deltas en `sdd/specs/` y archivo del cambio |
| 13 | `2534c6d` | Cambio 2 | **Solo especificación** de la migración a Supabase (propuesta, delta CON-04, anexo del plan) |
| 14 | `0fabc60` | Cambio 2 | Implementación sobre PostgreSQL/Supabase y pruebas |
| 15 | (cierre) | Fase 5 | Fusión del delta, archivo, README, trazabilidad, informe, documento Word |

Se cumple: el plan antecede a las especificaciones (1→2), las especificaciones revisadas anteceden al código (3→4) y cada cambio se especificó antes de implementarse (10→11 y 13→14).

## 3. Resultados de las pruebas

Comando: `cd backend && npm test` (runner nativo `node:test` + supertest, PGlite —PostgreSQL en memoria— y reloj fijo inyectado).

| Archivo | Capacidad verificada |
|---|---|
| `auth.test.js` | USR-01, USR-02, USR-04 |
| `users.test.js` | USR-03 |
| `permissions.test.js` | ROL-01, ROL-02 |
| `spaces.test.js` | ESP-01…ESP-04, ROL-03 |
| `rules.unit.test.js` | CON-01, RES-02, RES-04 (unitarias) |
| `reservations.test.js` | RES-01…RES-03, ROL-04, HIS-01, ESP-04-E2 |
| `availability.test.js` | DIS-01, DIS-02 |
| `conflicts.test.js` | CON-02, CON-04 |
| `approval.test.js` | APR-01, APR-02, CON-03, ROL-03-E1, ROL-02-E4 |
| `cancellation.test.js` | CAN-01 |
| `history.test.js` | HIS-01…HIS-03 |
| `max-consecutive.test.js` | RES-04, APR-01-E6 (cambio) |

```
# tests 118
# suites 28
# pass 118
# fail 0
```

**Prueba de humo contra Supabase real** (`npm run smoke`, esquema temporal `reservas_smoke`):

```
  ✔ RES-01 crear reserva → 201 (2031-03-10 08:00)
  ✔ CON-02 franja ocupada → 409 SCHEDULE_CONFLICT
  ✔ RES-04 cadena de 4 h 30 → 422
  ✔ APR-01 aprobar → 200 APROBADA
  ✔ DIS-01 ocupación → 1 bloque
  ✔ CON-04 concurrencia real → 201, 409, 409, 409, 409, 409
  ✔ HIS-02 historial → PENDIENTE → APROBADA
  ✔ HIS-01 trigger plpgsql impide modificar el historial
  ✔ RLS activo en users, spaces, reservations, reservation_history
```

El *advisor* de seguridad de Supabase no reporta advertencias. Solo queda un aviso informativo, intencional: RLS activo sin políticas, que bloquea la Data API.

**Frontend:** `npm run build` compila las 9 rutas sin errores. Con ambos servidores en ejecución se comprobó que todas las rutas responden `200` y que la API acepta CORS desde `http://localhost:3000`. `npm audit` sin vulnerabilidades (se forzó `postcss` a una versión parcheada).

## 4. Verificación de requisitos y correspondencia especificación ↔ código

La matriz completa está en [`sdd/traceability.md`](sdd/traceability.md). Mecanismos usados:

1. **IDs trazables:** cada prueba empieza con el ID del escenario (`CON-02-E1 …`); la matriz se generó automáticamente cruzando los escenarios de `sdd/specs/` con los nombres de las pruebas.
2. **Comentarios en el código** con el ID del requisito que implementa cada función (`// CON-01`, `// RES-04`, …).
3. **Revisión de arquitectura:** el SQL vive solo en los repositorios, las reglas en servicios y en `reservations.rules.js` (funciones puras) y las rutas solo traducen HTTP. El frontend no decide reglas: muestra los mensajes de la API.
4. **Búsqueda de funcionalidad no especificada:** se revisó que todo endpoint del contrato (`sdd/project.md`) tuviera requisito, y que no existieran endpoints adicionales.

## 5. Gestión del cambio: "máximo cuatro horas consecutivas"

| Paso pedido | Cómo se hizo |
|---|---|
| 1. Analizar impacto | `proposal.md`: impacto en especificaciones, plan, código, pruebas y datos existentes. |
| 2. ¿Afecta el plan? | Arquitectura, stack y persistencia sin cambios; se amplía el alcance con una regla y se materializa el riesgo R6. Registrado en el **Anexo A** del plan sin reescribir el original. |
| 3. Actualizar especificaciones | Deltas: **AGREGADO** RES-04, **MODIFICADOS** APR-01 y UI-03 (commit `d3332b5`, sin código). |
| 4. Nuevos escenarios | RES-04-E1…E9, APR-01-E6, UI-03-E2. |
| 5. Implementar | Función pura `consecutiveBlockMinutes` + validación al crear y al aprobar + aviso en la interfaz. |
| 6. Pruebas | 17 nuevas (4 unitarias, 13 de integración). |
| 7. No regresión | Las 101 pruebas previas pasan **sin modificar ninguna** (el diff de `backend/test` solo agrega líneas). |

**Interpretación decidida:** la regla se aplica a la **cadena de reservas activas contiguas** del mismo usuario en el mismo espacio y fecha; si no, bastaría con partir una reserva de 6 h en dos de 3 h. Exactamente 4 h está permitido ("más de cuatro"). Las reservas canceladas o rechazadas y las de otros usuarios no cuentan. También se valida al aprobar, para solicitudes pendientes anteriores a la regla.

## 6. Decisiones técnicas que cambiaron durante el desarrollo

| # | En el plan / spec v1 | En la implementación final | Motivo |
|---|---|---|---|
| 1 | No había especificación de la interfaz web. | Nueva capacidad `interfaz-web` (UI-01…UI-06). | Hallazgo H15: el plan incluía el módulo frontend y sin spec no podía implementarse según las reglas del proceso. |
| 2 | JWT "sin estado" (decisión D3). | El token se valida y además **se relee el usuario en cada petición**. | H10: con JWT puro, un usuario desactivado seguía operando hasta 8 h y los cambios de rol no se aplicaban. Se cambia una consulta por petición por seguridad. |
| 3 | "Reserva existente" bloquea la franja (ambiguo). | Bloquean las reservas **activas**, incluidas las pendientes ("primero en solicitar"). | H2: evita la duplicidad de solicitudes, que era el problema P1. |
| 4 | Horario 06:00–22:00 en DIS-01, 07:00–22:00 en RES-02. | Una sola constante 07:00–22:00 en `config.js`. | H4: contradicción entre specs. |
| 5 | CAN-01: solo propietario o ADMIN cancelan. | También el COORDINADOR. | H5: contradicción con la matriz ROL-03; se mantuvo la matriz. |
| 6 | Historial "solo inserción" por convención. | Además, **triggers** en la base de datos (hoy `plpgsql` en PostgreSQL) que impiden UPDATE y DELETE. | Defensa en profundidad para HIS-01; también se puede probar. |
| 7 | Reglas de negocio con `400`. | `422 BUSINESS_RULE` para reglas, `400` solo para formato. | H6: coherencia con el contrato de errores. |
| 8 | — | Reloj inyectable en `createApp({ db, clock })`. | Las reglas dependen de la hora actual. Sin reloj fijo, las pruebas serían frágiles (riesgo R5). |
| 9 | Next.js con dependencias por defecto. | `overrides` de `postcss` a una versión parcheada. | `npm audit` reportaba una vulnerabilidad alta en la dependencia de compilación de Next 15. |
| 10 | Límite de duración: no existía. | RES-04 (4 h consecutivas, por cadena contigua). | Cambio solicitado por la institución (Fase 4). |
| 11 | **D1: SQLite** en archivo (se descartó PostgreSQL por tener que operar un servidor). | **Supabase (PostgreSQL 17)**, esquema `reservas`, RLS, driver `pg` por *session pooler*; acceso a datos async y Express 5. | Se pidió una BD gestionada. Supabase elimina el costo operativo que motivó descartar PostgreSQL. Se gestionó como cambio `migracion-supabase`. |
| 12 | CON-04 con `BEGIN IMMEDIATE` (bloqueo global de escritura). | `SELECT … FOR UPDATE` sobre la fila del espacio. | En PostgreSQL el bloqueo por fila serializa solo las operaciones del mismo espacio, con mejor concurrencia. |
| 13 | Pruebas con SQLite en memoria. | Pruebas con **PGlite** + prueba de humo contra Supabase. | Probar con el mismo motor y dialecto SQL de producción, sin red ni datos reales (riesgo R10). |

## 7. Dificultades encontradas

1. **Ambigüedad del lenguaje natural.** La v1 de las especificaciones parecía completa, pero la revisión encontró 16 problemas, por ejemplo: ¿chocan dos franjas contiguas?, ¿una solicitud pendiente bloquea la franja?, ¿se puede cancelar una reserva que ya empezó? Cada uno habría producido código "correcto" pero distinto de lo esperado.
2. **Reglas dependientes del tiempo.** "Inicio futuro", "no aprobar vencidas" y "no cancelar iniciadas" obligaron a diseñar desde el principio un reloj inyectable.
3. **Concurrencia.** Para garantizar CON-04 se usó primero `BEGIN IMMEDIATE` en SQLite y, tras la migración, `SELECT … FOR UPDATE` sobre la fila del espacio en PostgreSQL. Se verificó con 6 solicitudes paralelas reales contra Supabase: exactamente una fue aceptada.
4. **Interpretar "cuatro horas consecutivas".** La regla, escrita en una línea, tenía al menos seis lecturas posibles. Se resolvieron explícitamente en la propuesta antes de programar.
5. **Entorno Windows.** Se evitaron dependencias nativas (`bcrypt`, `better-sqlite3`) usando `bcryptjs` y, después, `pg` y PGlite, que son JavaScript/WASM puros (riesgo R7). Los saltos de línea CRLF/LF se normalizaron con `.gitattributes`.
6. **Migración a Supabase al final del desarrollo.** Pasar de un driver síncrono a uno asíncrono obligó a convertir repositorios, servicios y rutas a `async/await` y a subir a Express 5. La conexión directa de Supabase (solo IPv6) no resolvía desde la red local; se usó el *session pooler*. Gracias a la capa de repositorios y a las pruebas por escenario, el cambio no alteró el comportamiento (118/118).
7. **Verificación de la interfaz.** No hubo navegador automatizado disponible en la sesión. La interfaz se verificó con compilación, respuesta HTTP de cada ruta, CORS y revisión del código. **Queda pendiente** que el estudiante recorra manualmente los flujos UI-01…UI-06 en el navegador antes de la sustentación.

## 8. Limitaciones conocidas y trabajo futuro

- El token se guarda en `localStorage`, que es vulnerable si existiera una falla XSS. A futuro convendría usar una cookie `httpOnly`.
- Sin notificaciones por correo ni reservas recurrentes (fuera de alcance del plan).
- La API se conecta con el rol `postgres` de Supabase. En producción convendría crear un rol dedicado con permisos mínimos sobre el esquema `reservas`.
- No hay pruebas automatizadas end-to-end del frontend (p. ej. Playwright).

## 9. Respuestas a las preguntas de sustentación

**1. ¿Qué decisiones de ingeniería tomé antes de programar?**
Las de `PLAN_INGENIERIA.md`: monolito modular en capas con API REST separada del frontend, base relacional transaccional (inicialmente SQLite; luego Supabase/PostgreSQL), JWT, pruebas con `node:test` + supertest, prevención de conflictos en el servicio dentro de una transacción, prioridades MoSCoW, orden de desarrollo por dependencias, ocho riesgos con su mitigación y criterios de terminado por etapa. Cinco de esas decisiones se compararon con alternativas descartadas (sección 3.5 del plan).

**2. ¿Qué problemas identifiqué al transformar la propuesta en especificaciones?**
Ambigüedades, contradicciones y vacíos: 16 hallazgos documentados en `sdd/reviews/2026-10-24-revision-especificaciones.md`. Los más importantes fueron la definición de solapamiento, qué estados bloquean una franja, el horario contradictorio, permisos de cancelación contradictorios, usuarios desactivados con token válido y la ausencia de spec de interfaz.

**3. ¿Cómo evité que la IA implementara funcionalidades incorrectas?**
- Cada tarea referenciaba IDs de requisito y solo se implementaron tareas con spec revisada.
- Las pruebas se derivaron de los escenarios, con el ID en el nombre, de modo que una desviación hace fallar una prueba concreta.
- Pruebas negativas obligatorias (401/403/409/422), no solo el camino feliz.
- Revisión de cada incremento antes del commit: correspondencia con la tarea, respeto de capas, sin endpoints fuera del contrato.
- En el cambio de 4 horas, primero se fijó la interpretación por escrito. Así la IA no eligió una lectura por su cuenta.

**4. ¿Qué diferencias hubo entre la planificación inicial y la implementación final?**
Ver la sección 6. En resumen: se agregó la spec de interfaz, el JWT dejó de ser puramente sin estado, se definió que las pendientes bloquean la franja, el coordinador puede cancelar, el historial se blindó con triggers, se introdujo el reloj inyectable y se incorporó la regla de 4 horas. La arquitectura en capas no cambió. Del stack cambió la persistencia: de SQLite a Supabase (PostgreSQL). Gracias a la capa de repositorios, la migración no tocó las reglas de negocio ni los escenarios.

**5. Ventajas y limitaciones de SDD frente a instrucciones directas a una IA**

| Ventajas | Limitaciones |
|---|---|
| Las ambigüedades aparecen **antes** de programar, cuando corregirlas es barato (16 hallazgos sin tocar código). | Requiere más tiempo inicial: plan, specs y revisión antes de ver algo funcionando. |
| La IA recibe un objetivo verificable (escenarios), no una idea vaga. Hay menos "alucinación" de funcionalidades. | Las especificaciones también pueden estar mal. SDD no reemplaza la revisión humana: la v1 tenía errores que la IA redactó y el estudiante tuvo que detectar. |
| Trazabilidad completa: requisito → código → prueba → commit. | Mantener specs, deltas y archivo sincronizados es disciplina adicional; sin ella la documentación se desactualiza. |
| Los cambios se gestionan con impacto analizado. La regla de 4 h no rompió nada. | Para cambios triviales el proceso puede ser excesivo. |
| Las pruebas derivadas de escenarios sirven como red de regresión. | La interfaz es más difícil de especificar de forma verificable que una API. |

## 10. Conclusiones

1. El valor principal de SDD estuvo en la **fase de revisión**: convirtió supuestos implícitos en decisiones explícitas y justificadas antes de programar.
2. La IA fue muy eficaz generando especificaciones, código y pruebas **cuando tenía escenarios concretos**. Las decisiones de negocio (qué bloquea una franja, cómo interpretar "consecutivas") siguieron siendo responsabilidad del estudiante.
3. Tener las pruebas atadas a los escenarios hizo que los cambios fueran seguros: la regla de 4 horas agregó 17 pruebas sin tocar las 101 previas, y la migración a Supabase mantuvo las 118 en verde sin cambiar una sola expectativa.
4. La gestión de cambios con propuesta + delta + archivo deja un registro auditable de **por qué** el sistema es como es, no solo de **qué** hace.
