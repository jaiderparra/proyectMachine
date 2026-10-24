# Especificación: Roles y permisos

## Propósito

Garantizar que cada operación solo pueda ser ejecutada por quien tiene autorización (problema P6 del plan).

## Requisitos

### Requisito ROL-01: Roles del sistema
El sistema DEBE manejar exactamente tres roles: `ADMIN`, `COORDINADOR` y `SOLICITANTE`. Cada usuario DEBE tener un único rol.

#### Escenario ROL-01-E1: Rol inválido
- **DADO** un `ADMIN` autenticado
- **CUANDO** asigna a un usuario el rol `SUPERUSUARIO`
- **ENTONCES** recibe `400` con código `VALIDATION_ERROR`

### Requisito ROL-02: Autenticación obligatoria
Todas las rutas de la API, excepto `/health`, `/auth/register` y `/auth/login`, DEBEN exigir un token válido en el encabezado `Authorization: Bearer <token>`. En cada petición el sistema DEBE verificar que el usuario del token exista y esté activo, y DEBE usar el rol vigente en la base de datos.

#### Escenario ROL-02-E1: Sin token
- **CUANDO** se consulta `GET /spaces` sin token
- **ENTONCES** se recibe `401` con código `UNAUTHENTICATED`

#### Escenario ROL-02-E2: Token inválido o expirado
- **CUANDO** se envía un token alterado
- **ENTONCES** se recibe `401`

#### Escenario ROL-02-E3: Usuario desactivado con token vigente
- **DADO** un usuario con token vigente que luego es desactivado por un `ADMIN`
- **CUANDO** usa ese token
- **ENTONCES** recibe `401`

#### Escenario ROL-02-E4: Cambio de rol con efecto inmediato
- **DADO** un `SOLICITANTE` con token vigente que es promovido a `COORDINADOR`
- **CUANDO** usa el mismo token para aprobar una solicitud
- **ENTONCES** la operación se permite (el rol se lee de la base de datos en cada petición)

### Requisito ROL-03: Matriz de permisos
El sistema DEBE aplicar la siguiente matriz. Una operación no permitida DEBE responder `403` con código `FORBIDDEN`.

| Operación | ADMIN | COORDINADOR | SOLICITANTE |
|---|:-:|:-:|:-:|
| Crear / editar / activar / inactivar espacios | ✔ | ✘ | ✘ |
| Consultar espacios y disponibilidad | ✔ | ✔ | ✔ |
| Administrar usuarios | ✔ | ✘ | ✘ |
| Crear solicitud de reserva | ✔ | ✔ | ✔ |
| Ver todas las reservas | ✔ | ✔ | ✘ (solo propias) |
| Aprobar / rechazar solicitudes | ✔ | ✔ | ✘ |
| Cancelar reserva propia | ✔ | ✔ | ✔ |
| Cancelar reserva de otro usuario | ✔ | ✔ | ✘ |
| Ver historial de una reserva | ✔ | ✔ | solo propias |

#### Escenario ROL-03-E1: Solicitante intenta aprobar
- **DADO** un `SOLICITANTE` autenticado y una solicitud pendiente
- **CUANDO** intenta aprobarla
- **ENTONCES** recibe `403`

#### Escenario ROL-03-E2: Coordinador intenta crear espacio
- **DADO** un `COORDINADOR` autenticado
- **CUANDO** intenta crear un espacio
- **ENTONCES** recibe `403`

### Requisito ROL-04: Propiedad de las reservas
Un `SOLICITANTE` DEBE ver, consultar y cancelar únicamente sus propias reservas.

#### Escenario ROL-04-E1: Acceso a reserva ajena
- **DADO** una reserva del solicitante A
- **CUANDO** el solicitante B consulta su detalle
- **ENTONCES** recibe `403`

#### Escenario ROL-04-E2: Listado filtrado por propietario
- **DADO** reservas de varios usuarios
- **CUANDO** un `SOLICITANTE` consulta `GET /reservations`
- **ENTONCES** solo recibe sus propias reservas

## Restricciones

- Las reglas de autorización se aplican en el backend; el frontend solo oculta opciones.
