const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { setup, SPACES } = require('./helpers');

const request = (overrides = {}) => ({
  spaceId: SPACES.LAB_REDES,
  date: '2030-05-10',
  startTime: '08:00',
  endTime: '10:00',
  purpose: 'Clase de redes de computadores',
  attendees: 20,
  ...overrides,
});

describe('CON-02 Rechazo de solicitudes solapadas', () => {
  let ctx;
  beforeEach(async () => {
    ctx = await setup();
    const first = await ctx.as(ctx.tokens.solic).post('/api/reservations', request());
    assert.equal(first.status, 201);
  });

  test('CON-02-E1 franja ocupada → 409 SCHEDULE_CONFLICT con las reservas en conflicto', async () => {
    const res = await ctx.as(ctx.tokens.otro).post('/api/reservations', request({ startTime: '09:00', endTime: '11:00' }));
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'SCHEDULE_CONFLICT');
    assert.equal(res.body.error.details.conflicts.length, 1);
    assert.equal(res.body.error.details.conflicts[0].startTime, '08:00');
  });

  test('CON-02-E2 otro espacio en la misma franja → 201', async () => {
    const res = await ctx.as(ctx.tokens.otro).post('/api/reservations', request({ spaceId: SPACES.SALA_COMPUTO }));
    assert.equal(res.status, 201);
  });

  test('CON-02-E3 solicitud duplicada del mismo usuario → 409', async () => {
    const res = await ctx.as(ctx.tokens.solic).post('/api/reservations', request());
    assert.equal(res.status, 409);
  });

  test('CON-02-E4 una solicitud PENDIENTE bloquea la franja', async () => {
    const res = await ctx.as(ctx.tokens.otro).post('/api/reservations', request({ startTime: '08:30', endTime: '09:30' }));
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'SCHEDULE_CONFLICT');
  });

  test('CON-02-E5 franja contigua → 201', async () => {
    const res = await ctx.as(ctx.tokens.otro).post('/api/reservations', request({ startTime: '10:00', endTime: '11:00' }));
    assert.equal(res.status, 201);
  });

  test('misma franja en otra fecha → 201', async () => {
    const res = await ctx.as(ctx.tokens.otro).post('/api/reservations', request({ date: '2030-05-11' }));
    assert.equal(res.status, 201);
  });
});

describe('CON-04 Atomicidad', () => {
  test('CON-04-E1 solicitudes concurrentes solapadas: exactamente una 201', async () => {
    const ctx = await setup();
    const results = await Promise.all([
      ctx.as(ctx.tokens.solic).post('/api/reservations', request()),
      ctx.as(ctx.tokens.otro).post('/api/reservations', request({ startTime: '09:00', endTime: '11:00' })),
      ctx.as(ctx.tokens.coord).post('/api/reservations', request({ startTime: '08:30', endTime: '09:00' })),
    ]);
    const statuses = results.map((r) => r.status).sort();
    assert.deepEqual(statuses, [201, 409, 409]);
    const { count } = ctx.db.prepare("SELECT COUNT(*) AS count FROM reservations WHERE status = 'PENDIENTE'").get();
    assert.equal(count, 1);
  });

  test('si falla la escritura no queda nada a medias (rollback)', async () => {
    const ctx = await setup();
    const before = ctx.db.prepare('SELECT COUNT(*) AS count FROM reservation_history').get().count;
    const res = await ctx.as(ctx.tokens.solic).post('/api/reservations', request({ attendees: 999 }));
    assert.equal(res.status, 422);
    const after = ctx.db.prepare('SELECT COUNT(*) AS count FROM reservation_history').get().count;
    assert.equal(after, before);
  });
});
