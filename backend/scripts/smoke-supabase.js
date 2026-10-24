// Prueba de humo contra Supabase real (cambio migracion-supabase).
// Crea un esquema temporal 'reservas_smoke', ejecuta el flujo principal y la concurrencia
// de CON-04 con conexiones reales del pool, y elimina el esquema al terminar.
// Uso: npm run smoke   (requiere DATABASE_URL en backend/.env)
const path = require('node:path');
const root = path.join(__dirname, '..');
const request = require('supertest');
const { openPostgres } = require(path.join(root, 'src/db/database'));
const { seed } = require(path.join(root, 'src/db/seed'));
const { createApp } = require(path.join(root, 'src/app'));
const ok = (cond, msg) => { console.log(cond ? '  ✔' : '  ✘', msg); if (!cond) process.exitCode = 1; };

(async () => {
  const t0 = Date.now();
  const db = await openPostgres(process.env.DATABASE_URL, { schema: 'reservas_smoke' });
  try {
    console.log('Migración aplicada en Supabase (esquema reservas_smoke). Sembrado:', await seed(db, { bcryptRounds: 4 }));
    const api = request(createApp({ db, config: { bcryptRounds: 4 } }));
    const login = async (e, p) => (await api.post('/api/auth/login').send({ email: e, password: p })).body.token;
    const solic = await login('solicitante@uni.edu', 'Solic123!');
    const coord = await login('coordinador@uni.edu', 'Coord123!');
    const as = (t) => ({ post: (u, b = {}) => api.post(u).set('Authorization', `Bearer ${t}`).send(b), get: (u) => api.get(u).set('Authorization', `Bearer ${t}`) });
    const base = { spaceId: 1, date: '2031-03-10', purpose: 'Prueba de humo Supabase', attendees: 10 };

    const r1 = await as(solic).post('/api/reservations', { ...base, startTime: '08:00', endTime: '10:00' });
    ok(r1.status === 201 && r1.body.date === '2031-03-10' && r1.body.startTime === '08:00', `RES-01 crear reserva → ${r1.status} (${r1.body.date} ${r1.body.startTime})`);
    const c = await as(coord).post('/api/reservations', { ...base, startTime: '09:00', endTime: '11:00' });
    ok(c.status === 409, `CON-02 franja ocupada → ${c.status} ${c.body.error?.code}`);
    const four = await as(solic).post('/api/reservations', { ...base, startTime: '10:00', endTime: '12:30' });
    ok(four.status === 422, `RES-04 cadena de 4 h 30 → ${four.status}`);
    const ap = await as(coord).post(`/api/reservations/${r1.body.id}/approve`);
    ok(ap.status === 200 && ap.body.status === 'APROBADA', `APR-01 aprobar → ${ap.status} ${ap.body.status}`);
    const av = await as(solic).get('/api/spaces/1/availability?date=2031-03-10');
    ok(av.body.blocks?.length === 1, `DIS-01 ocupación → ${JSON.stringify(av.body.blocks)}`);

    // CON-04 con concurrencia real: 6 solicitudes solapadas en paralelo por conexiones distintas del pool
    const par = await Promise.all([0, 1, 2, 3, 4, 5].map((i) => as(i % 2 ? coord : solic).post('/api/reservations', { ...base, spaceId: 2, startTime: '14:00', endTime: `15:${String(i * 5).padStart(2, '0')}` })));
    const codes = par.map((r) => r.status).sort();
    ok(codes.filter((s) => s === 201).length === 1, `CON-04 concurrencia real → ${codes.join(', ')}`);

    const h = await as(solic).get(`/api/reservations/${r1.body.id}/history`);
    ok(h.body.length === 2, `HIS-02 historial → ${h.body.map((x) => x.toStatus).join(' → ')}`);
    let immutable = false;
    try { await db.query('UPDATE reservation_history SET comment = $1', ['x']); } catch (e) { immutable = /inmutable/.test(e.message); }
    ok(immutable, 'HIS-01 trigger plpgsql impide modificar el historial');
    const rls = await db.query("SELECT relname, relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'reservas_smoke' AND relkind = 'r'");
    ok(rls.every((r) => r.relrowsecurity), `RLS activo en ${rls.map((r) => r.relname).join(', ')}`);
  } finally {
    await db.exec('DROP SCHEMA reservas_smoke CASCADE');
    console.log(`Esquema temporal eliminado. Duración: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    await db.close();
  }
})().catch((e) => { console.error('ERROR', e.message); process.exitCode = 1; });
