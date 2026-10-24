# Delta: Interfaz web

## Requisitos MODIFICADOS

### Requisito UI-03: Consultar disponibilidad y solicitar
La pantalla de espacios DEBE listar los espacios activos, permitir elegir una fecha, mostrar los bloques ocupados (DIS-01) y enviar una solicitud (RES-01). Los errores de la API DEBEN mostrarse con su mensaje. **El formulario de solicitud DEBE informar que una persona no puede reservar el mismo espacio más de 4 horas consecutivas (RES-04).**

#### Escenario UI-03-E1: Conflicto visible
- **CUANDO** el usuario solicita una franja ocupada
- **ENTONCES** ve el mensaje de conflicto devuelto por la API

#### Escenario UI-03-E2: Límite de cuatro horas visible
- **CUANDO** el usuario abre el formulario de solicitud
- **ENTONCES** ve la indicación del límite de 4 horas consecutivas
- **Y CUANDO** solicita más de 4 horas
- **ENTONCES** ve el mensaje de la regla devuelto por la API
