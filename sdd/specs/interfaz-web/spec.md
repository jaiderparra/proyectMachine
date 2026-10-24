# Especificación: Interfaz web

## Propósito

Ofrecer a cada rol una interfaz web que consuma la API REST (módulo `frontend` de la sección 2.3 del plan). Agregada durante la revisión de especificaciones (hallazgo H15).

## Requisitos

### Requisito UI-01: Autenticación en la interfaz
La interfaz DEBE ofrecer pantallas de inicio de sesión y registro. Tras iniciar sesión, DEBE conservar el token y redirigir al listado de espacios. DEBE permitir cerrar sesión.

#### Escenario UI-01-E1: Inicio de sesión
- **CUANDO** un usuario ingresa credenciales válidas en `/login`
- **ENTONCES** es redirigido a `/espacios` y ve su nombre y rol en la barra de navegación

#### Escenario UI-01-E2: Ruta protegida sin sesión
- **CUANDO** un visitante sin sesión abre `/reservas`
- **ENTONCES** es redirigido a `/login`

### Requisito UI-02: Navegación por rol
La barra de navegación DEBE mostrar solo las opciones permitidas por ROL-03: todos ven *Espacios* y *Mis reservas*; `COORDINADOR` y `ADMIN` ven además *Aprobaciones*; solo `ADMIN` ve *Administrar espacios* y *Usuarios*.

#### Escenario UI-02-E1: Menú de solicitante
- **DADO** un `SOLICITANTE` con sesión
- **ENTONCES** no ve las opciones *Aprobaciones*, *Administrar espacios* ni *Usuarios*

### Requisito UI-03: Consultar disponibilidad y solicitar
La pantalla de espacios DEBE listar los espacios activos, permitir elegir una fecha, mostrar los bloques ocupados (DIS-01) y enviar una solicitud (RES-01). Los errores de la API DEBEN mostrarse con su mensaje.

#### Escenario UI-03-E1: Conflicto visible
- **CUANDO** el usuario solicita una franja ocupada
- **ENTONCES** ve el mensaje de conflicto devuelto por la API

### Requisito UI-04: Mis reservas e historial
La pantalla *Mis reservas* DEBE listar las reservas del usuario con su estado, permitir cancelar las activas y ver el historial de cada una (CAN-01, HIS-02, HIS-03).

### Requisito UI-05: Bandeja de aprobaciones
La pantalla *Aprobaciones* DEBE listar las solicitudes pendientes y permitir aprobar o rechazar (pidiendo el motivo) (APR-01, APR-02).

### Requisito UI-06: Administración
Las pantallas de administración DEBEN permitir crear/editar/activar/inactivar espacios (ESP-01, ESP-03, ESP-04) y crear usuarios, cambiar su rol y activarlos/desactivarlos (USR-03).

## Restricciones

- La interfaz no implementa reglas de negocio: toda validación definitiva la hace la API.
- Verificación: compilación exitosa (`next build`) y prueba manual de los flujos por rol.
