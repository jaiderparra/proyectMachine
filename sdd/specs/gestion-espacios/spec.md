# Especificación: Gestión de espacios académicos

## Propósito

Mantener un inventario centralizado y confiable de los espacios reservables (necesidad N1 del plan).

## Requisitos

### Requisito ESP-01: Registrar espacio
El sistema DEBE permitir a un `ADMIN` registrar un espacio con: `name` (obligatorio, 3–100 caracteres, único sin distinguir mayúsculas), `type` (`LABORATORIO`, `AUDITORIO` o `SALA_COMPUTO`), `capacity` (entero entre 1 y 1000), `location` (obligatorio, máx. 150 caracteres) y `resources` (opcional, máx. 500 caracteres). El espacio se crea activo.

#### Escenario ESP-01-E1: Registro exitoso
- **DADO** un `ADMIN` autenticado
- **CUANDO** envía un espacio con datos válidos
- **ENTONCES** recibe `201` con el espacio creado, su `id` y `active = true`

#### Escenario ESP-01-E2: Nombre duplicado
- **DADO** que existe el espacio "Laboratorio de Redes"
- **CUANDO** el `ADMIN` registra otro espacio llamado "laboratorio de redes"
- **ENTONCES** recibe `409` con código `DUPLICATE`

#### Escenario ESP-01-E3: Datos inválidos
- **DADO** un `ADMIN` autenticado
- **CUANDO** envía `capacity = 0` o un `type` no reconocido
- **ENTONCES** recibe `400` con código `VALIDATION_ERROR` y el detalle de los campos inválidos

#### Escenario ESP-01-E4: Usuario sin permiso
- **DADO** un `SOLICITANTE` autenticado
- **CUANDO** intenta registrar un espacio
- **ENTONCES** recibe `403`

### Requisito ESP-02: Consultar espacios
El sistema DEBE permitir a cualquier usuario autenticado listar los espacios y consultar el detalle de uno. El listado PUEDE filtrarse por `type`.

#### Escenario ESP-02-E1: Listado
- **DADO** que existen espacios registrados
- **CUANDO** un usuario autenticado consulta `GET /spaces`
- **ENTONCES** recibe `200` con la lista ordenada por nombre

#### Escenario ESP-02-E2: Filtro por tipo
- **DADO** espacios de distintos tipos
- **CUANDO** consulta `GET /spaces?type=AUDITORIO`
- **ENTONCES** solo recibe espacios de tipo `AUDITORIO`

#### Escenario ESP-02-E3: Espacio inexistente
- **CUANDO** consulta `GET /spaces/9999`
- **ENTONCES** recibe `404`

### Requisito ESP-03: Actualizar espacio
El sistema DEBE permitir a un `ADMIN` modificar parcialmente los datos de un espacio, aplicando las mismas validaciones de ESP-01.

#### Escenario ESP-03-E1: Actualización exitosa
- **DADO** un espacio existente
- **CUANDO** el `ADMIN` cambia su `capacity` a 40
- **ENTONCES** recibe `200` y el espacio refleja la nueva capacidad

#### Escenario ESP-03-E2: Nombre en uso
- **CUANDO** el `ADMIN` cambia el nombre de un espacio por el de otro existente
- **ENTONCES** recibe `409` con código `DUPLICATE`

### Requisito ESP-04: Activar e inactivar espacio
El sistema DEBE permitir a un `ADMIN` inactivar o reactivar un espacio (`active`). Un espacio inactivo NO DEBE recibir nuevas solicitudes de reserva. Los espacios NO DEBEN eliminarse físicamente, para preservar el historial.

#### Escenario ESP-04-E1: Inactivación
- **DADO** un espacio activo sin reservas futuras
- **CUANDO** el `ADMIN` envía `active = false`
- **ENTONCES** recibe `200` y el espacio queda inactivo

#### Escenario ESP-04-E2: Solicitud sobre espacio inactivo
- **DADO** un espacio inactivo
- **CUANDO** un usuario crea una solicitud para ese espacio
- **ENTONCES** recibe `422` con código `BUSINESS_RULE`

## Restricciones

- No existe operación de borrado de espacios.
- Solo el rol `ADMIN` modifica el inventario.
