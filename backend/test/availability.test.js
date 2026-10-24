const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { setup, insertReservation, SPACES } = require('./helpers');

const url = (spaceId, date) => `/api/spaces/${spaceId}/availability?date=${date}`;

describe('DIS-01 Ocupación diaria', () => {
  let ctx;
  beforeEach(async () => {
    ctx = await setup();
  });

  test('DIS-01-E1 día sin reservas: bloques vacíos y horario de operación', async () => {
    const res = await ctx.as(ctx.tokens.solic).get(url(SPACES.LAB_REDES, '2030-05-10'));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.blocks, []);
    assert.deepEqual(res.body.operatingHours, { open: '07:00', close: '22:00' });
  });

  test('DIS-01-E2 bloques ordenados por hora de inicio, sin datos privados', async () => {
    insertReservation(ctx.db, { spaceId: SPACES.LAB_REDES, date: '2030-05-10', startTime: '10:00', endTime: '11:00' });
    insertReservation(ctx.db, {
      spaceId: SPACES.LAB_REDES, date: '2030-05-10', startTime: '08:00', endTime: '09:00', status: 'PENDIENTE',
    });
    const res = await ctx.as(ctx.tokens.solic).get(url(SPACES.LAB_REDES, '2030-05-10'));
    assert.deepEqual(
      res.body.blocks.map((b) => [b.startTime, b.endTime, b.status]),
      [['08:00', '09:00', 'PENDIENTE'], ['10:00', '11:00', 'APROBADA']]
    );
    assert.equal(res.body.blocks[0].purpose, undefined);
    assert.equal(res.body.blocks[0].userName, undefined);
  });

  test('DIS-01-E5 reservas canceladas y rechazadas no aparecen', async () => {
    insertReservation(ctx.db, {
      spaceId: SPACES.LAB_REDES, date: '2030-05-10', startTime: '08:00', endTime: '09:00', status: 'CANCELADA',
    });
    insertReservation(ctx.db, {
      spaceId: SPACES.LAB_REDES, date: '2030-05-10', startTime: '09:00', endTime: '10:00', status: 'RECHAZADA',
    });
    const res = await ctx.as(ctx.tokens.solic).get(url(SPACES.LAB_REDES, '2030-05-10'));
    assert.deepEqual(res.body.blocks, []);
  });

  test('DIS-01-E3 fecha inválida → 400', async () => {
    const res = await ctx.as(ctx.tokens.solic).get(url(SPACES.LAB_REDES, '2030-13-40'));
    assert.equal(res.status, 400);
  });

  test('DIS-01-E4 espacio inexistente → 404', async () => {
    const res = await ctx.as(ctx.tokens.solic).get(url(9999, '2030-05-10'));
    assert.equal(res.status, 404);
  });
});

describe('DIS-02 Verificación de una franja', () => {
  let ctx;
  beforeEach(async () => {
    ctx = await setup();
  });

  const check = (date, startTime, endTime) =>
    `/api/spaces/${SPACES.LAB_REDES}/availability/check?date=${date}&startTime=${startTime}&endTime=${endTime}`;

  test('DIS-02-E1 franja libre → available = true', async () => {
    const res = await ctx.as(ctx.tokens.solic).get(check('2030-05-10', '08:00', '10:00'));
    assert.equal(res.status, 200);
    assert.equal(res.body.available, true);
    assert.deepEqual(res.body.conflicts, []);
  });

  test('DIS-02-E2 franja ocupada → available = false con conflictos', async () => {
    const id = insertReservation(ctx.db, {
      spaceId: SPACES.LAB_REDES, date: '2030-05-10', startTime: '09:00', endTime: '11:00',
    });
    const res = await ctx.as(ctx.tokens.solic).get(check('2030-05-10', '08:00', '10:00'));
    assert.equal(res.body.available, false);
    assert.equal(res.body.conflicts.length, 1);
    assert.equal(res.body.conflicts[0].id, id);
  });

  test('formato inválido → 400', async () => {
    const res = await ctx.as(ctx.tokens.solic).get(check('2030-05-10', '8am', '10:00'));
    assert.equal(res.status, 400);
  });
});
