# SDD — Spec-Driven Development del proyecto

Este directorio reemplaza a `openspec/`. Por decisión del proyecto no se usa la CLI de OpenSpec: el agente de IA (Claude) actúa como herramienta de especificación siguiendo la **misma estructura y disciplina** de OpenSpec.

## Estructura

```
sdd/
├── README.md                 ← este archivo (convenciones del proceso)
├── project.md                ← contexto, glosario, convenciones y contrato de API
├── specs/                    ← especificación VIGENTE (fuente de verdad)
│   └── <capacidad>/spec.md
├── reviews/                  ← revisiones formales de especificaciones
└── changes/
    ├── <id-cambio>/          ← cambio ACTIVO
    │   ├── proposal.md       ← por qué, qué cambia, impacto
    │   ├── design.md         ← decisiones técnicas del cambio (opcional)
    │   ├── tasks.md          ← tareas de implementación (checklist)
    │   └── specs/<capacidad>/spec.md   ← DELTA: requisitos AGREGADOS / MODIFICADOS / ELIMINADOS
    └── archive/              ← cambios implementados y fusionados en specs/
```

## Formato de una especificación

```markdown
### Requisito XXX-NN: <nombre>
El sistema DEBE / NO DEBE ...

#### Escenario XXX-NN-EN: <nombre>
- **DADO** <estado inicial>
- **CUANDO** <acción>
- **ENTONCES** <resultado verificable>
```

- Palabras normativas: **DEBE**, **NO DEBE**, **PUEDE**.
- Cada requisito tiene al menos un escenario verificable.
- Cada escenario se corresponde con al menos una prueba automatizada cuyo nombre empieza con el ID del escenario.

## Flujo de trabajo

1. **Proponer**: crear `changes/<id>/proposal.md` + delta de especificación + `tasks.md`.
2. **Revisar**: validar consistencia, ambigüedades y correspondencia con `PLAN_INGENIERIA.md`.
3. **Implementar**: solo tareas cuya especificación esté revisada. Código y pruebas referencian IDs.
4. **Archivar**: fusionar el delta en `specs/` y mover el cambio a `changes/archive/AAAA-MM-DD-<id>/`.

> Regla: **no se modifica código funcional sin que exista antes la especificación correspondiente.**

## Prefijos de requisitos

| Prefijo | Capacidad |
|---|---|
| ESP | Gestión de espacios académicos |
| USR | Registro y administración de usuarios |
| ROL | Roles y permisos |
| RES | Solicitudes de reserva |
| DIS | Validación de disponibilidad |
| CON | Prevención de reservas simultáneas |
| APR | Aprobación y rechazo |
| CAN / HIS | Cancelación e historial |
| UI | Interfaz web (agregada en la revisión, H15) |
