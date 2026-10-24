const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { setup, SPACES } = require('./helpers');

const request = (overrides = {}) => ({
  spaceId: SPACES.AUDITORIO,
  date: '2030-05-10',
  startTime: '08:00',
  endTime: '10:00',
  purpose: 'Conferencia de bienvenida',
  attendees: 120,
  ...overrides,
});

describe('CAN-01 Cancelar reserva', () => {
  let ctx;
  let id;
  beforeEach(async () => {
    ctx = await setup();
    id = (await ctx.as(ctx.tokens.solic).post('/api/reservations', request())).body.id;
  });

  test('CAN-01-E1 el propietario cancela su solicitud pendiente', async () => {
    const res = await ctx.as(ctx.tokens.solic).post(`/api/reservations/${id}/cancel`);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'CANCELADA');
  });

  test('CAN-01-E2 cancelar una aprobada libera la franja', async () => {
    await ctx.as(ctx.tokens.coord).post(`/api/reservations/${id}/approve`);
    await ctx.as(ctx.tokens.solic).post(`/api/reservations/${id}/cancel`, { reason: 'Se pospuso el evento' });
    const res = await ctx.as(ctx.tokens.otro).post('/api/reservations', request());
    assert.equal(res.status, 201);
  });

  test('CAN-01-E3 otro solicitante no puede cancelar → 403', async () => {
    const res = await ctx.as(ctx.tokens.otro).post(`/api/reservations/${id}/cancel`);
    assert.equal(res.status, 403);
  });

  test('CAN-01-E4 cancelar una reserva rechazada o ya cancelada → 409', async () => {
    await ctx.as(ctx.tokens.solic).post(`/api/reservations/${id}/cancel`);
    const again = await ctx.as(ctx.tokens.solic).post(`/api/reservations/${id}/cancel`);
    assert.equal(again.status, 409);
    assert.equal(again.body.error.code, 'INVALID_STATE');

    const other = (await ctx.as(ctx.tokens.solic).post('/api/reservations', request({ startTime: '14:00', endTime: '15:00' }))).body.id;
    await ctx.as(ctx.tokens.coord).post(`/api/reservations/${other}/reject`, { reason: 'Evento institucional' });
    const rejected = await ctx.as(ctx.tokens.solic).post(`/api/reservations/${other}/cancel`);
    assert.equal(rejected.status, 409);
  });

  test('CAN-01-E5 el COORDINADOR cancela una reserva ajena con motivo en el historial', async () => {
    await ctx.as(ctx.tokens.coord).post(`/api/reservations/${id}/approve`);
    const res = await ctx.as(ctx.tokens.coord).post(`/api/reservations/${id}/cancel`, { reason: 'Evento institucional' });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'CANCELADA');
    const history = await ctx.as(ctx.tokens.solic).get(`/api/reservations/${id}/history`);
    assert.equal(history.body.at(-1).comment, 'Evento institucional');
  });

  test('CAN-01-E6 una reserva que ya comenzó no se puede cancelar → 422', async () => {
    await ctx.as(ctx.tokens.coord).post(`/api/reservations/${id}/approve`);
    ctx.clock.set(new Date(2030, 4, 10, 8, 30));
    const res = await ctx.as(ctx.tokens.solic).post(`/api/reservations/${id}/cancel`);
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'BUSINESS_RULE');
  });
});
