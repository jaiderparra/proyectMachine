# Especificación: Registro y administración de usuarios

## Propósito

Identificar a cada persona que interactúa con el sistema y permitir su administración (necesidad N6).

## Requisitos

### Requisito USR-01: Registro público
El sistema DEBE permitir el registro de un usuario con `name` (2–100 caracteres), `email` (formato válido, único, se almacena en minúsculas) y `password` (mínimo 8 caracteres). El usuario registrado públicamente DEBE recibir siempre el rol `SOLICITANTE`, aunque envíe otro rol. La contraseña DEBE almacenarse como hash y NUNCA devolverse.

#### Escenario USR-01-E1: Registro exitoso
- **CUANDO** un visitante se registra con datos válidos
- **ENTONCES** recibe `201` con el usuario creado, rol `SOLICITANTE` y sin campo de contraseña

#### Escenario USR-01-E2: Correo duplicado
- **DADO** un usuario con correo `ana@uni.edu`
- **CUANDO** otro visitante se registra con `ANA@uni.edu`
- **ENTONCES** recibe `409` con código `DUPLICATE`

#### Escenario USR-01-E3: Datos inválidos
- **CUANDO** se registra con correo mal formado o contraseña de menos de 8 caracteres
- **ENTONCES** recibe `400` con código `VALIDATION_ERROR`

#### Escenario USR-01-E4: Intento de autoasignarse rol
- **CUANDO** un visitante se registra enviando `role = ADMIN`
- **ENTONCES** el usuario se crea con rol `SOLICITANTE`

### Requisito USR-02: Inicio de sesión
El sistema DEBE autenticar con correo y contraseña y devolver un token JWT con vigencia de 8 horas junto con los datos públicos del usuario.

#### Escenario USR-02-E1: Credenciales válidas
- **CUANDO** un usuario activo inicia sesión con credenciales correctas
- **ENTONCES** recibe `200` con `token` y `user`

#### Escenario USR-02-E2: Credenciales inválidas
- **CUANDO** el correo no existe o la contraseña es incorrecta
- **ENTONCES** recibe `401` con el mismo mensaje genérico en ambos casos

#### Escenario USR-02-E3: Cuenta desactivada
- **DADO** un usuario desactivado
- **CUANDO** inicia sesión con credenciales correctas
- **ENTONCES** recibe `403`

### Requisito USR-03: Administración de usuarios
El sistema DEBE permitir a un `ADMIN` listar usuarios, crear usuarios con cualquier rol y modificar `name`, `role` y `active` de un usuario existente.

#### Escenario USR-03-E1: Crear coordinador
- **DADO** un `ADMIN` autenticado
- **CUANDO** crea un usuario con rol `COORDINADOR`
- **ENTONCES** recibe `201` y el usuario tiene rol `COORDINADOR`

#### Escenario USR-03-E2: Cambio de rol
- **CUANDO** el `ADMIN` cambia el rol de un `SOLICITANTE` a `COORDINADOR`
- **ENTONCES** recibe `200` con el nuevo rol

#### Escenario USR-03-E3: Desactivar usuario
- **CUANDO** el `ADMIN` envía `active = false` para un usuario
- **ENTONCES** recibe `200` y el usuario queda inactivo

#### Escenario USR-03-E4: Usuario sin permiso
- **DADO** un `COORDINADOR` autenticado
- **CUANDO** consulta `GET /users`
- **ENTONCES** recibe `403`

### Requisito USR-04: Perfil propio
El sistema DEBE permitir a cualquier usuario autenticado consultar sus propios datos en `GET /auth/me`.

#### Escenario USR-04-E1: Consulta de perfil
- **DADO** un usuario autenticado
- **CUANDO** consulta `GET /auth/me`
- **ENTONCES** recibe `200` con sus datos sin contraseña

## Restricciones

- No se eliminan usuarios; solo se desactivan (preserva historial).
- No hay recuperación de contraseña (fuera de alcance).
