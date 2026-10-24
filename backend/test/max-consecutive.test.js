const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { setup, insertReservation, SPACES } = require('./helpers');

// Cambio limite-cuatro-horas: RES-04 y APR-01-E6
const request = (overrides = {}) => ({
  spaceId: SPACES.LAB_REDES,
  date: '2030-05-10',
  startTime: '08:00',
  endTime: '12:00',
  purpose: 'Jornada de laboratorio',
  attendees: 10,
  ...overrides,
});

describe('RES-04 Duración consecutiva máxima', () => {
  let ctx;
  let solic;
  beforeEach(async () => {
    ctx = await setup();
    solic = ctx.as(ctx.tokens.solic);
  });

  test('RES-04-E1 exactamente cuatro horas → 201', async () => {
    const res = await solic.post('/api/reservations', request());
    assert.equal(res.status, 201);
  });

  test('RES-04-E2 una reserva de más de cuatro horas → 422', async () => {
    const res = await solic.post('/api/reservations', request({ endTime: '12:30' }));
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'BUSINESS_RULE');
    assert.match(res.body.error.message, /4 horas consecutivas/);
    assert.equal(res.body.error.details.consecutiveMinutes, 270);
  });

  test('RES-04-E3 reservas contiguas que suman más de cuatro horas → 422', async () => {
    assert.equal((await solic.post('/api/reservations', request({ endTime: '11:00' }))).status, 201);
    const res = await solic.post('/api/reservations', request({ startTime: '11:00', endTime: '13:00' }));
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'BUSINESS_RULE');
  });

  test('RES-04-E4 reservas separadas por un hueco → 201', async () => {
    await solic.post('/api/reservations', request({ endTime: '11:00' }));
    const res = await solic.post('/api/reservations', request({ startTime: '11:30', endTime: '13:00' }));
    assert.equal(res.status, 201);
  });

  test('RES-04-E5 reserva contigua en otro espacio → 201', async () => {
    await solic.post('/api/reservations', request({ endTime: '11:00' }));
    const res = await solic.post('/api/reservations', request({ spaceId: SPACES.SALA_COMPUTO, startTime: '11:00', endTime: '13:00' }));
    assert.equal(res.status, 201);
  });

  test('RES-04-E6 la reserva contigua cancelada no cuenta → 201', async () => {
    const first = (await solic.post('/api/reservations', request({ endTime: '11:00' }))).body.id;
    await solic.post(`/api/reservations/${first}/cancel`);
    const res = await solic.post('/api/reservations', request({ startTime: '11:00', endTime: '13:00' }));
    assert.equal(res.status, 201);
  });

  test('RES-04-E6 la reserva contigua rechazada no cuenta → 201', async () => {
    const first = (await solic.post('/api/reservations', request({ endTime: '11:00' }))).body.id;
    await ctx.as(ctx.tokens.coord).post(`/api/reservations/${first}/reject`, { reason: 'Mantenimiento programado' });
    const res = await solic.post('/api/reservations', request({ startTime: '11:00', endTime: '13:00' }));
    assert.equal(res.status, 201);
  });

  test('RES-04-E7 la reserva contigua de otro usuario no cuenta → 201', async () => {
    await ctx.as(ctx.tokens.otro).post('/api/reservations', request({ endTime: '11:00' }));
    const res = await solic.post('/api/reservations', request({ startTime: '11:00', endTime: '13:00' }));
    assert.equal(res.status, 201);
  });

  test('RES-04-E8 una franja que une dos reservas (6 h) → 422', async () => {
    await solic.post('/api/reservations', request({ endTime: '10:00' }));
    await solic.post('/api/reservations', request({ startTime: '12:00', endTime: '14:00' }));
    const res = await solic.post('/api/reservations', request({ startTime: '10:00', endTime: '12:00' }));
    assert.equal(res.status, 422);
    assert.equal(res.body.error.details.consecutiveMinutes, 360);
  });

  test('RES-04-E9 aplica también al ADMIN → 422', async () => {
    const res = await ctx.as(ctx.tokens.admin).post('/api/reservations', request({ endTime: '13:00' }));
    assert.equal(res.status, 422);
  });

  test('la regla no deja rastro: una solicitud rechazada por RES-04 no crea reserva ni historial', async () => {
    await solic.post('/api/reservations', request({ endTime: '13:00' }));
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS c FROM reservations').get().c, 0);
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS c FROM reservation_history').get().c, 0);
  });
});

describe('APR-01 (modificado) Aprobación con límite de cuatro horas', () => {
  test('APR-01-E6 pendiente previa de 5 h no se puede aprobar → 422 y sigue PENDIENTE', async () => {
    const ctx = await setup();
    const id = insertReservation(ctx.db, {
      spaceId: SPACES.LAB_REDES, date: '2030-05-10', startTime: '08:00', endTime: '13:00', status: 'PENDIENTE',
    });
    const res = await ctx.as(ctx.tokens.coord).post(`/api/reservations/${id}/approve`);
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'BUSINESS_RULE');
    const after = await ctx.as(ctx.tokens.coord).get(`/api/reservations/${id}`);
    assert.equal(after.body.status, 'PENDIENTE');
    const rejected = await ctx.as(ctx.tokens.coord).post(`/api/reservations/${id}/reject`, { reason: 'Excede el límite de 4 horas' });
    assert.equal(rejected.status, 200);
  });

  test('aprobar una reserva de 4 h junto a otra pendiente del mismo usuario sigue funcionando', async () => {
    const ctx = await setup();
    const id = (await ctx.as(ctx.tokens.solic).post('/api/reservations', request({ endTime: '10:00' }))).body.id;
    await ctx.as(ctx.tokens.solic).post('/api/reservations', request({ startTime: '10:00', endTime: '12:00' }));
    const res = await ctx.as(ctx.tokens.coord).post(`/api/reservations/${id}/approve`);
    assert.equal(res.status, 200);
  });
});
