const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { setup, insertReservation, SPACES } = require('./helpers');

const validSpace = {
  name: 'Laboratorio de Física',
  type: 'LABORATORIO',
  capacity: 20,
  location: 'Bloque E, piso 1',
  resources: 'Osciloscopios',
};

describe('ESP-01 Registrar espacio', () => {
  let ctx;
  beforeEach(async () => {
    ctx = await setup();
  });

  test('ESP-01-E1 registro exitoso, activo por defecto', async () => {
    const res = await ctx.as(ctx.tokens.admin).post('/api/spaces', validSpace);
    assert.equal(res.status, 201);
    assert.ok(res.body.id);
    assert.equal(res.body.active, true);
    assert.equal(res.body.name, 'Laboratorio de Física');
  });

  test('ESP-01-E2 nombre duplicado sin distinguir mayúsculas → 409 DUPLICATE', async () => {
    const res = await ctx.as(ctx.tokens.admin).post('/api/spaces', { ...validSpace, name: 'laboratorio de redes' });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'DUPLICATE');
  });

  test('ESP-01-E3 capacidad 0 o tipo desconocido → 400 con detalle', async () => {
    const res = await ctx.as(ctx.tokens.admin).post('/api/spaces', { ...validSpace, capacity: 0, type: 'PISCINA' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.capacity);
    assert.ok(res.body.error.details.type);
  });

  test('ESP-01-E4 un SOLICITANTE no puede registrar → 403', async () => {
    const res = await ctx.as(ctx.tokens.solic).post('/api/spaces', validSpace);
    assert.equal(res.status, 403);
  });

  test('ROL-03-E2 un COORDINADOR no puede registrar → 403', async () => {
    const res = await ctx.as(ctx.tokens.coord).post('/api/spaces', validSpace);
    assert.equal(res.status, 403);
  });
});

describe('ESP-02 Consultar espacios', () => {
  let ctx;
  beforeEach(async () => {
    ctx = await setup();
  });

  test('ESP-02-E1 listado ordenado por nombre', async () => {
    const res = await ctx.as(ctx.tokens.solic).get('/api/spaces');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 5);
    const names = res.body.map((s) => s.name);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
  });

  test('ESP-02-E2 filtro por tipo', async () => {
    const res = await ctx.as(ctx.tokens.solic).get('/api/spaces?type=AUDITORIO');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 2);
    assert.ok(res.body.every((s) => s.type === 'AUDITORIO'));
  });

  test('ESP-02-E3 espacio inexistente → 404', async () => {
    const res = await ctx.as(ctx.tokens.solic).get('/api/spaces/9999');
    assert.equal(res.status, 404);
  });

  test('ESP-02-E4 inactivos ocultos al solicitante, visibles al ADMIN', async () => {
    await ctx.as(ctx.tokens.admin).patch(`/api/spaces/${SPACES.LAB_QUIMICA}`, { active: false });
    const solic = await ctx.as(ctx.tokens.solic).get('/api/spaces?includeInactive=true');
    const admin = await ctx.as(ctx.tokens.admin).get('/api/spaces?includeInactive=true');
    assert.ok(!solic.body.some((s) => s.id === SPACES.LAB_QUIMICA));
    assert.ok(admin.body.some((s) => s.id === SPACES.LAB_QUIMICA));
  });
});

describe('ESP-03 Actualizar espacio', () => {
  let ctx;
  beforeEach(async () => {
    ctx = await setup();
  });

  test('ESP-03-E1 actualización de capacidad', async () => {
    const res = await ctx.as(ctx.tokens.admin).patch(`/api/spaces/${SPACES.LAB_REDES}`, { capacity: 40 });
    assert.equal(res.status, 200);
    assert.equal(res.body.capacity, 40);
    assert.equal(res.body.name, 'Laboratorio de Redes');
  });

  test('ESP-03-E2 nombre ya usado por otro espacio → 409', async () => {
    const res = await ctx.as(ctx.tokens.admin).patch(`/api/spaces/${SPACES.LAB_REDES}`, { name: 'Auditorio Principal' });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'DUPLICATE');
  });

  test('aplica las validaciones de ESP-01', async () => {
    const res = await ctx.as(ctx.tokens.admin).patch(`/api/spaces/${SPACES.LAB_REDES}`, { capacity: 5000 });
    assert.equal(res.status, 400);
  });
});

describe('ESP-04 Activar e inactivar', () => {
  let ctx;
  beforeEach(async () => {
    ctx = await setup();
  });

  test('ESP-04-E1 inactivación sin reservas futuras', async () => {
    const res = await ctx.as(ctx.tokens.admin).patch(`/api/spaces/${SPACES.LAB_REDES}`, { active: false });
    assert.equal(res.status, 200);
    assert.equal(res.body.active, false);
  });

  test('ESP-04-E3 inactivación con reserva aprobada futura → 422 y sigue activo', async () => {
    insertReservation(ctx.db, { spaceId: SPACES.LAB_REDES, date: '2030-05-10', startTime: '08:00', endTime: '10:00' });
    const res = await ctx.as(ctx.tokens.admin).patch(`/api/spaces/${SPACES.LAB_REDES}`, { active: false });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'BUSINESS_RULE');
    const space = await ctx.as(ctx.tokens.admin).get(`/api/spaces/${SPACES.LAB_REDES}`);
    assert.equal(space.body.active, true);
  });

  test('las reservas pasadas o canceladas no impiden inactivar', async () => {
    insertReservation(ctx.db, { spaceId: SPACES.LAB_REDES, date: '2030-04-20', startTime: '08:00', endTime: '10:00' });
    insertReservation(ctx.db, {
      spaceId: SPACES.LAB_REDES, date: '2030-05-10', startTime: '08:00', endTime: '10:00', status: 'CANCELADA',
    });
    const res = await ctx.as(ctx.tokens.admin).patch(`/api/spaces/${SPACES.LAB_REDES}`, { active: false });
    assert.equal(res.status, 200);
  });
});
