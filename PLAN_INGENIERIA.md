# Plan de Ingeniería de Software
## Sistema de Gestión de Reservas de Espacios Académicos

| Campo | Valor |
|---|---|
| Autor | Jaider Parra |
| Modalidad | Individual |
| Enfoque | Spec-Driven Development (SDD) asistido por IA |
| Stack | Node.js (backend) · Next.js (frontend) |
| Versión del documento | 1.0 (previa a especificaciones e implementación) |

> Este documento se elabora **antes** de escribir especificaciones formales o código. Se registra en un commit independiente para que el historial de Git demuestre que la planificación precede a todo lo demás.

---

## 1. Análisis del problema

### 1.1 Identificación de la problemática

La institución gestiona la reserva de laboratorios, auditorios y salas de cómputo mediante correos electrónicos y hojas de cálculo. Este proceso manual presenta los siguientes problemas:

| # | Problema observado | Consecuencia |
|---|---|---|
| P1 | Las solicitudes llegan por múltiples correos, sin formato único. | Duplicidad de solicitudes para el mismo espacio y franja. |
| P2 | La hoja de cálculo no valida cruces de horario. | Dos grupos asignados al mismo espacio a la misma hora (conflictos). |
| P3 | No existe un lugar único para consultar la ocupación. | Los usuarios no saben qué espacios están libres antes de solicitar. |
| P4 | Las aprobaciones dependen de respuestas por correo. | Pérdida de trazabilidad: no se sabe quién aprobó, cuándo ni por qué. |
| P5 | Las cancelaciones no se registran de forma sistemática. | Espacios bloqueados que en realidad están libres; no hay historial. |
| P6 | Cualquiera con acceso a la hoja puede modificarla. | No hay control de roles ni permisos. |

### 1.2 Necesidades de la institución

- **N1.** Centralizar el inventario de espacios académicos con sus características (tipo, capacidad, ubicación, recursos, estado).
- **N2.** Permitir que los usuarios autorizados soliciten reservas a través de un único canal.
- **N3.** Validar automáticamente la disponibilidad y **impedir reservas simultáneas** sobre el mismo espacio.
- **N4.** Ofrecer un flujo formal de **aprobación o rechazo** con responsable y motivo.
- **N5.** Permitir **cancelar** reservas y conservar un **historial** auditable de todos los cambios de estado.
- **N6.** Controlar el acceso mediante **usuarios, roles y permisos**.

### 1.3 Actores involucrados

| Actor | Descripción | Interés principal |
|---|---|---|
| **Solicitante** (docente, estudiante, personal) | Usuario que necesita un espacio para una actividad académica. | Consultar disponibilidad y obtener una reserva confirmada rápidamente. |
| **Coordinador de espacios** | Personal encargado de revisar solicitudes. | Aprobar o rechazar solicitudes con criterio y sin conflictos. |
| **Administrador** | Responsable del sistema. | Gestionar espacios, usuarios y roles; supervisar todas las reservas. |
| **Institución** (stakeholder) | Dirección académica / planta física. | Uso eficiente de los espacios y trazabilidad de decisiones. |

### 1.4 Alcance

**Incluido en el sistema:**

1. Gestión de espacios académicos (crear, consultar, editar, activar/inactivar).
2. Registro de usuarios, autenticación y administración de cuentas.
3. Roles (`ADMIN`, `COORDINADOR`, `SOLICITANTE`) y permisos por operación.
4. Creación de solicitudes de reserva.
5. Consulta y validación de disponibilidad.
6. Prevención de reservas simultáneas (solapamientos).
7. Aprobación y rechazo de solicitudes.
8. Cancelación de reservas e historial de cambios de estado.
9. Interfaz web para los tres roles.
10. Pruebas automatizadas del backend.

### 1.5 Limitaciones (fuera de alcance)

- No se integra con el directorio institucional (LDAP/SSO); la autenticación es propia (correo + contraseña).
- No se envían notificaciones por correo electrónico (se deja como trabajo futuro).
- No se manejan reservas recurrentes (p. ej., "todos los lunes del semestre").
- Una reserva ocurre dentro de un mismo día; no hay reservas que crucen la medianoche.
- La zona horaria es única: la hora local de la institución.
- El despliegue productivo (servidor, dominio, HTTPS) queda fuera del alcance académico; se entrega ejecutable localmente.

---

## 2. Propuesta de solución

### 2.1 Descripción general

Se construirá una **aplicación web cliente-servidor** compuesta por:

- Una **API REST** en Node.js que concentra toda la lógica de negocio (validaciones, reglas de disponibilidad, permisos, historial) y la persistencia.
- Un **frontend web** en Next.js que consume la API y ofrece pantallas adaptadas a cada rol.

La regla fundamental del diseño es que **ninguna regla de negocio vive solo en el frontend**: el frontend ayuda al usuario, pero el backend es la única fuente de verdad y rechaza cualquier operación inválida aunque se invoque directamente la API.

### 2.2 Funcionalidades prioritarias (MoSCoW)

| Prioridad | Funcionalidad | Justificación |
|---|---|---|
| **Must** | Prevención de reservas simultáneas | Es el problema central (P2). |
| **Must** | Validación de disponibilidad | Necesaria para crear solicitudes válidas (P3). |
| **Must** | Creación de solicitudes de reserva | Canal único de solicitud (P1). |
| **Must** | Roles y permisos + autenticación | Sin control de acceso no hay confiabilidad (P6). |
| **Must** | Aprobación / rechazo | Formaliza la decisión (P4). |
| **Must** | Gestión de espacios | Sin inventario no hay qué reservar (N1). |
| **Should** | Cancelación e historial | Trazabilidad y liberación de espacios (P5). |
| **Should** | Administración de usuarios (cambio de rol, desactivación) | Operación diaria del administrador. |
| **Could** | Vista de disponibilidad diaria por espacio en el frontend | Mejora de experiencia de usuario. |
| **Won't (ahora)** | Notificaciones por correo, reservas recurrentes, reportes | Fuera de alcance. |

### 2.3 Organización del sistema en módulos

| Módulo | Responsabilidad | Depende de |
|---|---|---|
| `auth` | Registro público, inicio de sesión, emisión y verificación de tokens. | `users` |
| `users` | CRUD de usuarios, cambio de rol, activación/desactivación. | `auth` (middleware) |
| `roles/permisos` (middleware) | Autorizar cada operación según el rol del usuario autenticado. | `auth` |
| `spaces` | Inventario de espacios académicos. | `auth`, permisos |
| `reservations` | Solicitudes, disponibilidad, conflictos, aprobación, cancelación. | `spaces`, `users`, permisos |
| `history` (dentro de `reservations`) | Registro inmutable de transiciones de estado. | `reservations` |
| `frontend` | Interfaz web por rol. | API REST |

### 2.4 Estrategia de desarrollo progresivo

El sistema se construirá en **incrementos verticales**, donde cada incremento queda probado y funcional antes de iniciar el siguiente:

1. **Base:** estructura del proyecto, base de datos, manejo de errores.
2. **Identidad:** usuarios, autenticación, roles y permisos.
3. **Inventario:** gestión de espacios.
4. **Núcleo de reservas:** solicitudes + disponibilidad + prevención de conflictos.
5. **Flujo de decisión:** aprobación / rechazo.
6. **Ciclo de vida:** cancelación e historial.
7. **Frontend:** pantallas por rol sobre la API ya probada.
8. **Gestión de cambios:** incorporación de nuevas reglas mediante especificaciones.

---

## 3. Decisiones de arquitectura y tecnología

### 3.1 Arquitectura seleccionada

**Arquitectura cliente-servidor con backend en capas (monolito modular) y API REST.**

```
┌──────────────────────┐        HTTP/JSON (REST)        ┌─────────────────────────────────────┐
│  Frontend Next.js    │  ───────────────────────────▶  │  Backend Node.js + Express          │
│  (App Router, React) │  ◀───────────────────────────  │                                     │
│  - Pantallas por rol │        Token JWT (Bearer)      │  Rutas  →  Servicios  →  Repositorios│
└──────────────────────┘                                │    │          │              │      │
                                                        │ Middleware  Reglas de     SQLite    │
                                                        │ auth/roles  negocio       (archivo) │
                                                        └─────────────────────────────────────┘
```

**Justificación:**

- El dominio es pequeño y cohesionado: un monolito modular evita la complejidad operativa de microservicios.
- Separar **rutas (HTTP)**, **servicios (reglas de negocio)** y **repositorios (SQL)** permite probar las reglas de negocio de forma aislada y cambiar la persistencia sin tocar la lógica.
- Separar frontend y backend permite que las reglas se apliquen siempre en el servidor y que la API pueda ser consumida por otros clientes en el futuro.

### 3.2 Stack tecnológico

| Capa | Tecnología | Motivo |
|---|---|---|
| Backend runtime | **Node.js 22 LTS** | Requisito del proyecto; incluye `node:sqlite` y `node:test` nativos. |
| Framework HTTP | **Express 4** | Maduro, mínimo y ampliamente documentado. |
| Persistencia | **SQLite** mediante el módulo nativo `node:sqlite` | Base relacional transaccional sin servidor adicional (ver 3.3). |
| Autenticación | **JWT** (`jsonwebtoken`) + **bcryptjs** para hash de contraseñas | Sin estado en el servidor; bcryptjs es JS puro (sin compilación nativa en Windows). |
| Pruebas backend | **node:test** (runner nativo) + **supertest** | Sin frameworks pesados; pruebas de API reales contra base en memoria. |
| Frontend | **Next.js 15 (App Router) + React** | Requisito del proyecto; enrutamiento por archivos y buen DX. |
| Estilos | CSS plano (CSS global) | Evita dependencias innecesarias en un proyecto académico. |
| Control de versiones | Git + GitHub | Requisito; evidencia de la secuencia del proceso. |

### 3.3 Estrategia de persistencia de datos

- Base de datos **relacional SQLite** en un archivo (`backend/data/reservas.db`); en pruebas se usa `:memory:` para aislamiento total y velocidad.
- El esquema se crea mediante un script SQL idempotente al arrancar (`CREATE TABLE IF NOT EXISTS`).
- **Entidades principales:**
  - `users (id, name, email UNIQUE, password_hash, role, active, created_at)`
  - `spaces (id, name UNIQUE, type, capacity, location, resources, active, created_at)`
  - `reservations (id, space_id FK, user_id FK, date, start_time, end_time, purpose, attendees, status, decided_by FK, decision_reason, created_at, updated_at)`
  - `reservation_history (id, reservation_id FK, from_status, to_status, changed_by FK, comment, changed_at)`
- Fechas y horas se guardan como texto ISO (`YYYY-MM-DD`, `HH:MM`) en hora local institucional; la comparación lexicográfica es equivalente a la cronológica, lo que simplifica la detección de solapamientos.
- La creación y aprobación de reservas se ejecutan **dentro de una transacción** (`BEGIN IMMEDIATE`) para que la verificación de conflictos y la escritura sean atómicas.
- El historial es de **solo inserción** (nunca se actualiza ni borra).

### 3.4 Organización de componentes

```
/ (repositorio)
├── PLAN_INGENIERIA.md
├── sdd/                      ← especificaciones (sustituto de OpenSpec, gestionado con Claude)
├── backend/
│   ├── src/
│   │   ├── app.js            ← construcción de la app Express (inyectable para pruebas)
│   │   ├── server.js         ← punto de arranque
│   │   ├── config.js
│   │   ├── db/               ← conexión, esquema y datos semilla
│   │   ├── middleware/       ← autenticación, autorización, errores
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── spaces/
│   │   │   └── reservations/ ← reglas, servicio, repositorio, rutas
│   │   └── utils/
│   └── test/                 ← pruebas automatizadas
└── frontend/
    └── src/app/              ← páginas Next.js por funcionalidad
```

### 3.5 Comparación de decisiones técnicas y alternativas descartadas

| # | Decisión tomada | Alternativas descartadas | Razón de la elección |
|---|---|---|---|
| D1 | **SQLite (`node:sqlite`)** como base de datos | **PostgreSQL**: requiere instalar y operar un servidor; excesivo para el alcance académico. **MongoDB**: el dominio es relacional (usuarios–espacios–reservas) y la detección de conflictos se beneficia de consultas SQL y transacciones simples. **Archivos JSON**: sin transacciones ni control de concurrencia, riesgo directo de reservas duplicadas. | Relacional, transaccional, cero instalación, y migrable a PostgreSQL gracias a la capa de repositorios. |
| D2 | **Backend Express separado + frontend Next.js** | **Solo Next.js con API Routes / Server Actions**: mezcla la lógica de negocio con la capa de presentación y contradice el requisito de backend en Node.js independiente. **NestJS**: estructura robusta pero con una curva de aprendizaje y código ceremonial que no aporta en este tamaño. | Separación clara de responsabilidades y backend probado de forma independiente. |
| D3 | **Autenticación con JWT** | **Sesiones en servidor con cookies**: requieren almacén de sesiones y manejo de CSRF. **Autenticación externa (OAuth / SSO institucional)**: fuera de alcance, depende de infraestructura de la institución. | API sin estado, fácil de probar con supertest y de consumir desde el frontend. |
| D4 | **node:test + supertest** para pruebas | **Jest**: más pesado y con configuración adicional para ESM/CommonJS. **Pruebas manuales con Postman**: no son repetibles ni automatizables. | Runner nativo, rápido, sin configuración; pruebas de integración reales de la API. |
| D5 | **Prevención de conflictos en el servicio dentro de una transacción** | **Solo validación en el frontend**: se puede evadir llamando la API directamente. **Restricción de exclusión en la base de datos** (p. ej. `EXCLUDE` de PostgreSQL): no disponible en SQLite. | La regla se centraliza y se prueba en el backend; la transacción garantiza atomicidad. |

---

## 4. Estrategia de desarrollo

### 4.1 Metodología de trabajo

**Spec-Driven Development (SDD) iterativo e incremental**, inspirado en el flujo de OpenSpec pero ejecutado con el agente de IA (Claude) como herramienta de especificación:

1. **Planificar** (este documento).
2. **Especificar**: requisitos con identificador, restricciones y escenarios *Dado / Cuando / Entonces*.
3. **Revisar** especificaciones: consistencia, ambigüedad, correspondencia con este plan.
4. **Definir tareas** de implementación vinculadas a requisitos.
5. **Implementar** por incrementos con pruebas.
6. **Verificar** contra los escenarios.
7. **Gestionar cambios** mediante propuestas de cambio (`sdd/changes/`) antes de tocar el código.

### 4.2 Etapas de implementación

| Etapa | Contenido | Entregable verificable |
|---|---|---|
| E0 | Plan de ingeniería | `PLAN_INGENIERIA.md` (commit independiente) |
| E1 | Especificaciones de las 8 capacidades | `sdd/specs/*/spec.md` |
| E2 | Revisión de especificaciones y tareas | `sdd/reviews/`, `sdd/changes/.../tasks.md` |
| E3 | Base del backend + identidad (usuarios, auth, roles) | Pruebas de auth/usuarios en verde |
| E4 | Espacios | Pruebas de espacios en verde |
| E5 | Reservas: solicitud, disponibilidad, conflictos | Pruebas de reservas en verde |
| E6 | Aprobación, rechazo, cancelación, historial | Pruebas de flujo completo en verde |
| E7 | Frontend Next.js | `next build` exitoso y flujo manual por rol |
| E8 | Cambio: límite de 4 horas consecutivas | Propuesta de cambio + pruebas nuevas y antiguas en verde |
| E9 | Verificación y cierre | `README.md`, `INFORME_FINAL.md`, matriz de trazabilidad |

### 4.3 Orden de desarrollo de funcionalidades

1. Usuarios y autenticación → 2. Roles y permisos → 3. Espacios → 4. Solicitudes de reserva → 5. Disponibilidad → 6. Prevención de reservas simultáneas → 7. Aprobación/rechazo → 8. Cancelación e historial → 9. Frontend.

### 4.4 Dependencias entre componentes

```
auth ──▶ roles/permisos ──▶ spaces ──▶ reservations(solicitud) ──▶ disponibilidad/conflictos
  │                                         │
  └──▶ users                                ├──▶ aprobación/rechazo ──▶ historial
                                            └──▶ cancelación ─────────▶ historial
frontend ──▶ (todos los endpoints anteriores)
```

- No se puede crear una reserva sin espacios ni usuarios autenticados.
- La aprobación depende de la verificación de conflictos (se revalida al aprobar).
- El historial depende de todas las transiciones de estado.

### 4.5 Criterios de terminado (Definition of Done) por etapa

Una etapa se considera terminada cuando:

1. Cada requisito de la etapa tiene **al menos una prueba automatizada** que cubre sus escenarios principales.
2. **Todas** las pruebas (nuevas y anteriores) pasan.
3. El código respeta la arquitectura en capas (sin SQL en rutas, sin lógica de negocio en el frontend).
4. El código generado por la IA fue **revisado** por el estudiante.
5. Los cambios quedan registrados en uno o más commits con mensaje descriptivo que referencia los requisitos.
6. Si hubo desviación respecto a la especificación, la especificación se actualizó **antes** que el código.

---

## 5. Estrategia de calidad

### 5.1 Tipos de pruebas

| Tipo | Herramienta | Qué cubre |
|---|---|---|
| **Unitarias** | node:test | Funciones puras de reglas de negocio: solapamiento de horarios, validación de formato de fecha/hora, horario de operación. |
| **Integración de API** | node:test + supertest + SQLite en memoria | Cada endpoint con sus escenarios de aceptación: éxito, validación, permisos (401/403), conflictos (409). |
| **Pruebas de aceptación** | Mismas pruebas de integración, nombradas con el ID del escenario | Correspondencia directa escenario ↔ prueba. |
| **Pruebas de regresión** | Ejecución completa de la suite tras cada cambio | Garantiza que el cambio de 4 horas no rompa funciones previas. |
| **Verificación de build del frontend** | `next build` | El frontend compila sin errores de tipos ni de rutas. |
| **Pruebas manuales exploratorias** | Navegador | Flujo de usuario por rol en el frontend. |

### 5.2 Riesgos identificados y mitigación

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | **Reservas simultáneas** por condiciones de carrera (dos solicitudes al mismo tiempo). | Media | Alto | Verificación + inserción dentro de una transacción `BEGIN IMMEDIATE`; revalidación al aprobar; pruebas específicas de solapamiento. |
| R2 | **La IA genera código que no corresponde a la especificación** o agrega funcionalidades no pedidas. | Alta | Alto | Tareas vinculadas a IDs de requisito; revisión de cada diff; pruebas escritas a partir de los escenarios; rechazo de código sin requisito asociado. |
| R3 | **Requisitos ambiguos** (p. ej., ¿las solicitudes pendientes bloquean el horario?). | Alta | Medio | Fase formal de revisión de especificaciones con registro de ambigüedades y decisiones. |
| R4 | **Errores de permisos** que permitan a un solicitante aprobar o administrar. | Media | Alto | Middleware de autorización centralizado; pruebas negativas (403) para cada operación protegida. |
| R5 | **Manejo incorrecto de fechas/horas** (zonas horarias, formatos, fin antes del inicio). | Media | Medio | Formato fijo `YYYY-MM-DD` y `HH:MM` en hora local; reloj inyectable en pruebas; validación estricta de formato. |
| R6 | **Cambios de requisitos tardíos** que rompan funcionalidad existente. | Alta | Medio | Gestión de cambios vía propuesta + delta de especificación; suite de regresión completa. |
| R7 | **Dependencias nativas que fallan al instalar en Windows** (p. ej., `bcrypt`, `better-sqlite3`). | Media | Medio | Uso de `bcryptjs` (JS puro) y del módulo nativo `node:sqlite`. |
| R8 | **Exposición de contraseñas o datos sensibles**. | Baja | Alto | Hash bcrypt; nunca devolver `password_hash`; secreto JWT por variable de entorno. |

### 5.3 Mecanismos para verificar el cumplimiento de requisitos

- **Identificadores trazables:** cada requisito tiene un ID (`ESP-01`, `RES-03`, …) y cada escenario un ID (`ESP-01-E1`).
- **Pruebas nombradas por escenario:** el nombre de cada prueba incluye el ID del escenario que verifica.
- **Matriz de trazabilidad:** requisito → escenario → archivo de código → prueba, consolidada en el cierre.
- **Revisión de correspondencia** especificación ↔ código al final de cada etapa y en el cierre.

---

## 6. Uso de SDD e inteligencia artificial

### 6.1 ¿Cómo se utilizará la herramienta de SDD?

Por decisión del proyecto **no se usará la CLI de OpenSpec**; en su lugar, el agente de IA (**Claude**) actuará como herramienta de especificación siguiendo la misma estructura y disciplina de OpenSpec, dentro del directorio `sdd/`:

```
sdd/
├── README.md              ← convenciones del proceso SDD
├── project.md             ← contexto, glosario y convenciones del proyecto
├── specs/<capacidad>/spec.md     ← especificación vigente ("fuente de verdad")
├── reviews/               ← revisiones de especificaciones
└── changes/
    ├── <id-cambio>/       ← propuesta activa: proposal.md, design.md, tasks.md, specs/ (deltas)
    └── archive/           ← cambios ya implementados y fusionados en specs/
```

- Las especificaciones vigentes describen **qué** debe hacer el sistema.
- Cada cambio funcional se gestiona con una **propuesta de cambio** (por qué, qué cambia, impacto), un **delta de especificación** (requisitos AGREGADOS / MODIFICADOS / ELIMINADOS) y una **lista de tareas**.
- Al terminar la implementación, el delta se **fusiona** en `sdd/specs/` y la propuesta se **archiva**.

### 6.2 ¿Cómo se transformará el plan en especificaciones?

| Elemento del plan | Se transforma en |
|---|---|
| Necesidades N1–N6 y alcance | Capacidades (una carpeta por funcionalidad mínima exigida). |
| Funcionalidades prioritarias | Requisitos con ID y palabra clave normativa (DEBE / NO DEBE). |
| Limitaciones | Restricciones explícitas en cada especificación. |
| Actores y roles | Matriz de permisos en la especificación de roles. |
| Riesgos R1, R4, R5 | Escenarios negativos (conflicto, acceso denegado, formato inválido). |
| Estrategia de calidad | Escenarios Dado/Cuando/Entonces convertibles en pruebas. |

### 6.3 Actividades que se delegarán a la IA

- Redactar el borrador de las especificaciones a partir de este plan.
- Detectar ambigüedades e inconsistencias en las especificaciones (revisión asistida).
- Generar la estructura del proyecto y el código de cada incremento según las tareas.
- Generar pruebas automatizadas a partir de los escenarios de aceptación.
- Proponer el análisis de impacto de los cambios.
- Redactar borradores de documentación (README, informe).

### 6.4 ¿Cómo se verificará el código generado?

1. **Revisión del diff** de cada incremento antes del commit: correspondencia con la tarea y el requisito.
2. **Ejecución de la suite completa** de pruebas; ningún incremento se integra con pruebas fallando.
3. **Pruebas negativas obligatorias** (permisos, validaciones, conflictos), no solo el camino feliz.
4. **Verificación de arquitectura**: SQL solo en repositorios, reglas solo en servicios, rutas delgadas.
5. **Búsqueda de funcionalidad no especificada**: cualquier comportamiento sin requisito se elimina o se especifica primero.
6. **Pruebas manuales** del frontend para los flujos principales.

### 6.5 Decisiones que son responsabilidad del estudiante

- Alcance, prioridades y limitaciones del sistema.
- Arquitectura, stack y estrategia de persistencia (sección 3).
- Resolución de ambigüedades en las reglas de negocio (p. ej., si una solicitud pendiente bloquea el horario).
- Aprobación final de cada especificación antes de implementarla.
- Aceptación o rechazo del código generado por la IA.
- Análisis del impacto de los cambios y decisión de cómo incorporarlos.
- Sustentación técnica del sistema y del proceso.
