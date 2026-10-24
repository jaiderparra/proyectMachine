const request = require('supertest');
const { createApp } = require('../src/app');
const { openPGlite } = require('../src/db/database');
const { seed } = require('../src/db/seed');

// Reloj controlable: por defecto 2030-05-01 08:00 hora local.
function createClock(initial = new Date(2030, 4, 1, 8, 0)) {
  let current = new Date(initial);
  return {
    now: () => new Date(current),
    set: (date) => {
      current = new Date(date);
    },
  };
}

// IDs de los espacios sembrados (ver src/db/seed.js).
const SPACES = { LAB_REDES: 1, AUDITORIO: 2, SALA_COMPUTO: 3, LAB_QUIMICA: 4, AUDITORIO_MENOR: 5 };

// Una instancia de PGlite (PostgreSQL en memoria) por archivo de prueba; cada setup la vacía.
// TRUNCATE no dispara los triggers por fila que protegen el historial.
let sharedDb;
async function freshDatabase() {
  sharedDb ??= await openPGlite();
  await sharedDb.exec('TRUNCATE reservation_history, reservations, spaces, users RESTART IDENTITY CASCADE');
  return sharedDb;
}

async function setup({ now } = {}) {
  const db = await freshDatabase();
  const clock = createClock(now);
  await seed(db, { bcryptRounds: 4, now: clock.now() });
  const app = createApp({ db, clock, config: { bcryptRounds: 4 } });
  const api = request(app);

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login').send({ email, password });
    if (res.status !== 200) throw new Error(`login falló para ${email}: ${res.status}`);
    return res.body.token;
  };

  await api
    .post('/api/auth/register')
    .send({ name: 'Otro Solicitante', email: 'otro@uni.edu', password: 'Otro1234!' });

  const tokens = {
    admin: await login('admin@uni.edu', 'Admin123!'),
    coord: await login('coordinador@uni.edu', 'Coord123!'),
    solic: await login('solicitante@uni.edu', 'Solic123!'),
    otro: await login('otro@uni.edu', 'Otro1234!'),
  };

  // Atajos autenticados: as(token).get(url) ...
  const as = (token) => ({
    get: (url) => api.get(url).set('Authorization', `Bearer ${token}`),
    post: (url, body = {}) => api.post(url).set('Authorization', `Bearer ${token}`).send(body),
    patch: (url, body = {}) => api.patch(url).set('Authorization', `Bearer ${token}`).send(body),
  });

  return { db, clock, app, api, tokens, as, login };
}

// Inserta una reserva directamente en la BD, saltando las reglas del servicio.
// Solo para preparar precondiciones que el flujo normal impide (CON-03-E1, ESP-04-E3).
async function insertReservation(db, { spaceId, userId = 3, date, startTime, endTime, status = 'APROBADA' }) {
  const now = new Date().toISOString();
  const row = await db.one(
    `INSERT INTO reservations (space_id, user_id, date, start_time, end_time, purpose, attendees, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'Precondición de prueba', 10, $6, $7, $7) RETURNING id`,
    [spaceId, userId, date, startTime, endTime, status, now]
  );
  return row.id;
}

// Cuenta filas de una tabla (verificaciones directas sobre la BD).
async function countRows(db, table, where = 'TRUE') {
  return (await db.one(`SELECT COUNT(*)::int AS count FROM ${table} WHERE ${where}`)).count;
}

module.exports = { setup, createClock, insertReservation, countRows, SPACES };
