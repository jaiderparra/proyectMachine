const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { setup, SPACES } = require('./helpers');

const request = (overrides = {}) => ({
  spaceId: SPACES.SALA_COMPUTO,
  date: '2030-05-10',
  startTime: '08:00',
  endTime: '10:00',
  purpose: 'Examen final de programación',
  attendees: 30,
  ...overrides,
});

describe('HIS-01 / HIS-02 Historial de una reserva', () => {
  let ctx;
  let id;
  beforeEach(async () => {
    ctx = await setup();
    id = (await ctx.as(ctx.tokens.solic).post('/api/reservations', request())).body.id;
  });

  test('HIS-02-E1 ciclo de vida completo en orden cronológico', async () => {
    await ctx.as(ctx.tokens.coord).post(`/api/reservations/${id}/approve`);
    await ctx.as(ctx.tokens.solic).post(`/api/reservations/${id}/cancel`, { reason: 'Cambio de fecha del examen' });
    const res = await ctx.as(ctx.tokens.solic).get(`/api/reservations/${id}/history`);
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.map((h) => [h.fromStatus, h.toStatus]),
      [[null, 'PENDIENTE'], ['PENDIENTE', 'APROBADA'], ['APROBADA', 'CANCELADA']]
    );
    assert.equal(res.body[0].changedByName, 'Docente Solicitante');
    assert.equal(res.body[1].changedByName, 'Coordinadora de Espacios');
    assert.ok(res.body.every((h) => h.changedAt));
  });

  test('HIS-02-E2 un solicitante no ve el historial de otro → 403', async () => {
    const res = await ctx.as(ctx.tokens.otro).get(`/api/reservations/${id}/history`);
    assert.equal(res.status, 403);
  });

  test('HIS-01 el historial es inmutable a nivel de base de datos', async () => {
    await assert.rejects(ctx.db.query("UPDATE reservation_history SET comment = 'x'"), /inmutable/);
    await assert.rejects(ctx.db.query('DELETE FROM reservation_history'), /inmutable/);
  });

  test('el rechazo guarda el motivo en el historial', async () => {
    await ctx.as(ctx.tokens.coord).post(`/api/reservations/${id}/reject`, { reason: 'Sala reservada para inducción' });
    const res = await ctx.as(ctx.tokens.coord).get(`/api/reservations/${id}/history`);
    assert.equal(res.body.at(-1).toStatus, 'RECHAZADA');
    assert.equal(res.body.at(-1).comment, 'Sala reservada para inducción');
  });
});

describe('HIS-03 Historial de reservas del usuario', () => {
  test('HIS-03-E1 el solicitante ve sus reservas en todos los estados', async () => {
    const ctx = await setup();
    const solic = ctx.as(ctx.tokens.solic);
    await solic.post('/api/reservations', request());
    const r2 = (await solic.post('/api/reservations', request({ startTime: '10:00', endTime: '11:00' }))).body.id;
    const r3 = (await solic.post('/api/reservations', request({ startTime: '11:00', endTime: '12:00' }))).body.id;
    await ctx.as(ctx.tokens.coord).post(`/api/reservations/${r2}/reject`, { reason: 'Sala ocupada por inducción' });
    await solic.post(`/api/reservations/${r3}/cancel`);

    const res = await solic.get('/api/reservations');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.map((r) => r.status).sort(), ['CANCELADA', 'PENDIENTE', 'RECHAZADA']);
  });
});
