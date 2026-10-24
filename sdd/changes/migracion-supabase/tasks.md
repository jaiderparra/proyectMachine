# Tareas: persistencia en Supabase

## 1. Especificación
- [x] 1.1 Propuesta e impacto (`proposal.md`); delta CON-04.
- [x] 1.2 Credenciales fuera de Git (`.gitignore`).
- [x] 1.3 Anexo A del plan y `project.md`.

## 2. Implementación
- [x] 2.1 Adaptador de BD: `query`, `one`, `exec`, `transaction` para `pg` (Pool) y PGlite.
- [x] 2.2 Esquema PostgreSQL en esquema `reservas` (tipos DATE/TIME, índice `lower(name)`, triggers plpgsql, RLS).
- [x] 2.3 Repositorios async con `to_char` para mantener el formato de la API.
- [x] 2.4 Servicios async; transacciones con `FOR UPDATE` sobre el espacio (CON-04) y la reserva.
- [x] 2.5 Express 5 (propagación de errores async); middleware de autenticación async.
- [x] 2.6 `server.js`: `DATABASE_URL` → Supabase; sin ella → PGlite local. `.env.example`.

## 3. Pruebas
- [x] 3.1 Helpers con PGlite (una instancia por archivo, reinicio por prueba).
- [x] 3.2 Suite completa: 118/118 sin cambiar expectativas.
- [x] 3.3 Prueba de humo contra Supabase real (migración, semilla, flujo de reserva).

## 4. Cierre
- [ ] 4.1 Fusionar delta, actualizar README/informe y archivar.
