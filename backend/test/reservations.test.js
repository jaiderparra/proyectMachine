const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { setup, SPACES } = require('./helpers');

// Reloj de las pruebas: 2030-05-01 08:00. Las fechas usadas son futuras.
const request = (overrides = {}) => ({
  spaceId: SPACES.LAB_REDES, // capacidad 30
  date: '2030-05-10',
  startTime: '08:00',
  endTime: '10:00',
  purpose: 'Práctica de laboratorio de redes',
  attendees: 20,
  ...overrides,
});

describe('RES-01 Crear solicitud', () => {
  let ctx;
  beforeEach(async () => {
    ctx = await setup();
  });

  test('RES-01-E1 solicitud exitosa queda PENDIENTE y asociada al usuario', async () => {
    const me = (await ctx.as(ctx.tokens.solic).get('/api/auth/me')).body;
    const res = await ctx.as(ctx.tokens.solic).post('/api/reservations', request());
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'PENDIENTE');
    assert.equal(res.body.userId, me.id);
    assert.equal(res.body.spaceName, 'Laboratorio de Redes');
  });

  test('RES-01-E2 sin propósito → 400', async () => {
    const res = await ctx.as(ctx.tokens.solic).post('/api/reservations', request({ purpose: undefined }));
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.purpose);
  });

  test('RES-01-E3 espacio inexistente → 404', async () => {
    const res = await ctx.as(ctx.tokens.solic).post('/api/reservations', request({ spaceId: 9999 }));
    assert.equal(res.status, 404);
  });

  test('RES-01-E4 asistentes superan la capacidad → 422', async () => {
    const res = await ctx.as(ctx.tokens.solic).post('/api/reservations', request({ attendees: 31 }));
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'BUSINESS_RULE');
  });

  test('ESP-04-E2 solicitud sobre espacio inactivo → 422', async () => {
    await ctx.as(ctx.tokens.admin).patch(`/api/spaces/${SPACES.LAB_REDES}`, { active: false });
    const res = await ctx.as(ctx.tokens.solic).post('/api/reservations', request());
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'BUSINESS_RULE');
  });

  test('HIS-01-E1 la creación registra la entrada null → PENDIENTE', async () => {
    const created = await ctx.as(ctx.tokens.solic).post('/api/reservations', request());
    const row = ctx.db
      .prepare('SELECT * FROM reservation_history WHERE reservation_id = ?')
      .get(created.body.id);
    assert.equal(row.from_status, null);
    assert.equal(row.to_status, 'PENDIENTE');
    assert.equal(row.changed_by, created.body.userId);
  });
});

describe('RES-02 Reglas de horario (API)', () => {
  let ctx;
  beforeEach(async () => {
    ctx = await setup();
  });

  test('RES-02-E1 fin anterior al inicio → 422', async () => {
    const res = await ctx.as(ctx.tokens.solic).post('/api/reservations', request({ startTime: '10:00', endTime: '09:00' }));
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'BUSINESS_RULE');
  });

  test('RES-02-E2 fuera del horario de operación → 422', async () => {
    const res = await ctx.as(ctx.tokens.solic).post('/api/reservations', request({ startTime: '21:00', endTime: '23:00' }));
    assert.equal(res.status, 422);
  });

  test('RES-02-E3 franja que ya comenzó → 422', async () => {
    ctx.clock.set(new Date(2030, 4, 10, 9, 0));
    const res = await ctx.as(ctx.tokens.solic).post('/api/reservations', request());
    assert.equal(res.status, 422);
    assert.match(res.body.error.message, /ya comenzó/);
  });

  test('RES-02-E4 duración menor a 30 minutos → 422', async () => {
    const res = await ctx.as(ctx.tokens.solic).post('/api/reservations', request({ endTime: '08:15' }));
    assert.equal(res.status, 422);
  });

  test('RES-02-E5 formato de fecha u hora inválido → 400', async () => {
    const a = await ctx.as(ctx.tokens.solic).post('/api/reservations', request({ date: '10/05/2030' }));
    const b = await ctx.as(ctx.tokens.solic).post('/api/reservations', request({ startTime: '8am' }));
    assert.equal(a.status, 400);
    assert.equal(b.status, 400);
    assert.equal(a.body.error.code, 'VALIDATION_ERROR');
  });
});

describe('RES-03 Consultar reservas / ROL-04 propiedad', () => {
  let ctx;
  let ownId;
  beforeEach(async () => {
    ctx = await setup();
    ownId = (await ctx.as(ctx.tokens.solic).post('/api/reservations', request())).body.id;
    await ctx.as(ctx.tokens.otro).post('/api/reservations', request({ spaceId: SPACES.SALA_COMPUTO }));
  });

  test('RES-03-E1 filtro por estado', async () => {
    const res = await ctx.as(ctx.tokens.coord).get('/api/reservations?status=PENDIENTE');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 2);
    assert.ok(res.body.every((r) => r.status === 'PENDIENTE'));
    const none = await ctx.as(ctx.tokens.coord).get('/api/reservations?status=APROBADA');
    assert.equal(none.body.length, 0);
  });

  test('RES-03-E2 el propietario consulta el detalle', async () => {
    const res = await ctx.as(ctx.tokens.solic).get(`/api/reservations/${ownId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.id, ownId);
  });

  test('RES-03-E3 el coordinador ve las reservas de todos con nombres', async () => {
    const res = await ctx.as(ctx.tokens.coord).get('/api/reservations');
    assert.equal(res.body.length, 2);
    assert.ok(res.body.every((r) => r.spaceName && r.userName));
  });

  test('ROL-04-E1 un solicitante no puede ver la reserva de otro → 403', async () => {
    const res = await ctx.as(ctx.tokens.otro).get(`/api/reservations/${ownId}`);
    assert.equal(res.status, 403);
  });

  test('ROL-04-E2 el listado del solicitante solo trae sus reservas', async () => {
    const res = await ctx.as(ctx.tokens.solic).get('/api/reservations');
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].id, ownId);
  });

  test('filtro con estado inválido → 400; reserva inexistente → 404', async () => {
    assert.equal((await ctx.as(ctx.tokens.coord).get('/api/reservations?status=OTRO')).status, 400);
    assert.equal((await ctx.as(ctx.tokens.coord).get('/api/reservations/9999')).status, 404);
  });
});
