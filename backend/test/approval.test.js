const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { setup, insertReservation, SPACES } = require('./helpers');

const request = (overrides = {}) => ({
  spaceId: SPACES.LAB_REDES,
  date: '2030-05-10',
  startTime: '08:00',
  endTime: '10:00',
  purpose: 'Taller de configuración de routers',
  attendees: 15,
  ...overrides,
});

describe('APR-01 Aprobar solicitud', () => {
  let ctx;
  let pendingId;
  beforeEach(async () => {
    ctx = await setup();
    pendingId = (await ctx.as(ctx.tokens.solic).post('/api/reservations', request())).body.id;
  });

  test('APR-01-E1 el COORDINADOR aprueba y queda registrado como decisor', async () => {
    const coord = (await ctx.as(ctx.tokens.coord).get('/api/auth/me')).body;
    const res = await ctx.as(ctx.tokens.coord).post(`/api/reservations/${pendingId}/approve`);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'APROBADA');
    assert.equal(res.body.decidedBy, coord.id);
  });

  test('APR-01-E2 aprobar una reserva no pendiente → 409 INVALID_STATE', async () => {
    await ctx.as(ctx.tokens.coord).post(`/api/reservations/${pendingId}/approve`);
    const again = await ctx.as(ctx.tokens.coord).post(`/api/reservations/${pendingId}/approve`);
    assert.equal(again.status, 409);
    assert.equal(again.body.error.code, 'INVALID_STATE');

    const otherId = (await ctx.as(ctx.tokens.solic).post('/api/reservations', request({ startTime: '12:00', endTime: '13:00' }))).body.id;
    await ctx.as(ctx.tokens.coord).post(`/api/reservations/${otherId}/reject`, { reason: 'Espacio en mantenimiento' });
    const rejected = await ctx.as(ctx.tokens.coord).post(`/api/reservations/${otherId}/approve`);
    assert.equal(rejected.status, 409);
  });

  test('APR-01-E3 reserva inexistente → 404', async () => {
    const res = await ctx.as(ctx.tokens.coord).post('/api/reservations/9999/approve');
    assert.equal(res.status, 404);
  });

  test('APR-01-E4 solicitud vencida → 422', async () => {
    ctx.clock.set(new Date(2030, 4, 10, 8, 30));
    const res = await ctx.as(ctx.tokens.coord).post(`/api/reservations/${pendingId}/approve`);
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'BUSINESS_RULE');
  });

  test('APR-01-E5 / ROL-03-E1 un SOLICITANTE no puede aprobar → 403', async () => {
    const res = await ctx.as(ctx.tokens.solic).post(`/api/reservations/${pendingId}/approve`);
    assert.equal(res.status, 403);
    const still = await ctx.as(ctx.tokens.solic).get(`/api/reservations/${pendingId}`);
    assert.equal(still.body.status, 'PENDIENTE');
  });

  test('el ADMIN también puede aprobar', async () => {
    const res = await ctx.as(ctx.tokens.admin).post(`/api/reservations/${pendingId}/approve`);
    assert.equal(res.status, 200);
  });

  test('ROL-02-E4 un solicitante promovido a COORDINADOR aprueba con el mismo token', async () => {
    const admin = ctx.as(ctx.tokens.admin);
    const otro = (await admin.get('/api/users')).body.find((u) => u.email === 'otro@uni.edu');
    await admin.patch(`/api/users/${otro.id}`, { role: 'COORDINADOR' });
    const res = await ctx.as(ctx.tokens.otro).post(`/api/reservations/${pendingId}/approve`);
    assert.equal(res.status, 200);
  });
});

describe('CON-03 Revalidación al aprobar', () => {
  test('CON-03-E1 conflicto con una aprobada → 409 y sigue PENDIENTE', async () => {
    const ctx = await setup();
    insertReservation(ctx.db, { spaceId: SPACES.LAB_REDES, date: '2030-05-10', startTime: '09:00', endTime: '11:00' });
    const pendingId = insertReservation(ctx.db, {
      spaceId: SPACES.LAB_REDES, date: '2030-05-10', startTime: '08:00', endTime: '10:00', status: 'PENDIENTE',
    });
    const res = await ctx.as(ctx.tokens.coord).post(`/api/reservations/${pendingId}/approve`);
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'SCHEDULE_CONFLICT');
    const after = await ctx.as(ctx.tokens.coord).get(`/api/reservations/${pendingId}`);
    assert.equal(after.body.status, 'PENDIENTE');
  });
});

describe('APR-02 Rechazar solicitud', () => {
  let ctx;
  let pendingId;
  beforeEach(async () => {
    ctx = await setup();
    pendingId = (await ctx.as(ctx.tokens.solic).post('/api/reservations', request())).body.id;
  });

  test('APR-02-E1 rechazo con motivo', async () => {
    const res = await ctx.as(ctx.tokens.coord).post(`/api/reservations/${pendingId}/reject`, {
      reason: 'Mantenimiento programado',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'RECHAZADA');
    assert.equal(res.body.decisionReason, 'Mantenimiento programado');
  });

  test('APR-02-E2 rechazo sin motivo → 400', async () => {
    const res = await ctx.as(ctx.tokens.coord).post(`/api/reservations/${pendingId}/reject`, {});
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  test('APR-02-E3 rechazar una reserva cancelada → 409', async () => {
    await ctx.as(ctx.tokens.solic).post(`/api/reservations/${pendingId}/cancel`);
    const res = await ctx.as(ctx.tokens.coord).post(`/api/reservations/${pendingId}/reject`, {
      reason: 'Ya no aplica la solicitud',
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'INVALID_STATE');
  });

  test('APR-02-E4 el rechazo libera la franja', async () => {
    await ctx.as(ctx.tokens.coord).post(`/api/reservations/${pendingId}/reject`, { reason: 'Mantenimiento programado' });
    const res = await ctx.as(ctx.tokens.otro).post('/api/reservations', request());
    assert.equal(res.status, 201);
  });

  test('un SOLICITANTE no puede rechazar → 403', async () => {
    const res = await ctx.as(ctx.tokens.solic).post(`/api/reservations/${pendingId}/reject`, { reason: 'Me arrepentí' });
    assert.equal(res.status, 403);
  });
});
